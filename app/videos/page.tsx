import { createClient } from '@/lib/supabase/server';
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

type AdminVideo = {
  id: string;
  title: string;
  youtube_id: string | null;
  thumbnail_url: string | null;
  duration: number | null;
  created_at: string;
  channel_name: string | null;
  language_name: string | null;
};

// Supabase rows 타입 (any 제거)
type VideoRow = {
  id: string;
  title: string;
  youtube_id: string | null;
  thumbnail_url: string | null;
  duration: number | null;
  created_at: string;
  languages: { name_ko: string } | { name_ko: string }[] | null;
  video_channels: { channel_name: string } | { channel_name: string }[] | null;
};

export default async function VideosPage() {
  const supabase = await createClient();
  const ADMIN_UPLOADER_ID = '07721211-a878-47d0-9501-ca9b282f5db9';
  const { data: rows, error } = await supabase
    .from('videos')
    .select('id, title, youtube_id, thumbnail_url, duration, created_at, language_id, languages(name_ko), video_channels(channel_name)')
    .eq('uploader_id', ADMIN_UPLOADER_ID)
    .order('created_at', { ascending: false })
    .limit(60);

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-600 font-semibold">비디오를 불러오는 중 오류가 발생했습니다.</p>
          <p className="text-sm text-red-500 mt-2">{String(error.message ?? error)}</p>
        </div>
      </div>
    );
  }

  const adminVideos: AdminVideo[] = (rows ?? []).map((v: VideoRow) => {
    const lang = Array.isArray(v.languages) ? v.languages[0] : v.languages;
    const channelRel = Array.isArray(v.video_channels) ? v.video_channels[0] : v.video_channels;
    return {
      id: v.id,
      title: v.title,
      youtube_id: v.youtube_id ?? null,
      thumbnail_url: v.thumbnail_url ?? null,
      duration: v.duration ?? null,
      created_at: v.created_at,
      channel_name: channelRel?.channel_name ?? null,
      language_name: lang?.name_ko ?? null,
    };
  });

  // 언어별 그룹화 (채널은 아직 없음)
  const groupedByLanguage = adminVideos.reduce((acc, video) => {
    const langKey = video.language_name || '언어 미지정';
    (acc[langKey] ||= []).push(video);
    return acc;
  }, {} as Record<string, AdminVideo[]>);

  const sortedGroups = Object.entries(groupedByLanguage)
    .map(([language, vids]) => ({ language, vids }))
    .sort((a, b) => {
      if (a.language === '언어 미지정') return 1;
      if (b.language === '언어 미지정') return -1;
      return a.language.localeCompare(b.language, 'ko');
    });

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      {/* 헤더 */}
      <div className="mb-6 sm:mb-8">
        <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
          <Video className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600" />
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">학습 비디오</h1>
        </div>
        <p className="text-sm sm:text-base text-gray-600">
          업로드된 비디오로 언어 학습을 시작하세요. 각 비디오는 스크립트와 번역이 함께 제공됩니다.
        </p>
      </div>

      {/* 비디오 목록 */}
      {adminVideos.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 sm:p-12 text-center">
          <Video className="w-12 h-12 sm:w-16 sm:h-16 text-gray-400 mx-auto mb-3 sm:mb-4" />
          <h3 className="text-lg sm:text-xl font-semibold text-gray-700 mb-2">
            아직 업로드된 비디오가 없습니다
          </h3>
          <p className="text-sm sm:text-base text-gray-500">
            곧 학습 비디오가 추가될 예정입니다.
          </p>
        </div>
      ) : (
        <div className="space-y-12">
          {sortedGroups.map(({ language, vids }) => (
            <section key={language} className="space-y-6">
              {/* 언어별 헤더 */}
              <div className="flex items-center gap-2 sm:gap-3 border-b-2 border-blue-500 pb-2">
                <Globe className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
                <h2 className="text-xl sm:text-2xl font-bold text-gray-800">{language}</h2>
              </div>
              {/* 채널별 섹션 */}
              {Object.entries(
                vids.reduce((acc, v) => {
                  const key = v.channel_name || '채널 미지정';
                  (acc[key] ||= []).push(v);
                  return acc;
                }, {} as Record<string, AdminVideo[]>)
              ).map(([channelName, channelVideos]) => (
                <div key={channelName} className="space-y-3">
                  <div className="flex items-center gap-2 pl-2 sm:pl-3 border-l-4 border-blue-400">
                    <h3 className="text-lg sm:text-xl font-semibold text-gray-700">{channelName}</h3>
                    <span className="text-xs sm:text-sm text-gray-500">({channelVideos.length}개)</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {channelVideos.map((video) => (
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
                        <div className="p-3 sm:p-4">
                          <h3 className="font-bold text-gray-900 text-base sm:text-lg mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">
                            {video.title}
                          </h3>
                          
                          <div className="flex items-center justify-between text-[11px] sm:text-xs text-gray-500">
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
                </div>
              ))}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
