"use client"

import { Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"

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

export default function ScalePage() {
  return (
    <main className="min-h-screen bg-stone-50 font-sans selection:bg-amber-100">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-stone-200">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-amber-700 rounded-lg flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <a href="/" className="text-xl font-bold text-stone-900 tracking-tight">Skintone <span className="text-amber-700">+</span></a>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-stone-600">
            <a href="/" className="hover:text-amber-700 transition-colors">분석하기</a>
            <a href="/scale" className="text-amber-700 font-bold">MST 스케일</a>
            <a href="#" className="hover:text-amber-700 transition-colors">전문가 가이드</a>
          </div>
          <Button variant="outline" size="sm" className="rounded-full border-stone-300">
            로그인
          </Button>
        </div>
      </nav>

      {/* Content */}
      <section className="container mx-auto px-4 py-12 md:py-16">
        <div className="max-w-4xl mx-auto">
            <div className="text-center space-y-6 mb-16">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-stone-200 shadow-sm mb-4">
                <span className="text-amber-600 font-bold tracking-wider text-xs uppercase">Google & Harvard Research</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-bold text-stone-900">Monk Skin Tone Scale</h1>
              <p className="text-lg text-stone-600 leading-relaxed text-pretty max-w-2xl mx-auto">
                구글과 하버드 대학의 사회학자 Ellis Monk 박사가 개발한 10단계 피부 톤 척도입니다. 
                기존 기술의 편향성을 극복하고, 세상의 모든 피부 색상을 포용하기 위해 탄생했습니다.
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-6 mb-16">
              {MST_UI_DATA.map((tone, i) => (
                <div key={i} className="flex flex-col items-center gap-4 p-6 bg-white rounded-2xl border border-stone-100 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
                  <div 
                    className="w-full aspect-square rounded-full shadow-inner ring-4 ring-stone-50" 
                    style={{ backgroundColor: tone.color }}
                  />
                  <div className="text-center space-y-1">
                    <span className="block text-xs font-bold text-stone-400 tracking-wider">{tone.level}</span>
                    <span className="block text-base font-bold text-stone-800">{tone.name}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid md:grid-cols-2 gap-8">
                <div className="bg-white p-8 rounded-2xl border border-stone-200 shadow-sm">
                    <h3 className="text-xl font-bold text-stone-900 mb-4 flex items-center gap-2">
                        <span className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center text-stone-600">1</span>
                        더 정확한 분석
                    </h3>
                    <p className="text-stone-600 leading-relaxed">
                        기존의 Fitzpatrick 척도(6단계)보다 더 세분화된 10단계 분류를 사용하여, 
                        미묘한 피부 톤의 차이까지 정확하게 잡아냅니다.
                    </p>
                </div>
                <div className="bg-white p-8 rounded-2xl border border-stone-200 shadow-sm">
                    <h3 className="text-xl font-bold text-stone-900 mb-4 flex items-center gap-2">
                        <span className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center text-stone-600">2</span>
                        AI의 공정성
                    </h3>
                    <p className="text-stone-600 leading-relaxed">
                        인종이나 지역에 구애받지 않고 누구나 자신의 피부 톤을 정확히 진단받을 수 있도록 
                        설계된 포용적인 기술입니다.
                    </p>
                </div>
            </div>
            
            <div className="mt-16 text-center">
                <Button size="lg" className="rounded-full px-10 h-12 bg-[#C3A186] hover:bg-[#A98467] text-white font-bold shadow-md transition-all hover:scale-105" asChild>
                    <a href="/">내 피부 톤 분석하러 가기</a>
                </Button>
            </div>
        </div>
      </section>
      
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
    </main>
  )
}