'use client';

import { useState, useRef, useEffect } from 'react';
import { Plus, Check, Loader2 } from 'lucide-react';
import { addVideoToLearningCategory, removeVideoFromLearningCategory } from '@/app/actions/user-category-videos';
import { useRouter } from 'next/navigation';
import CategoryManagerModal from '@/components/common/CategoryManagerModal';

interface Category {
  id: number;
  name: string;
  language_id?: number | null;
}

interface CategoryAddButtonProps {
  videoId: string;
  allCategories: Category[];
  selectedCategoryIds: number[];
}

export default function CategoryAddButton({ videoId, allCategories, selectedCategoryIds }: CategoryAddButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isManagerOpen, setIsManagerOpen] = useState(false);
  const [loadingIds, setLoadingIds] = useState<Set<number>>(new Set());
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // 드롭다운 외부 클릭 시 닫기
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleCategory = async (categoryId: number, isSelected: boolean) => {
    // 로딩 UI를 위해 클릭한 카테고리와 기존 선택된 카테고리 모두 로딩 상태로 만듭니다.
    const newLoadingIds = new Set(loadingIds);
    newLoadingIds.add(categoryId);
    if (!isSelected) {
      selectedCategoryIds.forEach(id => newLoadingIds.add(id));
    }
    setLoadingIds(newLoadingIds);
    
    try {
      if (isSelected) {
        // 이미 선택된 것을 누르면 제거 (카테고리 미지정 상태로 만들기)
        await removeVideoFromLearningCategory({ categoryId, videoId });
      } else {
        // 새로운 카테고리를 선택하면 기존에 선택되어 있던 모든 카테고리에서 제거 (이동 개념)
        const removePromises = selectedCategoryIds.map(oldCatId => 
          removeVideoFromLearningCategory({ categoryId: oldCatId, videoId })
        );
        if (removePromises.length > 0) {
          await Promise.all(removePromises);
        }
        
        // 새 카테고리에 추가
        await addVideoToLearningCategory({ categoryId, videoId });
      }
      // 간단한 동기화를 위해 새로고침
      router.refresh();
    } catch (error) {
      console.error('Failed to toggle category:', error);
      alert('카테고리 업데이트에 실패했습니다.');
    } finally {
      setLoadingIds(new Set()); // 로딩 상태 초기화
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={(e) => {
          e.preventDefault();
          setIsOpen(!isOpen);
        }}
        className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
          isOpen 
            ? 'bg-emerald-600 text-white' 
            : 'bg-white text-emerald-600 border border-emerald-200 hover:bg-emerald-50'
        }`}
      >
        <Plus className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-45' : ''}`} />
        담기
      </button>

      {isOpen && (
        <div className="absolute right-0 bottom-full mb-2 w-48 bg-white rounded-xl shadow-2xl border border-gray-100 py-2 z-50 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="px-3 py-2 border-b border-gray-50 mb-1">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">내 카테고리 선택</p>
          </div>
          <div className="max-h-48 overflow-y-auto custom-scrollbar">
            {allCategories.length === 0 ? (
              <div className="px-4 py-3 text-center">
                <p className="text-xs text-gray-500 italic">생성된 카테고리가 없습니다.</p>
                <button 
                  onClick={() => {
                    setIsOpen(false);
                    setIsManagerOpen(true);
                  }} 
                  className="text-[10px] text-emerald-600 font-bold hover:underline mt-2 inline-block"
                >
                  카테고리 만들기
                </button>
              </div>
            ) : (
              allCategories.map((cat) => {
                const isSelected = selectedCategoryIds.includes(cat.id);
                const isLoading = loadingIds.has(cat.id);

                return (
                  <button
                    key={cat.id}
                    disabled={isLoading}
                    onClick={(e) => {
                      e.preventDefault();
                      toggleCategory(cat.id, isSelected);
                    }}
                    className="w-full flex items-center justify-between px-4 py-2 hover:bg-emerald-50 transition-colors text-left"
                  >
                    <span className={`text-sm ${isSelected ? 'text-emerald-700 font-bold' : 'text-gray-600'}`}>
                      {cat.name}
                    </span>
                    {isLoading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                    ) : isSelected ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : null}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}

      {isManagerOpen && (
        <CategoryManagerModal
          videoId={videoId}
          isOpen={isManagerOpen}
          onClose={() => setIsManagerOpen(false)}
          initialCategories={allCategories as any}
          selectedCategoryIds={selectedCategoryIds}
          languageId={null}
        />
      )}
    </div>
  );
}
