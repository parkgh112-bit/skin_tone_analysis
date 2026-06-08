from flask import Flask, request, jsonify
from flask_cors import CORS
import cv2
import numpy as np
import pandas as pd
import joblib
import os
import tempfile
import google.generativeai as genai_classic
import json
import re
from supabase import create_client, Client
from dotenv import load_dotenv
import sqlite3

# ---------------------------------------------------------
# 1. 환경 설정 및 로드
# ---------------------------------------------------------
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
# 루트 .env 로드 시도
load_dotenv(os.path.join(BASE_DIR, "../.env"))

env_path = os.path.join(BASE_DIR, "../frontend/.env.local")
if os.path.exists(env_path):
    load_dotenv(env_path)
    print(f".env.local 로드 성공: {env_path}")

# ---------------------------------------------------------
# 2. 분류 기준 로드 (DB 기반)
# ---------------------------------------------------------
def get_kst_thresholds():
    """DB에서 톤 및 피부 상태 분류 기준을 가져옵니다."""
    db_path = os.path.join(BASE_DIR, "kst.db")
    try:
        conn = sqlite3.connect(db_path)
        tone_df = pd.read_sql("SELECT * FROM tone_threshold", conn)
        skin_df = pd.read_sql("SELECT * FROM skin_threshold", conn)
        conn.close()
        return tone_df, skin_df
    except Exception as e:
        print(f"[ERROR] DB 기준 로드 실패 (기본값 사용): {e}")
        return None, None

def classify_tone_db(val, tone_df):
    if tone_df is None: # Fallback (DB 실패 시)
        if val <= 49.93: return "Dark"
        elif val <= 53.82: return "Medium"
        elif val <= 57.73: return "Light"
        else: return "Very Light"
    
    for _, row in tone_df.iterrows():
        if row['min'] <= val < row['max']:
            return row['tone']
    return "Unknown"

def classify_skin_db(mel, red, skin_df):
    if skin_df is None: # Fallback (DB 실패 시)
        if mel < 19.24 and red < 6.06: return "Clear"
        elif mel >= 19.24 and red < 6.06: return "Pigmented"
        elif mel < 19.24 and red >= 6.06: return "Redness"
        else: return "Mixed"
        
    for _, row in skin_df.iterrows():
        if (row['melanin_min'] <= mel < row['melanin_max']) and \
           (row['redness_min'] <= red < row['redness_max']):
            return row['type']
    return "Unknown"

# ---------------------------------------------------------
# 3. Mediapipe 초기화
# ---------------------------------------------------------
face_mesh = None
try:
    import mediapipe as mp
    mp_face_mesh = mp.solutions.face_mesh
    face_mesh = mp_face_mesh.FaceMesh(
        static_image_mode=True, 
        max_num_faces=1, 
        refine_landmarks=True, 
        min_detection_confidence=0.5
    )
    print("Mediapipe 초기화 성공")
except Exception as e:
    print(f"Mediapipe 초기화 실패: {e}")

app = Flask(__name__)
CORS(app)

