"use client"

import type React from "react"

import { useState, useEffect } from "react"
import Link from "next/link"
import { supabase } from "@/lib/supabase/client"
import type { Session } from "@supabase/supabase-js"
import { Upload, Sparkles, Sun, Palette, ShoppingBag, Scissors, Gem, Ban, CheckCircle2, Loader2, Search, ChevronLeft, ChevronRight, Activity } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import ChatInterface from "@/components/ChatInterface"
import VirtualMakeup from "@/components/VirtualMakeup"
import ProReport from "@/components/ProReport"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

// ---------------------------------------------------------
// 1. MST Data for UI
// ---------------------------------------------------------
const MST_UI_DATA = [
  { level: "MST-01", color: "#F6EDE4", name: "매우 밝음" },
  { level: "MST-02", color: "#F3E7DB", name: "밝음" },
  { level: "MST-03", color: "#F1D5C7", name: "약간 밝음" },
  { level: "MST-04", color: "#DECBB7", name: "밝은 중간" },
  { level: "MST-05", color: "#C3A186", name: "중간" },
  { level: "MST-06", color: "#A98467", name: "약간 어두움" },
  { level: "MST-07", color: "#8B6A4F", name: "어두움" },
  { level: "MST-08", color: "#5E4230", name: "매우 어두움" },
  { level: "MST-09", color: "#3A2817", name: "깊음" },
  { level: "MST-10", color: "#1F1209", name: "매우 깊음" },
]

interface ColorInfo {
  name: string
  hex: string
}

interface ProductInfo {
  item: string
  desc: string
}

interface RecommendationData {
  skincare_focus: string
  skincare_products: ProductInfo[]
  foundation_shade: string
  foundation_products: ProductInfo[]
  best_colors: ColorInfo[]
  worst_colors: ColorInfo[]
  hair_colors: string[]
  jewelry: string
  fashion_desc: string
}

interface DetailProduct {
  brand: string
  name: string
  price: string
  reason: string
}

// Pro Report Interface
interface ProData {
  recommendations: {
    summary: string
    priority_analysis: Array<{ issue: string; level: string; desc: string }>
    future_report: string
    skincare_routine: Array<{ step: string; component: string; product: string; reason: string }>
    makeup_tip: string
  }
  raw_metrics: {
    pore: number
    wrinkle: number
    future_wrinkle: number
    pigment: number
    sebum: number
    redness: number
    porphyrin: number
    melanin: number
    gloss: number
  }
}

