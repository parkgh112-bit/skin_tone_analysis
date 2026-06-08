"use client"

import { useState, useRef, useCallback } from "react"
import Papa from "papaparse"
import { 
  FileText, 
  Upload, 
  X, 
  User, 
  Calendar, 
  ChevronRight, 
  BarChart3, 
  Clock, 
  Table as TableIcon,
  CheckCircle2,
  AlertCircle,
  Activity
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

// ─── 핵심 컬럼 정의 ───
const KEY_COLUMNS = [
  "Name", "DOB", "Age", "Sex", "Date",
  "FPore_T", "FPore_Small_T", "FPore_Medium_T", "FPore_Large_T",
  "FWrinkle_T", "FFutureWrinkle_T",
  "FPigmentation_T", "FMelanin_T", "FRedness_T", "FBrown_T",
  "FSebum_T", "FPorphyrin_T",
  "FSkinColor_T", "FSubun_T",
] as const

interface SkinRow {
  [key: string]: string | number | null | undefined
  Name?: string
  DOB?: string
  Age?: number
  Sex?: string
  Date?: string
  FPore_T?: number
  FPore_Small_T?: number
  FPore_Medium_T?: number
  FPore_Large_T?: number
  FWrinkle_T?: number
  FFutureWrinkle_T?: number
  FPigmentation_T?: number
  FMelanin_T?: number
  FRedness_T?: number
  FBrown_T?: number
  FSebum_T?: number
  FPorphyrin_T?: number
  FSkinColor_T?: number
  FSubun_T?: number
}

const METRIC_DEFS = [
  { key: "FPore_T", label: "모공 전체", icon: <Activity className="w-3 h-3" /> },
  { key: "FWrinkle_T", label: "주름", icon: <Activity className="w-3 h-3" /> },
  { key: "FPigmentation_T", label: "색소침착", icon: <Activity className="w-3 h-3" /> },
  { key: "FSebum_T", label: "피지", icon: <Activity className="w-3 h-3" /> },
  { key: "FRedness_T", label: "홍조", icon: <Activity className="w-3 h-3" /> },
  { key: "FMelanin_T", label: "멜라닌", icon: <Activity className="w-3 h-3" /> },
  { key: "FFutureWrinkle_T", label: "미래주름", icon: <Activity className="w-3 h-3" /> },
  { key: "FPorphyrin_T", label: "포르피린", icon: <Activity className="w-3 h-3" /> },
] as const

const BAR_COLORS: Record<string, string> = {
  FPore_T: "bg-rose-500",
  FWrinkle_T: "bg-amber-600",
  FPigmentation_T: "bg-emerald-600",
  FSebum_T: "bg-blue-500",
  FRedness_T: "bg-red-500",
  FMelanin_T: "bg-stone-500",
}

interface MarkvuCSVUploaderProps {
  onAnalyze?: (data: SkinRow) => void
}

export default function MarkvuCSVUploader({ onAnalyze }: MarkvuCSVUploaderProps) {
  const [allRows, setAllRows] = useState<SkinRow[]>([])
  const [fileName, setFileName] = useState("")
  const [names, setNames] = useState<string[]>([])
  const [selectedName, setSelectedName] = useState("")
  const [currentRow, setCurrentRow] = useState<SkinRow | null>(null)
  const [historyRows, setHistoryRows] = useState<SkinRow[]>([])
  const [activeHistoryIdx, setActiveHistoryIdx] = useState(0)
  const [displayCols, setDisplayCols] = useState<string[]>([])
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const doSelectPerson = (name: string, data: SkinRow[] = allRows) => {
    setSelectedName(name)
    const personRows = data
      .filter((r) => r.Name === name)
      .sort((a, b) => new Date(String(b.Date || 0)).getTime() - new Date(String(a.Date || 0)).getTime())
    setHistoryRows(personRows)
    setActiveHistoryIdx(0)
    setCurrentRow(personRows[0] || null)
  }

  const parseCSV = useCallback((file: File) => {
    Papa.parse<SkinRow>(file, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      complete: (results) => {
        const data = results.data
        if (!data || data.length === 0) return
        setAllRows(data)
        setFileName(file.name)
        const cols = KEY_COLUMNS.filter((c) => data[0][c] !== undefined)
        setDisplayCols([...cols])
        const uniqueNames = [...new Set(data.map((r) => r.Name).filter(Boolean))] as string[]
        setNames(uniqueNames)
        if (uniqueNames.length > 0) doSelectPerson(uniqueNames[0], data)
      },
    })
  }, [])

  const selectHistory = (idx: number) => {
    setActiveHistoryIdx(idx)
    setCurrentRow(historyRows[idx])
  }

  const reset = () => {
    setAllRows([])
    setFileName("")
    setNames([])
    setSelectedName("")
    setCurrentRow(null)
    setHistoryRows([])
    setActiveHistoryIdx(0)
    setDisplayCols([])
    if (inputRef.current) inputRef.current.value = ""
  }

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) parseCSV(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file && (file.name.endsWith(".csv") || file.type === "text/csv")) parseCSV(file)
  }

  const barMetrics = METRIC_DEFS.slice(0, 6)
  const maxVal = currentRow
    ? Math.max(...barMetrics.map((m) => (currentRow[m.key] as number) || 0), 1)
    : 1

  return (
    <div className="w-full space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Upload Zone */}
      {!fileName ? (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={cn(
            "border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all duration-300",
            dragOver
              ? "border-amber-500 bg-amber-50/50"
              : "border-stone-200 bg-white hover:border-amber-400 hover:bg-stone-50/50 shadow-sm"
          )}
        >
          <input ref={inputRef} type="file" accept=".csv" onChange={handleFile} className="hidden" />
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Upload className="w-8 h-8 text-amber-700" />
          </div>
          <h3 className="text-lg font-bold text-stone-900 mb-2">CSV 파일 업로드</h3>
          <p className="text-sm text-stone-500 leading-relaxed max-w-xs mx-auto">
            Mark-Vu 장비에서 추출한 CSV 파일을 드래그하거나 클릭하여 선택하세요.
          </p>
          <div className="mt-6 flex items-center justify-center gap-2">
            <Badge variant="outline" className="bg-stone-100 text-stone-600 border-stone-200">.csv 전용</Badge>
            <Badge variant="outline" className="bg-stone-100 text-stone-600 border-stone-200">개인정보 로컬 처리</Badge>
          </div>
        </div>
      ) : (
        <Card className="border-stone-200 shadow-md overflow-hidden">
          <div className="bg-stone-900 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-amber-500 rounded flex items-center justify-center">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-bold text-white leading-none mb-1">{fileName}</p>
                <p className="text-[10px] text-stone-400 font-mono uppercase tracking-wider">
                  {allRows.length} RECORDS · {Object.keys(allRows[0] || {}).length} COLUMNS
                </p>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={reset}
              className="text-stone-400 hover:text-white hover:bg-stone-800 h-8 gap-2"
            >
              <X className="w-4 h-4" /> 다시 업로드
            </Button>
          </div>

          <CardContent className="p-6 space-y-8">
            {/* Selection Area */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
              <div className="space-y-3">
                <label className="text-xs font-bold text-stone-500 flex items-center gap-2 uppercase tracking-tight">
                  <User className="w-3 h-3" /> 분석 대상자 선택
                </label>
                <select
                  value={selectedName}
                  onChange={(e) => doSelectPerson(e.target.value)}
                  className="w-full h-11 px-4 border border-stone-200 rounded-lg bg-stone-50 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all font-medium"
                >
                  {names.map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>
              {currentRow && (
                <div className="flex flex-wrap gap-2 pb-1">
                  <div className="px-3 py-1.5 bg-stone-100 border border-stone-200 rounded-md text-[11px] font-bold text-stone-600 flex items-center gap-1.5">
                    <User className="w-3 h-3 opacity-60" /> {currentRow.Age || "?? "}세 · {currentRow.Sex || "성별 미상"}
                  </div>
                  <div className="px-3 py-1.5 bg-stone-100 border border-stone-200 rounded-md text-[11px] font-bold text-stone-600 flex items-center gap-1.5">
                    <Calendar className="w-3 h-3 opacity-60" /> {String(currentRow.Date || "미상")}
                  </div>
                </div>
              )}
            </div>

            {currentRow && (
              <div className="space-y-8 animate-in fade-in duration-700">
                {/* Metrics Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {METRIC_DEFS.map((m) => (
                    <div
                      key={m.key}
                      className="group bg-white border border-stone-200 rounded-xl p-4 hover:border-amber-300 hover:shadow-md transition-all duration-300"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div className="p-1.5 bg-stone-100 group-hover:bg-amber-100 rounded-md text-stone-500 group-hover:text-amber-700 transition-colors">
                          {m.icon}
                        </div>
                        <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">{m.label}</span>
                      </div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-black text-stone-900 tracking-tighter">
                          {currentRow[m.key] != null ? currentRow[m.key] : "—"}
                        </span>
                        <span className="text-[10px] font-mono text-stone-400">PTS</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Main Content Area */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Bar Chart Section */}
                  <div className="lg:col-span-2 space-y-4">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                        <BarChart3 className="w-4 h-4 text-amber-600" /> 주요 지표 정밀 비교
                      </h4>
                    </div>
                    <div className="bg-stone-50 border border-stone-100 rounded-xl p-6 space-y-5">
                      {barMetrics.map((m) => {
                        const val = (currentRow[m.key] as number) || 0
                        const pct = Math.min((val / maxVal) * 100, 100)
                        return (
                          <div key={m.key} className="space-y-1.5">
                            <div className="flex justify-between text-[11px] font-bold">
                              <span className="text-stone-500">{m.label}</span>
                              <span className="text-stone-900">{val}</span>
                            </div>
                            <div className="h-2.5 bg-stone-200 rounded-full overflow-hidden">
                              <div
                                className={cn("h-full rounded-full transition-all duration-1000 ease-out shadow-sm", BAR_COLORS[m.key])}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* History Section */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-amber-600" /> 측정 히스토리
                    </h4>
                    <div className="space-y-2 max-h-[320px] overflow-y-auto pr-2 custom-scrollbar">
                      {historyRows.map((row, i) => (
                        <div
                          key={i}
                          onClick={() => selectHistory(i)}
                          className={cn(
                            "flex items-center justify-between px-4 py-3 rounded-xl cursor-pointer transition-all border",
                            i === activeHistoryIdx
                              ? "bg-amber-50 border-amber-200 shadow-sm"
                              : "bg-white border-stone-200 hover:border-amber-200"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "w-2 h-2 rounded-full",
                              i === activeHistoryIdx ? "bg-amber-600 animate-pulse" : "bg-stone-300"
                            )} />
                            <span className="text-xs font-bold text-stone-700">{String(row.Date || "??")}</span>
                          </div>
                          <ChevronRight className={cn(
                            "w-4 h-4 transition-transform",
                            i === activeHistoryIdx ? "text-amber-600 translate-x-1" : "text-stone-300"
                          )} />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* AI Analysis Trigger */}
                {onAnalyze && (
                  <div className="bg-amber-50 border border-amber-100 rounded-xl p-6 flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm">
                        <Activity className="w-6 h-6 text-amber-600" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-stone-900">전문 AI 리포트 생성 가능</h4>
                        <p className="text-xs text-stone-500">선택된 데이터를 바탕으로 상세 맞춤형 솔루션을 제안합니다.</p>
                      </div>
                    </div>
                    <Button 
                      onClick={() => onAnalyze(currentRow)}
                      className="bg-amber-700 hover:bg-amber-800 text-white font-bold h-11 px-8 rounded-lg shadow-md hover:shadow-lg transition-all"
                    >
                      AI 전문 리포트 조회
                    </Button>
                  </div>
                )}

                {/* Preview Table */}
                <div className="space-y-4 pt-4">
                  <h4 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                    <TableIcon className="w-4 h-4 text-amber-600" /> 데이터 원본 미리보기 (상위 5행)
                  </h4>
                  <div className="border border-stone-200 rounded-xl overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                      <table className="w-full text-[10px] font-medium">
                        <thead>
                          <tr className="bg-stone-50 border-b border-stone-200">
                            {displayCols.map((c) => (
                              <th key={c} className="px-4 py-3 text-left font-bold text-stone-500 uppercase tracking-tighter whitespace-nowrap">
                                {c}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-100">
                          {allRows.slice(0, 5).map((row, i) => (
                            <tr key={i} className="hover:bg-amber-50/30 transition-colors">
                              {displayCols.map((c) => (
                                <td key={c} className="px-4 py-2.5 text-stone-700 whitespace-nowrap">
                                  {row[c] ?? "—"}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Footer Info */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-6 border-t border-stone-200">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-xs text-stone-400">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> 로컬 데이터 파싱
          </div>
          <div className="flex items-center gap-1.5 text-xs text-stone-400">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> 서버 미저장 (보안)
          </div>
        </div>
        <p className="text-[10px] text-stone-400 font-medium">
          지원 파일 형식: <span className="text-stone-600">skin_type_result_EDA.csv (635 Columns)</span>
        </p>
      </div>
    </div>
  )
}