def get_mst_prediction(pro_data):
    """전문 분석 CSV 데이터를 기반으로 Lab/HSV/YCrCb 수치를 복원하여 120개 피처로 MST 예측"""
    if not model: return 5
    
    import cv2
    def get_extended_features(r, g, b, l_val):
        pixel = np.array([[[b, g, r]]], dtype=np.uint8)
        lab = cv2.cvtColor(pixel, cv2.COLOR_BGR2LAB)[0][0]
        ycbcr = cv2.cvtColor(pixel, cv2.COLOR_BGR2YCrCb)[0][0]
        hsv = cv2.cvtColor(pixel, cv2.COLOR_BGR2HSV)[0][0]
        return {
            'R': r, 'G': g, 'B': b, 'L': l_val,
            'a': float(lab[1]), 'b': float(lab[2]),
            'Y': float(ycbcr[0]), 'Cb': float(ycbcr[1]), 'Cr': float(ycbcr[2]),
            'H': float(hsv[0]), 'S': float(hsv[1]), 'V': float(hsv[2])
        }

    final_features = {}
    feature_names = model.feature_name_ if hasattr(model, 'feature_name_') else []
    
    for region in ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J']:
        csv_reg = region
        if region == 'I': csv_reg = 'G'
        if region == 'J': csv_reg = 'H'
        
        r = safe_float(pro_data.get(f'FSkin{csv_reg}_R', 0))
        g = safe_float(pro_data.get(f'FSkin{csv_reg}_G', 0))
        b = safe_float(pro_data.get(f'FSkin{csv_reg}_B', 0))
        l = safe_float(pro_data.get(f'FSkin{csv_reg}_L', 0))
        
        metrics = get_extended_features(r, g, b, l)
        for m_name, val in metrics.items():
            final_features[f"{region}_{m_name}"] = val

    df_input = pd.DataFrame([final_features])
    if feature_names:
        # 모델이 요구하는 피처만 순서대로 추출
        for col in feature_names:
            if col not in df_input.columns: df_input[col] = 0.0
        df_input = df_input[feature_names]
    
    try:
        pred = model.predict(df_input)[0]
        return int(pred)
    except:
        return 5

def get_undertone_from_metrics(redness):
    """Redness(a*) 수치를 기반으로 언더톤 추론"""
    if redness > 7.5: return "Cool"
    elif redness < 5.5: return "Warm"
    else: return "Neutral"

# ---------------------------------------------------------
# 4. API & Supabase Configuration
# ---------------------------------------------------------
GEMINI_API_KEY = os.getenv("GOOGLE_API_KEY")
if GEMINI_API_KEY:
    genai_classic.configure(api_key=GEMINI_API_KEY)
    print("Gemini API 키 로드 성공")
else:
    print("경고: GOOGLE_API_KEY 환경 변수가 설정되지 않았습니다.")

SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY")
supabase = None
if SUPABASE_URL and SUPABASE_KEY and SUPABASE_URL.startswith("http"):
    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
        print("Supabase 연결 성공")
    except: pass

# ---------------------------------------------------------
# 5. 모델 로드
# ---------------------------------------------------------
MODEL_FILE = os.path.join(BASE_DIR, "lgbm_model.pkl")
model = joblib.load(MODEL_FILE) if os.path.exists(MODEL_FILE) else None

# ---------------------------------------------------------
# 6. 제품 데이터베이스
# ---------------------------------------------------------
PRODUCT_DATABASE = {
    "Base": {
        "MST-01": [{"brand": "Chanel", "name": "Ultra Le Teint B10", "price": "₩89,000", "reason": "가장 밝은 피부톤을 위한 투명한 광채 선사"}],
        "MST-02": [{"brand": "Dior", "name": "Forever Skin Glow 0N", "price": "₩85,000", "reason": "투명하고 맑은 피부 표현"}],
        "MST-03": [{"brand": "Giorgio Armani", "name": "Power Fabric+ 1.5", "price": "₩82,000", "reason": "화사한 피부 톤업과 커버력"}],
        "MST-04": [{"brand": "Estee Lauder", "name": "Double Wear Bone", "price": "₩75,000", "reason": "중간 밝기의 뉴트럴톤 피부를 위한 완벽한 커버"}],
        "MST-05": [{"brand": "NARS", "name": "Natural Radiant Longwear Foundation Punjab", "price": "₩72,000", "reason": "건강하고 윤기 있는 피부 완성"}],
        "MST-06": [{"brand": "YSL", "name": "All Hours Foundation MN7", "price": "₩79,000", "reason": "차분한 피부톤을 위한 매끈한 밀착력"}],
        "MST-07": [{"brand": "Lancome", "name": "Teint Idole PO-03", "price": "₩72,000", "reason": "건강한 구리빛 피부 톤 보정"}],
        "MST-08": [{"brand": "Bobbi Brown", "name": "Skin Long-Wear Weightless Golden", "price": "₩78,000", "reason": "깊이 있는 피부톤을 위한 자연스러운 커버"}],
        "MST-09": [{"brand": "Fenty Beauty", "name": "Pro Filt'r Soft Matte 330", "price": "₩56,000", "reason": "매력적인 딥톤 피부를 위한 선명한 발색"}],
        "MST-10": [{"brand": "MAC", "name": "Studio Fix Fluid NC50", "price": "₩48,000", "reason": "어두운 피부톤을 위한 완벽한 톤 매칭"}]
    },
    "Point": {
        "Cool": [{"brand": "Dior", "name": "Addict Lip Glow 007 Raspberry", "price": "₩48,000", "reason": "쿨톤 피부에 생기를 더하는 핑크 컬러"}],
        "Warm": [{"brand": "MAC", "name": "Chili", "price": "₩35,000", "reason": "웜톤의 인생 컬러, 차분한 오렌지 브라운"}],
        "Neutral": [{"brand": "Chanel", "name": "Rouge Allure 191", "price": "₩55,000", "reason": "어느 피부톤에나 어울리는 우아한 코랄"}]
    },
    "Care": {
        "Dry": [{"brand": "Kiehl's", "name": "Ultra Facial Cream", "price": "₩45,000", "reason": "24시간 지속되는 강력한 수분 공급"}],
        "Oily": [{"brand": "La Roche-Posay", "name": "Effaclar Mat", "price": "₩32,000", "reason": "피지 조절 및 산뜻한 마무리"}],
        "Sensitive": [{"brand": "Avene", "name": "Cicalfate+", "price": "₩28,000", "reason": "민감해진 피부의 빠른 진정과 재생"}]
    }
}

