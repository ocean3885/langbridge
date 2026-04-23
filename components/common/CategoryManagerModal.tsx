'use client';

import { useState, useEffect } from 'react';
import { 
  Plus, 
  X, 
  Edit2, 
  Trash2, 
  Check, 
  Loader2, 
  ChevronRight,
  FolderPlus,
  ArrowRight
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { 
  addVideoToLearningCategory, 
  removeVideoFromLearningCategory,
  removeVideoFromMyLearning
} from '@/app/actions/user-category-videos';
import { 
  createUserCategoryAction, 
  updateUserCategoryAction, 
  deleteUserCategoryAction 
} from '@/app/actions/categories';

interface Category {
  id: number;
  name: string;
  language_id: number | null;
  video_count?: number;
}

interface CategoryManagerModalProps {
  videoId: string;
  isOpen: boolean;
  onClose: () => void;
  initialCategories: Category[];
  selectedCategoryIds: number[];
  languageId: number | null;
}

export default function CategoryManagerModal({
  videoId,
  isOpen,
  onClose,
  initialCategories,
  selectedCategoryIds,
  languageId
}: CategoryManagerModalProps) {
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [activeTab, setActiveTab] = useState<'list' | 'add' | 'edit'>('list');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [loadingIds, setLoadingIds] = useState<Set<number>>(new Set());
  const [globalLoading, setGlobalLoading] = useState(false);
  const router = useRouter();

  if (!isOpen) return null;

  const handleToggleMapping = async (categoryId: number, isSelected: boolean) => {
    setLoadingIds(prev => new Set(prev).add(categoryId));
    try {
      if (isSelected) {
        await removeVideoFromLearningCategory({ categoryId, videoId });
      } else {
        // 기존에 선택된 게 있으면 먼저 모두 제거 (단일 카테고리 정책인 경우)
        // 만약 다중 카테고리 허용하고 싶다면 Promise.all 제거
        const removePromises = selectedCategoryIds.map(id => 
          removeVideoFromLearningCategory({ categoryId: id, videoId })
        );
        await Promise.all(removePromises);
        await addVideoToLearningCategory({ categoryId, videoId });
      }
      router.refresh();
      // selectedCategoryIds는 부모에서 관리되므로 닫지 않아도 됨 (상태 반영은 refresh로)
    } catch (err) {
      console.error(err);
      alert('매핑 업데이트 실패');
    } finally {
      setLoadingIds(prev => {
        const next = new Set(prev);
        next.delete(categoryId);
        return next;
      });
    }
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return;
    setGlobalLoading(true);
    try {
      const res = await createUserCategoryAction({
        name: newCategoryName.trim(),
        languageId: languageId
      });
      if (res.success && res.category) {
        setCategories(prev => [...prev, res.category as Category].sort((a, b) => a.name.localeCompare(b.name)));
        setNewCategoryName('');
        setActiveTab('list');
      } else {
        alert(res.error || '생성 실패');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setGlobalLoading(false);
    }
  };

  const handleUpdateCategory = async () => {
    if (!editingCategory || !newCategoryName.trim()) return;
    setGlobalLoading(true);
    try {
      const res = await updateUserCategoryAction({
        id: editingCategory.id,
        name: newCategoryName.trim()
      });
      if (res.success) {
        setCategories(prev => prev.map(c => c.id === editingCategory.id ? { ...c, name: newCategoryName.trim() } : c));
        setNewCategoryName('');
        setEditingCategory(null);
        setActiveTab('list');
      } else {
        alert(res.error || '수정 실패');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setGlobalLoading(false);
    }
  };

  const handleDeleteCategory = async (id: number) => {
    const cat = categories.find(c => c.id === id);
    const count = cat?.video_count || 0;
    
    let confirmMsg = '정말 삭제하시겠습니까?';
    if (count > 0) {
      confirmMsg = `이 카테고리에 ${count}개의 영상이 담겨 있습니다. 삭제 시 모든 연결이 해제됩니다. 정말 삭제하시겠습니까?`;
    } else {
      confirmMsg = '정말 삭제하시겠습니까? 이 카테고리에 담긴 모든 영상 연결이 해제됩니다.';
    }

    if (!confirm(confirmMsg)) return;
    setGlobalLoading(true);
    try {
      const res = await deleteUserCategoryAction(id);
      if (res.success) {
        setCategories(prev => prev.filter(c => c.id !== id));
      } else {
        alert(res.error || '삭제 실패');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setGlobalLoading(false);
    }
  };

  const handleRemoveFromLearning = async () => {
    if (!confirm('정말 이 영상을 학습 목록에서 삭제하시겠습니까?\n모든 학습 이력과 데이터가 영구적으로 삭제되며 복구할 수 없습니다.')) return;
    
    setGlobalLoading(true);
    try {
      const res = await removeVideoFromMyLearning(videoId);
      if (res.success) {
        onClose();
        router.refresh();
      } else {
        alert(res.error || '삭제 실패');
      }
    } catch (err) {
      console.error(err);
      alert('삭제 도중 오류가 발생했습니다.');
    } finally {
      setGlobalLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 py-10 animate-in fade-in duration-300">
      <div className="bg-white dark:bg-gray-900 w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-full">
        {/* 헤더 */}
        <div className="px-6 py-5 border-b dark:border-gray-800 flex items-center justify-between bg-gray-50/50 dark:bg-gray-800/30">
          <h3 className="font-extrabold text-xl text-gray-900 dark:text-white">카테고리 관리</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* 탭/네비게이션 */}
        {activeTab === 'list' && (
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            <button 
              onClick={() => {
                setActiveTab('add');
                setNewCategoryName('');
              }}
              className="w-full mb-4 flex items-center justify-center gap-2 py-4 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-2xl border-2 border-dashed border-emerald-200 dark:border-emerald-800/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-all font-bold group"
            >
              <FolderPlus className="w-5 h-5 group-hover:scale-110 transition-transform" />
              <span>새 카테고리 만들기</span>
            </button>

            <div className="space-y-2">
              {categories.map(cat => {
                const isSelected = selectedCategoryIds.includes(cat.id);
                const isLoading = loadingIds.has(cat.id);

                return (
                  <div key={cat.id} className="group relative bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-2xl hover:border-emerald-300 dark:hover:border-emerald-800 p-1 pr-3 transition-all flex items-center">
                    <button 
                      onClick={() => handleToggleMapping(cat.id, isSelected)}
                      disabled={isLoading}
                      className={`flex-1 flex items-center gap-3 p-3 rounded-xl transition-colors ${isSelected ? 'bg-emerald-50 dark:bg-emerald-900/10' : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${isSelected ? 'bg-emerald-500 text-white shadow-lg ring-4 ring-emerald-100 dark:ring-emerald-900/30' : 'bg-gray-100 dark:bg-gray-700 text-gray-400'}`}>
                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : isSelected ? <Check className="w-5 h-5" /> : <div className="w-2 h-2 rounded-full bg-current opacity-30" />}
                      </div>
                      <div className="flex flex-col truncate">
                        <span className={`font-bold truncate ${isSelected ? 'text-emerald-700 dark:text-emerald-400' : 'text-gray-700 dark:text-gray-300'}`}>
                          {cat.name}
                        </span>
                      </div>
                    </button>

                    <div className="flex gap-1">
                      <button 
                        onClick={() => {
                          setEditingCategory(cat);
                          setNewCategoryName(cat.name);
                          setActiveTab('edit');
                        }}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-400 hover:text-blue-500 transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDeleteCategory(cat.id)}
                        className="p-2 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {(activeTab === 'add' || activeTab === 'edit') && (
          <div className="p-6 space-y-6">
            <button 
              onClick={() => setActiveTab('list')}
              className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 font-bold mb-2 group"
            >
              <ArrowRight className="w-4 h-4 rotate-180 group-hover:-translate-x-1 transition-transform" />
              목록으로 돌아가기
            </button>
            
            <div>
              <h4 className="text-xl font-extrabold mb-4">{activeTab === 'add' ? '새 카테고리' : '카테고리 수정'}</h4>
              <input
                autoFocus
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="카테고리 명칭 (예: 일상 회화, 뉴스)"
                className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 rounded-2xl focus:border-emerald-500 dark:focus:border-emerald-600 outline-none transition-all font-bold"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !globalLoading) {
                    activeTab === 'add' ? handleCreateCategory() : handleUpdateCategory();
                  }
                }}
              />
            </div>

            <button
              onClick={activeTab === 'add' ? handleCreateCategory : handleUpdateCategory}
              disabled={globalLoading || !newCategoryName.trim()}
              className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black shadow-xl shadow-emerald-600/20 disabled:opacity-50 disabled:shadow-none transition-all flex items-center justify-center gap-2"
            >
              {globalLoading ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <>
                  <Check className="w-6 h-6" />
                  <span>{activeTab === 'add' ? '생성 완료' : '수정 완료'}</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* 푸터 */}
        <div className="p-4 px-6 border-t dark:border-gray-800 bg-gray-50/30 dark:bg-gray-800/20 flex flex-col gap-3">
          <button
            onClick={handleRemoveFromLearning}
            disabled={globalLoading}
            className="w-full py-2.5 text-xs font-bold text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-xl transition-all border border-red-100 dark:border-red-900/30"
          >
            학습 목록에서 이 영상 삭제 (이력 포함)
          </button>
          <div className="text-[11px] text-gray-400 text-center font-medium">
            카테고리를 클릭하면 해당 영상이 이동 또는 담깁니다.
          </div>
        </div>
      </div>
    </div>
  );
}
