"use client"

import { useEffect, useRef, useState } from "react"
import { Palette, X, RefreshCcw, Eye, Layers } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface VirtualMakeupProps {
  imageSrc: string
  lipCoords: number[][]
  cheekCoords: { right: number[][]; left: number[][] } | null
  undertone: string // "Warm", "Cool", "Neutral"
  onClose: () => void
}

// --- Color Palettes ---
const PALETTES = {
  Warm: {
    lips: [
      { name: "Coral", hex: "#FF7F50" },       // Warm
      { name: "Tomato", hex: "#FF6347" },      // Warm
      { name: "Brick", hex: "#B22222" },       // Warm
      { name: "Peachy", hex: "#FF8F77" },      // Warm
      { name: "Orange Red", hex: "#FF4500" },  // Warm
      { name: "Beige", hex: "#D2B48C" },       // Warm/Neutral
    ],
    blush: [
      { name: "Coral", hex: "#FF7F50" },       // Warm
      { name: "Peach", hex: "#FFDAB9" },       // Warm
      { name: "Apricot", hex: "#FBCEB1" },     // Warm
      { name: "Bronze", hex: "#CD7F32" },      // Warm
      { name: "Terracotta", hex: "#E2725B" },  // Warm
    ]
  },
  Cool: {
    lips: [
      { name: "Hot Pink", hex: "#FF69B4" },    // Cool
      { name: "Berry", hex: "#8B008B" },       // Cool
      { name: "Ruby", hex: "#E0115F" },        // Cool
      { name: "Plum", hex: "#DDA0DD" },        // Cool
      { name: "Magenta", hex: "#FF00FF" },     // Cool
      { name: "Rose", hex: "#E9967A" },        // Cool/Neutral
    ],
    blush: [
      { name: "Baby Pink", hex: "#FFB6C1" },   // Cool
      { name: "Rose", hex: "#DB7093" },        // Cool
      { name: "Lavender", hex: "#E6E6FA" },    // Cool
      { name: "Mauve", hex: "#E0B0FF" },       // Cool
      { name: "Fuchsia", hex: "#FF00FF" },     // Cool
    ]
  },
  Neutral: {
    lips: [
      { name: "Rose", hex: "#E9967A" },
      { name: "Nude", hex: "#D2B48C" },
      { name: "Coral", hex: "#FF7F50" },
      { name: "Red", hex: "#DC143C" },
      { name: "Pink", hex: "#FF69B4" },
      { name: "Berry", hex: "#8B008B" },
    ],
    blush: [
      { name: "Peachy", hex: "#FFDAB9" },
      { name: "Soft Pink", hex: "#FFB6C1" },
      { name: "Coral", hex: "#FF7F50" },
      { name: "Rose", hex: "#DB7093" },
      { name: "Bronze", hex: "#CD7F32" },
    ]
  }
}

