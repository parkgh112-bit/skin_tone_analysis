"use client"

import { useState } from "react"
import { Gem, Loader2, Search, ArrowLeft, Activity, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import ProReport from "@/components/ProReport"
import Link from "next/link"
import ChatInterface from "@/components/ChatInterface"

// Pro Report Interface
interface ProData {
  recommendations: {
    summary: string
    skin_age_analysis: string
    detailed_analysis: Array<{ category: string; status: string; score: number; advice: string }>
    skincare_routine: Array<{ step: string; component: string; product: string; reason: string }>
    advanced_makeup_guide: string
    advanced_styling_guide: string
    lifestyle_tip: string
  }
  raw_metrics: {
    kst_diagnosis?: string
    tone?: string
    skin_type?: string
    mst: string
    undertone: string
    pore: number
    pore_small: number
    pore_medium: number
    pore_large: number
    wrinkle: number
    future_wrinkle: number
    pigment: number
    sebum: number
    sebum_cnt: number
    redness: number
    brown: number
    porphyrin: number
    melanin: number
    gloss: number
  }
}

export default function ProAnalysisPage() {
  const [isProAnalyzing, setIsProAnalyzing] = useState(false)
  const [proReportData, setProReportData] = useState<ProData | null>(null)
  const [userName, setUserName] = useState("")

  const handleProAnalyze = async () => {
    if (!userName.trim()) {
      alert("이름을 입력해 주세요.")
      return
    }

    setIsProAnalyzing(true)

    try {
      const response = await fetch("http://localhost:5000/recommend-pro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: userName,
          // 페이지가 분리되었으므로 MST/언더톤은 Unknown으로 보내고 서버에서 추론하게 함
          mst: "Unknown",
          undertone: "Neutral"
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "전문 데이터 분석에 실패했습니다.")
      }

      const data = await response.json()
      setProReportData(data)
    } catch (error: any) {
      console.error("Pro Analysis Error:", error)
      alert(error.message || "오류가 발생했습니다. 다시 시도해 주세요.")
    } finally {
      setIsProAnalyzing(false)
    }
  }

  return (
    <main className="min-h-screen bg-stone-50 font-sans selection:bg-amber-100 pb-20">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-stone-200">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 bg-amber-700 rounded-lg flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-stone-900 tracking-tight">Skintone <span className="text-amber-700">+</span></span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="sm" className="flex items-center gap-2">
                <ArrowLeft className="w-4 h-4" />
                홈으로
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Header Section */}
          <div className="text-center space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-100 border border-amber-200 shadow-sm text-amber-800 font-semibold text-sm">
              <Gem className="w-4 h-4" />
              Professional Edition
            </div>
            <h1 className="text-4xl font-bold text-stone-900 tracking-tight">전문 장비 데이터 분석</h1>
            <p className="text-stone-600 max-w-2xl mx-auto">
              Mark-Vu 등 전문 피부 측정 장비로 등록된 데이터를 기반으로 <br/>
              가장 정밀한 AI 피부 진단 리포트를 생성합니다.
            </p>
          </div>

          {/* Search Section */}
          {!proReportData ? (
            <Card className="max-w-2xl mx-auto border-stone-200 shadow-xl overflow-hidden">
               <div className="h-2 w-full bg-amber-600" />
              <CardHeader className="text-center">
                <CardTitle>데이터 조회</CardTitle>
                <CardDescription>측정 시 등록했던 이름을 입력해 주세요.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 py-6">
                <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                    <Input 
                      placeholder="이름 입력 (예: DATA33)" 
                      value={userName}
                      onChange={(e) => setUserName(e.target.value)}
                      className="h-12 pl-10 border-stone-300 focus-visible:ring-amber-600"
                    />
                  </div>
                  <Button 
                    onClick={handleProAnalyze}
                    disabled={isProAnalyzing}
                    size="lg"
                    className="bg-amber-700 hover:bg-amber-800 text-white h-12 px-8 shadow-md"
                  >
                    {isProAnalyzing ? <Loader2 className="w-5 h-5 animate-spin" /> : "조회하기"}
                  </Button>
                </div>
                <div className="bg-stone-100 p-4 rounded-lg text-xs text-stone-500 leading-relaxed">
                  <p className="font-bold mb-1 flex items-center gap-1">
                    <Activity className="w-3 h-3" /> 안내사항
                  </p>
                  데이터 조회가 되지 않을 경우, 성함이 정확한지 확인하시거나 시스템 관리자에게 문의하시기 바랍니다. 
                  전문 데이터는 측정 후 약 5~10분 내에 시스템에 동기화됩니다.
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <Button variant="outline" onClick={() => setProReportData(null)} className="gap-2">
                  <Search className="w-4 h-4" /> 다른 이름으로 조회
                </Button>
                <p className="text-sm text-stone-500">분석 대상: <span className="font-bold text-stone-900">{userName}</span></p>
              </div>
              <ProReport data={proReportData} />
              <div className="pt-12 border-t border-stone-200">
                <div className="text-center space-y-2 mb-8">
                  <h3 className="text-2xl font-bold text-stone-900">AI 전문가와 상담하기</h3>
                  <p className="text-stone-500 text-sm">분석 결과를 바탕으로 궁금한 점을 바로 물어보세요.</p>
                </div>
                <ChatInterface 
                  mstLevel={proReportData.raw_metrics.mst} 
                  undertone={proReportData.raw_metrics.undertone} 
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
