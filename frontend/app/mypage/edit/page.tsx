"use client"

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Link from 'next/link'
import { Sparkles } from 'lucide-react'

// Profile type to be reused
type Profile = {
  nickname: string;
  gender: string;
  birth_date: string;
  ethnicity: string | null;
  skin_type: string | null;
  skin_concerns: string | null;
  is_ai_consent: boolean;
}

export default function EditProfilePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<Profile | null>(null)

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (error) {
        alert('프로필 정보를 불러오는 데 실패했습니다.')
        console.error(error)
        setLoading(false)
      } else if (data) {
        setProfile(data)
        setLoading(false)
      }
    }

    fetchProfile()
  }, [router])
  
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile) return

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase
      .from('profiles')
      .update({
        nickname: profile.nickname,
        gender: profile.gender,
        birth_date: profile.birth_date,
        ethnicity: profile.ethnicity,
        skin_type: profile.skin_type,
        skin_concerns: profile.skin_concerns,
        is_ai_consent: profile.is_ai_consent,
        updated_at: new Date().toISOString(), // Manually update updated_at timestamp
      })
      .eq('user_id', user.id)

    if (error) {
      alert('프로필 업데이트에 실패했습니다: ' + error.message)
    } else {
      alert('프로필이 성공적으로 업데이트되었습니다.')
      router.push('/mypage')
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    if (!profile) return
    const { id, value } = e.target
    setProfile({ ...profile, [id]: value })
  }
  
  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!profile) return
    const { id, checked } = e.target
    setProfile({ ...profile, [id]: checked })
  }

  if (loading) {
    return <main className="min-h-screen bg-stone-50 flex items-center justify-center"><p>Loading profile...</p></main>
  }

  if (!profile) {
    return <main className="min-h-screen bg-stone-50 flex items-center justify-center"><p>Profile not found.</p></main>
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
      <Card className="w-full max-w-lg mx-auto shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl">프로필 수정</CardTitle>
          <CardDescription>회원님의 정보를 수정할 수 있습니다.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdateProfile} className="space-y-4">
            
            <div className="space-y-2 p-4 border rounded-lg bg-stone-50/50">
              <Label htmlFor="nickname" className="text-sm font-medium text-stone-500">닉네임 *</Label>
              <Input id="nickname" type="text" required value={profile.nickname || ''} onChange={handleInputChange} className="bg-white text-base"/>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2 p-4 border rounded-lg bg-stone-50/50">
                <Label htmlFor="gender" className="text-sm font-medium text-stone-500">성별 *</Label>
                <select id="gender" required value={profile.gender || ''} onChange={handleInputChange} className="w-full h-10 border-stone-200 border rounded-md px-3 bg-white text-base">
                  <option value="" disabled>성별을 선택하세요</option>
                  <option value="male">남성</option>
                  <option value="female">여성</option>
                  <option value="other">기타</option>
                </select>
              </div>
              <div className="space-y-2 p-4 border rounded-lg bg-stone-50/50">
                <Label htmlFor="birth_date" className="text-sm font-medium text-stone-500">생년월일 *</Label>
                <Input id="birth_date" type="date" required value={profile.birth_date || ''} onChange={handleInputChange} className="bg-white text-base"/>
              </div>
            </div>

            <div className="space-y-2 p-4 border rounded-lg bg-stone-50/50">
              <Label htmlFor="ethnicity" className="text-sm font-medium text-stone-500">인종/피부톤</Label>
              <Input id="ethnicity" type="text" placeholder="예: 황인, 동아시아" value={profile.ethnicity || ''} onChange={handleInputChange} className="bg-white text-base"/>
            </div>

            <div className="space-y-2 p-4 border rounded-lg bg-stone-50/50">
              <Label htmlFor="skin_type" className="text-sm font-medium text-stone-500">피부 타입</Label>
              <Input id="skin_type" type="text" placeholder="예: 건성, 지성, 복합성" value={profile.skin_type || ''} onChange={handleInputChange} className="bg-white text-base"/>
            </div>

            <div className="space-y-2 p-4 border rounded-lg bg-stone-50/50">
              <Label htmlFor="skin_concerns" className="text-sm font-medium text-stone-500">피부 고민 (쉼표로 구분)</Label>
              <Input id="skin_concerns" type="text" placeholder="예: 여드름, 칙칙함, 주름" value={profile.skin_concerns || ''} onChange={handleInputChange} className="bg-white text-base"/>
            </div>

            <div className="flex items-center space-x-3 p-4">
              <input type="checkbox" id="is_ai_consent" checked={profile.is_ai_consent} onChange={handleCheckboxChange} className="h-4 w-4 accent-amber-600" />
              <label htmlFor="is_ai_consent" className="text-sm font-medium text-stone-600">
                AI 분석 및 추천 기능 활용에 동의합니다.
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Link href="/mypage">
                <Button type="button" variant="ghost">취소</Button>
              </Link>
              <Button type="submit" className="bg-[#C3A186] hover:bg-[#A98467] text-white">
                프로필 저장
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </main>
  )
}
