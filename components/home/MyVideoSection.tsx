import Link from 'next/link';
import Image from 'next/image';
import { FolderOpen, Video, Clock } from 'lucide-react';
import { formatDuration } from '@/lib/utils';

export interface UserVideo {
  id: string;
  title: string;
  youtube_id: string;
  thumbnail_url: string | null;
  duration: number | null;
  created_at: string;
  category_id: number | null;
}

export interface VideoCategory {
  id: number | null;
  name: string;
  languageName: string;
  videoList: UserVideo[];
}

interface MyVideoSectionProps {
  isLoggedIn: boolean;
  categories: VideoCategory[];
}

export default function MyVideoSection({ isLoggedIn, categories }: MyVideoSectionProps) {
  return (
    <div id="video-list" className="max-w-7xl mx-auto scroll-mt-20">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Video className="w-6 h-6 text-cyan-600" />
          <h2 className="text-2xl font-bold text-gray-900">내 학습 영상</h2>
        </div>
        {isLoggedIn && categories.length > 0 && (
          <Link
            href="/my-videos"
            className="text-sm font-semibold text-blue-600 hover:text-blue-700 transition flex items-center gap-1"
          >
            전체 보기
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        )}
      </div>

      {/* 비로그인 */}
      {!isLoggedIn && (
        <div className="bg-gradient-to-r from-cyan-50 to-blue-50 border border-cyan-100 rounded-xl p-8 text-center space-y-4">
          <h3 className="text-xl font-bold text-gray-800">엄선된 교육 영상으로 실전 표현을 넓혀보세요</h3>
          <p className="text-sm text-gray-600 leading-relaxed">
            공개 어학 강의 영상에서는 주제별 교육 영상을 바로 재생하며 표현과 맥락을 익힐 수 있습니다.<br />
            가입 후에는 개인 영상 업로드와 별도로 나만의 학습 콘텐츠도 함께 관리할 수 있습니다.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/auth/sign-up" className="px-6 py-3 rounded-lg bg-cyan-600 text-white font-semibold shadow hover:bg-cyan-700 transition">무료로 가입하기</Link>
            <Link href="/videos" className="px-6 py-3 rounded-lg bg-white border border-gray-300 text-gray-800 font-semibold hover:bg-gray-50 transition">영상 둘러보기</Link>
          </div>
        </div>
      )}

      {/* 로그인 + 빈 상태 */}
      {isLoggedIn && categories.length === 0 && (
        <div className="bg-gradient-to-r from-cyan-50 to-blue-50 border border-cyan-100 rounded-xl p-8 text-center space-y-6">
          <div className="space-y-2">
            <h3 className="text-xl sm:text-2xl font-bold text-gray-800">첫 영상을 등록하여 영상 학습을 시작해보세요</h3>
            <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
              YouTube 영상을 등록해 나만의 영상 컬렉션을 만들고, 공개 어학 강의 영상과 함께 활용해보세요.
            </p>
          </div>
          <ul className="text-left mx-auto max-w-2xl space-y-2 text-sm sm:text-base">
            <li className="flex items-start gap-2"><span className="mt-0.5">🎬</span><span>YouTube URL과 스크립트 CSV 파일 업로드</span></li>
            <li className="flex items-start gap-2"><span className="mt-0.5">📝</span><span>카테고리와 언어를 지정해 체계적으로 정리</span></li>
            <li className="flex items-start gap-2"><span className="mt-0.5">🔁</span><span>공개 어학 강의 영상과 함께 다양한 주제를 병행 학습</span></li>
            <li className="flex items-start gap-2"><span className="mt-0.5">📁</span><span>카테고리로 체계적으로 관리</span></li>
          </ul>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/upload?tab=video" className="px-6 py-3 rounded-lg bg-cyan-600 text-white font-semibold shadow hover:bg-cyan-700 transition">
              지금 영상 등록
            </Link>
          </div>
          <p className="text-xs text-gray-500">영상은 언제든 삭제할 수 있어요. 실전 어학 학습을 시작해보세요!</p>
        </div>
      )}

      {/* 로그인 + 데이터 있음 */}
      {isLoggedIn && categories.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {(() => {
            const flatVideos = categories.flatMap(category =>
              category.videoList.map(video => ({
                ...video,
                categoryName: category.name,
                languageName: category.languageName
              }))
            ).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

            return flatVideos.map(video => (
              <Link
                key={video.id}
                href={`/my-videos/${video.id}`}
                className="group bg-white rounded-lg shadow border border-gray-100 hover:shadow-lg transition-all duration-300 overflow-hidden flex flex-col"
              >
                <div className="relative w-full aspect-video bg-gray-200">
                  {video.thumbnail_url ? (
                    <Image
                      src={video.thumbnail_url}
                      alt={video.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                    />
                  ) : (
                    <div className="flex items-center justify-center w-full h-full">
                      <Video className="w-10 h-10 text-gray-400" />
                    </div>
                  )}
                  {video.duration !== null && (
                    <div className="absolute bottom-2 right-2 bg-black/75 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>{formatDuration(video.duration)}</span>
                    </div>
                  )}
                </div>
                <div className="p-4 flex flex-col flex-grow">
                  <div className="flex flex-wrap items-center gap-1.5 mb-2.5">
                    {video.languageName && (
                      <span className="px-2 py-0.5 bg-cyan-50 text-cyan-700 rounded text-[11px] font-semibold border border-cyan-100">
                        {video.languageName}
                      </span>
                    )}
                    <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-[11px] font-medium">
                      {video.categoryName}
                    </span>
                  </div>
                  <h3 className="font-bold text-gray-900 mb-1 line-clamp-2 group-hover:text-cyan-600 transition-colors">
                    {video.title}
                  </h3>
                  <div className="mt-auto pt-2">
                    <p className="text-xs text-gray-500">
                      {new Date(video.created_at).toLocaleDateString('ko-KR', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                </div>
              </Link>
            ));
          })()}
        </div>
      )}
    </div>
  );
}
