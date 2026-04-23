'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import VideoPlayer from '@/components/video/VideoPlayer';
import TranscriptDisplay from '@/components/common/TranscriptDisplay';
import { updateVideoDuration } from '@/app/actions/video';
import EditVideoModal from './EditVideoModal';
import type { VideoVisibility } from '@/lib/supabase/services/videos';
import type { SupabaseVideoProgress as SqliteVideoProgress } from '@/lib/supabase/services/video-progress';
import { Edit3, ArrowLeft, Trash2, Settings2, FolderTree, Plus } from 'lucide-react';
import CategoryManagerModal from '@/components/common/CategoryManagerModal';


interface TranscriptWithTranslation {
  id: string;
  video_id: string;
  start: number;
  duration: number;
  text_original: string;
  order_index: number;
  translations: {
    id: string;
    lang: string;
    text_translated: string;
  }[];
}

interface VideoLearningClientProps {
  videoId: string;
  youtubeId: string;
  title: string;
  description: string | null;
  visibility: VideoVisibility;
  canEditVisibility: boolean;
  categoryId: number | null;
  categoryName: string | null;
  channelName: string | null;
  viewCount: number;
  languageId: number | null;
  duration: number | null;
  transcripts: TranscriptWithTranslation[];
  userNotes: Record<string, { id: string; content: string }>;
  isAdmin: boolean;
  progress?: SqliteVideoProgress;
  backUrl?: string;
  allCategories: { id: number; name: string; language_id: number | null }[];
  selectedCategoryIds: number[];
  enlargeTranscriptTextOnDesktop?: boolean;
}