# ---------------------------------------------------------
# 유틸리티 함수
# ---------------------------------------------------------
FINAL_REGIONS = {
    "A_Forehead": [109, 108, 151, 337, 338, 10, 297, 332, 284, 251, 21, 54, 103, 67],
    "B_Nose": [6, 197, 195, 5, 4, 1, 19, 94, 2, 98, 327, 294, 278, 48, 219, 218, 237, 44, 122, 168],
    "C_Side_Right_Eye": [127, 234, 93, 226],
    "D_Side_Left_Eye": [356, 454, 323, 446],
    "E_Under_Left_Eye": [350, 349, 348, 347, 346, 345],
    "F_Under_Right_Eye": [121, 120, 119, 118, 117, 116],
    "G_Right_Cheek": [50, 117, 118, 100, 101, 215, 213, 187, 147, 123],
    "H_Left_Cheek": [280, 346, 347, 329, 330, 435, 433, 411, 376, 352],
    "I_Right_Smile_Line": [205, 203, 165, 92, 186, 57, 43, 202],
    "J_Left_Smile_Line": [425, 423, 391, 322, 410, 287, 273, 422],
    "K_Lips": [61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291, 308, 324, 318, 402, 317, 14, 87, 178, 88, 95, 185, 40, 39, 37, 0, 267, 269, 270, 409, 415, 310, 311, 312, 13, 82, 81, 42, 183, 78]
}

def L_100_to_255(L_norm):
    return int(np.clip(L_norm / 100.0 * 255, 0, 255))

def safe_float(value, default=0.0):
    try:
        if value is None or (isinstance(value, float) and np.isnan(value)): return default
        return float(value)
    except: return default

def get_gemini_response(prompt):
    """Gemini API를 호출하여 JSON 응답을 시도합니다."""
    try:
        model_ai = genai_classic.GenerativeModel('models/gemini-2.5-flash-lite')
        response = model_ai.generate_content(prompt)
        text = response.text.strip()
        match = re.search(r'\{.*\}', text, re.DOTALL)
        if match:
            return json.loads(match.group())
        return None
    except Exception as e:
        print(f"Gemini API Error: {e}")
        return None

