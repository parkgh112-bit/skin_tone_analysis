"use client"

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Sparkles } from 'lucide-react'

// Define a type for the profile data
type Profile = {
  nickname: string;
  email: string;
  gender: string;
  birth_date: string;
  ethnicity: string | null;
  skin_type: string | null;
  skin_concerns: string | null;
  is_ai_consent: boolean;
}

export default function MyPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchSessionAndProfile = async () => {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()

      if (sessionError) {
        console.error("Error fetching session:", sessionError.message)
        setLoading(false)
        return
      }

      if (!session) {
        // If no session, redirect to login page
        router.push('/login')
        return
      }

      setUser(session.user)

      // Fetch the user's profile from the 'profiles' table
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', session.user.id)
        .single() // We expect only one profile per user

      if (profileError) {
        console.error("Error fetching profile:", profileError.message)
        alert("프로필 정보를 불러오는 데 실패했습니다.")
      } else {
        setProfile(profileData)
      }
      
      setLoading(false)
    }

    fetchSessionAndProfile()
  }, [router])

  if (loading) {
    return (
        <main className="min-h-screen bg-stone-50 flex items-center justify-center">
            <p>Loading...</p>
        </main>
    )
  }

  if (!profile) {
     return (
        <main className="min-h-screen bg-stone-50 flex items-center justify-center text-center">
            <div>
                <p>프로필 정보를 찾을 수 없습니다.</p>
                <Link href="/">
                    <Button variant="link">홈으로 돌아가기</Button>
                </Link>
            </div>
        </main>
    )
  }

  return (
    <main className="min-h-screen bg-stone-50 p-4 py-12">
        <div className="absolute top-0 left-0 p-6">
            <Link href="/" className="flex items-center gap-2 text-stone-900 hover:text-amber-700 transition-colors">
                <div className="w-8 h-8 bg-amber-700 rounded-lg flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold tracking-tight">Skintone <span className="text-amber-700">+</span></span>
            </Link>
        </div>

        <div className="max-w-2xl mx-auto">
            <Card className="shadow-lg">
                <CardHeader>
                    <CardTitle className="text-3xl">마이페이지</CardTitle>
                    <CardDescription>회원님의 프로필 정보입니다.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2 p-4 border rounded-md bg-stone-50/50">
                        <p className="text-sm font-medium text-stone-500">닉네임</p>
                        <p className="text-lg font-semibold">{profile.nickname}</p>
                    </div>
                     <div className="space-y-2 p-4 border rounded-md bg-stone-50/50">
                        <p className="text-sm font-medium text-stone-500">이메일</p>
                        <p className="text-lg">{profile.email}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2 p-4 border rounded-md bg-stone-50/50">
                            <p className="text-sm font-medium text-stone-500">성별</p>
                            <p className="text-lg">{profile.gender === 'male' ? '남성' : profile.gender === 'female' ? '여성' : '기타'}</p>
                        </div>
                        <div className="space-y-2 p-4 border rounded-md bg-stone-50/50">
                            <p className="text-sm font-medium text-stone-500">생년월일</p>
                            <p className="text-lg">{profile.birth_date}</p>
                        </div>
                    </div>
                     <div className="space-y-2 p-4 border rounded-md bg-stone-50/50">
                        <p className="text-sm font-medium text-stone-500">인종/피부톤</p>
                        <p className="text-lg">{profile.ethnicity || '입력되지 않음'}</p>
                    </div>
                     <div className="space-y-2 p-4 border rounded-md bg-stone-50/50">
                        <p className="text-sm font-medium text-stone-500">피부 타입</p>
                        <p className="text-lg">{profile.skin_type || '입력되지 않음'}</p>
                    </div>
                     <div className="space-y-2 p-4 border rounded-md bg-stone-50/50">
                        <p className="text-sm font-medium text-stone-500">피부 고민</p>
                        <p className="text-lg">{profile.skin_concerns || '입력되지 않음'}</p>
                    </div>
                    <div className="flex items-center pt-4">
                        <Link href="/mypage/edit">
                            <Button variant="outline">프로필 수정</Button>
                        </Link>
                    </div>
                </CardContent>
            </Card>
        </div>
    </main>
  )
}
