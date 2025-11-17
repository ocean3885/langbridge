'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import VideoPlayer from '@/components/VideoPlayer';
import TranscriptDisplay from '@/components/TranscriptDisplay';
import { updateVideo } from '@/app/actions/videos';
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
  languageId: number | null;
  transcripts: TranscriptWithTranslation[];
  userNotes: Record<string, { id: string; content: string }>;
  isAdmin: boolean;
}

export default function VideoLearningClient({
  videoId,
  youtubeId,
  title,
  languageId,
  transcripts,
  userNotes,
  isAdmin,
}: VideoLearningClientProps) {
  const [currentTime, setCurrentTime] = useState(0);
  const [selectedTranscriptIndex, setSelectedTranscriptIndex] = useState<number | null>(null);
  // 반복 상태: none | single | range
  const [repeatState, setRepeatState] = useState<{ type: 'none' | 'single' | 'range', index1: number | null, index2: number | null }>({ type: 'none', index1: null, index2: null });
  
  // 편집 모달 상태
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editTitle, setEditTitle] = useState(title);
  const [editLanguageId, setEditLanguageId] = useState<number | null>(languageId);
  const [languages, setLanguages] = useState<{ id: number; name_ko: string; name_en: string }[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const router = useRouter();

  // 언어 목록 가져오기
  useEffect(() => {
    if (isAdmin) {
      fetch('/api/admin/languages')
        .then(res => res.json())
        .then(data => setLanguages(data))
        .catch(err => console.error('언어 목록 불러오기 오류:', err));
    }
  }, [isAdmin]);

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
    setEditLanguageId(languageId);
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
    <div className="container mx-auto px-4 py-8">
      {/* 뒤로가기 버튼 행 */}
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
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 왼쪽: 비디오 플레이어 */}
        <div className="lg:sticky lg:top-4 h-fit">
          <VideoPlayer
            youtubeId={youtubeId}
            selectedTranscriptIndex={selectedTranscriptIndex}
            transcripts={transcripts}
            onTimeUpdate={handleTimeUpdate}
            repeatState={repeatState}
          />
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
        <div className="space-y-4">
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

              {/* 언어 */}
              <div>
                <label className="block text-sm font-semibold mb-2">언어</label>
                <select
                  value={editLanguageId || ''}
                  onChange={(e) => setEditLanguageId(e.target.value ? Number(e.target.value) : null)}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                >
                  <option value="">언어 선택</option>
                  {languages.map((lang) => (
                    <option key={lang.id} value={lang.id}>
                      {lang.name_ko} ({lang.name_en})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* 버튼 */}
            <div className="flex gap-3 mt-6">
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
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
