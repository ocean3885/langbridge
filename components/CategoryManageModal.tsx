'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { X, Pencil, Trash2, Plus } from 'lucide-react';

interface Category {
  id: number;
  name: string;
  language_id?: number | null;
  user_id?: string;
  content_count?: number;
}

interface Language {
  id: number;
  name_ko: string;
  code: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCategoryChanged?: () => void;
  initialCategories?: Category[];
  initialLanguages?: Language[];
  apiEndpoint?: string; // API 엔드포인트 (기본값: '/api/categories')
  contentType?: string; // 콘텐츠 타입 (예: '오디오', '비디오')
}

export default function CategoryManageModal({ 
  isOpen, 
  onClose, 
  onCategoryChanged, 
  initialCategories = [], 
  initialLanguages = [],
  apiEndpoint = '/api/categories',
  contentType = '오디오'
}: Props) {
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [languages, setLanguages] = useState<Language[]>(initialLanguages);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [selectedLanguageId, setSelectedLanguageId] = useState<number | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const hasInitialized = useRef(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [categoriesRes, languagesRes] = await Promise.all([
        fetch(`${apiEndpoint}?includeCount=true`),
        fetch('/api/admin/languages')
      ]);

      if (categoriesRes.ok) {
        const categoriesData = await categoriesRes.json();
        setCategories(categoriesData);
      }

      if (languagesRes.ok) {
        const languagesData = await languagesRes.json();
        setLanguages(languagesData);
      }
    } catch (err) {
      setError('데이터 로드 중 오류가 발생했습니다.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [apiEndpoint]);

  useEffect(() => {
    if (isOpen) {
      // 모달이 열릴 때 한 번만 초기화
      if (!hasInitialized.current) {
        // 초기 데이터가 있으면 즉시 사용
        if (initialCategories.length > 0) {
          setCategories(initialCategories);
        }
        if (initialLanguages.length > 0) {
          setLanguages(initialLanguages);
          // 선택된 언어가 없으면 첫 번째 언어 선택
          if (selectedLanguageId === null) {
            setSelectedLanguageId(initialLanguages[0].id);
          }
        }
        // 초기 데이터가 없으면 로드
        if (initialCategories.length === 0 || initialLanguages.length === 0) {
          loadData();
        }
        hasInitialized.current = true;
      }
    } else {
      // 모달이 닫힐 때 상태 초기화
      setEditingId(null);
      setEditingName('');
      setError(null);
      hasInitialized.current = false;
    }
  }, [isOpen, loadData]);

  // 언어 목록이 로드되었을 때 선택된 언어가 없으면 첫 번째 언어 선택
  useEffect(() => {
    if (languages.length > 0 && selectedLanguageId === null) {
      setSelectedLanguageId(languages[0].id);
    }
  }, [languages, selectedLanguageId]);

  async function handleAdd() {
    if (!newCategoryName.trim() || !selectedLanguageId) {
      setError('카테고리 이름과 언어를 선택하세요.');
      return;
    }

    setIsAdding(true);
    setError(null);

    try {
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: newCategoryName.trim(), 
          language_id: selectedLanguageId 
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || '카테고리 추가에 실패했습니다.');
      }

      setNewCategoryName('');
      await loadData();
      if (onCategoryChanged) onCategoryChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : '카테고리 추가 중 오류가 발생했습니다.');
    } finally {
      setIsAdding(false);
    }
  }

  async function handleEdit(id: number, name: string) {
    setError(null);

    try {
      const response = await fetch(apiEndpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, name: name.trim() })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || '카테고리 수정에 실패했습니다.');
      }

      setEditingId(null);
      setEditingName('');
      await loadData();
      if (onCategoryChanged) onCategoryChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : '카테고리 수정 중 오류가 발생했습니다.');
    }
  }

  async function handleDelete(id: number) {
    const category = categories.find(c => c.id === id);
    const contentCount = category?.content_count ?? 0;
    
    let confirmMessage = '이 카테고리를 삭제하시겠습니까?';
    if (contentCount > 0) {
      confirmMessage = `이 카테고리에는 ${contentCount}개의 ${contentType} 콘텐츠가 포함되어 있습니다.\n카테고리를 삭제하면 포함된 모든 콘텐츠도 함께 삭제됩니다.\n\n정말로 삭제하시겠습니까?`;
    }
    
    if (!confirm(confirmMessage)) return;

    setError(null);

    try {
      const response = await fetch(`${apiEndpoint}?id=${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || '카테고리 삭제에 실패했습니다.');
      }

      await loadData();
      if (onCategoryChanged) onCategoryChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : '카테고리 삭제 중 오류가 발생했습니다.');
    }
  }

  function startEdit(category: Category) {
    setEditingId(category.id);
    setEditingName(category.name);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditingName('');
  }

  const categoriesByLanguage = categories.reduce((acc, cat) => {
    const langId = cat.language_id ?? 0;
    if (!acc[langId]) acc[langId] = [];
    acc[langId].push(cat);
    return acc;
  }, {} as Record<number, Category[]>);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
        {/* 헤더 */}
        <div className="sticky top-0 bg-white border-b px-3 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <h2 className="text-lg sm:text-xl font-bold">카테고리 관리</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 본문 */}
        <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
          {/* 새 카테고리 추가 */}
          <div className="bg-blue-50 rounded-lg p-3 sm:p-4 space-y-3">
            <h3 className="font-semibold text-blue-900 text-sm sm:text-base">새 카테고리 추가</h3>
            <div className="flex flex-col sm:flex-row gap-2">
              <select
                value={selectedLanguageId ?? ''}
                onChange={(e) => setSelectedLanguageId(parseInt(e.target.value))}
                disabled={isAdding}
                className="w-full sm:w-auto border border-gray-300 rounded-md px-2 sm:px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
              >
                {languages.map((lang) => (
                  <option key={lang.id} value={lang.id}>
                    {lang.name_ko}
                  </option>
                ))}
              </select>
              <input
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="카테고리 이름"
                disabled={isAdding}
                className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAdd();
                  }
                }}
              />
              <button
                onClick={handleAdd}
                disabled={isAdding || !newCategoryName.trim()}
                className="w-full sm:w-auto px-3 sm:px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
              >
                <Plus className="w-4 h-4" />
                추가
              </button>
            </div>
          </div>

          {/* 에러 메시지 */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <p className="text-red-800 text-sm">❌ {error}</p>
            </div>
          )}

          {/* 카테고리 목록 */}
          {loading ? (
            <div className="text-center py-8 text-gray-500">로딩 중...</div>
          ) : categories.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              카테고리가 없습니다. 위에서 추가해보세요.
            </div>
          ) : (
            <div className="space-y-4 sm:space-y-6">
              {Object.entries(categoriesByLanguage).map(([langId, cats]) => {
                const language = languages.find(l => l.id === parseInt(langId));
                return (
                  <div key={langId} className="space-y-2">
                    <h4 className="font-semibold text-gray-700 text-xs sm:text-sm">
                      {language ? language.name_ko : '언어 미지정'}
                    </h4>
                    <div className="space-y-2">
                      {cats.map((category) => (
                        <div
                          key={category.id}
                          className="flex items-center gap-2 p-2 sm:p-3 bg-gray-50 rounded-md hover:bg-gray-100 transition-colors"
                        >
                          {editingId === category.id ? (
                            <>
                              <input
                                type="text"
                                value={editingName}
                                onChange={(e) => setEditingName(e.target.value)}
                                className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    handleEdit(category.id, editingName);
                                  } else if (e.key === 'Escape') {
                                    cancelEdit();
                                  }
                                }}
                                autoFocus
                              />
                              <button
                                onClick={() => handleEdit(category.id, editingName)}
                                className="px-2 sm:px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-xs sm:text-sm whitespace-nowrap"
                              >
                                저장
                              </button>
                              <button
                                onClick={cancelEdit}
                                className="px-2 sm:px-3 py-1 bg-gray-500 hover:bg-gray-600 text-white rounded text-xs sm:text-sm whitespace-nowrap"
                              >
                                취소
                              </button>
                            </>
                          ) : (
                            <>
                              <span className="flex-1 font-medium text-sm sm:text-base break-all">{category.name}</span>
                              <span className="text-xs sm:text-sm text-gray-500 whitespace-nowrap">({category.content_count ?? 0})</span>
                              <button
                                onClick={() => startEdit(category)}
                                className="p-2 hover:bg-blue-100 rounded transition-colors"
                                title="수정"
                              >
                                <Pencil className="w-4 h-4 text-blue-600" />
                              </button>
                              <button
                                onClick={() => handleDelete(category.id)}
                                className="p-2 hover:bg-red-100 rounded transition-colors"
                                title="삭제"
                              >
                                <Trash2 className="w-4 h-4 text-red-600" />
                              </button>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 푸터 */}
        <div className="sticky bottom-0 bg-gray-50 border-t px-3 sm:px-6 py-3 sm:py-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-3 sm:px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md font-medium text-sm"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
