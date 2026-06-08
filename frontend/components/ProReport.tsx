'use client'

import React, { useState } from 'react'
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell
} from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  AlertCircle, CheckCircle2, Info, Sparkles, Activity, ShieldAlert, 
  TrendingUp, Droplets, Loader2, ExternalLink, ShoppingBag, X
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface Product {
  brand: string
  name: string
  price: string
  reason: string
}

interface Color {
  name: string
  hex: string
}

interface ProReportProps {
  data: {
    recommendations: {
      summary: string
      skin_age_analysis: string
      detailed_analysis: Array<{ category: string; status: string; score: number; advice: string }>
      skincare_routine: Array<{ step: string; component: string; product: string; reason: string }>
      advanced_makeup_guide: string
      advanced_styling_guide: string
      lifestyle_tip: string
      best_colors?: Color[]
      worst_colors?: (string | Color)[]
      fashion_desc?: string
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
}

// MST UI Data for Scale
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

export default function ProReport({ data }: ProReportProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [categoryDetails, setCategoryDetails] = useState<Product[]>([])
  const [isLoadingDetails, setIsLoadingDetails] = useState(false)
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({})

  if (!data || !data.recommendations || !data.raw_metrics) {
    return (
      <Card className="p-12 text-center border-dashed border-stone-200">
        <div className="flex flex-col items-center gap-4">
          <AlertCircle className="w-12 h-12 text-stone-300" />
          <p className="text-stone-500 font-medium">분석 데이터를 불러오는 중 오류가 발생했거나 데이터가 불완전합니다.</p>
          <Button variant="outline" onClick={() => window.location.reload()}>다시 시도</Button>
        </div>
      </Card>
    )
  }

  const { recommendations, raw_metrics } = data
  const priorityIssue =
    recommendations?.detailed_analysis?.length
      ? recommendations.detailed_analysis.reduce((prev, curr) => (curr.score > prev.score ? curr : prev))
      : null

  // MST 레벨별 실제 색상 매핑 (일반 분석 스타일)
  const getMSTColorHex = (mst: string) => {
    const val = parseInt(mst.replace('MST-', ''))
    const colors: Record<number, string> = {
      1: '#f6ede4', 2: '#f3e7db', 3: '#f7ead0', 4: '#eadaba', 5: '#d7bd96',
      6: '#a07e56', 7: '#825c43', 8: '#604134', 9: '#3a312a', 10: '#292420'
    }
    return colors[val] || '#f3e7db'
  }

  // KST 진단 배지 색상 (전문성 강조)
  const getKSTStyle = (type: string | undefined) => {
    if (!type) return { bg: 'bg-stone-100', text: 'text-stone-600', border: 'border-stone-200', icon: 'text-stone-400' }
    if (type.includes('Clear')) return { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', icon: 'text-emerald-500' }
    if (type.includes('Pigmented')) return { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', icon: 'text-amber-500' }
    if (type.includes('Redness')) return { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', icon: 'text-rose-500' }
    return { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', icon: 'text-indigo-500' }
  }

  const kstStyle = getKSTStyle(raw_metrics.skin_type);

  // MST 단계별 설명 (일반 분석 스타일)
  const getMSTDescription = (mst: string) => {
    const val = parseInt(mst.replace('MST-', ''))
    const desc: Record<number, string> = {
      1: 'Very Light', 2: 'Light', 3: 'Light Medium', 4: 'Medium', 5: 'Medium Tan',
      6: 'Tan', 7: 'Dark Tan', 8: 'Dark', 9: 'Very Dark', 10: 'Deepest'
    }
    return desc[val] || 'Unknown'
  }

  // 1. 레이더 차트 (종합 밸런스)
  const radarData = [
    { subject: '모공(Pore)', A: raw_metrics.pore },
    { subject: '주름(Wrinkle)', A: raw_metrics.wrinkle },
    { subject: '색소(Pigment)', A: raw_metrics.pigment },
    { subject: '피지(Sebum)', A: raw_metrics.sebum },
    { subject: '트러블(Porphyrin)', A: raw_metrics.porphyrin },
    { subject: '붉은기(Redness)', A: raw_metrics.redness },
  ]

  // 2. 모공 크기별 분포 (S/M/L)
  const poreDistData = [
    { name: 'Small', value: raw_metrics.pore_small || 0, fill: '#94a3b8' },
    { name: 'Medium', value: raw_metrics.pore_medium || 0, fill: '#64748b' },
    { name: 'Large', value: raw_metrics.pore_large || 0, fill: '#334155' },
  ]

  // 3. 노화 누적 위험도 (현재 주름 + 잠재 주름)
  const agingTotalData = [
    {
      name: '노화 위험도',
      current: raw_metrics.wrinkle,
      future: raw_metrics.future_wrinkle,
    },
  ]

  const toggleSection = (key: string) => {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const renderExpandableText = (key: string, text: string, previewLength = 120) => {
    const isExpanded = !!expandedSections[key]
    const isLong = text && text.length > previewLength
    const displayText = isExpanded || !isLong ? text : `${text.slice(0, previewLength)}...`

    return (
      <div className="space-y-2">
        <p className="text-sm leading-relaxed text-stone-600 font-medium">{displayText}</p>
        {isLong && (
          <button
            type="button"
            onClick={() => toggleSection(key)}
            className="text-xs font-bold text-indigo-600 hover:text-indigo-700"
          >
            {isExpanded ? '접기' : '더보기'}
          </button>
        )}
      </div>
    )
  }

  // 상세 제품 정보 가져오기
  const handleStepClick = async (category: string) => {
    setSelectedCategory(category)
    setIsLoadingDetails(true)
    try {
      // Next API 라우트가 없는 현재 구조에서는 Flask 백엔드로 직접 요청
      const response = await fetch("http://localhost:5000/detail-recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          mst: raw_metrics.mst,
          undertone: raw_metrics.undertone
        })
      })

      if (!response.ok) throw new Error("추천 정보를 가져오지 못했습니다.")
      
      const result = await response.json()
      setCategoryDetails(result.products || [])
    } catch (error) {
      console.error(error)
      setCategoryDetails([])
    } finally {
      setIsLoadingDetails(false)
    }
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* 핵심 요약 바 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="border-stone-200 shadow-sm rounded-2xl">
          <CardContent className="p-4">
            <p className="text-[11px] font-bold text-stone-500 uppercase tracking-wide">MST</p>
            <p className="text-xl font-black text-stone-900">{raw_metrics.mst}</p>
          </CardContent>
        </Card>
        <Card className="border-stone-200 shadow-sm rounded-2xl">
          <CardContent className="p-4">
            <p className="text-[11px] font-bold text-stone-500 uppercase tracking-wide">KST</p>
            <p className="text-sm font-black text-stone-900">{raw_metrics.kst_diagnosis || raw_metrics.skin_type || 'Unknown'}</p>
          </CardContent>
        </Card>
        <Card className="border-stone-200 shadow-sm rounded-2xl">
          <CardContent className="p-4">
            <p className="text-[11px] font-bold text-stone-500 uppercase tracking-wide">Undertone</p>
            <p className="text-lg font-black text-stone-900">{raw_metrics.undertone}</p>
          </CardContent>
        </Card>
        <Card className="border-stone-200 shadow-sm rounded-2xl">
          <CardContent className="p-4">
            <p className="text-[11px] font-bold text-stone-500 uppercase tracking-wide">최우선 관리</p>
            <p className="text-sm font-black text-rose-600">{priorityIssue?.category || '기본 관리'}</p>
          </CardContent>
        </Card>
      </div>

      {/* 최상단 MST 강조 섹션 (이미지 제거 후 정갈한 레이아웃) */}
      <div className="bg-white p-8 md:p-12 rounded-[3rem] border border-stone-200 shadow-xl flex flex-col md:flex-row items-center gap-12 relative overflow-hidden">
        {/* 1. MST 컬러칩 */}
        <div className="flex flex-col items-center gap-3 shrink-0">
          <div 
            className="w-36 h-36 rounded-full border-8 border-stone-50 shadow-inner flex items-center justify-center relative group overflow-hidden"
            style={{ backgroundColor: getMSTColorHex(raw_metrics.mst) }}
          >
            <div className="absolute inset-0 bg-black/5 group-hover:bg-black/0 transition-colors" />
          </div>
          <div className="text-center">
            <span className="text-stone-400 text-[10px] font-black tracking-widest uppercase">Monk Scale</span>
            <h2 className="text-3xl font-black text-stone-900">{raw_metrics.mst}</h2>
          </div>
        </div>

        {/* 2. 진단 요약 정보 (구조감 있는 정제된 레이아웃) */}
        <div className="flex-1 space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <div className={`px-4 py-1 rounded-full ${kstStyle.bg} ${kstStyle.border} border flex items-center gap-1.5 shadow-sm`}>
              <Sparkles className={`w-4 h-4 ${kstStyle.icon}`} />
              <span className={`text-sm font-bold ${kstStyle.text}`}>{raw_metrics.skin_type || 'Analyzing...'}</span>
            </div>
            <div className="px-4 py-1 rounded-full bg-stone-800 text-white text-sm font-bold flex items-center gap-1.5 shadow-sm">
              <Activity className="w-4 h-4 text-stone-400" />
              <span>{raw_metrics.undertone.toUpperCase()}</span>
            </div>
          </div>
          
          <div className="space-y-3 border-l-2 border-stone-100 pl-8">
            <p className="text-stone-800 font-semibold text-lg md:text-xl leading-relaxed text-pretty">
              {recommendations.summary}
            </p>
            <div className="flex items-center gap-2 text-stone-400 text-sm font-medium">
              <Info className="w-4 h-4 text-stone-300" />
              <span>피부 상태: {getMSTDescription(raw_metrics.mst)} 단계의 건강한 톤</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 차트 탭 섹션 */}
        <Card className="lg:col-span-2 border-stone-200 shadow-md rounded-2xl overflow-hidden">
          <CardHeader className="border-b border-stone-100 bg-stone-50/30">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl font-black text-stone-900 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-indigo-500" />
                  차트 분석
                </CardTitle>
                <CardDescription className="text-stone-500 font-medium">원하는 항목을 선택해 상세 확인하세요.</CardDescription>
              </div>
              <Badge variant="outline" className="border-stone-300 text-stone-500 font-bold bg-white">PRO ANALYTICS</Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-6 px-4">
            <Tabs defaultValue="overall" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="overall">종합</TabsTrigger>
                <TabsTrigger value="pore">모공</TabsTrigger>
                <TabsTrigger value="aging">노화</TabsTrigger>
              </TabsList>

              <TabsContent value="overall" className="mt-4">
                <div className="h-[350px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                      <PolarGrid stroke="#e2e8f0" />
                      <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 12, fontWeight: 700 }} />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                      <Radar
                        name="Skin Score"
                        dataKey="A"
                        stroke="#6366f1"
                        strokeWidth={3}
                        fill="#6366f1"
                        fillOpacity={0.15}
                      />
                      <Tooltip contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </TabsContent>

              <TabsContent value="pore" className="mt-4">
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={poreDistData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                      <XAxis type="number" hide />
                      <YAxis dataKey="name" type="category" tick={{ fontWeight: 700, fill: '#64748b' }} axisLine={false} tickLine={false} />
                      <Tooltip
                        cursor={{ fill: '#f8fafc' }}
                        contentStyle={{ borderRadius: '0.75rem', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }}
                      />
                      <Bar dataKey="value" radius={[0, 10, 10, 0]} barSize={40}>
                        {poreDistData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </TabsContent>

              <TabsContent value="aging" className="mt-4">
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={agingTotalData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontWeight: 700, fill: '#64748b' }} />
                      <YAxis hide domain={[0, 200]} />
                      <Tooltip contentStyle={{ borderRadius: '0.75rem', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }} />
                      <Legend iconType="circle" wrapperStyle={{ fontWeight: 'bold', paddingTop: '20px' }} />
                      <Bar dataKey="current" name="현재 주름" fill="#fb7185" radius={[10, 10, 0, 0]} barSize={50} />
                      <Bar dataKey="future" name="잠재 주름" fill="#fda4af" radius={[10, 10, 0, 0]} barSize={50} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* 상세 분석 메트릭 카드 */}
        <Card className="border-stone-200 shadow-md rounded-2xl bg-stone-900 text-white overflow-hidden">
          <CardHeader className="border-b border-white/10 bg-white/5">
            <CardTitle className="text-lg font-black flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-400" />
              주요 정밀 수치
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1 p-3 bg-white/5 rounded-2xl border border-white/10">
                <span className="text-[10px] text-stone-400 font-black uppercase tracking-wider">멜라닌 지수</span>
                <p className="text-2xl font-black text-emerald-400">{raw_metrics.melanin}</p>
              </div>
              <div className="space-y-1 p-3 bg-white/5 rounded-2xl border border-white/10">
                <span className="text-[10px] text-stone-400 font-black uppercase tracking-wider">피부 광택도</span>
                <p className="text-2xl font-black text-indigo-400">{raw_metrics.gloss}</p>
              </div>
              <div className="space-y-1 p-3 bg-white/5 rounded-2xl border border-white/10">
                <span className="text-[10px] text-stone-400 font-black uppercase tracking-wider">피지 개수</span>
                <p className="text-2xl font-black text-amber-400">{raw_metrics.sebum_cnt}</p>
              </div>
              <div className="space-y-1 p-3 bg-white/5 rounded-2xl border border-white/10">
                <span className="text-[10px] text-stone-400 font-black uppercase tracking-wider">갈색 색소</span>
                <p className="text-2xl font-black text-orange-400">{raw_metrics.brown}</p>
              </div>
            </div>

            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between text-sm font-bold border-b border-white/10 pb-2">
                <span className="text-stone-400 uppercase tracking-tighter">Skin Age Analysis</span>
                <span className="text-white">Expert View</span>
              </div>
              {renderExpandableText('skin_age_analysis', `"${recommendations.skin_age_analysis}"`, 110)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 시각적 퍼스널 컬러 팔레트 (전문 분석 버전) */}
      {recommendations.best_colors && (
        <Card className="border-stone-200 shadow-xl rounded-[3rem] bg-white overflow-hidden">
          <CardHeader className="bg-stone-50/50 border-b border-stone-100 p-8 md:p-10">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-violet-100 rounded-2xl">
                  <ShoppingBag className="w-6 h-6 text-violet-600" />
                </div>
                <div>
                  <CardTitle className="text-2xl font-black text-stone-900">Personal Color Analysis</CardTitle>
                  <CardDescription className="text-stone-500 font-bold mt-1">당신에게 조화로운 베스트 & 워스트 컬러</CardDescription>
                </div>
              </div>
            </div>
            {recommendations.fashion_desc && (
              <p className="text-stone-600 font-medium leading-relaxed mt-4 max-w-3xl">
                {recommendations.fashion_desc}
              </p>
            )}
          </CardHeader>
          <CardContent className="p-8 md:p-12">
            <div className="grid md:grid-cols-2 gap-16">
              {/* Best Colors */}
              <div className="space-y-6">
                <h4 className="flex items-center gap-3 font-black text-stone-900 text-lg">
                  <div className="w-2 h-6 bg-green-500 rounded-full" />
                  Best Palette
                </h4>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-6">
                  {recommendations.best_colors.map((color, i) => (
                    <div key={i} className="group flex flex-col items-center gap-3">
                      <div 
                        className="w-full aspect-square rounded-3xl shadow-md border border-stone-100 relative overflow-hidden group-hover:scale-110 group-hover:rotate-3 transition-all duration-500"
                        style={{ backgroundColor: color.hex }}
                      >
                        <div className="absolute inset-0 bg-gradient-to-tr from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <span className="text-xs font-black text-stone-600 whitespace-nowrap overflow-hidden text-ellipsis w-full text-center">
                        {color.name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Worst Colors */}
              <div className="space-y-6">
                <h4 className="flex items-center gap-3 font-black text-stone-900 text-lg">
                  <div className="w-2 h-6 bg-rose-500 rounded-full" />
                  Avoid Colors
                </h4>
                <div className="flex flex-wrap gap-5">
                  {recommendations.worst_colors?.map((color, i) => (
                    <div key={i} className="flex flex-col items-center gap-3">
                      <div className="relative w-16 h-16 rounded-full border-2 border-stone-100 shadow-sm overflow-hidden group hover:scale-110 transition-all duration-500">
                        <div 
                          className="absolute inset-0"
                          style={{ backgroundColor: typeof color === 'string' ? '#D6D3D1' : color.hex }} 
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Ban className="w-6 h-6 text-white/80" />
                        </div>
                      </div>
                      <span className="text-xs font-black text-stone-400 whitespace-nowrap overflow-hidden text-ellipsis max-w-[80px] text-center">
                        {typeof color === 'string' ? color : color.name}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="bg-rose-50/50 p-5 rounded-3xl border border-rose-100 mt-6">
                  <p className="text-xs text-rose-700 font-bold leading-relaxed">
                    위 색상들은 피부를 칙칙해 보이게 하거나 잡티를 부각시킬 수 있습니다. 
                    상의나 스카프 등 얼굴 가까이 배치하는 것은 가급적 피해 주세요.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 정밀 가이드 및 제품 처방 섹션 */}
      <div className="space-y-6 pt-4">
        <h3 className="text-2xl font-black text-stone-900 flex items-center gap-3">
          <div className="w-2 h-8 bg-indigo-500 rounded-full" />
          Professional Prescription
        </h3>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 메이크업 & 스타일링 가이드 */}
          <Card className="border-stone-200 shadow-md rounded-2xl overflow-hidden">
            <CardHeader className="bg-stone-50/30 border-b border-stone-100 p-8">
              <CardTitle className="text-xl font-black flex items-center gap-3 text-stone-900">
                <Sparkles className="w-6 h-6 text-amber-500" />
                톤 맞춤형 뷰티 전략
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8 space-y-8">
              <div className="space-y-4">
                <h4 className="font-black text-stone-900 flex items-center gap-2 text-sm uppercase tracking-wider">
                  <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full" />
                  Advanced Makeup Guide
                </h4>
                <div className="bg-stone-50/50 p-5 rounded-2xl border border-stone-100">
                  {renderExpandableText('advanced_makeup_guide', recommendations.advanced_makeup_guide, 130)}
                </div>
              </div>
              <div className="space-y-4">
                <h4 className="font-black text-stone-900 flex items-center gap-2 text-sm uppercase tracking-wider">
                  <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                  Advanced Styling Guide
                </h4>
                <div className="bg-stone-50/50 p-5 rounded-2xl border border-stone-100">
                  {renderExpandableText('advanced_styling_guide', recommendations.advanced_styling_guide, 130)}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 스킨케어 루틴 & 생활 팁 */}
          <div className="space-y-6">
            <Card className="border-stone-200 shadow-md rounded-2xl bg-indigo-50/30 border-indigo-100 overflow-hidden">
              <CardHeader className="p-8 pb-4">
                <CardTitle className="text-xl font-black text-indigo-900 flex items-center gap-3">
                  <CheckCircle2 className="w-6 h-6 text-indigo-600" />
                  Expert Routine Step
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8 pt-0 space-y-4">
                {recommendations.skincare_routine.map((step, idx) => (
                  <div 
                    key={idx} 
                    className="flex items-start gap-4 p-4 bg-white rounded-2xl border border-indigo-100 shadow-sm cursor-pointer hover:shadow-md hover:scale-[1.02] transition-all group"
                    onClick={() => handleStepClick(step.component)}
                  >
                    <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-black shrink-0 shadow-lg group-hover:rotate-6 transition-transform">
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-3 mb-1">
                        <h5 className="font-black text-indigo-950 whitespace-nowrap shrink-0">{step.step}</h5>
                        <div className="flex-1 min-w-0 flex justify-start overflow-hidden">
                          <Badge variant="secondary" className="bg-indigo-100 text-indigo-700 font-bold border-none truncate text-left block min-w-0 max-w-[120px] md:max-w-[180px]">
                            {step.component}
                          </Badge>
                        </div>
                      </div>
                      <p className="text-sm text-indigo-800 font-bold mb-1 truncate">{step.product}</p>
                      <p className="text-[11px] text-indigo-600/70 font-bold line-clamp-1">{step.reason}</p>
                    </div>
                    <div className="self-center">
                      <ShoppingBag className="w-5 h-5 text-indigo-300 group-hover:text-indigo-600 transition-colors" />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="border-stone-200 shadow-md rounded-2xl bg-emerald-50/30 border-emerald-100">
              <CardContent className="p-8 flex items-start gap-5">
                <div className="p-4 bg-emerald-500 rounded-3xl shadow-lg shadow-emerald-200 shrink-0">
                  <Sparkles className="w-8 h-8 text-white" />
                </div>
                <div className="space-y-2">
                  <h4 className="text-lg font-black text-emerald-950 uppercase tracking-tighter">Lifestyle Advice</h4>
                  {renderExpandableText('lifestyle_tip', recommendations.lifestyle_tip, 110)}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* 추천 제품 상세 모달 */}
      {selectedCategory && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-stone-200">
            <div className="p-8 border-b border-stone-100 flex items-center justify-between bg-stone-50">
              <div>
                <span className="text-xs font-black text-stone-400 uppercase tracking-widest mb-1 block">Recommend Products</span>
                <h3 className="text-2xl font-black text-stone-900 flex items-center gap-3">
                  <ShoppingBag className="w-6 h-6 text-indigo-500" />
                  {selectedCategory} 처방 제품
                </h3>
                <div className="flex items-center gap-2 mt-3">
                  <Badge variant="outline" className="text-xs font-bold border-stone-300 bg-white">
                    {raw_metrics.mst}
                  </Badge>
                  <Badge variant="outline" className="text-xs font-bold border-stone-300 bg-white">
                    {raw_metrics.undertone}
                  </Badge>
                  <span className="text-xs text-stone-500">현재 진단 결과를 반영한 추천입니다.</span>
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                className="rounded-full hover:bg-stone-200"
                onClick={() => setSelectedCategory(null)}
              >
                <X className="w-6 h-6" />
              </Button>
            </div>
            
            <CardContent className="p-8 max-h-[60vh] overflow-y-auto space-y-6">
              {isLoadingDetails ? (
                <div className="py-20 flex flex-col items-center justify-center gap-4 text-stone-400">
                  <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
                  <p className="font-bold">분석 데이터에 맞는 최적의 제품을 찾는 중...</p>
                </div>
              ) : categoryDetails.length > 0 ? (
                <div className="grid grid-cols-1 gap-4">
                  {categoryDetails.map((product, idx) => (
                    <div key={idx} className="p-6 rounded-3xl border-2 border-stone-100 bg-stone-50/50 hover:border-indigo-200 transition-colors group">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <span className="text-xs font-black text-indigo-500 uppercase mb-1 block">{product.brand}</span>
                          <h4 className="text-lg font-black text-stone-900 group-hover:text-indigo-700 transition-colors">{product.name}</h4>
                        </div>
                        <div className="text-right">
                          <span className="text-lg font-black text-stone-900">{product.price}</span>
                        </div>
                      </div>
                      <div className="p-4 bg-white rounded-2xl border border-stone-100 shadow-sm">
                        <p className="text-sm text-stone-600 font-bold leading-relaxed">
                          <AlertCircle className="w-4 h-4 inline-block mr-2 text-indigo-400" />
                          {product.reason}
                        </p>
                      </div>
                      <Button className="w-full mt-4 rounded-2xl bg-stone-900 hover:bg-indigo-600 text-white font-black py-6 shadow-lg shadow-stone-200 transition-all">
                        제품 정보 상세 보기
                        <ExternalLink className="w-4 h-4 ml-2" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-20 text-center space-y-4">
                  <div className="w-16 h-16 bg-stone-100 rounded-full flex items-center justify-center mx-auto">
                    <AlertCircle className="w-8 h-8 text-stone-300" />
                  </div>
                  <p className="text-stone-500 font-bold">현재 피부 상태에 적합한 추천 제품 정보가 없습니다.</p>
                </div>
              )}
            </CardContent>
            
            <div className="p-6 bg-stone-50 border-t border-stone-100">
              <Button 
                variant="outline" 
                className="w-full rounded-2xl border-stone-300 font-black py-6"
                onClick={() => setSelectedCategory(null)}
              >
                닫기
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
