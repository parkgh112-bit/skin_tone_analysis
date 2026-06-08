# Skin Tone Analysis & Pro Report System (캡스톤 디자인)

피부톤(MST 스케일) 분석 및 전문 장비(Mark-Vu) 데이터를 결합한 정밀 피부 진단 및 맞춤형 솔루션 제공 시스템입니다.

## 🚀 주요 기능
- **MST 스케일 기반 피부톤 진단:** MediaPipe를 활용한 얼굴 영역 추출 및 색상 분석.
- **전문 리포트(ProReport):** Mark-Vu 장비 데이터를 활용한 심층 분석 및 시각화.
- **AI 뷰티 가이드:** Gemini API를 이용한 개인별 맞춤형 메이크업 및 스타일링 추천.
- **가상 메이크업 시뮬레이션:** (개발 예정) 분석된 톤에 최적화된 제품 합성.

## 🛠 기술 스택
- **Frontend:** Next.js, TypeScript, Tailwind CSS, Recharts
- **Backend:** Flask (Python), OpenCV, MediaPipe, LightGBM, SQLite
- **Database:** Supabase (History management), SQLite (Thresholds)
- **AI:** Google Gemini API (Flash-lite)

## 📂 프로젝트 구조
- `frontend/`: Next.js 기반 웹 인터페이스
- `backend/`: Flask API 서버 및 데이터 처리 로직
- `mst_model_확인/`: 모델 예측 테스트 코드

## ⚙️ 실행 방법
### Backend
1. Python 3.8+ 설치
2. `pip install -r requirements.txt`
3. `python backend/app.py`

### Frontend
1. Node.js 설치
2. `cd frontend && npm install`
3. `npm run dev`

## ⚠️ 주의사항
- **데이터 보안:** 본 저장소에는 개인정보 보호를 위해 실제 분석 데이터셋(`code/*.csv`) 및 대용량 모델 데이터가 포함되어 있지 않습니다.
- **전문 분석 기능:** `recommend-pro` 기능을 사용하려면 프로젝트 루트에 `code/` 폴더를 생성하고, 해당 폴더 내에 전문 장비에서 추출된 `skin_type_result.csv` 파일을 직접 배치해야 합니다.
- 실행을 위해서는 루트 디렉토리에 `.env` 파일(API Key 등)이 필요합니다.


### `.env` 파일 형태

GOOGLE_API_KEY= ###

NEXT_PUBLIC_SUPABASE_URL=###

NEXT_PUBLIC_SUPABASE_ANON_KEY=###

### 개선 사항
frontend/ 에 .env.local 파일 필요
NEXT_PUBLIC_SUPABASE_URL=###

NEXT_PUBLIC_SUPABASE_ANON_KEY=###
