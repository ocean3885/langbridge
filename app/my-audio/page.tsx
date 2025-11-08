import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';

// 나의 오디오 리스트 페이지 (서버 컴포넌트)
export default async function MyAudioPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    // 비로그인 상태면 로그인 페이지로 유도
    return (
      <div className="max-w-xl mx-auto">
        <h1 className="text-3xl font-bold mb-4">내 오디오</h1>
        <p className="mb-4">로그인이 필요합니다.</p>
        <Link href="/auth/login" className="text-blue-600 hover:underline">로그인 페이지로 이동</Link>
      </div>
    );
  }

  // 사용자 소유 오디오 콘텐츠 가져오기 (최신 순)
  const { data: audioList, error } = await supabase
    .from('lang_audio_content')
    .select('id,title,created_at,audio_file_path')
    .eq('user_id', user.id)
    .order('id', { ascending: false })
    .limit(50);

  if (error) {
    return <div className="text-red-600">오디오 목록을 불러오는 중 오류: {error.message}</div>;
  }

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-4xl font-bold mb-6">내 오디오</h1>
      {(!audioList || audioList.length === 0) && (
        <p className="text-gray-600">아직 생성된 오디오가 없습니다. <Link href="/upload" className="text-blue-600 hover:underline">지금 만들어보세요.</Link></p>
      )}
      <div className="grid gap-6">
        {audioList?.map(item => (
          <Card key={item.id} className="transition hover:shadow-md">
            <CardHeader>
              <CardTitle className="text-xl font-semibold flex justify-between items-center">
                <span>{item.title || '제목 없음'}</span>
                <Link href={`/player/${item.id}`} className="text-sm text-blue-600 hover:underline">재생</Link>
              </CardTitle>
              <CardDescription>
                {new Date(item.created_at).toLocaleString('ko-KR')}
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
