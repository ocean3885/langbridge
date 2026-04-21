import { getAppUserFromServer } from '@/lib/auth/app-user';
import { listVideosSqlite } from '@/lib/sqlite/videos';
import { listSqliteCategories } from '@/lib/sqlite/categories';
import { listSqliteLanguages } from '@/lib/sqlite/languages';
import { listVideosByUserCategorySqlite } from '@/lib/sqlite/user-category-videos';
import { listAllUserCategoryVideosSqlite } from '@/lib/sqlite/user-category-videos-all';
import { listVideoProgressForVideos, type SqliteVideoProgress } from '@/lib/sqlite/video-progress';
import Link from 'next/link';
import { Video } from 'lucide-react';
import CategoryManageButton from './CategoryManageButton';
import CategoryFilter from './CategoryFilter';
import VideoCard from './VideoCard';
import EmptyVideoState from './EmptyVideoState';
import type { VideoItem } from './types';

// 동적 렌더링 강제
export const dynamic = 'force-dynamic';

interface MyVideosPageProps {
  searchParams?: Promise<{
    learningCategoryId?: string;
  }>;
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

  const activeCategoryIds = new Set(mySavedMappings.map((m: any) => m.category_id));

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
          category_name: categoryMap[String(video.category_id)]?.name || null,
          language_name: categoryMap[String(video.category_id)]?.languageName || null,
          transcript_count: video.transcript_count || 0,
        });
      }
    }
  } else {
    // 모든 담긴 영상의 상세 정보를 가져옴
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
            category_name: categoryMap[String(video.category_id)]?.name || null,
            language_name: categoryMap[String(video.category_id)]?.languageName || null,
            transcript_count: video.transcript_count || 0,
          });
        }
      }
    }

    // 매핑되지 않은 업로드 영상 처리
    const mappedVideoIds = new Set(mySavedMappings.map((m: any) => m.video_id));
    for (const v of myUploadedVideos) {
      if (mappedVideoIds.has(v.id)) continue;
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

  const sortedVideos = videoList.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-3 mb-3">
            <Video className="w-8 h-8 text-blue-600" />
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">내 학습 영상</h1>
          </div>
          <p className="text-sm sm:text-base text-gray-600">카테고리별로 정리된 영상 목록입니다.</p>
        </div>
        <div className="sm:flex-shrink-0">
          <CategoryManageButton
            initialCategories={categoryRows as any}
            initialLanguages={languageRows as any}
          />
        </div>
      </div>

      <CategoryFilter
        categories={categoryRows.map(c => ({ id: c.id, name: c.name }))}
        selectedCategoryId={selectedLearningCategoryId}
      />

      {videoList.length === 0 ? (
        <EmptyVideoState categoryName={selectedLearningCategory?.name} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {sortedVideos.map((video) => (
            <VideoCard
              key={video.id}
              video={video}
              progress={progressMap.get(video.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
