"use client"

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

export default function SignupPage() {
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
          <CardTitle className="text-2xl">회원가입</CardTitle>
          <CardDescription>
            새 계정을 만들기 위해 정보를 입력하세요.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">이메일</Label>
              <Input
                id="email"
                type="email"
                placeholder="m@example.com"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">비밀번호</Label>
              <Input id="password" type="password" required />
            </div>
             <div className="grid gap-2">
              <Label htmlFor="confirm-password">비밀번호 확인</Label>
              <Input id="confirm-password" type="password" required />
            </div>
            <Button type="submit" className="w-full bg-[#C3A186] hover:bg-[#A98467] text-white">
              계정 생성
            </Button>
          </div>
          <div className="mt-4 text-center text-sm">
            이미 계정이 있으신가요?{" "}
            <Link href="/login" className="underline text-amber-700 hover:text-amber-800">
              로그인
            </Link>
          </div>
        </CardContent>
      </Card>
    </main>
  )
}