export default function VideoLearningClient({
  videoId,
  youtubeId,
  title,
  description,
  visibility,
  canEditVisibility,
  categoryId,
  categoryName,
  channelName,
  viewCount,
  languageId,
  duration: existingDuration,
  transcripts,
  userNotes,
  isAdmin,
  progress,
  backUrl = '/my-videos',
  allCategories: initialCategories,
  selectedCategoryIds,
  enlargeTranscriptTextOnDesktop = false,
}: VideoLearningClientProps) {
  const [currentTime, setCurrentTime] = useState(0);
  const [selectedTranscriptIndex, setSelectedTranscriptIndex] = useState<number | null>(null);
  const [durationSyncRequested, setDurationSyncRequested] = useState(false);
  // 반복 상태: none | single | range
  const [repeatState, setRepeatState] = useState<{ type: 'none' | 'single' | 'range', index1: number | null, index2: number | null }>({ type: 'none', index1: null, index2: null });
  
  // 화면 크기 감지 (모바일 vs 데스크톱)
  const [isMobile, setIsMobile] = useState<boolean | undefined>(undefined);
  
  // 모바일 재생 상태 (전체화면 모드)
  const [isPlaying, setIsPlaying] = useState(false);
  
  // 편집 모달 상태
  const [editModalOpen, setEditModalOpen] = useState(false);
  
  // 카테고리 관리 모달
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  
  const router = useRouter();

  // 화면 크기 감지 (모바일 = 768px 미만, 태블릿/PC = 768px 이상)
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);



  const handleTimeUpdate = useCallback((time: number) => {
    setCurrentTime(time);
  }, []);

  const handleDurationReady = useCallback(async (durationSeconds: number) => {
    if (durationSyncRequested || existingDuration) {
      return;
    }

    setDurationSyncRequested(true);
    await updateVideoDuration({
      videoId,
      durationSeconds,
    });
  }, [durationSyncRequested, existingDuration, videoId]);

  // 스크립트 클릭: 반복 해제 및 해당 문장부터 순차 재생
  const handleSelectTranscript = useCallback((index: number | null) => {
    setSelectedTranscriptIndex(index);
    setRepeatState({ type: 'none', index1: null, index2: null });
    if (index !== null) {
      setTimeout(() => {
        setSelectedTranscriptIndex(null);
      }, 100);
    }
  }, []);

  // R 버튼 클릭 핸들러
  const handleRepeat = useCallback((index: number) => {
    if (repeatState.type === 'none') {
      setRepeatState({ type: 'single', index1: index, index2: null });
    } else if (repeatState.type === 'single') {
      if (repeatState.index1 === index) {
        setRepeatState({ type: 'none', index1: null, index2: null }); // 반복 해제
      } else {
        setRepeatState({ type: 'range', index1: repeatState.index1, index2: index }); // 구간 반복
      }
    } else if (repeatState.type === 'range') {
      // 구간 반복 중 다른 R 클릭 시 해당 문장만 반복
      setRepeatState({ type: 'single', index1: index, index2: null });
    }
  }, [repeatState]);

  // 편집 모달 열기
  const handleOpenEditModal = () => {
    setEditModalOpen(true);
  };
  const VideoMetaData = ({ isDesktop = false }: { isDesktop?: boolean }) => (
    <div className={`flex flex-wrap gap-${isDesktop ? '3 text-sm' : '1.5 text-xs'} items-center`}>
      {categoryName && (
        <div className={`flex items-center ${isDesktop ? 'px-3 py-1' : 'px-2 py-0.5'} bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full font-bold`}>
          <span>{categoryName}</span>
        </div>
      )}
      {channelName && (
        <div className={`flex items-center gap-1 ${isDesktop ? 'px-3 py-1' : 'px-2 py-0.5'} bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full`}>
          <span className="font-medium">채널:</span>
          <span>{channelName}</span>
        </div>
      )}
      <div className={`flex items-center gap-1 ${isDesktop ? 'px-3 py-1' : 'px-2 py-0.5'} bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full`}>
        <span className="font-medium">조회수:</span>
        <span>{viewCount.toLocaleString()}회</span>
      </div>
    </div>
  );

  const StudyActionButtons = ({ isDesktop = false }: { isDesktop?: boolean }) => (
    <div className={isDesktop ? "mt-4 flex gap-2" : "md:hidden flex gap-2 px-4 py-2 border-b bg-background flex-shrink-0"}>
      <button
        onClick={() => router.push(`/my-videos/${videoId}/word-scramble`)}
        className={`flex-1 ${isDesktop ? 'px-4 py-2.5 text-sm' : 'px-3 py-2 text-xs'} bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity`}
      >
        🔤 단어 배열 학습
      </button>
      <button
        onClick={() => router.push(`/my-videos/${videoId}/word-scramble?mode=review`)}
        className={`flex-1 ${isDesktop ? 'px-4 py-2.5 text-sm' : 'px-3 py-2 text-xs'} bg-secondary text-secondary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity`}
      >
        🔁 복습 모드
      </button>
    </div>
  );

  const StudyProgressDisplay = ({ isDesktop = false }: { isDesktop?: boolean }) => {
    if (!progress) return null;
    
    if (isDesktop) {
      return (
        <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700/50 rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">학습 현황</h4>
            <span className="text-xs font-bold text-blue-600">
              성공률 {progress.total_attempts > 0 ? Math.round((progress.total_correct / progress.total_attempts) * 100) : 0}%
            </span>
          </div>
          <div className="flex flex-col gap-2">
            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="bg-white dark:bg-gray-700 p-2 rounded-lg shadow-sm border border-gray-50 dark:border-gray-600">
                <p className="text-[10px] text-gray-400 mb-0.5">전체 문장</p>
                <p className="text-sm font-bold">{progress.total_scripts}</p>
              </div>
              <div className="bg-white dark:bg-gray-700 p-2 rounded-lg shadow-sm border border-gray-50 dark:border-gray-600">
                <p className="text-[10px] text-blue-500/70 mb-0.5">마스터 문장</p>
                <p className="text-sm font-bold text-blue-600">{progress.mastered_scripts}</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-white dark:bg-gray-700 p-2 rounded-lg shadow-sm border border-gray-50 dark:border-gray-600">
                <p className="text-[10px] text-gray-400 mb-0.5">총 시도</p>
                <p className="text-sm font-bold">{progress.total_attempts}</p>
              </div>
              <div className="bg-white dark:bg-gray-700 p-2 rounded-lg shadow-sm border border-gray-50 dark:border-gray-600">
                <p className="text-[10px] text-green-500/70 mb-0.5">정답</p>
                <p className="text-sm font-bold text-green-600">{progress.total_correct}</p>
              </div>
              <div className="bg-white dark:bg-gray-700 p-2 rounded-lg shadow-sm border border-gray-50 dark:border-gray-600">
                <p className="text-[10px] text-red-400 mb-0.5">오답</p>
                <p className="text-sm font-bold text-red-500">{progress.total_wrong}</p>
              </div>
            </div>
          </div>
        </div>
      );
    }
    
    return (
      <div className="md:hidden px-4 py-2 border-b bg-gray-50 dark:bg-gray-800/50 flex justify-between items-center text-[10px] overflow-x-auto whitespace-nowrap scrollbar-hide">
        <div className="flex gap-2.5 text-gray-500 dark:text-gray-400">
          <span>마스터 <span className="font-bold text-blue-600">{progress.mastered_scripts}/{progress.total_scripts}</span></span>
          <span className="text-gray-300">|</span>
          <span>시도 <span className="font-bold text-gray-900 dark:text-gray-100">{progress.total_attempts}</span></span>
          <span>정답 <span className="font-bold text-green-600">{progress.total_correct}</span></span>
          <span>오답 <span className="font-bold text-red-500">{progress.total_wrong}</span></span>
        </div>
        <div className="flex items-center gap-1 ml-4 sticky right-0 bg-gray-50 dark:bg-gray-800/80 px-1 shadow-[-4px_0_4px_-4px_rgba(0,0,0,0.1)]">
          <span className="text-gray-400 uppercase tracking-tighter font-bold">성공률</span>
          <span className="text-blue-600 font-bold text-xs">
            {progress.total_attempts > 0 ? Math.round((progress.total_correct / progress.total_attempts) * 100) : 0}%
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className={`flex flex-col md:block md:container md:mx-auto md:px-4 md:py-8 ${
      isMobile && isPlaying 
        ? 'fixed inset-0 z-50 bg-white dark:bg-gray-900' 
        : 'h-screen md:h-auto'
    }`}>
      {/* 모바일 전체 모드: 닫기 버튼 - 제거 (정보 섹션에 통합) */}
      
      {/* 태블릿/데스크톱: 목록으로 버튼 */}
      <div className={`flex justify-end mb-2 ${
        isMobile && isPlaying ? 'hidden' : ''
      }`}>
        <button
          onClick={() => router.push(backUrl)}
          className="flex items-center gap-2 px-3 py-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition"
          title="목록으로"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm font-medium">목록으로</span>
        </button>
      </div>

      {/* 모바일: 비디오 섹션 (고정) */}
      <div className="md:hidden flex-shrink-0">
        {/* 모바일 일반 모드: 제목 + 메타 + 비디오, 전체모드: 메타(버튼 포함)만 상단 */}
        <div className="px-4 pt-3 pb-2 bg-white dark:bg-gray-900 flex flex-col gap-2">
          {/* 제목 (전체모드에서는 숨김) */}
          {!isPlaying && (
            <h1 className="text-lg font-bold break-words line-clamp-2">{title}</h1>
          )}
          {/* 메타 행 (카테고리/조회수 + 전체화면 토글 + 편집) */}
          <div className="flex items-center justify-between gap-2">
            <VideoMetaData />
            <div className="flex items-center gap-1">
              <button 
                onClick={() => setIsCategoryModalOpen(true)}
                className="p-1 text-emerald-600 dark:text-emerald-400 rounded-lg transition-all active:scale-95"
                title="카테고리 관리/담기"
              >
                <FolderTree className="w-5 h-5" />
              </button>
              {isAdmin && (
                <button
                  onClick={handleOpenEditModal}
                  className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-blue-600"
                  title="비디오 정보 수정"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                title={isPlaying ? '전체모드 해제' : '전체화면'}
              >
                {isPlaying ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
        
        {/* 비디오 플레이어 - 모바일에서만 렌더링 (전체모드에서는 메타 아래) */}
        {isMobile === true && (
          <VideoPlayer
            youtubeId={youtubeId}
            selectedTranscriptIndex={selectedTranscriptIndex}
            onDurationReady={handleDurationReady}
            transcripts={transcripts}
            onTimeUpdate={handleTimeUpdate}
            repeatState={repeatState}
          />
        )}
      </div>

      {/* 모바일: 학습 버튼 (고정) */}
      {!isPlaying && <StudyActionButtons />}

      {/* 모바일: 학습 현황 */}
      {!isPlaying && <StudyProgressDisplay />}

      {/* 모바일: 스크립트 섹션 (스크롤 가능) */}
      <div className={`md:hidden flex-1 overflow-y-auto px-4 py-4 ${
        isPlaying ? 'pb-safe' : ''
      }`}>
        <h2 className="text-lg font-semibold mb-3">스크립트</h2>
        <TranscriptDisplay
          videoId={videoId}
          transcripts={transcripts}
          currentTime={currentTime}
          selectedTranscriptIndex={selectedTranscriptIndex}
          onSelectTranscript={handleSelectTranscript}
          userNotes={userNotes}
          repeatState={repeatState}
          onRepeat={handleRepeat}
          isAdmin={isAdmin}
          enlargeTextOnDesktop={enlargeTranscriptTextOnDesktop}
        />
      </div>

      {/* 태블릿/데스크톱: 좌우 분할 레이아웃 */}
      <div className="hidden md:block">
        {/* 제목과 편집 버튼 행 */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold break-words">{title}</h1>
          {isAdmin && (
            <button
              onClick={handleOpenEditModal}
              className="self-start sm:self-auto p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-blue-600 flex-shrink-0"
              title="비디오 정보 수정"
            >
              <Edit3 className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* 채널, 카테고리, 조회수 정보 */}
        <div className="flex items-center justify-between mb-4">
          <VideoMetaData isDesktop />

          <button 
            onClick={() => setIsCategoryModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-xl border border-emerald-100 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-all font-bold text-sm shadow-sm active:scale-95"
            title="카테고리 관리 및 영상 담기"
          >
            <FolderTree className="w-4 h-4" />
            <span>카테고리 관리</span>
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 왼쪽: 비디오 플레이어 - 태블릿/데스크톱에서만 렌더링 */}
          <div className="md:sticky md:top-4 md:self-start h-fit">
            {isMobile === false && (
              <VideoPlayer
                youtubeId={youtubeId}
                selectedTranscriptIndex={selectedTranscriptIndex}
                onDurationReady={handleDurationReady}
                transcripts={transcripts}
                onTimeUpdate={handleTimeUpdate}
                repeatState={repeatState}
              />
            )}
            <div className="mt-4 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
              <h3 className="font-semibold mb-2">사용 방법</h3>
              <ul className="text-sm space-y-1 text-gray-600 dark:text-gray-300">
                <li>• 스크립트를 클릭하면 해당 구간부터 순차 재생됩니다</li>
                <li>• 현재 재생 중인 문장은 파란색으로 표시됩니다</li>
                <li>• 메모 아이콘을 클릭하여 각 문장에 메모를 남길 수 있습니다</li>
                <li>• R 버튼을 클릭하면 해당 문장이 반복재생 됩니다</li>
                <li>• R 버튼이 클릭된 두 문장 사이의 구간은 구간반복재생 됩니다</li>
              </ul>
            </div>
            {/* 단어 배열 학습 버튼 */}
            <StudyActionButtons isDesktop />

            {/* 데스크톱: 학습 현황 */}
            <StudyProgressDisplay isDesktop />
          </div>

          {/* 오른쪽: 스크립트 목록 */}
          <div className="space-y-4 md:overflow-y-auto md:max-h-[calc(100vh-12rem)]">
            <h2 className="text-xl font-semibold">스크립트</h2>
            <TranscriptDisplay
              videoId={videoId}
              transcripts={transcripts}
              currentTime={currentTime}
              selectedTranscriptIndex={selectedTranscriptIndex}
              onSelectTranscript={handleSelectTranscript}
              userNotes={userNotes}
              repeatState={repeatState}
              onRepeat={handleRepeat}
              isAdmin={isAdmin}
              enlargeTextOnDesktop={enlargeTranscriptTextOnDesktop}
            />
          </div>
        </div>
      </div>

      {/* 편집 모달 */}
      <EditVideoModal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        videoId={videoId}
        initialTitle={title}
        initialDescription={description}
        initialVisibility={visibility}
        initialLanguageId={languageId}
        initialCategoryId={categoryId}
        canEditVisibility={canEditVisibility}
        backUrl={backUrl}
      />

      <CategoryManagerModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        videoId={videoId}
        initialCategories={initialCategories}
        selectedCategoryIds={selectedCategoryIds}
        languageId={languageId}
      />
    </div>
  );
}
