import { getUserProfileByIdSqlite } from '@/lib/sqlite/user-profiles';
import { getAppUserFromServer } from '@/lib/auth/app-user';
import { listAudioContentByUserSqlite } from '@/lib/sqlite/audio-content';
import { listSqliteCategories } from '@/lib/sqlite/categories';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';

// 특정 유저의 오디오 목록 페이지
export default async function UserAudiosPage({ params }: { params: Promise<{ user_id: string }> }) {
  const { user_id } = await params;

  const currentUser = await getAppUserFromServer();

  const sqliteProfile = await getUserProfileByIdSqlite(user_id);
  const userEmail = sqliteProfile?.email || (currentUser?.id === user_id ? (currentUser.email ?? '알 수 없는 사용자') : '알 수 없는 사용자');

  const audioList = await listAudioContentByUserSqlite(user_id, 50);
  const categories = await listSqliteCategories('lang_categories', user_id);
  const categoryMap = new Map<number, string>(categories.map((category) => [category.id, category.name]));

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <Link href="/" className="inline-flex items-center gap-2 text-blue-600 hover:underline mb-4">
          <ArrowLeft className="w-4 h-4" />
          <span>홈으로 돌아가기</span>
        </Link>
        <h1 className="text-4xl font-bold mb-2">{userEmail}님의 오디오</h1>
        <p className="text-gray-600">총 {audioList.length}개의 오디오</p>
      </div>

      {audioList.length === 0 && (
        <p className="text-gray-600">아직 생성된 오디오가 없습니다.</p>
      )}

      <div className="grid gap-6">
        {audioList.map(item => (
          <Card key={item.id} className="transition hover:shadow-md">
            <CardHeader>
              <CardTitle className="text-xl font-semibold flex justify-between items-center">
                <span>{item.title || '제목 없음'}</span>
                <Link href={`/player/${item.id}`} className="text-sm text-blue-600 hover:underline">재생</Link>
              </CardTitle>
              <CardDescription className="flex items-center gap-4">
                <span>{new Date(item.created_at).toLocaleString('ko-KR')}</span>
                {item.category_id !== null && categoryMap.has(item.category_id) && (
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                    {categoryMap.get(item.category_id)}
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
