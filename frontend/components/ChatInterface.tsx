"use client"

import { useState, useRef, useEffect } from "react"
import { Send, Sparkles, X, MessageCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

interface ChatInterfaceProps {
  mstLevel: string
  undertone: string
}

interface Message {
  role: "user" | "assistant"
  content: string
}

export default function ChatInterface({ mstLevel, undertone }: ChatInterfaceProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [input, setInput] = useState("")
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: `안녕하세요! 고객님의 피부 분석 결과는 ${mstLevel}, ${undertone}입니다. 

어울리는 립스틱 색상이나 파운데이션 호수 등 무엇이든 물어보세요!`,
    },
  ])
  const [isLoading, setIsLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [messages, isOpen])

  const handleSend = async () => {
    if (!input.trim()) return

    const userMsg = input
    setInput("")
    setMessages((prev) => [...prev, { role: "user", content: userMsg }])
    setIsLoading(true)

    try {
      const response = await fetch("http://localhost:5000/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMsg,
          mst: mstLevel,
          undertone: undertone,
        }),
      })

      if (!response.ok) throw new Error("Chat failed")
      const data = await response.json()

      setMessages((prev) => [...prev, { role: "assistant", content: data.reply }])
    } catch (error) {
      console.error(error)
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "죄송합니다. 서버 연결에 문제가 생겼습니다. 잠시 후 다시 시도해 주세요." },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-amber-700 hover:bg-amber-800 text-white shadow-lg z-50 animate-bounce"
      >
        <MessageCircle className="w-8 h-8" />
      </Button>
    )
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 w-[90vw] md:w-[400px]">
      <Card className="border-stone-200 shadow-2xl h-[500px] flex flex-col bg-white overflow-hidden p-0 gap-0">
        <CardHeader className="bg-amber-700 text-white py-4 px-4 flex flex-row items-center justify-between space-y-0">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            <CardTitle className="text-lg">AI 뷰티 상담사</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsOpen(false)}
            className="text-white hover:bg-amber-800 hover:text-white rounded-full h-8 w-8"
          >
            <X className="w-5 h-5" />
          </Button>
        </CardHeader>
        
                <CardContent className="flex-1 p-0 flex flex-col min-h-0">
        
                  {/* Messages Area - replaced ScrollArea with native div for reliable scrolling */}
        
                  <div className="flex-1 overflow-y-auto p-4 bg-stone-50 space-y-4">
        
                    {messages.map((msg, idx) => (
        
                      <div
        
                        key={idx}
        
                        className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
        
                      >
        
                        <div
        
                          className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap ${
        
                            msg.role === "user"
        
                              ? "bg-amber-700 text-white rounded-tr-none"
        
                              : "bg-white border border-stone-200 text-stone-800 rounded-tl-none shadow-sm"
        
                          }`}
        
                        >
        
                          {msg.content}
        
                        </div>
        
                      </div>
        
                    ))}
        
                    {isLoading && (
        
                      <div className="flex justify-start">
        
                        <div className="bg-white border border-stone-200 rounded-2xl rounded-tl-none px-4 py-3 shadow-sm">
        
                          <div className="flex gap-1">
        
                            <div className="w-2 h-2 bg-stone-400 rounded-full animate-bounce" />
        
                            <div className="w-2 h-2 bg-stone-400 rounded-full animate-bounce [animation-delay:-.3s]" />
        
                            <div className="w-2 h-2 bg-stone-400 rounded-full animate-bounce [animation-delay:-.5s]" />
        
                          </div>
        
                        </div>
        
                      </div>
        
                    )}
        
                    <div ref={scrollRef} className="h-1" />
        
                  </div>
        
        
        
                  <div className="p-3 bg-white border-t border-stone-100 flex gap-2">
        
        
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="질문을 입력하세요..."
              className="flex-1 border-stone-200 focus-visible:ring-amber-700"
            />
            <Button 
              onClick={handleSend} 
              disabled={isLoading || !input.trim()}
              size="icon"
              className="bg-amber-700 hover:bg-amber-800 text-white"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
