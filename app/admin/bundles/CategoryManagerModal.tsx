'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Trash2, Edit2, Check, Loader2 } from 'lucide-react';
import { listCategories, createCategory, updateCategory, deleteCategory } from '@/lib/supabase/services/bundles';

interface Category {
  id: string;
  name: string;
  name_en: string | null;
  description: string | null;
  description_en: string | null;
  order_index: number;
}

export default function CategoryManagerModal({ 
  isOpen, 
  onClose,
  onRefresh
}: { 
  isOpen: boolean; 
  onClose: () => void;
  onRefresh: () => void;
}) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [newCategory, setNewCategory] = useState({
    name: '',
    name_en: ''
  });
  
  const [editCategory, setEditCategory] = useState({
    name: '',
    name_en: ''
  });

  useEffect(() => {
    if (isOpen) {
      fetchCategories();
    }
  }, [isOpen]);

  const fetchCategories = async () => {
    setIsLoading(true);
    try {
      const data = await listCategories();
      setCategories(data as Category[]);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newCategory.name.trim()) return;
    try {
      await createCategory({ 
        name: newCategory.name.trim(), 
        name_en: newCategory.name_en.trim() || undefined,
        order_index: categories.length 
      });
      setNewCategory({ name: '', name_en: '' });
      fetchCategories();
      onRefresh();
    } catch (e) {
      alert('카테고리 생성 중 오류가 발생했습니다.');
    }
  };

  const handleUpdate = async (id: string) => {
    if (!editCategory.name.trim()) return;
    try {
      await updateCategory(id, { 
        name: editCategory.name.trim(),
        name_en: editCategory.name_en.trim() || null
      });
      setEditingId(null);
      fetchCategories();
      onRefresh();
    } catch (e) {
      alert('카테고리 수정 중 오류가 발생했습니다.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('정말 삭제하시겠습니까? 관련 번들의 카테고리가 해제됩니다.')) return;
    try {
      await deleteCategory(id);
      fetchCategories();
      onRefresh();
    } catch (e) {
      alert('카테고리 삭제 중 오류가 발생했습니다.');
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden"
          >
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">카테고리 관리</h2>
              <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Create Input */}
              <div className="bg-gray-50 p-4 rounded-2xl space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input 
                    type="text"
                    placeholder="카테고리 이름 (KO)"
                    value={newCategory.name}
                    onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                    className="px-4 py-2 bg-white border border-gray-100 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all text-sm"
                  />
                  <input 
                    type="text"
                    placeholder="Category Name (EN)"
                    value={newCategory.name_en}
                    onChange={(e) => setNewCategory({ ...newCategory, name_en: e.target.value })}
                    className="px-4 py-2 bg-white border border-gray-100 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all text-sm"
                  />
                </div>
                <button 
                  onClick={handleCreate}
                  disabled={!newCategory.name.trim()}
                  className="w-full py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2 font-bold text-sm"
                >
                  <Plus className="w-4 h-4" />
                  새 카테고리 추가
                </button>
              </div>

              {/* List */}
              <div className="max-h-[400px] overflow-y-auto space-y-3 pr-1 custom-scrollbar">
                {isLoading ? (
                  <div className="flex items-center justify-center py-10">
                    <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                  </div>
                ) : categories.length === 0 ? (
                  <p className="text-center py-10 text-gray-400">카테고리가 없습니다.</p>
                ) : (
                  categories.map(cat => (
                    <div key={cat.id} className="bg-white border border-gray-100 rounded-2xl p-4 hover:border-blue-200 transition-all group">
                      {editingId === cat.id ? (
                        <div className="space-y-3">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <input 
                              autoFocus
                              type="text"
                              value={editCategory.name}
                              onChange={(e) => setEditCategory({ ...editCategory, name: e.target.value })}
                              className="px-3 py-1.5 bg-gray-50 border border-blue-200 rounded-lg outline-none text-sm"
                              placeholder="이름 (KO)"
                            />
                            <input 
                              type="text"
                              value={editCategory.name_en}
                              onChange={(e) => setEditCategory({ ...editCategory, name_en: e.target.value })}
                              className="px-3 py-1.5 bg-gray-50 border border-blue-200 rounded-lg outline-none text-sm"
                              placeholder="Name (EN)"
                            />
                          </div>
                          <div className="flex justify-end gap-2">
                            <button onClick={() => setEditingId(null)} className="px-3 py-1 text-xs font-bold text-gray-500 hover:bg-gray-100 rounded-lg transition-colors">
                              취소
                            </button>
                            <button onClick={() => handleUpdate(cat.id)} className="px-3 py-1 text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors">
                              저장
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="font-bold text-gray-900 truncate">{cat.name}</div>
                            {cat.name_en && (
                              <div className="text-xs text-gray-400 font-medium truncate">{cat.name_en}</div>
                            )}
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                            <button 
                              onClick={() => { 
                                setEditingId(cat.id); 
                                setEditCategory({ name: cat.name, name_en: cat.name_en || '' }); 
                              }}
                              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => handleDelete(cat.id)}
                              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