def extract_features(image_path):
    if face_mesh is None: return None, None, None
    image = cv2.imread(image_path)
    if image is None: return None, None, None
    h, w, _ = image.shape
    rgb_image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    results = face_mesh.process(rgb_image)
    if not results.multi_face_landmarks: return None, None, None
    
    landmarks = results.multi_face_landmarks[0].landmark
    features = {}
    lip_coords = [[landmarks[i].x, landmarks[i].y] for i in FINAL_REGIONS["K_Lips"]]
    cheek_coords = {
        'right': [[landmarks[i].x, landmarks[i].y] for i in FINAL_REGIONS["G_Right_Cheek"]],
        'left': [[landmarks[i].x, landmarks[i].y] for i in FINAL_REGIONS["H_Left_Cheek"]]
    }
    
    for key, indices in FINAL_REGIONS.items():
        if key == "K_Lips": continue
        try:
            points = np.array([[int(landmarks[i].x * w), int(landmarks[i].y * h)] for i in indices], np.int32)
            mask = np.zeros(image.shape[:2], dtype=np.uint8)
            cv2.fillPoly(mask, [cv2.convexHull(points)], 255)
            pixels = image[mask == 255]
            if pixels.size == 0: continue
            
            median_bgr = np.median(pixels, axis=0).astype(np.uint8).reshape(1, 1, 3)
            lab = cv2.cvtColor(median_bgr, cv2.COLOR_BGR2LAB)[0][0]
            ycbcr = cv2.cvtColor(median_bgr, cv2.COLOR_BGR2YCrCb)[0][0]
            hsv = cv2.cvtColor(median_bgr, cv2.COLOR_BGR2HSV)[0][0]
            
            r_key = key.split('_')[0]
            features[f'{r_key}_R'] = int(median_bgr[0,0,2])
            features[f'{r_key}_G'] = int(median_bgr[0,0,1])
            features[f'{r_key}_B'] = int(median_bgr[0,0,0])
            L_norm = (lab[0] / 255.0) * 100
            features[f'{r_key}_L'] = L_100_to_255(L_norm)
            features[f'{r_key}_a'] = int(lab[1])
            features[f'{r_key}_b'] = int(lab[2])
            features[f'{r_key}_Y'] = int(ycbcr[0])
            features[f'{r_key}_Cb'] = int(ycbcr[1])
            features[f'{r_key}_Cr'] = int(ycbcr[2])
            features[f'{r_key}_H'] = int(hsv[0])
            features[f'{r_key}_S'] = int(hsv[1])
            features[f'{r_key}_V'] = int(hsv[2])
        except: continue
    return features, lip_coords, cheek_coords

def get_user_pro_data(user_name):
    csv_path = os.path.join(os.path.dirname(BASE_DIR), 'code/skin_type_result (2).csv')
    if not os.path.exists(csv_path): return None
    try:
        df = pd.read_csv(csv_path)
        df.columns = df.columns.str.strip()
        user_row = df[df['Name'].str.contains(user_name, na=False, case=False)]
        return user_row.iloc[0].to_dict() if not user_row.empty else None
    except: return None