export default function LumilayerAI() {
  const [session, setSession] = useState<Session | null>(null)
  const [uploadedImage, setUploadedImage] = useState<string | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisComplete, setAnalysisComplete] = useState(false)
  const [scanProgress, setScanProgress] = useState(0)
  const [detectedMST, setDetectedMST] = useState<number>(4) // Default
  const [detectedUndertone, setDetectedUndertone] = useState<string>("Neutral")
  const [lipCoords, setLipCoords] = useState<number[][]>([])
  const [cheekCoords, setCheekCoords] = useState<{ right: number[][]; left: number[][] } | null>(null)
  const [showMakeup, setShowMakeup] = useState(false)
  
  // AI Recommendations State
  const [recommendations, setRecommendations] = useState<RecommendationData | null>(null)

  // Dynamic Section State
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [currentSlide, setCurrentSlide] = useState(0)
  
  const [loadingProducts, setLoadingProducts] = useState<Set<string>>(new Set())
  const [productDetails, setProductDetails] = useState<Record<string, DetailProduct[]>>({})

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })

    // Set up a listener for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    // The onAuthStateChange listener will handle setting the session to null
  }

  const getUndertoneLabel = (tone: string) => {
    if (tone === "Warm") return "웜톤 (Warm)"
    if (tone === "Cool") return "쿨톤 (Cool)"
    return "뉴트럴 (Neutral)"
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setImageFile(file) // Store file for API upload
      const reader = new FileReader()
      reader.onload = (e) => {
        setUploadedImage(e.target?.result as string)
        setAnalysisComplete(false)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleAnalyze = async () => {
    if (!imageFile) return

    setIsAnalyzing(true)
    setScanProgress(0)

    // Animation loop (Visual Feedback)
    const interval = setInterval(() => {
      setScanProgress((prev) => {
        if (prev >= 90) return 90 // Hold at 90% until response
        return prev + 5
      })
    }, 100)

    try {
      const formData = new FormData()
      formData.append("file", imageFile)

      // Call Python Backend
      const response = await fetch("http://localhost:5000/predict", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        throw new Error("Analysis failed")
      }

      const data = await response.json()
      
      // MST returned is 1-10, Array index is 0-9
      const mstIndex = data.mst - 1
      setDetectedMST(mstIndex)
      
      // Set Undertone
      if (data.undertone) {
        setDetectedUndertone(data.undertone)
      }

      // Set Lip Coords
      if (data.lip_coords) {
        setLipCoords(data.lip_coords)
      }
      
      // Set Cheek Coords
      if (data.cheek_coords) {
        setCheekCoords(data.cheek_coords)
      }

      // --- Call AI Recommendation API ---
      // We do this in parallel or after ensuring data is ready
      const recResponse = await fetch("http://localhost:5000/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mst: MST_UI_DATA[mstIndex].level,
          undertone: data.undertone || "Neutral"
        }),
      })

      if (recResponse.ok) {
        const recData = await recResponse.json()
        setRecommendations(recData)
      }

      setScanProgress(100)
      setTimeout(() => {
        setIsAnalyzing(false)
        setAnalysisComplete(true)
        clearInterval(interval)
      }, 500)

    } catch (error) {
      console.error("Error analyzing image:", error)
      alert("이미지 분석에 실패했습니다. 다시 시도해 주세요. (백엔드 서버 확인 필요)")
      setIsAnalyzing(false)
      clearInterval(interval)
      setScanProgress(0)
    }
  }

  const handleProductClick = async (category: string) => {
    // If clicking same category, just scroll to section or toggle off (optional)
    if (activeCategory === category) {
        // Optional: setActiveCategory(null) to close
        return 
    }

    setActiveCategory(category)
    setCurrentSlide(0) // Reset slider

    // If data already exists, don't fetch again
    if (productDetails[category]) return

    // Fetch Start
    const nextLoading = new Set(loadingProducts)
    nextLoading.add(category)
    setLoadingProducts(nextLoading)

    try {
      const response = await fetch("http://localhost:5000/detail-recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: category,
          mst: MST_UI_DATA[detectedMST].level,
          undertone: detectedUndertone,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        if (data.products) {
            setProductDetails(prev => ({
                ...prev,
                [category]: data.products
            }))
        }
      }
    } catch (error) {
      console.error("Failed to fetch details", error)
    } finally {
       // Fetch End
       setLoadingProducts(prev => {
           const next = new Set(prev)
           next.delete(category)
           return next
       })
    }
  }

  const detectedTone = MST_UI_DATA[detectedMST]

  return (
    <main className="min-h-screen bg-stone-50 font-sans selection:bg-amber-100">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-stone-200">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-amber-700 rounded-lg flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-stone-900 tracking-tight">Skintone <span className="text-amber-700">+</span></span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-stone-600">
            <a href="/" className="hover:text-amber-700 transition-colors">분석하기</a>
            <a href="/pro" className="hover:text-amber-700 transition-colors">전문 분석(Pro)</a>
            <a href="/scale" className="hover:text-amber-700 transition-colors">MST 스케일</a>
            <a href="/admin/thresholds" className="text-amber-700 font-bold hover:text-amber-800 transition-colors flex items-center gap-1">
              <Activity className="w-4 h-4" />
              임계값 관리
            </a>
          </div>
          <div className="flex items-center gap-4">
            {session ? (
              <>
                <Link href="/mypage" className="text-sm text-stone-600 hidden sm:inline hover:text-amber-700 transition-colors cursor-pointer">
                    {session.user.email}
                </Link>
                <Button onClick={handleLogout} variant="outline" size="sm" className="rounded-full border-stone-300">
                  로그아웃
                </Button>
              </>
            ) : (
              <Link href="/login">
                <Button variant="outline" size="sm" className="rounded-full border-stone-300">
                    로그인
                </Button>
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section id="analysis" className="container mx-auto px-4 py-12 md:py-16">
        <div className="max-w-4xl mx-auto text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-stone-200 shadow-sm">
            <Sparkles className="w-4 h-4 text-amber-600" />
            <span className="text-sm font-medium text-stone-700">Monk Scale AI 기술 지원</span>
          </div>

          <h1 className="text-4xl md:text-6xl font-bold text-stone-900 text-balance tracking-tight">
            Skintone+ 로 <br/> <span className="text-amber-700">당신의 고유한 톤</span>을 찾아보세요
          </h1>

          <p className="text-lg md:text-xl text-stone-600 text-pretty max-w-2xl mx-auto leading-relaxed">
            당신의 고유한 피부 톤을 찾고, 전문적인 맞춤형 솔루션을 받아보세요.
          </p>

          <div className="mt-12 max-w-4xl mx-auto">
            {/* Analysis Section */}
            <div className="animate-in fade-in duration-500">
              {/* Upload Area */}
              {!uploadedImage ? (
                <label className="block cursor-pointer group">
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                  <div className="border-2 border-dashed border-stone-300 rounded-2xl p-12 bg-white transition-all duration-300 group-hover:border-amber-400 group-hover:bg-amber-50/30 group-hover:shadow-md">
                    <div className="flex flex-col items-center gap-5">
                      <div className="w-20 h-20 rounded-full bg-stone-100 flex items-center justify-center group-hover:bg-white group-hover:scale-110 transition-transform duration-300">
                        <Upload className="w-8 h-8 text-stone-600 group-hover:text-amber-600" />
                      </div>
                      <div className="text-center">
                        <p className="text-xl font-semibold text-stone-900">셀카 업로드</p>
                        <p className="text-sm text-stone-500 mt-2">이미지를 드래그하거나 클릭하여 선택하세요</p>
                      </div>
                    </div>
                  </div>
                </label>
              ) : (
                <div className="space-y-6">
                  <div className="relative rounded-2xl overflow-hidden bg-white border border-stone-200 shadow-xl max-w-2xl mx-auto">
                    <img
                      src={uploadedImage || "/placeholder.svg"}
                      alt="Uploaded selfie"
                      className="w-full h-auto max-h-[500px] object-contain mx-auto"
                    />
                    {isAnalyzing && (
                      <div className="absolute inset-0 bg-black/5 z-10">
                        <div
                          className="absolute left-0 right-0 h-1.5 bg-gradient-to-r from-transparent via-amber-400 to-transparent shadow-[0_0_15px_rgba(251,191,36,0.5)]"
                          style={{ top: `${scanProgress}%`, transition: "top 0.03s linear" }}
                        />
                      </div>
                    )}
                  </div>

                  {!analysisComplete && (
                    <div className="flex gap-4 justify-center">
                      <Button onClick={handleAnalyze} disabled={isAnalyzing} size="lg" className="bg-[#C3A186] hover:bg-[#A98467] text-white font-semibold px-10 h-12 rounded-full">
                        {isAnalyzing ? "분석 중..." : "피부 톤 분석하기"}
                      </Button>
                      <Button variant="outline" size="lg" onClick={() => { setUploadedImage(null); setAnalysisComplete(false); }} className="border-stone-300 h-12 px-6 rounded-full">
                        취소
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      {!analysisComplete && !uploadedImage && (
        <section className="container mx-auto px-4 py-12 md:py-24 border-t border-stone-200/60">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-stone-900 text-center mb-12">사용 방법</h2>
            <div className="grid md:grid-cols-3 gap-12">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-white rounded-2xl shadow-sm border border-stone-100 flex items-center justify-center mx-auto">
                  <span className="text-2xl font-bold text-amber-700">1</span>
                </div>
                <h3 className="font-bold text-stone-900">이미지 업로드</h3>
                <p className="text-sm text-stone-600">조명이 좋은 곳에서 찍은 선명한 셀카를 업로드하세요.</p>
              </div>
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-white rounded-2xl shadow-sm border border-stone-100 flex items-center justify-center mx-auto">
                  <span className="text-2xl font-bold text-amber-700">2</span>
                </div>
                <h3 className="font-bold text-stone-900">AI 정밀 분석</h3>
                <p className="text-sm text-stone-600">고급 픽셀 분석 기술로 당신의 정확한 MST 지수를 찾아냅니다.</p>
              </div>
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-white rounded-2xl shadow-sm border border-stone-100 flex items-center justify-center mx-auto">
                  <span className="text-2xl font-bold text-amber-700">3</span>
                </div>
                <h3 className="font-bold text-stone-900">맞춤형 솔루션</h3>
                <p className="text-sm text-stone-600">당신의 톤에 최적화된 스킨케어와 메이크업 가이드를 확인하세요.</p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Analysis Results Section */}
      {analysisComplete && (
        <>
          <section className="container mx-auto px-4 py-8 animate-in slide-in-from-bottom-10 duration-700">
            <div className="max-w-4xl mx-auto">
              <Card className="bg-white border-stone-200 shadow-2xl overflow-hidden">
                <div className="h-2 w-full bg-gradient-to-r from-[#F6EDE4] via-[#C3A186] to-[#1F1209]" />
                <CardHeader className="text-center pb-8 pt-10">
                  <div className="mx-auto w-fit px-4 py-1.5 rounded-full bg-green-100 text-green-800 text-sm font-semibold mb-4">
                    분석 완료
                  </div>
                  <CardTitle className="text-3xl md:text-4xl text-stone-900 font-bold">당신의 피부 톤 프로필</CardTitle>
                  <CardDescription className="text-stone-600 text-lg mt-2">Monk Skin Tone (MST) 스케일 기준</CardDescription>
                </CardHeader>
                <CardContent className="space-y-10 pb-12">
                  {/* MST Badge and Color Swatch */}
                  <div className="flex flex-col md:flex-row items-center justify-center gap-10 p-8 bg-stone-50/50 rounded-2xl border border-stone-100">
                    <div className="relative group">
                      <div
                        className="w-32 h-32 rounded-full border-8 border-white shadow-xl transition-transform duration-500 group-hover:scale-105"
                        style={{ backgroundColor: detectedTone.color }}
                      />
                      <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-stone-900 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
                        일치
                      </div>
                    </div>
                    <div className="text-center md:text-left space-y-2">
                      <p className="text-sm text-stone-500 font-medium uppercase tracking-wider">감지된 톤</p>
                      <p className="text-4xl font-bold text-stone-900">{detectedTone.level}</p>
                      <p className="text-xl text-stone-600">{detectedTone.name}</p>
                      <div className={`inline-block px-3 py-1 rounded-full text-sm font-semibold mt-2 ${
                        detectedUndertone === 'Warm' ? 'bg-orange-100 text-orange-800' :
                        detectedUndertone === 'Cool' ? 'bg-pink-100 text-pink-800' :
                        'bg-stone-200 text-stone-700'
                      }`}>
                        {getUndertoneLabel(detectedUndertone)}
                      </div>
                    </div>
                  </div>

                  {/* Virtual Makeup Button */}
                  {lipCoords.length > 0 && (
                    <div className="flex justify-center pb-4">
                      <Button
                        onClick={() => setShowMakeup(true)}
                        size="lg"
                        className="bg-rose-600 hover:bg-rose-700 text-white font-semibold px-8 py-6 rounded-full text-lg shadow-lg transition-transform hover:scale-105 flex items-center gap-3"
                      >
                        <Palette className="w-5 h-5" />
                        가상 메이크업 시도하기 (Beta)
                      </Button>
                    </div>
                  )}

                  {/* Scale Position */}
                  <div className="space-y-4 px-4">
                    <p className="text-sm font-medium text-stone-500 text-center uppercase tracking-wide">Monk 스케일에서의 위치</p>
                    <div className="flex gap-1.5 justify-center flex-wrap">
                      {MST_UI_DATA.map((tone, index) => (
                        <div key={tone.level} className="flex flex-col items-center gap-2 group cursor-default">
                          <div
                            className={`w-8 md:w-10 h-14 md:h-16 rounded-lg transition-all duration-300 shadow-sm ${
                              index === detectedMST 
                                ? "ring-4 ring-stone-900 ring-offset-2 scale-110 z-10 shadow-xl" 
                                : "opacity-40 grayscale-[0.3] group-hover:opacity-100 group-hover:scale-105"
                            }`}
                            style={{ backgroundColor: tone.color }}
                          />
                          {index === detectedMST && (
                            <span className="text-[10px] md:text-xs font-bold text-stone-900 bg-stone-100 px-2 py-0.5 rounded-full animate-bounce">
                              당신
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* Tailored Solutions Section */}
          {recommendations && (
          <section className="container mx-auto px-4 py-8 pb-20">
            <div className="max-w-6xl mx-auto space-y-10">
              <div className="text-center space-y-4">
                <h2 className="text-3xl md:text-4xl font-bold text-stone-900 text-balance">
                  <span className="text-[#A98467]">{detectedTone.level}</span>를 위한 AI 토탈 스타일링
                </h2>
                <p className="text-lg text-stone-600 text-pretty max-w-2xl mx-auto">
                  당신의 피부 톤과 언더톤에 완벽하게 조화되는 뷰티 & 스타일링 가이드입니다.
                </p>
              </div>

              {/* 1. Fashion & Color Palette (Full Width) */}
              <Card className="bg-white border-stone-200 shadow-lg overflow-hidden">
                <CardHeader className="bg-stone-50/50 border-b border-stone-100 pb-6">
                  <div className="flex items-center gap-2 mb-2">
                    <ShoppingBag className="w-5 h-5 text-violet-600" />
                    <span className="text-sm font-bold text-violet-600 uppercase tracking-wider">Fashion & Palette</span>
                  </div>
                  <CardTitle className="text-2xl text-stone-900">퍼스널 컬러 팔레트</CardTitle>
                  <CardDescription className="text-stone-600 text-base mt-1">
                    {recommendations.fashion_desc}
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-8">
                  <div className="grid md:grid-cols-2 gap-10">
                    {/* Best Colors */}
                    <div className="space-y-4">
                      <h4 className="flex items-center gap-2 font-bold text-stone-800">
                        <CheckCircle2 className="w-5 h-5 text-green-600" /> 베스트 컬러 (Best)
                      </h4>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        {recommendations.best_colors?.map((color, i) => (
                          <div key={i} className="group flex flex-col gap-2">
                            <div 
                              className="w-full aspect-square rounded-2xl shadow-sm border border-stone-100 relative overflow-hidden group-hover:scale-105 transition-transform duration-300"
                              style={{ backgroundColor: color.hex }}
                            >
                              <div className="absolute inset-0 bg-gradient-to-tr from-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                            <span className="text-xs font-medium text-stone-600 text-center">{color.name}</span>
                          </div>
                        )) || <p className="text-sm text-stone-400 col-span-4">추천 색상 정보를 불러오는 중입니다...</p>}
                      </div>
                    </div>
                    {/* Worst Colors */}
                    <div className="space-y-4">
                      <h4 className="flex items-center gap-2 font-bold text-stone-800">
                        <Ban className="w-5 h-5 text-red-500" /> 피해야 할 컬러 (Worst)
                      </h4>
                      <div className="flex flex-wrap gap-4">
                         {recommendations.worst_colors?.map((color, i) => (
                           <div key={i} className="flex flex-col items-center gap-2">
                             <div className="relative w-14 h-14 rounded-full border border-stone-200 shadow-sm overflow-hidden group hover:scale-105 transition-transform duration-300">
                               <div 
                                 className="absolute inset-0"
                                 style={{ backgroundColor: color.hex || '#D6D3D1' }} 
                               />
                             </div>
                             <span className="text-xs font-medium text-stone-500 text-center">
                               {typeof color === 'string' ? color : color.name}
                             </span>
                           </div>
                         )) || <span className="text-sm text-stone-400">정보 없음</span>}
                      </div>
                      <p className="text-sm text-stone-500 leading-relaxed mt-4">
                        이 색상들은 피부를 칙칙해 보이게 하거나 홍조를 부각시킬 수 있으니, 
                        얼굴 가까이 배치하는 것은 피하는 것이 좋습니다.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 2. Detailed Grid (Skincare, Makeup, Styling) */}
              <div className="grid md:grid-cols-3 gap-8">
                {/* Skincare Routine */}
                <Card className="bg-white border-stone-100 shadow-md hover:shadow-xl transition-all duration-300 group h-full flex flex-col">
                  <CardHeader className="pb-4">
                    <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center mb-4 group-hover:bg-amber-100 transition-colors">
                      <Sun className="w-6 h-6 text-amber-600" />
                    </div>
                    <CardTitle className="text-lg text-stone-900">스킨케어 솔루션</CardTitle>
                    <CardDescription className="text-stone-500 font-medium">{recommendations.skincare_focus}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1">
                    <div className="space-y-3">
                      {recommendations.skincare_products?.map((product, i) => {
                         const itemName = typeof product === 'string' ? product : product.item;
                         const isActive = activeCategory === itemName;

                         return (
                        <div key={i} className={`flex flex-col rounded-xl border overflow-hidden transition-all duration-300 ${isActive ? 'bg-amber-100 border-amber-300 ring-2 ring-amber-200' : 'bg-amber-50/50 border-amber-100'}`}>
                            {/* Header (Clickable) */}
                            <div 
                              onClick={() => handleProductClick(itemName)}
                              className="flex items-start gap-3 p-3 hover:bg-amber-100 transition-colors cursor-pointer group/item"
                            >
                              <div className="mt-1 w-2 h-2 rounded-full bg-amber-400 shrink-0 group-hover/item:scale-125 transition-transform" />
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                    <p className={`text-sm font-bold ${isActive ? 'text-amber-800' : 'text-stone-800'} underline decoration-amber-200/50 underline-offset-2`}>
                                    {itemName}
                                    </p>
                                    <Search className={`w-3 h-3 text-amber-500 transition-opacity ${isActive ? 'opacity-100' : 'opacity-0 group-hover/item:opacity-100'}`} />
                                </div>
                                {typeof product !== 'string' && product.desc && (
                                  <p className="text-xs text-stone-500 mt-0.5 leading-snug">{product.desc}</p>
                                )}
                              </div>
                            </div>
                        </div>
                      );
                    }) || <span className="text-sm text-stone-400">추천 제품 로딩 중...</span>}
                    </div>
                  </CardContent>
                </Card>

                {/* Foundation Match */}
                <Card className="bg-white border-stone-100 shadow-md hover:shadow-xl transition-all duration-300 group h-full flex flex-col">
                  <CardHeader className="pb-4">
                    <div className="w-12 h-12 rounded-xl bg-rose-50 flex items-center justify-center mb-4 group-hover:bg-rose-100 transition-colors">
                      <Palette className="w-6 h-6 text-rose-600" />
                    </div>
                    <CardTitle className="text-lg text-stone-900">베이스 메이크업</CardTitle>
                    <CardDescription className="text-stone-500 font-medium">{recommendations.foundation_shade}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1">
                    <div className="space-y-3">
                      {recommendations.foundation_products?.map((product, i) => {
                         const itemName = typeof product === 'string' ? product : product.item;
                         const isActive = activeCategory === itemName;

                         return (
                        <div key={i} className={`flex flex-col rounded-xl border overflow-hidden transition-all duration-300 ${isActive ? 'bg-rose-100 border-rose-300 ring-2 ring-rose-200' : 'bg-rose-50/50 border-rose-100'}`}>
                            {/* Header (Clickable) */}
                            <div 
                              onClick={() => handleProductClick(itemName)}
                              className="flex items-start gap-3 p-3 hover:bg-rose-100 transition-colors cursor-pointer group/item"
                            >
                              <div className="mt-1 w-2 h-2 rounded-full bg-rose-400 shrink-0 group-hover/item:scale-125 transition-transform" />
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                    <p className={`text-sm font-bold ${isActive ? 'text-rose-800' : 'text-stone-800'} underline decoration-rose-200/50 underline-offset-2`}>
                                    {itemName}
                                    </p>
                                    <Search className={`w-3 h-3 text-rose-500 transition-opacity ${isActive ? 'opacity-100' : 'opacity-0 group-hover/item:opacity-100'}`} />
                                </div>
                                {typeof product !== 'string' && product.desc && (
                                  <p className="text-xs text-stone-500 mt-0.5 leading-snug">{product.desc}</p>
                                )}
                              </div>
                            </div>
                        </div>
                      );
                    }) || <span className="text-sm text-stone-400">추천 제품 로딩 중...</span>}
                    </div>
                  </CardContent>
                </Card>

                {/* Styling (Hair & Jewelry) */}
                <Card className="bg-white border-stone-100 shadow-md hover:shadow-xl transition-all duration-300 group h-full flex flex-col">
                  <CardHeader className="pb-4">
                    <div className="w-12 h-12 rounded-xl bg-violet-50 flex items-center justify-center mb-4 group-hover:bg-violet-100 transition-colors">
                      <Scissors className="w-6 h-6 text-violet-600" />
                    </div>
                    <CardTitle className="text-lg text-stone-900">헤어 & 주얼리</CardTitle>
                    <CardDescription className="text-stone-500">완벽한 스타일링 마무리</CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1 space-y-6">
                    <div>
                      <h5 className="text-sm font-bold text-stone-900 mb-2 flex items-center gap-2">
                         헤어 컬러 추천
                      </h5>
                      <div className="flex flex-wrap gap-2">
                        {recommendations.hair_colors?.map((hair, i) => (
                          <span key={i} className="px-2.5 py-1 rounded bg-stone-100 text-stone-700 text-xs font-medium border border-stone-200">
                            {hair}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h5 className="text-sm font-bold text-stone-900 mb-2 flex items-center gap-2">
                         <Gem className="w-3.5 h-3.5 text-stone-400" /> 베스트 주얼리
                      </h5>
                      <p className="text-sm text-stone-600 pl-1 border-l-2 border-violet-200">
                        {recommendations.jewelry || "정보 없음"}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* 3. Detailed Product Carousel Section */}
              {activeCategory && (
                <div className="animate-in fade-in slide-in-from-top-4 duration-500 mt-8">
                  <div className="flex items-center gap-3 mb-6">
                     <Sparkles className="w-6 h-6 text-amber-600 animate-pulse" />
                     <h3 className="text-2xl font-bold text-stone-900">
                       <span className="text-amber-700 underline decoration-amber-300 decoration-2 underline-offset-4">{activeCategory}</span> 추천 제품 상세
                     </h3>
                  </div>
                  
                  <div className="relative min-h-[600px] flex items-center justify-center py-10 overflow-visible">
                    {/* Background Blur Effect */}
                    <div className="absolute inset-0 bg-gradient-to-b from-stone-50/50 to-white/0 pointer-events-none" />

                    {loadingProducts.has(activeCategory) ? (
                        <Card className="w-full max-w-lg bg-white border-stone-200 shadow-xl p-12 flex flex-col items-center gap-4 z-10">
                            <Loader2 className="w-10 h-10 text-amber-500 animate-spin" />
                            <p className="text-stone-500 text-lg font-medium">AI가 최적의 제품을 찾는 중...</p>
                        </Card>
                    ) : (productDetails[activeCategory] && productDetails[activeCategory].length > 0) ? (
                        <div className="w-full max-w-5xl flex flex-col items-center gap-8 px-4">
                            
                            {/* Slider Area */}
                            <div className="relative w-full h-[450px] flex items-center justify-center perspective-1000">
                                {/* Navigation Buttons (Outside) */}
                                <button 
                                    onClick={() => setCurrentSlide(prev => Math.max(0, prev - 1))}
                                    disabled={currentSlide === 0}
                                    className="absolute left-0 md:-left-4 z-50 p-3 rounded-full bg-white/90 border border-stone-200 shadow-lg hover:bg-white disabled:opacity-20 disabled:cursor-not-allowed transition-all backdrop-blur-sm"
                                >
                                    <ChevronLeft className="w-6 h-6 text-stone-700" />
                                </button>
                                <button 
                                    onClick={() => setCurrentSlide(prev => Math.min(productDetails[activeCategory].length - 1, prev + 1))}
                                    disabled={currentSlide === productDetails[activeCategory].length - 1}
                                    className="absolute right-0 md:-right-4 z-50 p-3 rounded-full bg-white/90 border border-stone-200 shadow-lg hover:bg-white disabled:opacity-20 disabled:cursor-not-allowed transition-all backdrop-blur-sm"
                                >
                                    <ChevronRight className="w-6 h-6 text-stone-700" />
                                </button>

                                {/* Cards Container */}
                                <div className="relative w-full h-full flex items-center justify-center overflow-visible">
                                    {productDetails[activeCategory].map((prod, idx) => {
                                        const diff = idx - currentSlide;
                                        let xOffset = '0%';
                                        let scale = 1;
                                        let opacity = 1;
                                        let zIndex = 10;
                                        let rotateY = '0deg';

                                        if (diff === 0) {
                                            xOffset = '0%';
                                            scale = 1;
                                            opacity = 1;
                                            zIndex = 30;
                                        } else if (diff < 0) {
                                            xOffset = '-55%';
                                            scale = 0.85;
                                            opacity = 0.4;
                                            zIndex = 20;
                                            rotateY = '15deg';
                                        } else {
                                            xOffset = '55%';
                                            scale = 0.85;
                                            opacity = 0.4;
                                            zIndex = 20;
                                            rotateY = '-15deg';
                                        }
                                        
                                        if (Math.abs(diff) > 1) opacity = 0;

                                        return (
                                            <Card 
                                                key={idx}
                                                className="absolute w-full md:w-[680px] h-full bg-white border-stone-200 shadow-[0_25px_60px_rgba(0,0,0,0.12)] transition-all duration-500 ease-out origin-center flex flex-col md:flex-row overflow-hidden"
                                                style={{
                                                    transform: `translateX(${xOffset}) scale(${scale}) perspective(1000px) rotateY(${rotateY})`,
                                                    opacity: opacity,
                                                    zIndex: zIndex,
                                                    pointerEvents: diff === 0 ? 'auto' : 'none',
                                                }}
                                            >
                                                {/* Left Area */}
                                                <div className="w-full md:w-2/5 bg-stone-50 flex flex-col items-center justify-center p-8 border-b md:border-b-0 md:border-r border-stone-100 gap-5">
                                                    <div className="w-32 h-32 bg-white rounded-2xl border border-stone-200 shadow-sm flex items-center justify-center">
                                                        <ShoppingBag className="w-12 h-12 text-stone-300" />
                                                    </div>
                                                    <a 
                                                        href={`https://www.google.com/search?tbm=isch&q=${encodeURIComponent(prod.brand + " " + prod.name)}`} 
                                                        target="_blank" 
                                                        rel="noreferrer"
                                                        className="flex items-center gap-2 text-sm font-bold text-stone-500 hover:text-amber-600 transition-colors px-5 py-2.5 rounded-full bg-white border border-stone-200 hover:border-amber-300 shadow-sm"
                                                    >
                                                        <Search className="w-4 h-4" />
                                                        이미지 보기
                                                    </a>
                                                </div>

                                                {/* Right Area */}
                                                <div className="flex-1 p-8 md:p-10 flex flex-col justify-center space-y-4">
                                                    <div>
                                                        <span className="text-xs font-bold text-amber-700 bg-amber-50 px-3 py-1 rounded-full mb-2 inline-block">
                                                            {prod.brand}
                                                        </span>
                                                        <h4 className="text-2xl md:text-3xl font-bold text-stone-900 leading-tight">
                                                            {prod.name}
                                                        </h4>
                                                    </div>
                                                    <div className="text-xl font-bold text-amber-600">
                                                        {prod.price}
                                                    </div>
                                                    <div className="bg-stone-50 p-4 rounded-xl border border-stone-100 text-stone-600 text-sm leading-relaxed max-h-[120px] overflow-y-auto custom-scrollbar">
                                                        <span className="font-bold text-stone-800 mr-1.5">💡 추천 이유:</span>
                                                        {prod.reason}
                                                    </div>
                                                </div>
                                            </Card>
                                        )
                                    })}
                                </div>
                            </div>

                            {/* Indicators (Flow Layout) */}
                            <div className="flex gap-2 z-50 mt-4">
                                {productDetails[activeCategory].map((_, dotIdx) => (
                                    <button 
                                        key={dotIdx} 
                                        onClick={() => setCurrentSlide(dotIdx)}
                                        className={`h-2.5 rounded-full transition-all duration-300 shadow-sm ${dotIdx === currentSlide ? 'w-10 bg-amber-600' : 'w-2.5 bg-stone-300 hover:bg-stone-400'}`}
                                        aria-label={`Go to slide ${dotIdx + 1}`}
                                    />
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-12 text-stone-500 bg-white w-full max-w-lg rounded-xl shadow-sm border border-stone-100 text-lg">
                            제품 정보를 불러올 수 없습니다.
                        </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </section>
          )}
        </>
      )}

      {/* Footer */}
      <footer className="bg-white border-t border-stone-200 py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-stone-900 rounded flex items-center justify-center">
                <Sparkles className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="text-lg font-bold text-stone-900 tracking-tight">Skintone <span className="text-amber-700">+</span></span>
            </div>
            
            <p className="text-sm text-stone-500">
              © 2026 Skintone Plus. All rights reserved. <span className="opacity-70 ml-1">Powered by Monk Skin Tone Scale.</span>
            </p>

            <div className="flex gap-6">
              <a href="#" className="text-stone-400 hover:text-stone-600 transition-colors text-sm">이용약관</a>
              <a href="#" className="text-stone-400 hover:text-stone-600 transition-colors text-sm">개인정보처리방침</a>
            </div>
          </div>
        </div>
      </footer>
      


      {/* AI Chatbot Overlay */}
      {analysisComplete && (
        <ChatInterface 
          mstLevel={detectedTone.level} 
          undertone={getUndertoneLabel(detectedUndertone)} 
        />
      )}

      {/* Virtual Makeup Modal */}
      {showMakeup && uploadedImage && (
        <VirtualMakeup
          imageSrc={uploadedImage}
          lipCoords={lipCoords}
          cheekCoords={cheekCoords}
          undertone={detectedUndertone}
          onClose={() => setShowMakeup(false)}
        />
      )}
    </main>
  )
}

