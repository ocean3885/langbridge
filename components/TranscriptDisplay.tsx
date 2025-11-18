'use client';

import { useState, useRef, useEffect } from 'react';
import { saveNote, deleteNote } from '@/app/actions/notes';
import { updateTranscript } from '@/app/actions/transcripts';
import { StickyNote, Trash2, Edit3 } from 'lucide-react';

interface TranscriptWithTranslation {
  id: string;
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

interface TranscriptDisplayProps {
  videoId: string;
  transcripts: TranscriptWithTranslation[];
  currentTime: number;
  selectedTranscriptIndex: number | null;
  onSelectTranscript: (index: number | null) => void;
  userNotes: Record<string, { id: string; content: string }>;
  repeatState: { type: 'none' | 'single' | 'range', index1: number | null, index2: number | null };
  onRepeat: (index: number) => void;
  isAdmin: boolean;
}

export default function TranscriptDisplay({
  videoId,
  transcripts,
  currentTime,
  selectedTranscriptIndex, // eslint-disable-line @typescript-eslint/no-unused-vars
  onSelectTranscript,
  userNotes,
  repeatState,
  onRepeat,
  isAdmin,
}: TranscriptDisplayProps) {
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [currentTranscriptId, setCurrentTranscriptId] = useState<string | null>(null);
  const [noteContent, setNoteContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  
  // 편집 모달 상태
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingTranscript, setEditingTranscript] = useState<{
    id: string;
    start: number;
    duration: number;
    textOriginal: string;
    textTranslated: string;
  } | null>(null);
  // 시간 미세 조정 (0.1초 단위)
  const adjustStart = (delta: number) => {
    setEditingTranscript(prev => {
      if (!prev) return prev;
      const nextStart = Math.max(0, parseFloat((prev.start + delta).toFixed(3)));
      return { ...prev, start: nextStart };
    });
  };
  const adjustEnd = (delta: number) => {
    setEditingTranscript(prev => {
      if (!prev) return prev;
      const end = prev.start + prev.duration;
      let nextEnd = parseFloat((end + delta).toFixed(3));
      if (nextEnd < prev.start + 0.1) {
        nextEnd = prev.start + 0.1; // 최소 0.1초 유지
      }
      const nextDuration = parseFloat((nextEnd - prev.start).toFixed(3));
      return { ...prev, duration: nextDuration };
    });
  };

  // Forward-fit: 이전 구간 끝 + 0.01로 시작시간을 자동 맞춤
  const forwardFit = () => {
    setEditingTranscript(prev => {
      if (!prev) return prev;
      const idx = transcripts.findIndex(t => t.id === prev.id);
      if (idx <= 0) return prev; // 이전 항목 없음
      const prevItem = transcripts[idx - 1];
      const newStart = parseFloat((prevItem.start + prevItem.duration + 0.01).toFixed(3));
      const oldEnd = parseFloat((prev.start + prev.duration).toFixed(3));
    let newDuration = parseFloat((oldEnd - newStart).toFixed(3));
    if (newDuration < 0.1) newDuration = 0.1;
      return { ...prev, start: Math.max(0, newStart), duration: newDuration };
    });
  };

  // Backward-fit: 다음 구간 시작 - 0.01로 끝 시간을 맞춤
  const backwardFit = () => {
    setEditingTranscript(prev => {
      if (!prev) return prev;
      const idx = transcripts.findIndex(t => t.id === prev.id);
      if (idx === -1 || idx >= transcripts.length - 1) return prev; // 다음 항목 없음
      const next = transcripts[idx + 1];
      const newEnd = parseFloat((next.start - 0.01).toFixed(3));
      const minEnd = parseFloat((prev.start + 0.1).toFixed(3));
      const finalEnd = newEnd <= minEnd ? minEnd : newEnd;
      const newDuration = parseFloat((finalEnd - prev.start).toFixed(3));
      return { ...prev, duration: newDuration };
    });
  };
  
  // 각 스크립트 요소에 대한 ref
  const transcriptRefs = useRef<(HTMLDivElement | null)[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  // 현재 재생 라인 계산 (겹침 처리 및 클릭 우선)
  let currentPlayingIndex = -1;

  // 클릭으로 선택된 인덱스가 있으면 우선 표시 (seek 직후 깜빡임 방지)
  if (selectedTranscriptIndex !== null) {
    currentPlayingIndex = selectedTranscriptIndex;
  } else {
    // 겹치는 구간이 있을 경우 시작 시간이 가장 늦은 항목을 선택
    const candidates = transcripts
      .map((t, idx) => ({ t, idx }))
      .filter(({ t }) => currentTime >= t.start && currentTime < t.start + t.duration);
    if (candidates.length > 0) {
      const best = candidates.reduce((a, b) => (
        a.t.start === b.t.start ? (a.idx > b.idx ? a : b) : (a.t.start > b.t.start ? a : b)
      ));
      currentPlayingIndex = best.idx;
    }
  }

  // 반복 중일 때 하이라이트 보정
  if (repeatState.type === 'single' && repeatState.index1 !== null) {
    currentPlayingIndex = repeatState.index1;
  }
  if (repeatState.type === 'range' && repeatState.index1 !== null && repeatState.index2 !== null) {
    // 반복 구간 내에 있으면 하이라이트, 아니면 첫 구간 인덱스로 고정
    const t1 = transcripts[repeatState.index1];
    const t2 = transcripts[repeatState.index2];
    if (t1 && t2) {
      const start = Math.min(t1.start, t2.start);
      const end = Math.max(t1.start + t1.duration, t2.start + t2.duration);
      if (!(currentTime >= start && currentTime < end)) {
        currentPlayingIndex = repeatState.index1;
      }
    }
  }

  // 현재 재생 중인 스크립트가 화면에 보이는지 체크
  useEffect(() => {
    if (currentPlayingIndex === -1) {
      setShowScrollButton(false);
      return;
    }

    const checkVisibility = () => {
      const element = transcriptRefs.current[currentPlayingIndex];
      if (!element) return;

      const rect = element.getBoundingClientRect();
      const isVisible = (
        rect.top >= 0 &&
        rect.bottom <= (window.innerHeight || document.documentElement.clientHeight)
      );

      setShowScrollButton(!isVisible);
    };

    checkVisibility();
    
    // 스크롤 이벤트 리스너
    const handleScroll = () => checkVisibility();
    const container = containerRef.current;
    window.addEventListener('scroll', handleScroll);
    container?.addEventListener('scroll', handleScroll);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      container?.removeEventListener('scroll', handleScroll);
    };
  }, [currentPlayingIndex]);

  // 현재 재생 중인 스크립트로 스크롤
  const scrollToCurrentScript = () => {
    if (currentPlayingIndex === -1) return;
    
    const element = transcriptRefs.current[currentPlayingIndex];
    if (!element) return;

    element.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    });
  };

  const handleTranscriptClick = (index: number) => {
    // 스크립트 클릭 시 해당 시점으로 이동 (순차 재생)
    onSelectTranscript(index);
  };

  const handleOpenNoteModal = (transcriptId: string) => {
    setCurrentTranscriptId(transcriptId);
    const existingNote = userNotes[transcriptId];
    setNoteContent(existingNote?.content || '');
    setNoteModalOpen(true);
  };

  const handleSaveNote = async () => {
    if (!currentTranscriptId) return;

    setIsSaving(true);
    try {
      const result = await saveNote({
        videoId,
        transcriptId: currentTranscriptId,
        content: noteContent,
      });

      if (result.success) {
        setNoteModalOpen(false);
        setCurrentTranscriptId(null);
        setNoteContent('');
      } else {
        alert(result.error || '메모 저장에 실패했습니다.');
      }
    } catch (error) {
      console.error('Save note error:', error);
      alert('메모 저장 중 오류가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteNote = async (transcriptId: string) => {
    const note = userNotes[transcriptId];
    if (!note) return;

    if (!confirm('메모를 삭제하시겠습니까?')) return;

    try {
      const result = await deleteNote(note.id, videoId);
      if (!result.success) {
        alert(result.error || '메모 삭제에 실패했습니다.');
      }
    } catch (error) {
      console.error('Delete note error:', error);
      alert('메모 삭제 중 오류가 발생했습니다.');
    }
  };

  // 스크립트 편집 모달 열기
  const handleOpenEditModal = (transcript: TranscriptWithTranslation) => {
    const translation = transcript.translations[0];
    setEditingTranscript({
      id: transcript.id,
      start: transcript.start,
      duration: transcript.duration,
      textOriginal: transcript.text_original,
      textTranslated: translation?.text_translated || '',
    });
    setEditModalOpen(true);
  };

  // 스크립트 수정 저장
  const handleSaveEdit = async () => {
    if (!editingTranscript) return;

    setIsSaving(true);
    try {
      const result = await updateTranscript({
        transcriptId: editingTranscript.id,
        videoId,
        start: editingTranscript.start,
        duration: editingTranscript.duration,
        textOriginal: editingTranscript.textOriginal,
        textTranslated: editingTranscript.textTranslated,
      });

      if (result.success) {
        setEditModalOpen(false);
        setEditingTranscript(null);
        alert('스크립트가 수정되었습니다. 페이지를 새로고침하세요.');
      } else {
        alert(result.error || '스크립트 수정에 실패했습니다.');
      }
    } catch (error) {
      console.error('Save edit error:', error);
      alert('스크립트 수정 중 오류가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  // 시간 포맷 변환 함수 (유튜브 스타일)
  const formatTime = (seconds: number) => {
    const sec = Math.floor(seconds % 60);
    const min = Math.floor((seconds / 60) % 60);
    const hour = Math.floor(seconds / 3600);
    if (hour > 0) {
      return `${hour}:${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
    } else {
      return `${min}:${String(sec).padStart(2, '0')}`;
    }
  };

  return (
    <>
      {/* 스크립트 이동 버튼 */}
      {showScrollButton && (
        <button
          onClick={scrollToCurrentScript}
          className="fixed bottom-4 right-4 md:bottom-8 md:right-8 z-50 flex items-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-all animate-bounce"
          title="현재 재생 중인 스크립트로 이동"
        >
          <span className="hidden sm:inline font-medium">스크립트 이동</span>
        </button>
      )}

      <div ref={containerRef} className="space-y-2">
        {transcripts.map((transcript, index) => {
          const isPlaying = currentPlayingIndex === index;
          const hasNote = !!userNotes[transcript.id];
          const translation = transcript.translations[0]; // 첫 번째 번역 사용

          // 반복 상태 표시
          const isRepeatSingle = repeatState.type === 'single' && repeatState.index1 === index;
          const isRepeatRange = repeatState.type === 'range' && (repeatState.index1 === index || repeatState.index2 === index);
          return (
            <div
              key={transcript.id}
              ref={(el) => { transcriptRefs.current[index] = el; }}
              className={`p-4 rounded-lg border transition-all cursor-pointer ${
                isPlaying
                  ? 'bg-blue-100 dark:bg-blue-900/20 border-blue-500'
                  : isRepeatSingle || isRepeatRange
                  ? 'ring-2 ring-green-500'
                  : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
              onClick={() => handleTranscriptClick(index)}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                    {formatTime(transcript.start)}
                  </div>
                  <div className="text-base font-medium mb-2">
                    {transcript.text_original}
                  </div>
                  {translation && (
                    <div className="text-sm text-gray-600 dark:text-gray-300">
                      {translation.text_translated}
                    </div>
                  )}
                  {hasNote && (
                    <div className="mt-2 p-2 bg-gray-100 dark:bg-gray-800 rounded text-sm">
                      {userNotes[transcript.id].content}
                    </div>
                  )}
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      onRepeat(index);
                    }}
                    className={`p-2 rounded-full transition-colors ${
                      isRepeatSingle || isRepeatRange
                        ? 'bg-green-500 text-white hover:bg-green-600'
                        : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                    }`}
                    title={isRepeatSingle || isRepeatRange ? '반복 중지' : '이 문장 반복'}
                  >
                    <span style={{fontWeight:'bold'}}>R</span>
                  </button>
                  {isAdmin && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenEditModal(transcript);
                      }}
                      className="p-2 rounded hover:bg-purple-100 dark:hover:bg-purple-900/20 text-purple-600"
                      title="스크립트 수정"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenNoteModal(transcript.id);
                    }}
                    className={`p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 ${
                      hasNote ? 'text-blue-600' : 'text-gray-400'
                    }`}
                    title="메모"
                  >
                    <StickyNote className="w-4 h-4" />
                  </button>
                  {hasNote && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteNote(transcript.id);
                      }}
                      className="p-2 rounded hover:bg-red-100 dark:hover:bg-red-900/20 text-red-600"
                      title="메모 삭제"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 메모 모달 */}
      {noteModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-4">메모 작성</h3>
            <textarea
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              className="w-full h-32 p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 resize-none"
              placeholder="메모를 입력하세요..."
            />
            <div className="flex gap-2 mt-4">
              <button
                onClick={handleSaveNote}
                disabled={isSaving || !noteContent.trim()}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? '저장 중...' : '저장'}
              </button>
              <button
                onClick={() => {
                  setNoteModalOpen(false);
                  setCurrentTranscriptId(null);
                  setNoteContent('');
                }}
                disabled={isSaving}
                className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 스크립트 편집 모달 */}
      {editModalOpen && editingTranscript && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-lg max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">스크립트 수정</h3>
            
            <div className="space-y-4">
              {/* 시작/끝 시간 조정 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 시작 시간 */}
                <div>
                  <label className="block text-sm font-medium mb-2">시작 시간 (초)</label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => adjustStart(-0.1)}
                      className="px-3 py-2 rounded bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-sm font-semibold"
                      title="시작 -0.1초"
                    >
                      -0.1
                    </button>
                    <input
                      type="number"
                      step="0.01"
                      value={editingTranscript.start}
                      onChange={(e) => setEditingTranscript({
                        ...editingTranscript,
                        start: Math.max(0, parseFloat(e.target.value) || 0),
                      })}
                      className="flex-1 p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => adjustStart(0.1)}
                      className="px-3 py-2 rounded bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-sm font-semibold"
                      title="시작 +0.1초"
                    >
                      +0.1
                    </button>
                  </div>
                  <div className="mt-2">
                    <button
                      type="button"
                      onClick={forwardFit}
                      disabled={transcripts.findIndex(t => t.id === editingTranscript?.id) <= 0}
                      className="px-3 py-1 rounded bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-sm font-semibold disabled:opacity-50"
                    >
                      Forward Fit
                    </button>
                    <p className="text-xs text-gray-500 mt-1">이전 문장의 끝에 맞춰 시작시간을 자동으로 맞춥니다.</p>
                  </div>
                </div>
                {/* 끝 시간 */}
                <div>
                  <label className="block text-sm font-medium mb-2">끝 시간 (초)</label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => adjustEnd(-0.1)}
                      className="px-3 py-2 rounded bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-sm font-semibold"
                      title="끝 -0.1초"
                    >
                      -0.1
                    </button>
                    <input
                      type="number"
                      step="0.01"
                      value={parseFloat((editingTranscript.start + editingTranscript.duration).toFixed(3))}
                      onChange={(e) => {
                        const raw = parseFloat(e.target.value);
                        if (!isNaN(raw)) {
                          const desiredEnd = Math.max(editingTranscript.start + 0.1, raw);
                          const newDuration = parseFloat((desiredEnd - editingTranscript.start).toFixed(3));
                          setEditingTranscript({ ...editingTranscript, duration: newDuration });
                        }
                      }}
                      className="flex-1 p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => adjustEnd(0.1)}
                      className="px-3 py-2 rounded bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-sm font-semibold"
                      title="끝 +0.1초"
                    >
                      +0.1
                    </button>
                  </div>
                  <div className="mt-2">
                    <button
                      type="button"
                      onClick={backwardFit}
                      disabled={(() => {
                        const i = transcripts.findIndex(t => t.id === editingTranscript?.id);
                        return i === -1 || i >= transcripts.length - 1;
                      })()}
                      className="px-3 py-1 rounded bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-sm font-semibold disabled:opacity-50"
                    >
                      Backward Fit
                    </button>
                    <p className="text-xs text-gray-500 mt-1">다음 문장의 시작에 맞춰 끝시간을 자동으로 맞춥니다.</p>
                  </div>
                  <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">지속 시간: {(editingTranscript.duration).toFixed(3)}초</p>
                </div>
              </div>

              {/* (기존) 지속 시간 직접 입력 유지 */}
              <div>
                <label className="block text-sm font-medium mb-2">지속 시간 직접 입력 (초)</label>
                <input
                  type="number"
                  step="0.01"
                  value={editingTranscript.duration}
                  onChange={(e) => setEditingTranscript({
                    ...editingTranscript,
                    duration: Math.max(0.1, parseFloat(e.target.value) || editingTranscript.duration),
                  })}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                />
              </div>

              {/* 원문 */}
              <div>
                <label className="block text-sm font-medium mb-2">원문</label>
                <textarea
                  value={editingTranscript.textOriginal}
                  onChange={(e) => setEditingTranscript({
                    ...editingTranscript,
                    textOriginal: e.target.value,
                  })}
                  className="w-full h-24 p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 resize-none"
                  placeholder="원문을 입력하세요..."
                />
              </div>

              {/* 번역 */}
              <div>
                <label className="block text-sm font-medium mb-2">번역</label>
                <textarea
                  value={editingTranscript.textTranslated}
                  onChange={(e) => setEditingTranscript({
                    ...editingTranscript,
                    textTranslated: e.target.value,
                  })}
                  className="w-full h-24 p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 resize-none"
                  placeholder="번역을 입력하세요..."
                />
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={handleSaveEdit}
                disabled={isSaving}
                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? '저장 중...' : '저장'}
              </button>
              <button
                onClick={() => {
                  setEditModalOpen(false);
                  setEditingTranscript(null);
                }}
                disabled={isSaving}
                className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50"
              >
                취소
              </button>
            </div>
            
          </div>
        </div>
      )}
    </>
  );
}
