'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import VideoPlayer from '@/components/VideoPlayer';
import TranscriptDisplay from '@/components/TranscriptDisplay';
import { updateVideo } from '@/app/actions/videos';
import { deleteVideo as deleteVideoAction } from '@/app/actions/video';
import { Edit3, ArrowLeft } from 'lucide-react';

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
  categoryId: string | null;
  categoryName: string | null;
  channelName: string | null;
  viewCount: number;
  languageId: number | null;
  transcripts: TranscriptWithTranslation[];
  userNotes: Record<string, { id: string; content: string }>;
  isAdmin: boolean;
}

export default function VideoLearningClient({
  videoId,
  youtubeId,
  title,
  description,
  categoryId,
  categoryName,
  channelName,
  viewCount,
  languageId,
  transcripts,
  userNotes,
  isAdmin,
}: VideoLearningClientProps) {
  const [currentTime, setCurrentTime] = useState(0);
  const [selectedTranscriptIndex, setSelectedTranscriptIndex] = useState<number | null>(null);
  // 반복 상태: none | single | range
  const [repeatState, setRepeatState] = useState<{ type: 'none' | 'single' | 'range', index1: number | null, index2: number | null }>({ type: 'none', index1: null, index2: null });
  
  // 화면 크기 감지 (모바일 vs 데스크톱)
  const [isMobile, setIsMobile] = useState(false);
  
  // 편집 모달 상태
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editTitle, setEditTitle] = useState(title);
  const [editDescription, setEditDescription] = useState<string>(description || '');
  const [editLanguageId, setEditLanguageId] = useState<number | null>(languageId);
  const [editCategoryId, setEditCategoryId] = useState<string | null>(categoryId);
  const [categories, setCategories] = useState<{ id: string; name: string; language_id: number | null }[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const router = useRouter();

  // 화면 크기 감지
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const DeleteVideoButton = ({ videoId }: { videoId: string }) => {
    const [deleting, setDeleting] = useState(false);
    const onDelete = async () => {
      if (!confirm('정말 이 영상을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) return;
      setDeleting(true);
      const res = await deleteVideoAction(videoId);
      setDeleting(false);
      if (res.success) {
        alert('영상이 삭제되었습니다.');
        router.push('/my-videos');
      } else {
        alert(`삭제 실패: ${res.error}`);
      }
    };
    return (
      <button
        onClick={onDelete}
        disabled={deleting}
        className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-semibold disabled:opacity-50"
      >
        {deleting ? '삭제 중...' : '영상 삭제'}
      </button>
    );
  };

  // 언어 목록 가져오기
  useEffect(() => {
    if (isAdmin) {
      fetch('/api/user-categories')
        .then(res => res.json())
        .then(data => setCategories(Array.isArray(data) ? data : []))
        .catch(err => console.error('카테고리 목록 불러오기 오류:', err));
    }
  }, [isAdmin]);

  // 카테고리 변경 시 카테고리의 언어로 자동 변경
  useEffect(() => {
    if (editCategoryId !== null && editCategoryId !== '' && categories.length > 0) {
      const cat = categories.find(c => String(c.id) === String(editCategoryId));
      if (cat) {
        setEditLanguageId(cat.language_id ?? null);
      }
    }
  }, [editCategoryId, categories]);

  const handleTimeUpdate = useCallback((time: number) => {
    setCurrentTime(time);
  }, []);

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
    setEditTitle(title);
    setEditDescription(description || '');
    setEditLanguageId(languageId);
    setEditCategoryId(categoryId);
    setEditModalOpen(true);
  };

  // 비디오 정보 저장
  const handleSaveVideo = async () => {
    if (!editTitle.trim()) {
      alert('제목을 입력해주세요.');
      return;
    }

    setIsSaving(true);

    const result = await updateVideo({
      videoId,
      title: editTitle.trim(),
      languageId: editLanguageId,
      categoryId: (editCategoryId === '' || editCategoryId === null) ? null : editCategoryId,
      description: editDescription.trim() || null,
    });

    setIsSaving(false);
    if (result.success) {
      alert('저장되었습니다.');
      setEditModalOpen(false);
      window.location.reload(); // 페이지 새로고침으로 변경사항 반영
    } else {
      alert(`저장 실패: ${result.error}`);
    }
  };

  return (
    <div className="flex flex-col lg:block lg:container lg:mx-auto lg:px-4 lg:py-8 h-screen lg:h-auto">
      {/* 데스크톱: 뒤로가기 버튼 */}
      <div className="flex justify-end mb-2">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 px-3 py-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition"
          title="뒤로가기"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm font-medium">뒤로가기</span>
        </button>
      </div>

      {/* 모바일: 비디오 섹션 (고정) */}
      <div className="lg:hidden flex-shrink-0">
        {/* 제목과 정보 */}
        <div className="px-4 py-3 bg-white dark:bg-gray-900">
          <div className="flex items-center justify-between gap-2 mb-2">
            <h1 className="text-lg font-bold break-words line-clamp-2 flex-1">{title}</h1>
            {isAdmin && (
              <button
                onClick={handleOpenEditModal}
                className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-blue-600 flex-shrink-0"
                title="비디오 정보 수정"
              >
                <Edit3 className="w-4 h-4" />
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            {channelName && (
              <div className="flex items-center gap-1 px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full">
                <span className="font-medium">채널:</span>
                <span>{channelName}</span>
              </div>
            )}
            {categoryName && (
              <div className="flex items-center gap-1 px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full">
                <span className="font-medium">카테고리:</span>
                <span>{categoryName}</span>
              </div>
            )}
            <div className="flex items-center gap-1 px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full">
              <span className="font-medium">조회수:</span>
              <span>{viewCount.toLocaleString()}회</span>
            </div>
          </div>
        </div>
        
        {/* 비디오 플레이어 - 모바일에서만 렌더링 */}
        {isMobile && (
          <VideoPlayer
            youtubeId={youtubeId}
            selectedTranscriptIndex={selectedTranscriptIndex}
            transcripts={transcripts}
            onTimeUpdate={handleTimeUpdate}
            repeatState={repeatState}
          />
        )}
      </div>

      {/* 모바일: 스크립트 섹션 (스크롤 가능) */}
      <div className="lg:hidden flex-1 overflow-y-auto px-4 py-4">
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
        />
      </div>

      {/* 데스크톱: 기존 레이아웃 */}
      <div className="hidden lg:block">
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
        <div className="flex flex-wrap gap-3 mb-4 text-sm">
          {channelName && (
            <div className="flex items-center gap-1 px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full">
              <span className="font-medium">채널:</span>
              <span>{channelName}</span>
            </div>
          )}
          {categoryName && (
            <div className="flex items-center gap-1 px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full">
              <span className="font-medium">카테고리:</span>
              <span>{categoryName}</span>
            </div>
          )}
          <div className="flex items-center gap-1 px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full">
            <span className="font-medium">조회수:</span>
            <span>{viewCount.toLocaleString()}회</span>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 왼쪽: 비디오 플레이어 - 데스크톱에서만 렌더링 */}
          <div className="lg:sticky lg:top-4 lg:self-start h-fit">
            {!isMobile && (
              <VideoPlayer
                youtubeId={youtubeId}
                selectedTranscriptIndex={selectedTranscriptIndex}
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
          </div>

          {/* 오른쪽: 스크립트 목록 */}
          <div className="space-y-4 lg:overflow-y-auto lg:max-h-[calc(100vh-12rem)]">
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
            />
          </div>
        </div>
      </div>

      {/* 편집 모달 */}
      {editModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">비디오 정보 수정</h2>
            
            <div className="space-y-4">
              {/* 제목 */}
              <div>
                <label className="block text-sm font-semibold mb-2">제목</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                  placeholder="비디오 제목"
                />
              </div>

              {/* 설명 */}
              <div>
                <label className="block text-sm font-semibold mb-2">설명</label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border rounded-lg resize-y dark:bg-gray-700 dark:border-gray-600"
                  placeholder="영상 설명을 입력하세요"
                />
              </div>

              {/* 카테고리 */}
              <div>
                <label className="block text-sm font-semibold mb-2">카테고리</label>
                <select
                  value={editCategoryId ?? ''}
                  onChange={(e) => setEditCategoryId(e.target.value === '' ? null : e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                >
                  <option value="">카테고리 선택 없음</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* 버튼 */}
            <div className="flex flex-wrap gap-3 mt-6 justify-between">
              <button
                onClick={handleSaveVideo}
                disabled={isSaving}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold disabled:opacity-50"
              >
                {isSaving ? '저장 중...' : '저장'}
              </button>
              <button
                onClick={() => setEditModalOpen(false)}
                disabled={isSaving}
                className="flex-1 bg-gray-300 hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-800 dark:text-white px-4 py-2 rounded-lg font-semibold disabled:opacity-50"
              >
                취소
              </button>
              <DeleteVideoButton videoId={videoId} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
