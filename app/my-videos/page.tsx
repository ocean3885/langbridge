import { getAppUserFromServer } from '@/lib/auth/app-user';
import { listVideosSqlite } from '@/lib/sqlite/videos';
import { listSqliteCategories } from '@/lib/sqlite/categories';
import { listSqliteLanguages } from '@/lib/sqlite/languages';
import { listVideosByUserCategorySqlite } from '@/lib/sqlite/user-category-videos';
import { listAllUserCategoryVideosSqlite } from '@/lib/sqlite/user-category-videos-all';
import { listVideoProgressForVideos, type SqliteVideoProgress } from '@/lib/sqlite/video-progress';
import { formatDuration } from '@/lib/utils';
import Link from 'next/link';
import Image from 'next/image';
import { Video, Clock, Plus, FolderOpen, Tag } from 'lucide-react';
import CategoryManageButton from './CategoryManageButton';

// 동적 렌더링 강제
export const dynamic = 'force-dynamic';

interface MyVideosPageProps {
  searchParams?: Promise<{
    learningCategoryId?: string;
  }>;
}

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

export default async function MyVideosPage({ searchParams }: MyVideosPageProps) {
  const user = await getAppUserFromServer();

  if (!user) {
    return (
      <div className="max-w-xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold mb-4">내 학습 영상</h1>
        <p className="mb-4">로그인이 필요합니다.</p>
        <Link href="/auth/login" className="text-blue-600 hover:underline">
          로그인 페이지로 이동
        </Link>
      </div>
    );
  }

  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const requestedLearningCategoryId = resolvedSearchParams?.learningCategoryId;
  const selectedLearningCategoryId = requestedLearningCategoryId ? Number(requestedLearningCategoryId) : null;
  const shouldFilterByLearningCategory =
    selectedLearningCategoryId !== null && Number.isFinite(selectedLearningCategoryId);

  const categoryRows = await listSqliteCategories('user_categories', user.id);
  const selectedLearningCategory = shouldFilterByLearningCategory
    ? categoryRows.find((category) => category.id === selectedLearningCategoryId) ?? null
    : null;
  const languageRows = await listSqliteLanguages();
  const languageNameMap = new Map(languageRows.map((language) => [language.id, language.name_ko]));
  const categoryMap: Record<string, { name: string; languageName: string }> = {};
  for (const category of categoryRows) {
    categoryMap[String(category.id)] = {
      name: category.name,
      languageName: category.language_id
        ? (languageNameMap.get(category.language_id) ?? '언어 미지정')
        : '언어 미지정',
    };
  }

  // 2. 실제로 영상이 존재하는 카테고리 ID들 추출 (필터 바 노출용)
  const [myUploadedVideos, mySavedMappings] = await Promise.all([
    listVideosSqlite({ uploaderId: user.id }),
    listAllUserCategoryVideosSqlite(user.id)
  ]);

  const activeCategoryIds = new Set([
    ...myUploadedVideos.map((v: any) => v.category_id).filter((id): id is string => id !== null).map((id: string) => Number(id)),
    ...mySavedMappings.map((m: any) => m.category_id)
  ]);

  // 3. 비디오 데이터 로드 및 변환
  const videoList: VideoItem[] = [];
  const addedSet = new Set<string>(); // "category_id:video_id" 조합 기록용

  if (shouldFilterByLearningCategory && selectedLearningCategory) {
    const videos = await listVideosByUserCategorySqlite({
      userId: user.id,
      categoryId: selectedLearningCategory.id,
    });

    for (const video of videos) {
      const uniqueKey = `${video.category_id}:${video.video_id}`;
      if (!addedSet.has(uniqueKey)) {
        addedSet.add(uniqueKey);
        videoList.push({
          id: video.video_id,
          youtube_id: video.youtube_id,
          title: video.title,
          description: video.description,
          duration: video.duration,
          thumbnail_url: video.thumbnail_url,
          created_at: video.created_at,
          category_id: String(video.category_id),
          category_name: categoryMap[String(video.category_id)]?.name || null,
          language_name: categoryMap[String(video.category_id)]?.languageName || null,
          transcript_count: video.transcript_count || 0,
        });
      }
    }
  } else {
    // 1. 모든 담긴 영상의 상세 정보를 가져옴
    const categoryVideoPromises = Array.from(activeCategoryIds).map((catId) =>
      listVideosByUserCategorySqlite({ userId: user.id, categoryId: catId })
    );
    const categoryVideosArrays = await Promise.all(categoryVideoPromises);

    for (const videos of categoryVideosArrays) {
      for (const video of videos) {
        const uniqueKey = `${video.category_id}:${video.video_id}`;
        if (!addedSet.has(uniqueKey)) {
          addedSet.add(uniqueKey);
          videoList.push({
            id: video.video_id,
            youtube_id: video.youtube_id,
            title: video.title,
            description: video.description,
            duration: video.duration,
            thumbnail_url: video.thumbnail_url,
            created_at: video.created_at,
            category_id: String(video.category_id),
            category_name: categoryMap[String(video.category_id)]?.name || null,
            language_name: categoryMap[String(video.category_id)]?.languageName || null,
            transcript_count: video.transcript_count || 0,
          });
        }
      }
    }

    // 2. 혹시나 'user_category_videos'에 매핑되지 않은 업로드 영상들 (카테고리 미지정이거나, old data)
    // 원본 videos.category_id가 남아있어 사용자가 변경한 카테고리와 겹쳐 두 번 나오는 것을 방지하기 위해,
    // 이미 user_category_videos를 통해 하나라도 매핑 정보가 있다면 폴백(원본 카테고리)을 무시합니다.
    const mappedVideoIds = new Set(mySavedMappings.map((m: any) => m.video_id));

    for (const v of myUploadedVideos) {
      // 이미 내가 관리하는 카테고리에 하나이상 담겨있다면 기존 원본 카테고리로 중복 표시하지 않음
      if (mappedVideoIds.has(v.id)) continue;

      // 사용자가 카테고리를 통제할 수 있도록, 매핑 테이블(user_category_videos)에 없으면 
      // 무조건 '카테고리 미지정'으로 처리하여 과거의 고정된 카테고리에 얽매이지 않게 합니다.
      const uniqueKey = `null:${v.id}`;

      if (!addedSet.has(uniqueKey)) {
        addedSet.add(uniqueKey);
        videoList.push({
          id: v.id,
          youtube_id: v.youtube_id,
          title: v.title,
          description: v.description,
          duration: v.duration,
          thumbnail_url: v.thumbnail_url,
          created_at: v.created_at,
          category_id: null,
          category_name: null,
          language_name: null,
          transcript_count: v.transcript_count || 0,
        });
      }
    }
  }

  // 학습 진행 데이터 조회
  const videoIds = videoList.map((v) => v.id);
  const progressRows = await listVideoProgressForVideos(user.id, videoIds);
  const progressMap = new Map<string, SqliteVideoProgress>();
  for (const row of progressRows) {
    progressMap.set(row.video_id, row);
  }

  // 비디오 최신순 정렬 (플랫 리스트용)
  const sortedVideos = videoList.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      {/* 헤더 */}
      <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-3 mb-3">
            <Video className="w-8 h-8 text-blue-600" />
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">내 학습 영상</h1>
          </div>
          <p className="text-sm sm:text-base text-gray-600">
            카테고리별로 정리된 영상 목록입니다.
          </p>
        </div>
        <div className="sm:flex-shrink-0">
          <CategoryManageButton
            initialCategories={categoryRows as any}
            initialLanguages={languageRows as any}
          />
        </div>
      </div>

      <div className="mb-6 rounded-lg border border-gray-200 bg-white p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-gray-700 mr-1">학습 카테고리 필터:</span>
          <Link
            href="/my-videos"
            className={`rounded-full px-3 py-1 text-sm border transition-colors ${!shouldFilterByLearningCategory
                ? 'border-blue-600 bg-blue-50 text-blue-700'
                : 'border-gray-300 text-gray-700 hover:border-blue-300 hover:text-blue-700'
              }`}
          >
            전체
          </Link>
          {categoryRows.map((category) => (
              <Link
                key={category.id}
                href={`/my-videos?learningCategoryId=${category.id}`}
                className={`rounded-full px-3 py-1 text-sm border transition-colors ${selectedLearningCategory?.id === category.id
                    ? 'border-blue-600 bg-blue-50 text-blue-700'
                    : 'border-gray-300 text-gray-700 hover:border-blue-300 hover:text-blue-700'
                  }`}
              >
                {category.name}
              </Link>
            ))}
        </div>
      </div>

      {/* 비디오 목록 */}
      {videoList.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-12 text-center">
          <Video className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-700 mb-2">
            {shouldFilterByLearningCategory && selectedLearningCategory
              ? `${selectedLearningCategory.name} 카테고리에 등록된 영상이 없습니다`
              : '아직 등록된 영상이 없습니다'}
          </h3>
          <p className="text-gray-500 mb-4">
            첫 영상을 등록하여 학습을 시작해보세요.
          </p>
          <Link
            href="/upload?tab=video"
            className="inline-flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm font-medium"
          >
            <Plus className="w-5 h-5" />
            영상 등록
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {sortedVideos.map((video) => (
            <Link
              key={video.category_id ? `${video.category_id}_${video.id}` : `null_${video.id}`}
              href={`/my-videos/${video.id}`}
              className="group flex flex-col bg-white rounded-2xl shadow-sm border border-gray-200 hover:shadow-lg transition-all duration-300 overflow-hidden"
            >
              <div className="flex flex-col h-full">
                {/* 썸네일 */}
                <div className="relative w-full aspect-video flex-shrink-0 bg-gray-100 rounded-t-2xl overflow-hidden">
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
                <div className="p-4 flex flex-col flex-grow">
                  {/* 카테고리 배지 */}
                  <div className="flex items-center mb-2">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] sm:text-[11px] font-bold rounded-full border ${
                      video.category_name 
                        ? 'bg-blue-50 text-blue-700 border-blue-100' 
                        : 'bg-gray-50 text-gray-500 border-gray-200'
                    }`}>
                      <Tag className="w-3 h-3" />
                      {video.category_name || '미지정'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <h3 className="font-bold text-gray-900 text-base line-clamp-2 group-hover:text-blue-600 transition-colors">
                      {video.title}
                    </h3>
                  </div>

                  {/* 학습 진행 바 (수치) */}
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
                      <div className="flex flex-col gap-1 mb-3 mt-auto">
                        <div className="flex items-center justify-between text-[10px] font-semibold">
                          <span className={pct >= 100 ? 'text-emerald-600' : pct > 0 ? 'text-blue-600' : 'text-gray-500'}>
                            {pct >= 100 ? '학습 완료' : `${pct}% 진행`}
                          </span>
                          <span className="text-gray-500 tabular-nums">
                            {p.mastered_scripts} / {p.total_scripts}
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${barColor}`}
                            style={{ width: `${Math.min(pct, 100)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })()}

                  <div className="mt-auto pt-3 border-t border-gray-100 text-[11px] text-gray-500 flex flex-wrap gap-2 items-center justify-between">
                    <div className="flex gap-2 items-center">
                      {video.language_name && <span>🌐 {video.language_name}</span>}
                      <span>📝 {video.transcript_count}문장</span>
                    </div>
                    <span>
                      {(() => {
                        const p = progressMap.get(video.id);
                        const lastStudied = p?.last_studied_at;
                        if (lastStudied) {
                          return `📖 ${relativeFromNowKo(lastStudied)}`;
                        }
                        return relativeFromNowKo(video.created_at);
                      })()}
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
