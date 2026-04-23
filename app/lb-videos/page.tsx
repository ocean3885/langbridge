import { getAppUserFromServer } from '@/lib/auth/app-user';
import { listVideos, listAllUserCategoryVideos } from '@/lib/supabase/services/videos';
import { listCategories } from '@/lib/supabase/services/categories';
import { formatDuration } from '@/lib/utils';
import Link from 'next/link';
import Image from 'next/image';
import { Video, Globe, Tag } from 'lucide-react';
import CategoryAddButton from './CategoryAddButton';
import Pagination from '@/components/common/Pagination';

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
  myCategories: { id: number; name: string }[];
};

interface LBVideosPageProps {
  searchParams?: Promise<{
    filter?: string;
    page?: string;
  }>;
}

export default async function LBVideosPage({ searchParams }: LBVideosPageProps) {
  const user = await getAppUserFromServer();
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const currentFilter = resolvedSearchParams?.filter || 'all';
  const currentPage = Number(resolvedSearchParams?.page) || 1;
  const ITEMS_PER_PAGE = 12;

  // 1. 데이터 병렬 로드
  const [allPublicVideos, allMyCategories, allMyMappings] = await Promise.all([
    listVideos({ visibility: 'public' }),
    user ? listCategories('user_categories', user.id) : Promise.resolve([]),
    user ? listAllUserCategoryVideos(user.id) : Promise.resolve([]),
  ]);

  // 2. 비디오별 카테고리 매핑 생성
  const mappingMap: Record<string, { id: number; name: string }[]> = {};
  allMyMappings.forEach((m) => {
    if (!mappingMap[m.video_id]) mappingMap[m.video_id] = [];
    mappingMap[m.video_id].push({ id: m.category_id, name: m.category_name });
  });

  let videoList: VideoItem[] = allPublicVideos.map((v) => ({
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
    myCategories: mappingMap[v.id] || [],
  })).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  // 필터링 적용
  if (currentFilter === 'saved') {
    videoList = videoList.filter(v => v.myCategories.length > 0);
  } else if (currentFilter === 'new') {
    videoList = videoList.filter(v => v.myCategories.length === 0);
  }

  const filters = [
    { id: 'all', label: '전체' },
    { id: 'saved', label: '학습 중' },
    { id: 'new', label: '학습 대기' },
  ];

  const totalPages = Math.ceil(videoList.length / ITEMS_PER_PAGE);
  const paginatedVideos = videoList.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      {/* 헤더 */}
      <div className="mb-10 text-center sm:text-left">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
          <Globe className="w-10 h-10 text-emerald-600 mx-auto sm:mx-0" />
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">LB 학습 영상</h1>
        </div>
        <p className="text-lg text-gray-600">
          다양한 학습 영상을 둘러보고 마음에 드는 영상은 내 카테고리에 담아 정교하게 관리해보세요.
        </p>
      </div>

      {/* 필터 섹션 */}
      <div className="flex flex-wrap items-center gap-2 mb-8">
        {filters.map((f) => (
          <Link
            key={f.id}
            href={`/lb-videos${f.id === 'all' ? '' : `?filter=${f.id}`}`}
            className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${
              currentFilter === f.id
                ? 'bg-emerald-600 text-white shadow-md'
                : 'bg-white text-gray-600 border border-gray-200 hover:border-emerald-200 hover:bg-emerald-50'
            }`}
          >
            {f.label}
          </Link>
        ))}
        <div className="ml-auto text-xs text-gray-400 font-medium">
          총 <span className="text-emerald-600 font-bold">{videoList.length}</span>개의 영상
        </div>
      </div>

      {/* 비디오 그리드 목록 */}
      {videoList.length === 0 ? (
        <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl p-20 text-center">
          <Video className="w-20 h-20 text-gray-300 mx-auto mb-6" />
          <h3 className="text-2xl font-bold text-gray-700 mb-2">등록된 영상이 없습니다</h3>
          <p className="text-gray-500">새로운 학습 영상이 업로드되면 이곳에 나타납니다.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {paginatedVideos.map((video) => (
            <div
              key={video.id}
              className="group flex flex-col bg-white rounded-2xl shadow-sm border border-gray-200 hover:shadow-xl transition-all duration-300 overflow-hidden"
            >
              {/* 이미지 영역 */}
              <Link href={`/lb-videos/${video.id}`} className="relative aspect-video overflow-hidden">
                {video.thumbnail_url ? (
                  <Image
                    src={video.thumbnail_url}
                    alt={video.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                  />
                ) : (
                  <div className="flex items-center justify-center w-full h-full bg-gray-100">
                    <Video className="w-12 h-12 text-gray-300" />
                  </div>
                )}
                {video.duration !== null && (
                  <div className="absolute bottom-2 right-2 bg-black/75 text-white text-xs px-2 py-1 rounded flex items-center gap-1 font-mono">
                    {formatDuration(video.duration)}
                  </div>
                )}
              </Link>

              {/* 정보 영역 */}
              <div className="p-5 flex flex-col flex-grow">
                {/* 1. 사용자가 담아둔 카테고리 및 언어 표시 */}
                <div className="flex flex-wrap items-center gap-1.5 mb-3 min-h-[24px]">
                  {video.language_name && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-600 text-[11px] font-bold rounded-full border border-gray-200">
                      <Globe className="w-3 h-3 text-gray-400" />
                      {video.language_name}
                    </span>
                  )}
                  {video.myCategories.length > 0 && (
                    video.myCategories.map((cat) => (
                      <span key={cat.id} className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[11px] font-bold rounded-full border border-emerald-100">
                        <Tag className="w-3 h-3" />
                        {cat.name}
                      </span>
                    ))
                  )}
                </div>

                <Link href={`/lb-videos/${video.id}`} className="block mb-3">
                  <h3 className="font-bold text-gray-900 leading-tight line-clamp-2 min-h-[3rem] group-hover:text-emerald-600 transition-colors">
                    {video.title}
                  </h3>
                </Link>

                <div className="flex items-center justify-between mt-auto pt-4 border-t border-gray-100">
                  <div className="text-[11px] text-gray-500">
                    <p className="font-medium text-gray-900 mb-0.5">{new Date(video.created_at).toLocaleDateString('ko-KR')}</p>
                    <p>{video.transcript_count} 문장</p>
                  </div>

                  {/* 2. 카테고리 추가 버튼 (클라이언트 컴포넌트) - 미등록 영상에만 표시 */}
                  {user && video.myCategories.length === 0 && (
                    <CategoryAddButton
                      videoId={video.id}
                      allCategories={allMyCategories}
                      selectedCategoryIds={video.myCategories.map(c => c.id)}
                    />
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {totalPages > 1 && (
        <Pagination 
          currentPage={currentPage} 
          totalPages={totalPages} 
          baseUrl="/lb-videos" 
          queryParams={currentFilter !== 'all' ? { filter: currentFilter } : undefined} 
        />
      )}
    </div>
  );
}
