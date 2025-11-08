import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';

// 프로필 페이지 (향후 사용자 설정 추가 예정)
export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="max-w-xl mx-auto">
        <h1 className="text-3xl font-bold mb-4">프로필</h1>
        <p className="mb-4">로그인이 필요합니다.</p>
        <Link href="/auth/login" className="text-blue-600 hover:underline">로그인 페이지로 이동</Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-4xl font-bold mb-6">내 프로필</h1>
      <Card>
        <CardHeader>
          <CardTitle>계정 정보</CardTitle>
          <CardDescription>현재 로그인된 계정의 정보입니다.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm font-medium text-gray-500">이메일</p>
            <p className="text-lg">{user.email}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">사용자 ID</p>
            <p className="text-sm text-gray-600 break-all">{user.id}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">가입일</p>
            <p className="text-sm text-gray-600">
              {user.created_at ? new Date(user.created_at).toLocaleString('ko-KR') : '알 수 없음'}
            </p>
          </div>
        </CardContent>
      </Card>
      <div className="mt-6">
        <p className="text-gray-500 text-sm">향후 프로필 편집, 비밀번호 변경, 언어 설정 등이 추가될 예정입니다.</p>
      </div>
    </div>
  );
}
