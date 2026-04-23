import Link from 'next/link';
import { CalendarDays, Clock3, Target, Video } from 'lucide-react';
import Image from 'next/image';
import { listEduVideos } from '@/lib/supabase/services/edu-videos';
import { getAppUserFromServer } from '@/lib/auth/app-user';
import { listVideoLearningProgressForVideos } from '@/lib/supabase/services/video-learning-progress';
import VideosChannelFilter from './VideosChannelFilter';

// 동적 렌더링 강제
export const dynamic = 'force-dynamic';

type AdminVideo = {
  id: string;
  title: string;
  youtube_url: string | null;
  thumbnail_url: string | null;
  duration_seconds: number | null;
  created_at: string;
  channel_name: string | null;
  language_name: string | null;
};

interface VideosPageProps {
  searchParams?: Promise<{
    channel?: string;
    page?: string;
    sort?: string;
  }>;
}

const PAGE_SIZE = 12;
const UNASSIGNED_CHANNEL = '__unassigned__';
const DEFAULT_SORT = 'latest';
const RECENT_STUDY_SORT = 'recent-study';

type PaginationItem = number | 'ellipsis';

function formatStudyDate(value: string | null): string {
  if (!value) return '학습 전';
  return new Date(value).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatStudyDuration(seconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}시간 ${minutes}분`;
  }

  if (minutes > 0) {
    return `${minutes}분`;
  }

  return `${safeSeconds}초`;
}

function formatAchievement(totalStudySeconds: number, durationSeconds: number | null): string {
  if (totalStudySeconds <= 0) return '0%';
  if (!durationSeconds || durationSeconds <= 0) return '계산 준비중';
  return `${Math.round((totalStudySeconds / durationSeconds) * 100)}%`;
}

function normalizePageNumber(value: string | undefined): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return 1;
  }

  return Math.floor(parsed);
}

function normalizeSortValue(value: string | undefined, isLoggedIn: boolean): string {
  if (isLoggedIn && value === RECENT_STUDY_SORT) {
    return RECENT_STUDY_SORT;
  }

  return DEFAULT_SORT;
}

function buildVideosPageHref(channel: string | undefined, page: number, sort: string): string {
  const params = new URLSearchParams();

  if (channel) {
    params.set('channel', channel);
  }

  if (sort !== DEFAULT_SORT) {
    params.set('sort', sort);
  }

  if (page > 1) {
    params.set('page', String(page));
  }

  const query = params.toString();
  return query ? `/videos?${query}` : '/videos';
}

function getPaginationItems(currentPage: number, totalPages: number): PaginationItem[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages = new Set<number>([1, totalPages, currentPage - 1, currentPage, currentPage + 1]);
  const normalizedPages = Array.from(pages)
    .filter((page) => page >= 1 && page <= totalPages)
    .sort((a, b) => a - b);

  const items: PaginationItem[] = [];

  normalizedPages.forEach((page, index) => {
    if (index > 0 && page - normalizedPages[index - 1] > 1) {
      items.push('ellipsis');
    }

    items.push(page);
  });

  return items;
}

export default async function VideosPage({ searchParams }: VideosPageProps) {
  const user = await getAppUserFromServer();
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const selectedChannel = resolvedSearchParams?.channel;
  const selectedSort = normalizeSortValue(resolvedSearchParams?.sort, Boolean(user));
  const requestedPage = normalizePageNumber(resolvedSearchParams?.page);
  
  // Official videos are in edu_videos table
  const rows = await listEduVideos();

  const adminVideos: AdminVideo[] = rows.map((v) => ({
    id: v.id,
    title: v.title,
    youtube_url: v.youtube_url,
    thumbnail_url: v.thumbnail_url ?? null,
    duration_seconds: v.duration_seconds ?? null,
    created_at: v.created_at,
    channel_name: v.channel_name ?? null,
    language_name: v.language_name ?? null,
  })).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const availableChannels = Array.from(
    new Set(
      adminVideos
        .map((video) => video.channel_name?.trim() || '')
        .filter(Boolean)
    )
  ).sort((a, b) => a.localeCompare(b, 'ko'));
  const hasUnassignedChannelVideos = adminVideos.some((video) => !(video.channel_name && video.channel_name.trim()));

  const filteredVideos = adminVideos.filter((video) => {
    if (!selectedChannel) {
      return true;
    }

    if (selectedChannel === UNASSIGNED_CHANNEL) {
      return !(video.channel_name && video.channel_name.trim());
    }

    return (video.channel_name ?? '') === selectedChannel;
  });

  const sortingProgressMap = user && selectedSort === RECENT_STUDY_SORT
    ? new Map(
        (await listVideoLearningProgressForVideos(user.id, filteredVideos.map((video) => video.id)))
          .map((row) => [row.video_id, row])
      )
    : new Map();

  const sortedVideos = selectedSort === RECENT_STUDY_SORT
    ? [...filteredVideos].sort((a, b) => {
        const aProgress = sortingProgressMap.get(a.id);
        const bProgress = sortingProgressMap.get(b.id);
        const aLastStudied = aProgress?.last_studied_at ? new Date(aProgress.last_studied_at).getTime() : -1;
        const bLastStudied = bProgress?.last_studied_at ? new Date(bProgress.last_studied_at).getTime() : -1;

        if (aLastStudied !== bLastStudied) {
          return bLastStudied - aLastStudied;
        }

        if ((aProgress?.total_study_seconds ?? 0) !== (bProgress?.total_study_seconds ?? 0)) {
          return (bProgress?.total_study_seconds ?? 0) - (aProgress?.total_study_seconds ?? 0);
        }

        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      })
    : filteredVideos;

  const totalPages = Math.max(1, Math.ceil(sortedVideos.length / PAGE_SIZE));
  const currentPage = Math.min(requestedPage, totalPages);
  const paginatedVideos = sortedVideos.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const paginationItems = getPaginationItems(currentPage, totalPages);

  const progressRows = user
    ? selectedSort === RECENT_STUDY_SORT
      ? paginatedVideos
          .map((video) => sortingProgressMap.get(video.id))
          .filter((row): row is NonNullable<typeof row> => Boolean(row))
      : await listVideoLearningProgressForVideos(user.id, paginatedVideos.map((video) => video.id))
    : [];
  const progressMap = new Map(progressRows.map((row) => [row.video_id, row]));

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      {/* 헤더 */}
      <div className="mb-6 sm:mb-8">
        <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
          <Video className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600" />
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">어학 강의 영상</h1>
        </div>
        <p className="text-sm sm:text-base text-gray-600">
          최근 업로드된 교육용 비디오를 둘러보고, 원하는 채널만 골라서 학습하세요.
        </p>
      </div>

      <div className="mb-8 space-y-3">
        <VideosChannelFilter
          availableChannels={availableChannels}
          selectedChannel={selectedChannel}
          selectedSort={selectedSort}
          showRecentStudySort={Boolean(user)}
          showUnassignedChannel={hasUnassignedChannelVideos}
          unassignedChannelValue={UNASSIGNED_CHANNEL}
        />
        <p className="text-sm text-gray-500">
          총 {sortedVideos.length}개의 영상
        </p>
      </div>

      {/* 비디오 목록 */}
      {sortedVideos.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 sm:p-12 text-center">
          <Video className="w-12 h-12 sm:w-16 sm:h-16 text-gray-400 mx-auto mb-3 sm:mb-4" />
          <h3 className="text-lg sm:text-xl font-semibold text-gray-700 mb-2">
            조건에 맞는 비디오가 없습니다
          </h3>
          <p className="text-sm sm:text-base text-gray-500">
            다른 채널 필터를 선택해보세요.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {paginatedVideos.map((video) => {
              const progress = progressMap.get(video.id);
              const totalStudySeconds = progress?.total_study_seconds ?? 0;
              const lastStudiedAt = progress?.last_studied_at ?? null;

              return (
                <Link
                  key={video.id}
                  href={`/videos/${video.id}`}
                  className="group overflow-hidden rounded-lg bg-white shadow-md transition-all duration-300 hover:shadow-xl"
                >
                  <div className="relative w-full aspect-video bg-gray-200">
                    {video.thumbnail_url ? (
                      <Image
                        src={video.thumbnail_url}
                        alt={video.title}
                        fill
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Video className="w-16 h-16 text-gray-400" />
                      </div>
                    )}
                  </div>

                  <div className="p-4">
                    <div className="mb-3 flex flex-wrap gap-2 text-xs font-medium">
                      <span className="rounded-full bg-blue-50 px-2.5 py-1 text-blue-700">
                        {video.channel_name?.trim() || '채널 미지정'}
                      </span>
                      <span className="rounded-full bg-gray-100 px-2.5 py-1 text-gray-700">
                        {video.language_name?.trim() || '언어 미지정'}
                      </span>
                    </div>

                    <h3 className="line-clamp-2 text-base font-bold text-gray-900 transition-colors group-hover:text-blue-600 sm:text-lg">
                      {video.title}
                    </h3>

                    {user && (
                      <div className="mt-4 grid gap-2 rounded-lg bg-gray-50 px-3 py-3 text-xs text-gray-600 sm:text-sm">
                        <div className="flex items-center justify-between gap-3">
                           <span className="flex items-center gap-1">
                            <CalendarDays className="h-3.5 w-3.5 text-gray-400" />
                            최근학습일
                          </span>
                          <span className="font-medium text-gray-800">{formatStudyDate(lastStudiedAt)}</span>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <span className="flex items-center gap-1">
                            <Clock3 className="h-3.5 w-3.5 text-gray-400" />
                            학습시간
                          </span>
                          <span className="font-medium text-gray-800">{formatStudyDuration(totalStudySeconds)}</span>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <span className="flex items-center gap-1">
                            <Target className="h-3.5 w-3.5 text-gray-400" />
                            학습성취도
                          </span>
                          <span className="font-medium text-blue-700">
                            {formatAchievement(totalStudySeconds, video.duration_seconds)}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className="mt-10 flex flex-wrap items-center justify-center gap-2">
              <Link
                href={buildVideosPageHref(selectedChannel, 1, selectedSort)}
                aria-disabled={currentPage === 1}
                className={`rounded-lg border px-4 py-2 text-sm font-medium ${
                  currentPage === 1
                    ? 'pointer-events-none border-gray-200 bg-gray-100 text-gray-400'
                    : 'border-gray-300 bg-white text-gray-700 hover:border-blue-300 hover:text-blue-700'
                }`}
              >
                처음
              </Link>

              <Link
                href={buildVideosPageHref(selectedChannel, Math.max(1, currentPage - 1), selectedSort)}
                aria-disabled={currentPage === 1}
                className={`rounded-lg border px-4 py-2 text-sm font-medium ${
                  currentPage === 1
                    ? 'pointer-events-none border-gray-200 bg-gray-100 text-gray-400'
                    : 'border-gray-300 bg-white text-gray-700 hover:border-blue-300 hover:text-blue-700'
                }`}
              >
                이전
              </Link>

              {paginationItems.map((item, index) => {
                if (item === 'ellipsis') {
                  return (
                    <span
                      key={`ellipsis-${index}`}
                      className="px-2 py-2 text-sm font-medium text-gray-400"
                    >
                      ...
                    </span>
                  );
                }

                return (
                  <Link
                    key={item}
                    href={buildVideosPageHref(selectedChannel, item, selectedSort)}
                    className={`min-w-10 rounded-lg border px-3 py-2 text-center text-sm font-medium ${
                      currentPage === item
                        ? 'border-blue-600 bg-blue-600 text-white'
                        : 'border-gray-300 bg-white text-gray-700 hover:border-blue-300 hover:text-blue-700'
                    }`}
                  >
                    {item}
                  </Link>
                );
              })}

              <Link
                href={buildVideosPageHref(selectedChannel, Math.min(totalPages, currentPage + 1), selectedSort)}
                aria-disabled={currentPage === totalPages}
                className={`rounded-lg border px-4 py-2 text-sm font-medium ${
                  currentPage === totalPages
                    ? 'pointer-events-none border-gray-200 bg-gray-100 text-gray-400'
                    : 'border-gray-300 bg-white text-gray-700 hover:border-blue-300 hover:text-blue-700'
                }`}
              >
                다음
              </Link>

              <Link
                href={buildVideosPageHref(selectedChannel, totalPages, selectedSort)}
                aria-disabled={currentPage === totalPages}
                className={`rounded-lg border px-4 py-2 text-sm font-medium ${
                  currentPage === totalPages
                    ? 'pointer-events-none border-gray-200 bg-gray-100 text-gray-400'
                    : 'border-gray-300 bg-white text-gray-700 hover:border-blue-300 hover:text-blue-700'
                }`}
              >
                마지막
              </Link>
            </div>
          )}
        </>
      )}
    </div>
  );
}
