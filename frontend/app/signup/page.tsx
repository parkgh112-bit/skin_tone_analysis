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
import { supabase } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

export default function SignupPage() {
  const router = useRouter()
  // Basic auth fields
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")

  // Profile fields
  const [nickname, setNickname] = useState("")
  const [gender, setGender] = useState("")
  const [birthDate, setBirthDate] = useState("")
  const [ethnicity, setEthnicity] = useState("")
  const [skinType, setSkinType] = useState("")
  const [skinConcerns, setSkinConcerns] = useState("")
  const [isAiConsent, setIsAiConsent] = useState(false)

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()

    // Frontend validation for required fields
    if (!nickname || !gender || !birthDate) {
      alert("닉네임, 성별, 생년월일은 필수 입력 항목입니다.")
      return
    }

    if (password !== confirmPassword) {
      alert("비밀번호가 일치하지 않습니다.")
      return
    }

    try {
      // 1. Sign up user
      const { data, error } = await supabase.auth.signUp({
        email: email,
        password: password,
      })

      if (error) throw error

      if (data.user) {
        // 2. Insert profile data
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({ 
            user_id: data.user.id,
            email: data.user.email,
            nickname: nickname,
            gender: gender,
            birth_date: birthDate,
            ethnicity: ethnicity || null, // Send null if empty
            skin_type: skinType || null,
            skin_concerns: skinConcerns || null,
            is_ai_consent: isAiConsent,
          });

        if (profileError) {
          console.error("Profile creation error:", profileError.message);
          alert("회원가입은 완료되었으나, 프로필 생성 중 문제가 발생했습니다. 관리자에게 문의해주세요.");
        } else {
          alert("회원가입에 성공했습니다! 이메일을 확인하여 계정을 활성화해주세요.");
          router.push('/login');
        }
      } else {
        alert("회원가입은 되었으나, 추가 확인이 필요합니다. 이메일을 확인해주세요.")
      }
    } catch (error: any) {
      alert(`회원가입 중 오류가 발생했습니다: ${error.message}`)
    }
  }

  return (
    <main className="min-h-screen bg-stone-50 flex items-center justify-center p-4 py-12">
      <div className="absolute top-0 left-0 p-6">
        <Link href="/" className="flex items-center gap-2 text-stone-900 hover:text-amber-700 transition-colors">
          <div className="w-8 h-8 bg-amber-700 rounded-lg flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight">Skintone <span className="text-amber-700">+</span></span>
        </Link>
      </div>
      <Card className="w-full max-w-lg mx-auto shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl">회원가입</CardTitle>
          <CardDescription>
            계정 정보를 생성하고 맞춤형 서비스를 받아보세요.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignUp} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* --- Auth Fields --- */}
            <div className="grid gap-2 md:col-span-2">
              <Label htmlFor="email">이메일</Label>
              <Input id="email" type="email" placeholder="m@example.com" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">비밀번호</Label>
              <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="confirm-password">비밀번호 확인</Label>
              <Input id="confirm-password" type="password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
            </div>
            
            {/* --- Divider --- */}
            <div className="md:col-span-2 mt-4 border-t border-stone-200" />
            <p className="md:col-span-2 text-sm text-stone-600 -mb-2">추가 정보 ( *는 필수 항목 )</p>

            {/* --- Profile Fields --- */}
            <div className="grid gap-2">
              <Label htmlFor="nickname">닉네임 *</Label>
              <Input id="nickname" type="text" required value={nickname} onChange={(e) => setNickname(e.target.value)} />
            </div>
             <div className="grid gap-2">
              <Label htmlFor="gender">성별 *</Label>
              <select id="gender" required value={gender} onChange={(e) => setGender(e.target.value)} className="w-full h-10 border-stone-200 border rounded-md px-3 text-sm">
                <option value="" disabled>성별을 선택하세요</option>
                <option value="male">남성</option>
                <option value="female">여성</option>
                <option value="other">기타</option>
              </select>
            </div>
            <div className="grid gap-2 md:col-span-2">
              <Label htmlFor="birthDate">생년월일 *</Label>
              <Input id="birthDate" type="date" required value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ethnicity">인종/피부톤</Label>
              <Input id="ethnicity" type="text" placeholder="예: 황인, 동아시아" value={ethnicity} onChange={(e) => setEthnicity(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="skinType">피부 타입</Label>
              <Input id="skinType" type="text" placeholder="예: 건성, 지성, 복합성" value={skinType} onChange={(e) => setSkinType(e.target.value)} />
            </div>
            <div className="grid gap-2 md:col-span-2">
              <Label htmlFor="skinConcerns">피부 고민 (쉼표로 구분)</Label>
              <Input id="skinConcerns" type="text" placeholder="예: 여드름, 칙칙함, 주름" value={skinConcerns} onChange={(e) => setSkinConcerns(e.target.value)} />
            </div>

            <div className="flex items-center space-x-2 md:col-span-2 mt-2">
              <input type="checkbox" id="ai-consent" checked={isAiConsent} onChange={(e) => setIsAiConsent(e.target.checked)} className="h-4 w-4" />
              <label htmlFor="ai-consent" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                AI 분석 및 추천 기능 활용에 동의합니다.
              </label>
            </div>
            
            <Button type="submit" className="w-full bg-[#C3A186] hover:bg-[#A98467] text-white md:col-span-2 mt-4">
              계정 생성
            </Button>
          </form>
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
