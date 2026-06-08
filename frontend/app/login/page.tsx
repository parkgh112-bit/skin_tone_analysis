"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { Sparkles } from "lucide-react"
import { supabase } from "@/lib/supabase/client" // Import Supabase client

import { useRouter } from "next/navigation" // useRouter import

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const router = useRouter() // Initialize useRouter

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault() // Prevent default form submission

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      })

      if (error) {
        throw error
      }

      if (data.user) {
        alert("로그인에 성공했습니다!")
        router.push('/') // Redirect to home page
      } else {
        // This might happen if signInWithPassword succeeds but session data is not immediately available
        alert("로그인 처리 중입니다. 잠시 후 다시 시도해 주세요.")
      }
    } catch (error: any) {
      alert(`로그인 중 오류가 발생했습니다: ${error.message}`)
    }
  }

  return (
    <main className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
      <div className="absolute top-0 left-0 p-6">
        <Link href="/" className="flex items-center gap-2 text-stone-900 hover:text-amber-700 transition-colors">
          <div className="w-8 h-8 bg-amber-700 rounded-lg flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight">Skintone <span className="text-amber-700">+</span></span>
        </Link>
      </div>
      <Card className="w-full max-w-sm mx-auto shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl">로그인</CardTitle>
          <CardDescription>
            이메일과 비밀번호를 입력하여 로그인하세요.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignIn} className="space-y-4">
            <div className="space-y-2 p-4 border rounded-lg bg-stone-50/50">
              <Label htmlFor="email" className="text-sm font-medium text-stone-500">이메일</Label>
              <Input
                id="email"
                type="email"
                placeholder="m@example.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-white text-base"
              />
            </div>
            <div className="space-y-2 p-4 border rounded-lg bg-stone-50/50">
              <Label htmlFor="password" className="text-sm font-medium text-stone-500">비밀번호</Label>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-white text-base"
              />
            </div>
            <Button type="submit" className="w-full bg-[#C3A186] hover:bg-[#A98467] text-white !mt-6 h-12 text-base">
              로그인
            </Button>
          </form>
          <div className="mt-6 text-center text-sm">
            계정이 없으신가요?{" "}
            <Link href="/signup" className="underline text-amber-700 hover:text-amber-800">
              회원가입
            </Link>
          </div>
        </CardContent>
      </Card>
    </main>
  )
}
