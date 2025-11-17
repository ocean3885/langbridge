import { getAllVideos } from '@/lib/supabase/queries/videos';
import Link from 'next/link';
import { Video, Clock, Globe } from 'lucide-react';
import Image from 'next/image';

// 동적 렌더링 강제
export const dynamic = 'force-dynamic';

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

export default async function VideosPage() {
  const { data: videos, error } = await getAllVideos();

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-600 font-semibold">비디오를 불러오는 중 오류가 발생했습니다.</p>
          <p className="text-sm text-red-500 mt-2">{error}</p>
        </div>
      </div>
    );
  }

  // 언어별로 그룹화
  const videosByLanguage: Record<string, typeof videos> = {};
  videos.forEach((video) => {
    const langKey = video.language_name || '언어 미지정';
    if (!videosByLanguage[langKey]) {
      videosByLanguage[langKey] = [];
    }
    videosByLanguage[langKey].push(video);
  });

  // 언어 목록을 정렬 (언어 미지정은 마지막)
  const sortedLanguages = Object.keys(videosByLanguage).sort((a, b) => {
    if (a === '언어 미지정') return 1;
    if (b === '언어 미지정') return -1;
    return a.localeCompare(b, 'ko');
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      {/* 헤더 */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <Video className="w-8 h-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-900">학습 비디오</h1>
        </div>
        <p className="text-gray-600">
          업로드된 비디오로 언어 학습을 시작하세요. 각 비디오는 스크립트와 번역이 함께 제공됩니다.
        </p>
      </div>

      {/* 비디오 목록 */}
      {videos.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-12 text-center">
          <Video className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-700 mb-2">
            아직 업로드된 비디오가 없습니다
          </h3>
          <p className="text-gray-500">
            곧 학습 비디오가 추가될 예정입니다.
          </p>
        </div>
      ) : (
        <div className="space-y-12">
          {sortedLanguages.map((languageName) => (
            <section key={languageName} className="space-y-4">
              {/* 언어별 헤더 */}
              <div className="flex items-center gap-3 border-b-2 border-gray-200 pb-2">
                <Globe className="w-6 h-6 text-blue-600" />
                <h2 className="text-2xl font-bold text-gray-800">{languageName}</h2>
                <span className="text-sm text-gray-500">
                  ({videosByLanguage[languageName].length}개)
                </span>
              </div>

              {/* 비디오 그리드 */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {videosByLanguage[languageName].map((video) => (
                  <Link
                    key={video.id}
                    href={`/videos/${video.id}`}
                    className="group bg-white rounded-lg shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden"
                  >
                    {/* 썸네일 */}
                    <div className="relative w-full aspect-video bg-gray-200">
                      {video.thumbnail_url ? (
                        <Image
                          src={video.thumbnail_url}
                          alt={video.title}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Video className="w-16 h-16 text-gray-400" />
                        </div>
                      )}
                      
                      {/* 시간 배지 */}
                      {video.duration !== null && (
                        <div className="absolute bottom-2 right-2 bg-black/75 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{formatDuration(video.duration)}</span>
                        </div>
                      )}
                    </div>

                    {/* 비디오 정보 */}
                    <div className="p-4">
                      <h3 className="font-bold text-gray-900 text-lg mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">
                        {video.title}
                      </h3>
                      
                      {video.description && (
                        <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                          {video.description}
                        </p>
                      )}

                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>
                          {video.transcript_count || 0}개의 스크립트
                        </span>
                        <span>
                          {new Date(video.created_at).toLocaleDateString('ko-KR', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </span>
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
