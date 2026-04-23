'use client';

import { useState, useEffect } from 'react';
import { Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { updateVideo } from '@/app/actions/videos';
import { deleteVideo as deleteVideoAction } from '@/app/actions/video';
import type { VideoVisibility } from '@/lib/supabase/services/videos';

const VIDEO_VISIBILITY_OPTIONS: Array<{ value: VideoVisibility; label: string }> = [
  { value: 'public', label: '공개' },
  { value: 'private', label: '비공개' },
  { value: 'members_only', label: '회원 공개' },
];

function DeleteVideoButton({ videoId, backUrl }: { videoId: string; backUrl: string }) {
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();

  const onDelete = async () => {
    if (!confirm('정말 이 영상을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) return;
    setDeleting(true);
    const res = await deleteVideoAction(videoId);
    setDeleting(false);
    if (res.success) {
      alert('영상이 삭제되었습니다.');
      router.push(backUrl);
    } else {
      alert(`삭제 실패: ${res.error}`);
    }
  };
  return (
    <button
      onClick={onDelete}
      disabled={deleting}
      className="p-2 rounded hover:bg-red-100 dark:hover:bg-red-900/20 text-red-600 disabled:opacity-50"
      title={deleting ? '삭제 중...' : '영상 삭제'}
    >
      <Trash2 className="w-5 h-5" />
    </button>
  );
}

interface EditVideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoId: string;
  initialTitle: string;
  initialDescription: string | null;
  initialVisibility: VideoVisibility;
  initialLanguageId: number | null;
  initialCategoryId: number | null;
  canEditVisibility: boolean;
  backUrl: string;
}

export default function EditVideoModal({
  isOpen,
  onClose,
  videoId,
  initialTitle,
  initialDescription,
  initialVisibility,
  initialLanguageId,
  initialCategoryId,
  canEditVisibility,
  backUrl,
}: EditVideoModalProps) {
  const [editTitle, setEditTitle] = useState(initialTitle);
  const [editDescription, setEditDescription] = useState<string>(initialDescription || '');
  const [editVisibility, setEditVisibility] = useState<VideoVisibility>(initialVisibility);
  const [editLanguageId, setEditLanguageId] = useState<number | null>(initialLanguageId);
  const [editCategoryId, setEditCategoryId] = useState<number | null>(initialCategoryId);
  const [categories, setCategories] = useState<{ id: string; name: string; language_id: number | null }[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // 모달이 열릴 때마다 초기값 동기화
  useEffect(() => {
    if (isOpen) {
      setEditTitle(initialTitle);
      setEditDescription(initialDescription || '');
      setEditVisibility(initialVisibility);
      setEditLanguageId(initialLanguageId);
      setEditCategoryId(initialCategoryId);
    }
  }, [isOpen, initialTitle, initialDescription, initialVisibility, initialLanguageId, initialCategoryId]);

  // 카테고리 목록 가져오기
  useEffect(() => {
    if (isOpen) {
      fetch('/api/user-categories')
        .then(res => res.json())
        .then(data => setCategories(Array.isArray(data) ? data : []))
        .catch(err => console.error('카테고리 목록 불러오기 오류:', err));
    }
  }, [isOpen]);

  // 카테고리 변경 시 카테고리의 언어로 자동 변경
  useEffect(() => {
    if (editCategoryId !== null && categories.length > 0) {
      const cat = categories.find(c => Number(c.id) === Number(editCategoryId));
      if (cat) {
        setEditLanguageId(cat.language_id ?? null);
      }
    }
  }, [editCategoryId, categories]);

  const handleSaveVideo = async () => {
    if (!editTitle.trim()) {
      alert('제목을 입력해주세요.');
      return;
    }

    setIsSaving(true);

    const result = await updateVideo({
      videoId,
      title: editTitle.trim(),
      visibility: editVisibility,
      languageId: editLanguageId,
      categoryId: editCategoryId === null ? null : String(editCategoryId),
      description: editDescription.trim() || null,
    });

    setIsSaving(false);
    if (result.success) {
      alert('저장되었습니다.');
      onClose();
      window.location.reload(); // 페이지 새로고침으로 변경사항 반영
    } else {
      alert(`저장 실패: ${result.error}`);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">비디오 정보 수정</h2>
          <DeleteVideoButton videoId={videoId} backUrl={backUrl} />
        </div>
        
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

          {canEditVisibility ? (
            <div>
              <label className="block text-sm font-semibold mb-2">공개 범위</label>
              <select
                value={editVisibility}
                onChange={(e) => setEditVisibility(e.target.value as VideoVisibility)}
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
              >
                {VIDEO_VISIBILITY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
          ) : null}

          {/* 카테고리 */}
          <div>
            <label className="block text-sm font-semibold mb-2">카테고리</label>
            <select
              value={editCategoryId ?? ''}
              onChange={(e) => setEditCategoryId(e.target.value === '' ? null : Number(e.target.value))}
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
        <div className="flex gap-3 mt-6">
          <button
            onClick={handleSaveVideo}
            disabled={isSaving}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold disabled:opacity-50"
          >
            {isSaving ? '저장 중...' : '저장'}
          </button>
          <button
            onClick={onClose}
            disabled={isSaving}
            className="flex-1 bg-gray-300 hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-800 dark:text-white px-4 py-2 rounded-lg font-semibold disabled:opacity-50"
          >
            취소
          </button>
        </div>
      </div>
    </div>
  );
}
