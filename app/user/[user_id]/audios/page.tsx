import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';

// 특정 유저의 오디오 목록 페이지
export default async function UserAudiosPage({ params }: { params: Promise<{ user_id: string }> }) {
  const supabase = await createClient();
  const { user_id } = await params;

  // 해당 유저 정보 가져오기
  const { data: targetUser, error: userError } = await supabase
    .from('lang_profiles')
    .select('email')
    .eq('id', user_id)
    .single();

  // profiles 테이블이 없을 경우 auth.users에서 직접 가져오기 (fallback)
  let userEmail = targetUser?.email;
  if (!userEmail) {
    const { data: { users } } = await supabase.auth.admin.listUsers();
    const foundUser = users.find(u => u.id === user_id);
    userEmail = foundUser?.email || '알 수 없는 사용자';
  }

  // 해당 유저의 오디오 콘텐츠 가져오기 (최신 순)
  const { data: audioList, error } = await supabase
    .from('lang_audio_content')
    .select('id,title,created_at,audio_file_path,category:category_id(name)')
    .eq('user_id', user_id)
    .order('id', { ascending: false })
    .limit(50);

  if (error) {
    return (
      <div className="max-w-3xl mx-auto">
        <h1 className="text-4xl font-bold mb-6">사용자 오디오 목록</h1>
        <div className="text-red-600">오디오 목록을 불러오는 중 오류: {error.message}</div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <Link href="/" className="inline-flex items-center gap-2 text-blue-600 hover:underline mb-4">
          <ArrowLeft className="w-4 h-4" />
          <span>홈으로 돌아가기</span>
        </Link>
        <h1 className="text-4xl font-bold mb-2">{userEmail}님의 오디오</h1>
        <p className="text-gray-600">총 {audioList?.length || 0}개의 오디오</p>
      </div>

      {(!audioList || audioList.length === 0) && (
        <p className="text-gray-600">아직 생성된 오디오가 없습니다.</p>
      )}

      <div className="grid gap-6">
        {audioList?.map(item => (
          <Card key={item.id} className="transition hover:shadow-md">
            <CardHeader>
              <CardTitle className="text-xl font-semibold flex justify-between items-center">
                <span>{item.title || '제목 없음'}</span>
                <Link href={`/player/${item.id}`} className="text-sm text-blue-600 hover:underline">재생</Link>
              </CardTitle>
              <CardDescription className="flex items-center gap-4">
                <span>{new Date(item.created_at).toLocaleString('ko-KR')}</span>
                {item.category && Array.isArray(item.category) && item.category.length > 0 && (
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                    {item.category[0].name}
                  </span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500 break-all">파일 경로: {item.audio_file_path}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