# ---------------------------------------------------------
# 7. Admin & Threshold Management Routes
# ---------------------------------------------------------
@app.route('/api/admin/thresholds', methods=['GET'])
def get_all_thresholds():
    """DB에 저장된 모든 임계값 데이터를 반환합니다."""
    db_path = os.path.join(BASE_DIR, "kst.db")
    try:
        conn = sqlite3.connect(db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        tone_data = [dict(row) for row in cursor.execute("SELECT * FROM tone_threshold").fetchall()]
        skin_data = [dict(row) for row in cursor.execute("SELECT * FROM skin_threshold").fetchall()]
        
        conn.close()
        return jsonify({
            "tone_thresholds": tone_data,
            "skin_thresholds": skin_data
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/admin/thresholds/update', methods=['POST'])
def update_threshold():
    """특정 임계값을 업데이트합니다."""
    data = request.json
    table = data.get('table') # 'tone' or 'skin'
    row_id = data.get('id')
    updates = data.get('updates') # {col: val, ...}
    
    if not table or not row_id or not updates:
        return jsonify({"error": "Missing parameters"}), 400
        
    db_path = os.path.join(BASE_DIR, "kst.db")
    table_name = "tone_threshold" if table == "tone" else "skin_threshold"
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        set_clause = ", ".join([f"{k} = ?" for k in updates.keys()])
        values = list(updates.values()) + [row_id]
        
        query = f"UPDATE {table_name} SET {set_clause} WHERE id = ?"
        cursor.execute(query, values)
        
        conn.commit()
        conn.close()
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ---------------------------------------------------------
# 8. Main Routes
# ---------------------------------------------------------
@app.route('/predict', methods=['POST'])
def predict():
    if 'file' not in request.files: return jsonify({'error': 'No file'}), 400
    with tempfile.NamedTemporaryFile(delete=False, suffix='.jpg') as tmp:
        request.files['file'].save(tmp.name)
        tmp_path = tmp.name
    try:
        features, lip, cheek = extract_features(tmp_path)
        if not features: return jsonify({'error': 'Face detection failed'}), 400
        df = pd.DataFrame([features])
        if model and hasattr(model, 'feature_name_'):
            for col in model.feature_name_: 
                if col not in df.columns: df[col] = 0
            df = df[model.feature_name_]
        prediction = model.predict(df)[0] if model else 4
        return jsonify({'mst': int(prediction), 'undertone': 'Neutral', 'lip_coords': lip, 'cheek_coords': cheek})
    except Exception as e: return jsonify({'error': str(e)}), 500
    finally:
        if os.path.exists(tmp_path): os.remove(tmp_path)

@app.route('/recommend', methods=['POST'])
def recommend():
    data = request.json
    mst = data.get('mst', 'MST-05')
    ut = data.get('undertone', 'Neutral')
    
    # MST 형식 정규화 (예: "5" -> "MST-05")
    mst_val = str(mst).replace('MST-', '')
    mst_key = f"MST-{int(mst_val):02d}" if mst_val.isdigit() else "MST-05"
    
    # 데이터베이스에서 관련 제품 추출
    base_prod = PRODUCT_DATABASE["Base"].get(mst_key, PRODUCT_DATABASE["Base"]["MST-05"])[0]
    point_prod = PRODUCT_DATABASE["Point"].get(ut, PRODUCT_DATABASE["Point"]["Neutral"])[0]
    
    prompt = f"""
    당신은 전문 퍼스널 컬러 컨설턴트 및 피부 진단 전문가입니다. 
    사용자의 MST 지수는 {mst_key}이고, 언더톤은 {ut}입니다.

    추천 베이스 제품: {base_prod['brand']} {base_prod['name']} ({base_prod['reason']})
    추천 포인트 제품: {point_prod['brand']} {point_prod['name']} ({point_prod['reason']})

    다음 지침에 따라 상세 분석 결과와 추천 정보를 반드시 아래 JSON 형식으로 작성하세요:
    
    {{
      "summary": "피부톤 특징 요약",
      "fashion_desc": "스타일링 및 패션 가이드",
      "best_colors": [
        {{"name": "색상명1", "hex": "#HEX1"}},
        {{"name": "색상명2", "hex": "#HEX2"}},
        {{"name": "색상명3", "hex": "#HEX3"}},
        {{"name": "색상명4", "hex": "#HEX4"}}
      ],
      "worst_colors": [
        {{"name": "피해야할색1", "hex": "#HEX1"}},
        {{"name": "피해야할색2", "hex": "#HEX2"}}
      ],
      "makeup_guide": "메이크업 팁 및 제품 활용법",
      "skincare_focus": "현재 피부 상태에 따른 관리 중점 사항",
      "skincare_products": [
        {{"item": "추천 스킨케어 제품 1", "desc": "제품 특징 및 사용 효과"}},
        {{"item": "추천 스킨케어 제품 2", "desc": "제품 특징 및 사용 효과"}}
      ],
      "foundation_shade": "추천 파운데이션 홋수 및 질감 가이드",
      "foundation_products": [
        {{"item": "{base_prod['brand']} {base_prod['name']}", "desc": "{base_prod['reason']}"}},
        {{"item": "추가 추천 파운데이션", "desc": "가볍고 밀착력이 좋은 텍스처"}}
      ],
      "hair_colors": ["추천헤어컬러1", "추천헤어컬러2", "추천헤어컬러3"],
      "jewelry": "어울리는 금속 종류 (실버/골드/로즈골드) 및 디테일 추천",
      "recommendations": {{
         "base": "{base_prod['brand']} {base_prod['name']}",
         "point": "{point_prod['brand']} {point_prod['name']}"
      }},
      "advice": "추가적인 전문가 조언"
    }}

    * 모든 색상은 hex 코드를 반드시 포함해야 합니다.
    * 한국어로 작성하세요.
    """
    res = get_gemini_response(prompt)
    if not res:
        res = {
            "summary": "기본 분석 결과입니다.",
            "fashion_desc": "자연스러운 스타일링을 권장합니다.",
            "best_colors": [{"name": "베이지", "hex": "#F5F5DC"}, {"name": "코랄", "hex": "#FF7F50"}],
            "worst_colors": [{"name": "네온 블루", "hex": "#0000FF"}],
            "makeup_guide": "가벼운 텍스처의 제품을 사용하세요.",
            "skincare_focus": "보습과 자외선 차단에 집중하세요.",
            "skincare_products": [{"item": "수분 크림", "desc": "피부 장벽 강화"}],
            "foundation_shade": "21호 내외의 뉴트럴 쉐이드",
            "foundation_products": [{"item": base_prod['name'], "desc": base_prod['reason']}],
            "hair_colors": ["다크 브라운", "내추럴 블랙"],
            "jewelry": "로즈골드 주얼리가 잘 어울립니다.",
            "recommendations": {"base": base_prod['name'], "point": point_prod['name']},
            "advice": "피부 보습에 유의하세요."
        }
    return jsonify(res)

@app.route('/detail-recommend', methods=['POST'])
def detail_recommend():
    data = request.json
    product_name = data.get('category', '')
    mst = data.get('mst', 'MST-05')
    ut = data.get('undertone', 'Neutral')

    # 1. PRODUCT_DATABASE에서 직접 검색 시도
    found_product = None
    for cat_name, sub_dict in PRODUCT_DATABASE.items():
        for sub_cat, prod_list in sub_dict.items():
            for prod in prod_list:
                if prod['name'].lower() in product_name.lower() or product_name.lower() in prod['name'].lower():
                    found_product = prod
                    break
            if found_product: break
        if found_product: break

    if found_product:
        return jsonify({"products": [found_product]})

    # 2. 데이터베이스에 없는 경우 Gemini를 통해 상세 정보 생성
    prompt = f"""
    당신은 뷰티 제품 전문가입니다. 제품명 '{product_name}'에 대한 상세 정보를 JSON 형식으로 작성하세요.
    사용자의 피부 상태는 MST: {mst}, 언더톤: {ut} 입니다.

    다음 형식을 반드시 지켜주세요:
    {{
      "products": [
        {{
          "brand": "실제 브랜드명 또는 유추된 브랜드",
          "name": "{product_name}",
          "price": "예상 가격 (예: ₩50,000)",
          "reason": "전문적인 추천 이유 (반드시 100자 이내, 2~3문장으로 간결하게 작성)"
        }}
      ]
    }}
    """
    res = get_gemini_response(prompt)
    if not res:
        res = {"products": [{"brand": "Unknown", "name": product_name, "price": "가격 정보 없음", "reason": "상세 정보를 불러올 수 없습니다."}]}
    
    return jsonify(res)

@app.route('/chat', methods=['POST'])
def chat():
    data = request.json
    user_msg = data.get('message', '')
    mst = data.get('mst', 'MST-05')
    ut = data.get('undertone', 'Neutral')
    prompt = f"사용자 질문: {user_msg}, MST: {mst}, UT: {ut}에 대해 상담 JSON {{'reply': '내용'}}을 작성하세요."
    res = get_gemini_response(prompt)
    if not res:
        res = {"reply": "API 연결에 문제가 발생했습니다."}
    return jsonify(res)

@app.route('/recommend-pro', methods=['POST'])
def recommend_pro():
    data = request.json
    user_name = data.get('name', '')
    raw_input_data = data.get('raw_data') # 프론트엔드에서 직접 전달된 CSV 행 데이터

    # 1. 캐시 확인 (이름 기반 조회 시에만)
    if not raw_input_data and supabase:
        try:
            cache_res = supabase.table('pro_analysis_cache').select('*').eq('user_name', user_name).execute()
            if cache_res.data:
                return jsonify({"recommendations": cache_res.data[0]['analysis_result'], "raw_metrics": cache_res.data[0]['raw_metrics'], "is_cached": True})
        except: pass

    # 2. 데이터 추출 (직접 전달된 데이터가 있으면 그것을 사용, 없으면 서버 CSV에서 조회)
    pro_data = raw_input_data if raw_input_data else get_user_pro_data(user_name)
    if not pro_data: return jsonify({'error': '데이터를 찾을 수 없습니다.'}), 404

    def f_v(pattern, default=0.0):
        # 대소문자 무시 및 공백 제거하여 매칭
        pattern_clean = pattern.strip().lower()
        for k, v in pro_data.items():
            if pattern_clean in str(k).strip().lower():
                return safe_float(v, default)
        return default

    def get_compensated_val(base_name):
        f = f_v(f'F{base_name}_T')
        if f > 0: return f
        l = f_v(f'L{base_name}_T')
        r = f_v(f'R{base_name}_T')
        return (l + r) / 2 if (l + r) > 0 else 0.0

    # KST 판별 및 모든 지표 추출
    lightness = get_compensated_val('SLColor')
    melanin = get_compensated_val('Melanin')
    redness = get_compensated_val('Redness')
    
    tone_ths, skin_ths = get_kst_thresholds()
    tone = classify_tone_db(lightness, tone_ths)
    skin = classify_skin_db(melanin, redness, skin_ths)
    kst_diagnosis = f"{tone} + {skin}"

    # MST 및 언더톤 추론 (일반 분석과 동일 로직)
    mst_val = get_mst_prediction(pro_data)
    mst_key = f"MST-{mst_val:02d}"
    undertone = get_undertone_from_metrics(redness)

    metrics = {
        "kst_diagnosis": kst_diagnosis,
        "tone": tone,
        "skin_type": skin,
        "mst": mst_key,
        "undertone": undertone,
        "pore": get_compensated_val('Pore'),
        "pore_small": f_v('FPoreCNT_Small_T') or f_v('FPore_Small_T'),
        "pore_medium": f_v('FPoreCNT_Medium_T') or f_v('FPore_Medium_T'),
        "pore_large": f_v('FPoreCNT_Large_T') or f_v('FPore_Large_T'),
        "wrinkle": get_compensated_val('Wrinkle'),
        "future_wrinkle": get_compensated_val('FutureWrinkle'),
        "pigment": get_compensated_val('Pigmentation'),
        "sebum": get_compensated_val('Sebum'),
        "sebum_cnt": f_v('FSebumCNT_T') or f_v('FSebum_T'),
        "redness": redness,
        "brown": get_compensated_val('Brown'),
        "porphyrin": get_compensated_val('Porphyrin'),
        "melanin": melanin,
        "gloss": lightness
    }
    
    prompt = f"""
    당신은 정밀 피부 진단 전문가 및 퍼스널 컬러 스타일리스트입니다. 
    KST 진단 결과: {kst_diagnosis}, MST 지수: {mst_key}, 언더톤: {undertone}입니다.
    전문 장비(Mark-Vu) 측정 지표는 {metrics}입니다.

    다음 JSON 형식을 반드시 지켜서 고도화된 리포트를 작성하세요:
    {{
      "summary": "전체적인 피부 상태 요약 (2-3문장)",
      "skin_age_analysis": "현재/잠재 주름 데이터를 기반으로 한 노화 예방 리포트",
      "detailed_analysis": [
        {{"category": "모공", "status": "상태 설명", "score": {metrics['pore']}, "advice": "관리 조언"}},
        {{"category": "주름", "status": "상태 설명", "score": {metrics['wrinkle']}, "advice": "관리 조언"}},
        {{"category": "색소", "status": "상태 설명", "score": {metrics['pigment']}, "advice": "관리 조언"}},
        {{"category": "피지/트러블", "status": "상태 설명", "score": {metrics['sebum']}, "advice": "관리 조언"}}
      ],
      "skincare_routine": [
        {{"step": "클렌징", "component": "성분 제안", "product": "추천 제품명", "reason": "추천 이유"}},
        {{"step": "토너", "component": "성분 제안", "product": "추천 제품명", "reason": "추천 이유"}},
        {{"step": "세럼", "component": "성분 제안", "product": "추천 제품명", "reason": "추천 이유"}},
        {{"step": "크림", "component": "성분 제안", "product": "추천 제품명", "reason": "추천 이유"}}
      ],
      "advanced_makeup_guide": "정밀 지표(모공, 홍조, 피지 등)를 반영한 입체적인 메이크업 전략 (예: 홍조 커버, 요철 보정 등)",
      "advanced_styling_guide": "MST/언더톤과 피부결(광택)을 고려한 패션 소재 및 주얼리, 헤어 컬러 추천",
      "lifestyle_tip": "생활 습관 및 환경 관리 조언"
    }}

    * 한국어로 작성하고, 전문적이고 신뢰감 있는 톤을 유지하세요.
    """
    res = get_gemini_response(prompt)
    
    # Fallback if Gemini fails
    if not res:
        res = {
            "summary": "전문 장비 데이터를 기반으로 분석된 결과입니다. 현재 모공과 주름 상태에 따른 맞춤형 관리가 필요합니다.",
            "skin_age_analysis": "현재 측정된 주름 수치를 기반으로 볼 때, 지속적인 탄력 케어가 필요한 상태입니다.",
            "detailed_analysis": [
                {"category": "모공", "status": "주의", "score": metrics.get('pore', 50), "advice": "딥 클렌징과 모공 수렴 제품 사용을 권장합니다."},
                {"category": "주름", "status": "보통", "score": metrics.get('wrinkle', 40), "advice": "보습과 기능성 안티에이징 제품 사용이 필요합니다."},
                {"category": "색소", "status": "양호", "score": metrics.get('pigment', 30), "advice": "자외선 차단제를 꾸준히 도포하여 현재 상태를 유지하세요."},
                {"category": "피지/트러블", "status": "주의", "score": metrics.get('sebum', 60), "advice": "유수분 밸런스 조절을 위한 산뜻한 제형의 수분 크림을 사용하세요."}
            ],
            "skincare_routine": [
                {"step": "클렌징", "component": "살리실산", "product": "약산성 클렌저", "reason": "자극 없이 모공 속 노폐물을 제거합니다."},
                {"step": "토너", "component": "히알루론산", "product": "보습 토너", "reason": "피부 결을 정돈하고 즉각적인 수분을 공급합니다."},
                {"step": "세럼", "component": "레티놀", "product": "리페어 세럼", "reason": "피부 재생을 돕고 주름 개선에 도움을 줍니다."},
                {"step": "크림", "component": "세라마이드", "product": "장벽 강화 크림", "reason": "피부 보호막을 형성하여 수분 손실을 방지합니다."}
            ],
            "advanced_makeup_guide": "모공 부위는 프라이머로 요철을 메우고, 홍조가 있는 부위는 그린 베이스로 톤을 보정하는 것이 효과적입니다.",
            "advanced_styling_guide": "MST 지수와 언더톤을 고려할 때, 너무 선명한 원색보다는 부드러운 파스텔 톤이나 뮤트 톤의 의상이 피부를 더 맑아 보이게 합니다.",
            "lifestyle_tip": "충분한 수분 섭취와 규칙적인 수면은 피부 재생 주기를 정상화하는 데 큰 도움이 됩니다."
        }

    if res and supabase:
        try:
            supabase.table('pro_analysis_cache').upsert({"user_name": user_name, "analysis_result": res, "raw_metrics": metrics}, on_conflict="user_name").execute()
        except: pass

    return jsonify({"recommendations": res, "raw_metrics": metrics})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
