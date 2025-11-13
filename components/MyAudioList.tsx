"use client";

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import CategoryChangeModal from './CategoryChangeModal';

type AudioItem = {
  id: string; // UUID
  title: string | null;
  created_at: string;
  audio_file_path?: string | null;
  created_label: string; // 서버에서 미리 포맷된 문자열
  study_count?: number | null;
  last_studied_at?: string | null;
  studied_label?: string; // 서버에서 미리 포맷된 문자열('-' 포함)
};

type Category = {
  id: number;
  name: string;
  languageName?: string;
};

interface Props {
  audioList: AudioItem[];
  bulkDelete: (formData: FormData) => Promise<void>;
  changeCategory: (formData: FormData) => Promise<void>;
  categories: Category[];
  recordStudy: (formData: FormData) => Promise<void>;
  selectMode: boolean;
}

export default function MyAudioList({ audioList, bulkDelete, changeCategory, categories, recordStudy, selectMode }: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isModalOpen, setIsModalOpen] = useState(false);

  const allIds = useMemo(() => audioList.map(a => a.id), [audioList]);
  const allSelected = selected.size > 0 && selected.size === allIds.length;
  const anySelected = selected.size > 0;

  const toggleOne = (id: string, checked: boolean) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const toggleAll = (checked: boolean) => {
    setSelected(() => {
      if (!checked) return new Set();
      return new Set(allIds);
    });
  };

  const onBulkDelete = async () => {
    if (!anySelected) return;
    if (!confirm(`선택한 ${selected.size}개 항목을 삭제하시겠습니까?`)) return;

    try {
      const formData = new FormData();
      formData.append('ids', JSON.stringify(Array.from(selected)));
      await bulkDelete(formData);
      // 삭제 후 최신 데이터 반영
      router.refresh();
      setSelected(new Set());
    } catch (err) {
      console.error('삭제 중 오류:', err);
      alert('삭제에 실패했습니다. 콘솔 로그를 확인하세요.');
    }
  };

  // 선택 모드가 해제되면 선택 상태/모달 초기화
  useEffect(() => {
    if (!selectMode) {
      setSelected(new Set());
      setIsModalOpen(false);
    }
  }, [selectMode]);

  const handleCategoryChange = async (categoryId: number | null) => {
    if (selected.size === 0) return;
    try {
      const formData = new FormData();
      formData.append('ids', JSON.stringify(Array.from(selected)));
      formData.append('categoryId', categoryId === null ? 'null' : String(categoryId));
      await changeCategory(formData);
      // 최신 데이터 반영
      router.refresh();
      setSelected(new Set());
    } catch (err) {
      console.error('카테고리 변경 중 오류:', err);
      alert('카테고리 변경에 실패했습니다. 콘솔 로그를 확인하세요.');
    }
  };

  return (
    <div className="space-y-4">
      {/* 선택 툴바: 선택 모드에서만 표시 */}
      {selectMode && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Checkbox
              id="select-all"
              checked={allSelected}
              onCheckedChange={(v) => toggleAll(Boolean(v))}
            />
            <label htmlFor="select-all" className="text-xs sm:text-sm">전체 선택</label>
            {anySelected && (
              <span className="text-xs text-gray-500">{selected.size}개 선택됨</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              disabled={!anySelected}
              className={`px-2.5 sm:px-3 py-1.5 sm:py-2 rounded text-xs sm:text-sm font-medium transition ${
                anySelected 
                  ? 'bg-blue-600 text-white hover:bg-blue-700' 
                  : 'bg-gray-200 text-gray-500 cursor-not-allowed'
              }`}
            >
              카테고리 변경
            </button>
            <button
              type="button"
              onClick={onBulkDelete}
              disabled={!anySelected}
              className={`px-2.5 sm:px-3 py-1.5 sm:py-2 rounded text-xs sm:text-sm font-medium transition ${
                anySelected 
                  ? 'bg-red-600 text-white hover:bg-red-700' 
                  : 'bg-gray-200 text-gray-500 cursor-not-allowed'
              }`}
            >
              삭제
            </button>
          </div>
        </div>
      )}

  {/* (서버 액션 직접 호출로 숨김 폼 제거됨) */}

      {/* 카테고리 변경 모달 */}
      <CategoryChangeModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={handleCategoryChange}
        selectedCount={selected.size}
        initialCategories={categories}
      />

      {/* 리스트 */}
      <div className="grid gap-4 sm:gap-6">
        {audioList.map(item => {
          const isChecked = selected.has(item.id);
          const onOpen = async () => {
            try {
              const fd = new FormData();
              fd.append('id', item.id);
              // fire-and-forget: 학습 기록을 기다리지 않고 재생 페이지로 이동
              recordStudy(fd);
            } finally {
              router.push(`/player/${item.id}`);
            }
          };

          return (
            <Card
              key={item.id}
              className="transition hover:shadow-md cursor-pointer relative"
              onClick={onOpen}
            >
              <CardHeader>
                <CardTitle className="text-base sm:text-xl font-semibold flex justify-between items-center gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {/* 체크박스: 선택 모드에서만 표시, 클릭 시 내비게이션 방지 */}
                    {selectMode && (
                      <Checkbox
                        checked={isChecked}
                        onCheckedChange={(v) => toggleOne(item.id, Boolean(v))}
                        onClick={(e) => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()}
                      />
                    )}
                    <span className="truncate" title={item.title || '제목 없음'}>
                      {item.title || '제목 없음'}
                    </span>
                  </div>
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm text-gray-600 flex flex-wrap gap-x-2 gap-y-1">
                  <span className="whitespace-nowrap">생성: {item.created_label}</span>
                  <span className="hidden sm:inline">•</span>
                  <span className="whitespace-nowrap">학습횟수: {typeof item.study_count === 'number' ? item.study_count : 0}회</span>
                  <span className="hidden sm:inline">•</span>
                  <span className="whitespace-nowrap">최근학습: {item.studied_label ?? '-'}</span>
                </CardDescription>
              </CardHeader>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
