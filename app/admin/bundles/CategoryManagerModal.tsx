'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Trash2, Edit2, Check, Loader2 } from 'lucide-react';
import { listCategories, createCategory, updateCategory, deleteCategory } from '@/lib/supabase/services/bundles';

interface Category {
  id: string;
  name: string;
  description: string | null;
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
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editName, setEditName] = useState('');

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
    if (!newCategoryName.trim()) return;
    try {
      await createCategory({ name: newCategoryName.trim(), order_index: categories.length });
      setNewCategoryName('');
      fetchCategories();
      onRefresh();
    } catch (e) {
      alert('카테고리 생성 중 오류가 발생했습니다.');
    }
  };

  const handleUpdate = async (id: string) => {
    if (!editName.trim()) return;
    try {
      await updateCategory(id, { name: editName.trim() });
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
            className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden"
          >
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">카테고리 관리</h2>
              <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Create Input */}
              <div className="flex gap-2">
                <input 
                  type="text"
                  placeholder="새 카테고리 이름"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                  className="flex-1 px-4 py-2 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all"
                />
                <button 
                  onClick={handleCreate}
                  disabled={!newCategoryName.trim()}
                  className="p-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center"
                >
                  <Plus className="w-6 h-6" />
                </button>
              </div>

              {/* List */}
              <div className="max-h-[300px] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                {isLoading ? (
                  <div className="flex items-center justify-center py-10">
                    <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                  </div>
                ) : categories.length === 0 ? (
                  <p className="text-center py-10 text-gray-400">카테고리가 없습니다.</p>
                ) : (
                  categories.map(cat => (
                    <div key={cat.id} className="flex items-center gap-2 group p-2 rounded-xl hover:bg-gray-50 transition-colors">
                      {editingId === cat.id ? (
                        <>
                          <input 
                            autoFocus
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleUpdate(cat.id)}
                            className="flex-1 px-3 py-1 border border-blue-200 rounded-lg outline-none"
                          />
                          <button onClick={() => handleUpdate(cat.id)} className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg">
                            <Check className="w-4 h-4" />
                          </button>
                          <button onClick={() => setEditingId(null)} className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg">
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <>
                          <span className="flex-1 font-medium text-gray-700">{cat.name}</span>
                          <button 
                            onClick={() => { setEditingId(cat.id); setEditName(cat.name); }}
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleDelete(cat.id)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
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
