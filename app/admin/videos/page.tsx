import Link from 'next/link';
import Image from 'next/image';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getAllVideos } from '@/lib/supabase/queries/videos';
import { Plus, Play } from 'lucide-react';
import AdminSidebar from '../AdminSidebar';
import DeleteVideoButton from './DeleteVideoButton';

export default async function AdminVideosPage() {
  const supabase = await createClient();
  
  // 인증 확인
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect('/auth/login?redirectTo=/admin/videos');
  }
  
  // is_premium 확인
  const { data: profile } = await supabase
    .from('lang_profiles')
    .select('is_premium')
    .eq('id', user.id)
    .single();
  
  if (!profile?.is_premium) {
    redirect('/');
  }

  const { data: videos, error } = await getAllVideos();

  if (error) {
    return (
      <>
        <AdminSidebar userEmail={user.email ?? ''} />
        <div className="min-h-screen bg-gray-50 ml-64 p-8">
          <div className="max-w-6xl mx-auto">
            <div className="text-red-600">영상 목록을 불러오는데 실패했습니다: {error}</div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <AdminSidebar userEmail={user.email ?? ''} />
      <div className="min-h-screen bg-gray-50 ml-64 p-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">영상 관리</h1>
              <p className="text-gray-600 mt-2">YouTube 영상 학습 콘텐츠를 관리합니다.</p>
            </div>
            <Link
              href="/admin/videos/register"
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" />
              영상 등록
            </Link>
          </div>

      {videos.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          등록된 영상이 없습니다. 새로운 영상을 등록해보세요.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {videos.map((video) => (
            <div
              key={video.id}
              className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden hover:shadow-lg transition-shadow bg-white"
            >
              {/* 썸네일 */}
              <div className="relative aspect-video bg-gray-900">
                {video.thumbnail_url ? (
                  <Image
                    src={video.thumbnail_url}
                    alt={video.title}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Play className="w-16 h-16 text-gray-600" />
                  </div>
                )}
              </div>

              {/* 정보 */}
              <div className="p-4">
                <h3 className="font-semibold text-lg mb-2 line-clamp-2">{video.title}</h3>
                {video.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                    {video.description}
                  </p>
                )}
                <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                  <span>스크립트: {video.transcript_count || 0}개</span>
                  {video.duration && <span>{Math.floor(video.duration / 60)}분</span>}
                </div>

                {/* 액션 버튼 */}
                <div className="flex gap-2">
                  <Link
                    href={`/videos/${video.id}`}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-center text-sm font-medium"
                  >
                    학습하기
                  </Link>
                  <DeleteVideoButton videoId={video.id} videoTitle={video.title} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
        </div>
      </div>
    </>
  );
}
