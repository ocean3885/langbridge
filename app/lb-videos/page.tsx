import { getAppUserFromServer } from '@/lib/auth/app-user';
import { listVideosSqlite } from '@/lib/sqlite/videos';
import { listVideoProgressForVideos, type SqliteVideoProgress } from '@/lib/sqlite/video-progress';
import { formatDuration } from '@/lib/utils';
import Link from 'next/link';
import Image from 'next/image';
import { Video, Clock, Globe, FolderOpen } from 'lucide-react';

export const dynamic = 'force-dynamic';

type VideoItem = {
  id: string;
  youtube_id: string;
  title: string;
  description: string | null;
  duration: number | null;
  thumbnail_url: string | null;
  created_at: string;
  channel_name: string | null;
  language_name: string | null;
  transcript_count: number;
};

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

export default async function LBVideosPage() {
  const user = await getAppUserFromServer();

  const videos = await listVideosSqlite({ visibility: 'public' });

  const videoList: VideoItem[] = videos.map((v) => ({
    id: v.id,
    youtube_id: v.youtube_id,
    title: v.title,
    description: v.description,
    duration: v.duration,
    thumbnail_url: v.thumbnail_url,
    created_at: v.created_at,
    channel_name: v.channel_name ?? null,
    language_name: v.language_name ?? null,
    transcript_count: v.transcript_count || 0,
  }));

  // 로그인한 사용자의 학습 진행 데이터
  const progressMap = new Map<string, SqliteVideoProgress>();
  if (user) {
    const videoIds = videoList.map((v) => v.id);
    const progressRows = await listVideoProgressForVideos(user.id, videoIds);
    for (const row of progressRows) {
      progressMap.set(row.video_id, row);
    }
  }

  // 언어별로 그룹화
  const groupedByLanguage = videoList.reduce(
    (acc, video) => {
      const key = video.language_name || '언어 미지정';
      if (!acc[key]) acc[key] = [];
      acc[key].push(video);
      return acc;
    },
    {} as Record<string, VideoItem[]>
  );

  const sortedGroups = Object.entries(groupedByLanguage).sort((a, b) => {
    if (a[0] === '언어 미지정') return 1;
    if (b[0] === '언어 미지정') return -1;
    return a[0].localeCompare(b[0], 'ko');
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      {/* 헤더 */}
      <div className="mb-6 sm:mb-8">
        <div className="flex items-center gap-3 mb-3">
          <Globe className="w-8 h-8 text-emerald-600" />
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">LB 학습 영상</h1>
        </div>
        <p className="text-sm sm:text-base text-gray-600">
          공개된 학습 영상 목록입니다. 누구나 자유롭게 학습할 수 있습니다.
        </p>
      </div>

      {/* 비디오 목록 */}
      {videoList.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-12 text-center">
          <Video className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-700 mb-2">
            아직 공개된 학습 영상이 없습니다
          </h3>
          <p className="text-gray-500">공개 영상이 등록되면 이곳에 표시됩니다.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {sortedGroups.map(([languageName, groupVideos]) => (
            <section key={languageName} className="space-y-4">
              {/* 언어 헤더 */}
              <div className="flex items-center gap-3 border-b-2 border-emerald-500 pb-2">
                <FolderOpen className="w-6 h-6 text-emerald-600" />
                <h2 className="text-2xl font-bold text-gray-800">{languageName}</h2>
                <span className="text-sm text-gray-500">({groupVideos.length}개)</span>
              </div>

              {/* 비디오 리스트 */}
              <div className="space-y-3">
                {groupVideos.map((video) => (
                  <Link
                    key={video.id}
                    href={`/my-videos/${video.id}`}
                    className="block bg-white rounded-lg shadow hover:shadow-lg transition-all duration-300 overflow-hidden border border-gray-200 hover:border-emerald-300"
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

                        {video.duration !== null && (
                          <div className="absolute bottom-1 right-1 bg-black/75 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>{formatDuration(video.duration)}</span>
                          </div>
                        )}
                      </div>

                      {/* 비디오 정보 */}
                      <div className="w-full sm:w-auto flex-1 min-w-0 overflow-hidden">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-bold text-gray-900 text-base sm:text-lg truncate hover:text-emerald-600 transition-colors">
                            {video.title}
                          </h3>
                          {(() => {
                            const p = progressMap.get(video.id);
                            if (!p) return null;
                            const pct = p.mastery_pct;
                            const label = pct >= 100 ? '완료' : `${pct}%`;
                            const color =
                              pct >= 100
                                ? 'bg-emerald-100 text-emerald-700'
                                : pct > 0
                                  ? 'bg-blue-100 text-blue-700'
                                  : 'bg-gray-100 text-gray-600';
                            return (
                              <span className={`flex-shrink-0 text-[10px] sm:text-xs font-semibold px-1.5 py-0.5 rounded ${color}`}>
                                {label}
                              </span>
                            );
                          })()}
                        </div>

                        {/* 학습 진행 바 */}
                        {(() => {
                          const p = progressMap.get(video.id);
                          if (!p || p.total_scripts === 0) return null;
                          const pct = p.mastery_pct;
                          const barColor =
                            pct >= 100
                              ? 'bg-emerald-500'
                              : pct > 0
                                ? 'bg-blue-500'
                                : 'bg-gray-300';
                          return (
                            <div className="flex items-center gap-2 mb-1.5">
                              <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all ${barColor}`}
                                  style={{ width: `${Math.min(pct, 100)}%` }}
                                />
                              </div>
                              <span className="text-[10px] text-gray-500 flex-shrink-0 tabular-nums">
                                {p.mastered_scripts}/{p.total_scripts}
                              </span>
                            </div>
                          );
                        })()}

                        {video.description && (
                          <p className="text-sm text-gray-500 line-clamp-3 sm:line-clamp-2 mb-2 break-words">
                            {video.description}
                          </p>
                        )}

                        <div className="mt-1 sm:mt-2 text-xs text-gray-500">
                          <div className="flex flex-wrap gap-x-3 gap-y-1 overflow-hidden">
                            {video.channel_name && (
                              <span className="flex items-center gap-1">
                                📺 {video.channel_name}
                              </span>
                            )}
                            {video.language_name && (
                              <span className="flex items-center gap-1">
                                🌐 {video.language_name}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              📝 {video.transcript_count}개의 스크립트
                            </span>
                            <span className="flex items-center gap-1">
                              {(() => {
                                const p = progressMap.get(video.id);
                                const lastStudied = p?.last_studied_at;
                                if (lastStudied) {
                                  return `📖 ${relativeFromNowKo(lastStudied)} 학습`;
                                }
                                return relativeFromNowKo(video.created_at);
                              })()}
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