export default function VirtualMakeup({ imageSrc, lipCoords, cheekCoords, undertone, onClose }: VirtualMakeupProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  
  // Determine Palette based on undertone
  // undertone string might be "Warm", "Cool", or "Neutral" (case sensitive from backend)
  // Default to Neutral if mismatched
  const currentPalette = PALETTES[undertone as keyof typeof PALETTES] || PALETTES.Neutral

  // States
  const [activeTab, setActiveTab] = useState("lips")
  const [showOriginal, setShowOriginal] = useState(false) 

  // Lips State (Default to first color in palette)
  const [lipColor, setLipColor] = useState<string>(currentPalette.lips[0].hex)
  const [lipOpacity, setLipOpacity] = useState([0.6])

  // Blush State (Default to first color in palette)
  const [blushColor, setBlushColor] = useState<string>(currentPalette.blush[0].hex)
  const [blushOpacity, setBlushOpacity] = useState([0.4])

  useEffect(() => {
    // Update default colors when palette changes (e.g. if undertone prop changes)
    setLipColor(currentPalette.lips[0].hex)
    setBlushColor(currentPalette.blush[0].hex)
  }, [undertone])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !imageSrc) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const img = new Image()
    img.crossOrigin = "anonymous"
    img.src = imageSrc

    img.onload = () => {
      canvas.width = img.width
      canvas.height = img.height

      // 1. Draw Original Image
      ctx.drawImage(img, 0, 0)

    // If comparing, stop here (show original only)
    if (showOriginal) return

    // --- Draw Lips ---
    if (lipCoords && lipCoords.length > 0) {
      drawLips(ctx, img, lipCoords, lipColor, lipOpacity[0])
    }

      // --- Draw Blush ---
      if (cheekCoords && cheekCoords.left && cheekCoords.left.length > 0) {
        console.log("Drawing Blush at:", cheekCoords.left[0]) // Debug Log
        drawBlush(ctx, img, cheekCoords.left, blushColor, blushOpacity[0])
        drawBlush(ctx, img, cheekCoords.right, blushColor, blushOpacity[0])
      }
    }
  }, [imageSrc, lipCoords, cheekCoords, lipColor, lipOpacity, blushColor, blushOpacity, showOriginal])

  // Helper: Draw Lips
  const drawLips = (ctx: CanvasRenderingContext2D, img: HTMLImageElement, coords: number[][], color: string, opacity: number) => {
    // Mask Canvas
    const maskCanvas = document.createElement("canvas")
    maskCanvas.width = img.width
    maskCanvas.height = img.height
    const maskCtx = maskCanvas.getContext("2d")
    if (!maskCtx) return

    maskCtx.beginPath()
    maskCtx.moveTo(coords[0][0] * img.width, coords[0][1] * img.height)
    for (let i = 1; i < coords.length; i++) {
      maskCtx.lineTo(coords[i][0] * img.width, coords[i][1] * img.height)
    }
    maskCtx.closePath()
    maskCtx.fillStyle = "white"
    maskCtx.fill()
    
    // Blur mask
    maskCtx.filter = "blur(5px)"
    maskCtx.drawImage(maskCanvas, 0, 0)
    maskCtx.filter = "none"

    // Color Layer
    const colorCanvas = document.createElement("canvas")
    colorCanvas.width = img.width
    colorCanvas.height = img.height
    const colorCtx = colorCanvas.getContext("2d")
    if (!colorCtx) return

    colorCtx.fillStyle = color
    colorCtx.fillRect(0, 0, img.width, img.height)
    colorCtx.globalCompositeOperation = "destination-in"
    colorCtx.drawImage(maskCanvas, 0, 0)

    // Blend
    ctx.save()
    ctx.globalAlpha = opacity
    ctx.globalCompositeOperation = "multiply"
    ctx.drawImage(colorCanvas, 0, 0)
    // Add subtle highlight
    ctx.globalCompositeOperation = "soft-light"
    ctx.globalAlpha = opacity * 0.4
    ctx.drawImage(colorCanvas, 0, 0)
    ctx.restore()
  }

  // Helper: Draw Blush (Improved: Localized Soft Gradient)
  const drawBlush = (ctx: CanvasRenderingContext2D, img: HTMLImageElement, coords: number[][], color: string, opacity: number) => {
    if (!coords || coords.length === 0) return

    // 1. Calculate Center (Centroid)
    let sumX = 0, sumY = 0
    coords.forEach(p => { sumX += p[0]; sumY += p[1] })
    const centerX = (sumX / coords.length) * img.width
    const centerY = (sumY / coords.length) * img.height

    // 2. Calculate Size based on the polygon width
    const minX = Math.min(...coords.map(p => p[0]))
    const maxX = Math.max(...coords.map(p => p[0]))
    const width = (maxX - minX) * img.width
    
    // Radius: Use 75% of the cheek region width to stay localized but round
    const radius = width * 0.75

    ctx.save()
    
    // Create Radial Gradient (Center -> Transparent)
    const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius)
    gradient.addColorStop(0, color)        // Center color
    gradient.addColorStop(0.4, color)      // Core color
    gradient.addColorStop(1, "rgba(0,0,0,0)") // Fade out

    // Layer 1: Soft Light (Natural tinting without darkening)
    ctx.globalAlpha = opacity * 0.8
    ctx.globalCompositeOperation = "soft-light"
    ctx.filter = "blur(10px)" // Soften edges
    ctx.fillStyle = gradient
    ctx.beginPath()
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2)
    ctx.fill()
    ctx.filter = "none"

    // Layer 2: Source Over (Adds visible color pop)
    // Lower opacity to look like powder
    ctx.globalAlpha = opacity * 0.4 
    ctx.globalCompositeOperation = "source-over"
    ctx.filter = "blur(10px)"
    ctx.beginPath()
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2)
    ctx.fill()
    ctx.filter = "none"

    ctx.restore()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <Card className="w-full max-w-5xl bg-white border-stone-200 shadow-2xl overflow-hidden flex flex-col md:flex-row h-[85vh]">
        
        {/* Canvas Area */}
        <div className="relative flex-1 bg-stone-100 flex items-center justify-center overflow-hidden p-4 group">
          <canvas
            ref={canvasRef}
            className="max-w-full max-h-full object-contain shadow-lg rounded-lg"
          />
          
          {/* Compare Button Overlay */}
          <div className="absolute top-6 right-6 z-10">
            <Button
              onMouseDown={() => setShowOriginal(true)}
              onMouseUp={() => setShowOriginal(false)}
              onMouseLeave={() => setShowOriginal(false)}
              onTouchStart={() => setShowOriginal(true)}
              onTouchEnd={() => setShowOriginal(false)}
              className="bg-white/90 text-stone-900 border border-stone-200 hover:bg-white shadow-sm backdrop-blur-md"
            >
              <Eye className="w-4 h-4 mr-2" />
              <span className="font-semibold">원본 비교 (누르기)</span>
            </Button>
          </div>
          
          {showOriginal && (
            <div className="absolute top-6 left-6 bg-black/70 text-white px-3 py-1 rounded-full text-sm font-bold animate-pulse pointer-events-none">
              Original
            </div>
          )}
        </div>

        {/* Controls Area */}
        <div className="w-full md:w-96 bg-white border-l border-stone-200 flex flex-col h-full">
          {/* Fixed Header */}
          <div className="shrink-0 p-6 border-b border-stone-100 flex items-center justify-between bg-stone-50/50">
            <div>
              <h3 className="text-xl font-bold text-stone-900 flex items-center gap-2">
                <Palette className="w-5 h-5 text-rose-500" />
                가상 메이크업
              </h3>
              <p className="text-xs text-stone-500 mt-1">AI가 분석한 얼굴 영역에 적용됩니다</p>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full hover:bg-stone-200">
              <X className="w-5 h-5 text-stone-500" />
            </Button>
          </div>

          {/* Scrollable Content Area */}
          <Tabs defaultValue="lips" value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
            <div className="shrink-0 px-6 pt-4">
              <TabsList className="grid w-full grid-cols-2 bg-stone-100 p-1 rounded-xl">
                <TabsTrigger value="lips" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm text-sm">립 (Lips)</TabsTrigger>
                <TabsTrigger value="blush" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm text-sm">블러셔 (Blush)</TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-6">
              {/* Lips Control */}
              <TabsContent value="lips" className="space-y-8 mt-0 border-none outline-none">
                <div className="space-y-4">
                  <label className="text-sm font-semibold text-stone-900 flex items-center justify-between">
                    <span>
                      추천 컬러 팔레트 
                      <span className={`ml-2 text-[10px] px-2 py-0.5 rounded-full ${
                        undertone === 'Warm' ? 'bg-orange-100 text-orange-700' :
                        undertone === 'Cool' ? 'bg-pink-100 text-pink-700' :
                        'bg-stone-100 text-stone-600'
                      }`}>
                        {undertone === 'Warm' ? '웜톤 추천' : undertone === 'Cool' ? '쿨톤 추천' : '뉴트럴 추천'}
                      </span>
                    </span>
                    <span className="text-xs font-normal text-stone-500">클릭하여 선택</span>
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {currentPalette.lips.map((color) => (
                      <button
                        key={color.name}
                        onClick={() => setLipColor(color.hex)}
                        className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${
                          lipColor === color.hex 
                            ? "border-rose-500 bg-rose-50 ring-1 ring-rose-500 shadow-sm scale-105" 
                            : "border-stone-100 hover:border-stone-300 hover:bg-stone-50"
                        }`}
                      >
                        <div
                          className="w-8 h-8 rounded-full shadow-inner"
                          style={{ backgroundColor: color.hex }}
                        />
                        <span className="text-xs font-medium text-stone-600">{color.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4 p-4 bg-stone-50 rounded-2xl border border-stone-100">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-semibold text-stone-900">발색 농도</label>
                    <span className="text-xs font-mono bg-white px-2 py-0.5 rounded border border-stone-200">{Math.round(lipOpacity[0] * 100)}%</span>
                  </div>
                  <Slider
                    value={lipOpacity}
                    onValueChange={setLipOpacity}
                    max={1}
                    step={0.01}
                    className="py-2"
                  />
                  <p className="text-xs text-stone-500 leading-relaxed">오른쪽으로 갈수록 진하게 발색됩니다.</p>
                </div>
              </TabsContent>

              {/* Blush Control */}
              <TabsContent value="blush" className="space-y-8 mt-0 border-none outline-none">
                <div className="space-y-4">
                  <label className="text-sm font-semibold text-stone-900 flex items-center justify-between">
                    <span>
                      추천 컬러 팔레트 
                      <span className={`ml-2 text-[10px] px-2 py-0.5 rounded-full ${
                        undertone === 'Warm' ? 'bg-orange-100 text-orange-700' :
                        undertone === 'Cool' ? 'bg-pink-100 text-pink-700' :
                        'bg-stone-100 text-stone-600'
                      }`}>
                        {undertone === 'Warm' ? '웜톤 추천' : undertone === 'Cool' ? '쿨톤 추천' : '뉴트럴 추천'}
                      </span>
                    </span>
                    <span className="text-xs font-normal text-stone-500">클릭하여 선택</span>
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {currentPalette.blush.map((color) => (
                      <button
                        key={color.name}
                        onClick={() => setBlushColor(color.hex)}
                        className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${
                          blushColor === color.hex 
                            ? "border-orange-400 bg-orange-50 ring-1 ring-orange-400 shadow-sm scale-105" 
                            : "border-stone-100 hover:border-stone-300 hover:bg-stone-50"
                        }`}
                      >
                        <div
                          className="w-8 h-8 rounded-full shadow-inner"
                          style={{ backgroundColor: color.hex }}
                        />
                        <span className="text-xs font-medium text-stone-600">{color.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4 p-4 bg-stone-50 rounded-2xl border border-stone-100">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-semibold text-stone-900">투명도</label>
                    <span className="text-xs font-mono bg-white px-2 py-0.5 rounded border border-stone-200">{Math.round(blushOpacity[0] * 100)}%</span>
                  </div>
                  <Slider
                    value={blushOpacity}
                    onValueChange={setBlushOpacity}
                    max={0.8}
                    step={0.01}
                    className="py-2"
                  />
                  <p className="text-xs text-stone-500 leading-relaxed">자연스러운 연출을 위해 30-50%를 권장합니다.</p>
                </div>
              </TabsContent>
            </div>
          </Tabs>

          {/* Fixed Footer */}
          <div className="shrink-0 p-6 border-t border-stone-100 bg-stone-50/50">
             <Button 
                variant="outline"
                className="w-full border-stone-300 bg-white hover:bg-stone-100 transition-colors py-5"
                onClick={() => {
                  setLipOpacity([0.6])
                  setBlushOpacity([0.4])
                  setLipColor(currentPalette.lips[0].hex)
                  setBlushColor(currentPalette.blush[0].hex)
                }}
              >
                <RefreshCcw className="w-4 h-4 mr-2" />
                설정 초기화
              </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}