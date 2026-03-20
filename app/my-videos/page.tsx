import { createClient } from '@/lib/supabase/server';
import { getAppUserFromServer } from '@/lib/auth/app-user';
import { listVideosSqlite } from '@/lib/sqlite/videos';
import { listSqliteCategories } from '@/lib/sqlite/categories';
import Link from 'next/link';
import Image from 'next/image';
import { Video, Clock, Plus, FolderOpen } from 'lucide-react';

// 동적 렌더링 강제
export const dynamic = 'force-dynamic';

type VideoItem = {
  id: string;
  youtube_id: string;
  title: string;
  description: string | null;
  duration: number | null;
  thumbnail_url: string | null;
  created_at: string;
  category_id: string | null;
  category_name: string | null;
  language_name: string | null;
  transcript_count: number;
};

// 초를 MM:SS 또는 H:MM:SS 형식으로 변환
function formatDuration(seconds: number | null): string {
  if (seconds === null) return '-';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

// 상대 시간 표시
function relativeFromNowKo(iso: string | null): string {
  if (!iso) return '-';
  const past = new Date(iso);
  if (isNaN(past.getTime())) return '-';
  const now = new Date();
  const diffMs = now.getTime() - past.getTime();
  const dayMs = 24 * 60 * 60 * 1000;
  const diffDays = Math.floor(diffMs / dayMs);
  if (diffDays <= 0) return '오늘';
  if (diffDays < 30) return `${diffDays}일 전`;
  const months = Math.floor(diffDays / 30);
  if (months < 12) return `${months}달 전`;
  const years = Math.floor(months / 12);
  return `${years}년 전`;
}

export default async function MyVideosPage() {
  const supabase = await createClient();
  const user = await getAppUserFromServer(supabase);

  if (!user) {
    return (
      <div className="max-w-xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold mb-4">내 영상 목록</h1>
        <p className="mb-4">로그인이 필요합니다.</p>
        <Link href="/auth/login" className="text-blue-600 hover:underline">
          로그인 페이지로 이동
        </Link>
      </div>
    );
  }

  const videos = await listVideosSqlite({ uploaderId: user.id });

  const categoryRows = await listSqliteCategories('user_categories', user.id);
  const categoryMap: Record<string, { name: string; languageName: string }> = {};
  for (const category of categoryRows) {
    categoryMap[String(category.id)] = {
      name: category.name,
      languageName: '',
    };
  }

  // 데이터 변환 및 트랜스크립트 카운트 조회
  const videoList: VideoItem[] = [];
  
  for (const video of videos) {
    videoList.push({
      id: video.id,
      youtube_id: video.youtube_id,
      title: video.title,
      description: video.description,
      duration: video.duration,
      thumbnail_url: video.thumbnail_url,
      created_at: video.created_at,
      category_id: video.category_id,
      category_name: categoryMap[String(video.category_id || '')]?.name || null,
      language_name: categoryMap[String(video.category_id || '')]?.languageName || null,
      transcript_count: video.transcript_count || 0,
    });
  }

  // 카테고리별로 그룹화
  const groupedByCategory = videoList.reduce((acc, video) => {
    const categoryKey = video.category_name || '카테고리 미지정';
    const categoryId = video.category_id ?? null;
    
    if (!acc[categoryKey]) {
      acc[categoryKey] = { id: categoryId, videos: [] };
    }
    acc[categoryKey].videos.push(video);
    return acc;
  }, {} as Record<string, { id: string | null; videos: VideoItem[] }>);

  const sortedGroups = Object.entries(groupedByCategory).sort((a, b) => {
    if (a[0] === '카테고리 미지정') return 1;
    if (b[0] === '카테고리 미지정') return -1;
    return a[0].localeCompare(b[0], 'ko');
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      {/* 헤더 */}
      <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-3 mb-3">
            <Video className="w-8 h-8 text-blue-600" />
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">내 영상 목록</h1>
          </div>
          <p className="text-sm sm:text-base text-gray-600">
            카테고리별로 정리된 영상 목록입니다.
          </p>
        </div>
        <div className="sm:flex-shrink-0">
          <Link
            href="/upload?tab=video"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            <Plus className="w-5 h-5" />
            영상 생성
          </Link>
        </div>
      </div>

      {/* 비디오 목록 */}
      {videoList.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-12 text-center">
          <Video className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-700 mb-2">
            아직 등록된 영상이 없습니다
          </h3>
          <p className="text-gray-500 mb-4">
            첫 영상을 등록하여 학습을 시작해보세요.
          </p>
          <Link
            href="/upload?tab=video"
            className="inline-flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            영상 생성
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          {sortedGroups.map(([categoryName, categoryData]) => (
            <section key={categoryName} className="space-y-4">
              {/* 카테고리 헤더 */}
              <div className="flex items-center gap-3 border-b-2 border-blue-500 pb-2">
                <FolderOpen className="w-6 h-6 text-blue-600" />
                <h2 className="text-2xl font-bold text-gray-800">{categoryName}</h2>
                <span className="text-sm text-gray-500">({categoryData.videos.length}개)</span>
              </div>

              {/* 비디오 리스트 */}
              <div className="space-y-3">
                {categoryData.videos.map((video) => (
                  <Link
                    key={video.id}
                    href={`/videos/${video.id}`}
                    className="block bg-white rounded-lg shadow hover:shadow-lg transition-all duration-300 overflow-hidden border border-gray-200 hover:border-blue-300"
                  >
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 p-4">
                      {/* 썸네일 */}
                      <div className="relative w-full sm:w-40 h-40 sm:h-24 flex-shrink-0 bg-gray-200 rounded overflow-hidden">
                        {video.thumbnail_url ? (
                          <Image
                            src={video.thumbnail_url}
                            alt={video.title}
                            fill
                            sizes="(max-width: 640px) 100vw, 160px"
                            className="object-cover"
                          />
                        ) : (
                          <div className="flex items-center justify-center w-full h-full">
                            <Video className="w-10 h-10 text-gray-400" />
                          </div>
                        )}
                        
                        {/* 시간 배지 */}
                        {video.duration !== null && (
                          <div className="absolute bottom-1 right-1 bg-black/75 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>{formatDuration(video.duration)}</span>
                          </div>
                        )}
                      </div>

                      {/* 비디오 정보 */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-gray-900 text-base sm:text-lg mb-1 truncate hover:text-blue-600 transition-colors">
                          {video.title}
                        </h3>
                        
                        {video.description && (
                          <p className="text-sm text-gray-500 line-clamp-3 sm:line-clamp-2 mb-2">
                            {video.description}
                          </p>
                        )}

                        {/* 메타 정보: 모바일에서는 설명 하단에 줄바꿈되며 보기 좋게 배치 */}
                        <div className="mt-1 sm:mt-2 text-xs text-gray-500">
                          <div className="flex flex-wrap gap-x-3 gap-y-1">
                            {video.language_name && (
                              <span className="flex items-center gap-1">
                                🌐 {video.language_name}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              📝 {video.transcript_count}개의 스크립트
                            </span>
                            <span className="flex items-center gap-1">
                              {relativeFromNowKo(video.created_at)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
