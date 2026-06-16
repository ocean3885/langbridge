'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Trash2, Edit2, Loader2, ImageIcon, Upload, MoveUp, MoveDown } from 'lucide-react';
import {
  listCategories,
  createCategory,
  updateCategory,
  updateCategoryOrder,
  deleteCategory,
} from '@/lib/supabase/services/bundles';
import { uploadThumbnail } from '@/lib/supabase/services/storage';
import { compressImageForUpload } from '@/lib/image-compression';

const CATEGORY_ICON_MAX_WIDTH = 500;

interface Category {
  id: string;
  name: string;
  name_en: string | null;
  description: string | null;
  description_en: string | null;
  icon_image_url: string | null;
  category_image_url: string | null;
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
  const [isUploadingNewIcon, setIsUploadingNewIcon] = useState(false);
  const [uploadingEditIconId, setUploadingEditIconId] = useState<string | null>(null);
  const [orderingCategoryId, setOrderingCategoryId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [newCategory, setNewCategory] = useState({
    name: '',
    name_en: '',
    description: '',
    description_en: '',
    icon_image_url: '',
    category_image_url: ''
  });
  
  const [editCategory, setEditCategory] = useState({
    name: '',
    name_en: '',
    description: '',
    description_en: '',
    icon_image_url: '',
    category_image_url: ''
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
        description: newCategory.description.trim() || null,
        description_en: newCategory.description_en.trim() || null,
        icon_image_url: newCategory.icon_image_url.trim() || null,
        category_image_url: newCategory.category_image_url.trim() || null,
        order_index: categories.length 
      });
      setNewCategory({ name: '', name_en: '', description: '', description_en: '', icon_image_url: '', category_image_url: '' });
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
        name_en: editCategory.name_en.trim() || null,
        description: editCategory.description.trim() || null,
        description_en: editCategory.description_en.trim() || null,
        icon_image_url: editCategory.icon_image_url.trim() || null,
        category_image_url: editCategory.category_image_url.trim() || null
      });
      setEditingId(null);
      fetchCategories();
      onRefresh();
    } catch (e) {
      alert('카테고리 수정 중 오류가 발생했습니다.');
    }
  };

  const handleNewIconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingNewIcon(true);

    try {
      const compressedFile = await compressImageForUpload(file, { maxWidth: CATEGORY_ICON_MAX_WIDTH });
      const formData = new FormData();
      formData.append('file', compressedFile);
      const url = await uploadThumbnail(formData, 'bundle-categories');
      setNewCategory((prev) => ({ ...prev, icon_image_url: url }));
    } catch (err: any) {
      alert(err.message || '아이콘 이미지 업로드에 실패했습니다.');
    } finally {
      setIsUploadingNewIcon(false);
      e.target.value = '';
    }
  };

  const handleEditIconUpload = async (categoryId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingEditIconId(categoryId);

    try {
      const compressedFile = await compressImageForUpload(file, { maxWidth: CATEGORY_ICON_MAX_WIDTH });
      const formData = new FormData();
      formData.append('file', compressedFile);
      const url = await uploadThumbnail(formData, 'bundle-categories');
      setEditCategory((prev) => ({ ...prev, icon_image_url: url }));
    } catch (err: any) {
      alert(err.message || '아이콘 이미지 업로드에 실패했습니다.');
    } finally {
      setUploadingEditIconId(null);
      e.target.value = '';
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

  const handleMoveCategory = async (categoryId: string, direction: 'up' | 'down') => {
    const currentIndex = categories.findIndex((category) => category.id === categoryId);
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;

    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= categories.length) return;

    const reorderedCategories = [...categories];
    const [movedCategory] = reorderedCategories.splice(currentIndex, 1);
    reorderedCategories.splice(targetIndex, 0, movedCategory);

    setOrderingCategoryId(categoryId);
    setCategories(reorderedCategories.map((category, index) => ({ ...category, order_index: index })));

    try {
      await updateCategoryOrder(
        reorderedCategories.map((category, index) => ({
          id: category.id,
          order_index: index,
        }))
      );
      onRefresh();
    } catch (e) {
      alert('카테고리 순서 변경 중 오류가 발생했습니다.');
      fetchCategories();
    } finally {
      setOrderingCategoryId(null);
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
            className="relative w-full max-w-lg bg-white dark:bg-gray-900 rounded-3xl shadow-2xl overflow-hidden"
          >
            <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">카테고리 관리</h2>
              <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
                <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Create Input */}
              <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-2xl space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input 
                    type="text"
                    placeholder="카테고리 이름 (KO)"
                    value={newCategory.name}
                    onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                    className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/20 focus:border-blue-400 dark:focus:border-blue-500 outline-none transition-all text-sm text-gray-900 dark:text-gray-100"
                  />
                  <input 
                    type="text"
                    placeholder="Category Name (EN)"
                    value={newCategory.name_en}
                    onChange={(e) => setNewCategory({ ...newCategory, name_en: e.target.value })}
                    className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/20 focus:border-blue-400 dark:focus:border-blue-500 outline-none transition-all text-sm text-gray-900 dark:text-gray-100"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <textarea
                    placeholder="카테고리 설명 (KO)"
                    value={newCategory.description}
                    onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
                    rows={3}
                    className="resize-none px-4 py-2 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/20 focus:border-blue-400 dark:focus:border-blue-500 outline-none transition-all text-sm text-gray-900 dark:text-gray-100"
                  />
                  <textarea
                    placeholder="Category Description (EN)"
                    value={newCategory.description_en}
                    onChange={(e) => setNewCategory({ ...newCategory, description_en: e.target.value })}
                    rows={3}
                    className="resize-none px-4 py-2 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/20 focus:border-blue-400 dark:focus:border-blue-500 outline-none transition-all text-sm text-gray-900 dark:text-gray-100"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <CategoryIconPreview iconUrl={newCategory.icon_image_url} />
                  <div className="flex-1 min-w-0 space-y-2">
                    <input
                      type="url"
                      placeholder="아이콘 이미지 URL"
                      value={newCategory.icon_image_url}
                      onChange={(e) => setNewCategory({ ...newCategory, icon_image_url: e.target.value })}
                      className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/20 focus:border-blue-400 dark:focus:border-blue-500 outline-none transition-all text-sm text-gray-900 dark:text-gray-100"
                    />
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700">
                      {isUploadingNewIcon ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                      아이콘 업로드
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleNewIconUpload}
                        disabled={isUploadingNewIcon}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
                <input
                  type="url"
                  placeholder="카테고리 대표이미지 URL"
                  value={newCategory.category_image_url}
                  onChange={(e) => setNewCategory({ ...newCategory, category_image_url: e.target.value })}
                  className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/20 focus:border-blue-400 dark:focus:border-blue-500 outline-none transition-all text-sm text-gray-900 dark:text-gray-100"
                />
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
                  <p className="text-center py-10 text-gray-400 dark:text-gray-500">카테고리가 없습니다.</p>
                ) : (
                  categories.map((cat, index) => (
                    <div key={cat.id} className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-4 hover:border-blue-200 dark:hover:border-blue-900 transition-all group">
                      {editingId === cat.id ? (
                        <div className="space-y-3">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <input 
                              autoFocus
                              type="text"
                              value={editCategory.name}
                              onChange={(e) => setEditCategory({ ...editCategory, name: e.target.value })}
                              className="px-3 py-1.5 bg-gray-50 dark:bg-gray-800 border border-blue-200 dark:border-blue-900 rounded-lg outline-none text-sm text-gray-900 dark:text-gray-100"
                              placeholder="이름 (KO)"
                            />
                            <input 
                              type="text"
                              value={editCategory.name_en}
                              onChange={(e) => setEditCategory({ ...editCategory, name_en: e.target.value })}
                              className="px-3 py-1.5 bg-gray-50 dark:bg-gray-800 border border-blue-200 dark:border-blue-900 rounded-lg outline-none text-sm text-gray-900 dark:text-gray-100"
                              placeholder="Name (EN)"
                            />
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <textarea
                              value={editCategory.description}
                              onChange={(e) => setEditCategory({ ...editCategory, description: e.target.value })}
                              rows={3}
                              className="resize-none px-3 py-1.5 bg-gray-50 dark:bg-gray-800 border border-blue-200 dark:border-blue-900 rounded-lg outline-none text-sm text-gray-900 dark:text-gray-100"
                              placeholder="설명 (KO)"
                            />
                            <textarea
                              value={editCategory.description_en}
                              onChange={(e) => setEditCategory({ ...editCategory, description_en: e.target.value })}
                              rows={3}
                              className="resize-none px-3 py-1.5 bg-gray-50 dark:bg-gray-800 border border-blue-200 dark:border-blue-900 rounded-lg outline-none text-sm text-gray-900 dark:text-gray-100"
                              placeholder="Description (EN)"
                            />
                          </div>
                          <div className="flex items-center gap-3">
                            <CategoryIconPreview iconUrl={editCategory.icon_image_url} />
                            <div className="flex-1 min-w-0 space-y-2">
                              <input
                                type="url"
                                value={editCategory.icon_image_url}
                                onChange={(e) => setEditCategory({ ...editCategory, icon_image_url: e.target.value })}
                                className="w-full px-3 py-1.5 bg-gray-50 dark:bg-gray-800 border border-blue-200 dark:border-blue-900 rounded-lg outline-none text-sm text-gray-900 dark:text-gray-100"
                                placeholder="아이콘 이미지 URL"
                              />
                              <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-bold text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800">
                                {uploadingEditIconId === cat.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                                아이콘 업로드
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={(e) => handleEditIconUpload(cat.id, e)}
                                  disabled={uploadingEditIconId === cat.id}
                                  className="hidden"
                                />
                              </label>
                            </div>
                          </div>
                          <input
                            type="url"
                            value={editCategory.category_image_url}
                            onChange={(e) => setEditCategory({ ...editCategory, category_image_url: e.target.value })}
                            className="w-full px-3 py-1.5 bg-gray-50 dark:bg-gray-800 border border-blue-200 dark:border-blue-900 rounded-lg outline-none text-sm text-gray-900 dark:text-gray-100"
                            placeholder="카테고리 대표이미지 URL"
                          />
                          <div className="flex justify-end gap-2">
                            <button onClick={() => setEditingId(null)} className="px-3 py-1 text-xs font-bold text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
                              취소
                            </button>
                            <button onClick={() => handleUpdate(cat.id)} className="px-3 py-1 text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors">
                              저장
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex min-w-0 flex-1 items-center gap-3">
                            <CategoryIconPreview iconUrl={cat.icon_image_url} />
                            <div className="min-w-0">
                              <div className="font-bold text-gray-900 dark:text-gray-100 truncate">{cat.name}</div>
                              {cat.name_en && (
                                <div className="text-xs text-gray-400 dark:text-gray-500 font-medium truncate">{cat.name_en}</div>
                              )}
                              {(cat.description || cat.description_en) && (
                                <div className="mt-1 line-clamp-2 text-xs leading-5 text-gray-500 dark:text-gray-400">
                                  {cat.description || cat.description_en}
                                </div>
                              )}
                              {cat.category_image_url && (
                                <div className="mt-1 truncate text-[11px] font-medium text-blue-500 dark:text-blue-400">
                                  대표이미지 등록됨
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                            <button
                              onClick={() => handleMoveCategory(cat.id, 'up')}
                              disabled={index === 0 || orderingCategoryId !== null}
                              className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-30 dark:text-gray-500 dark:hover:text-gray-200 dark:hover:bg-gray-800 rounded-xl"
                              title="위로 이동"
                            >
                              {orderingCategoryId === cat.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <MoveUp className="w-4 h-4" />}
                            </button>
                            <button
                              onClick={() => handleMoveCategory(cat.id, 'down')}
                              disabled={index === categories.length - 1 || orderingCategoryId !== null}
                              className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-30 dark:text-gray-500 dark:hover:text-gray-200 dark:hover:bg-gray-800 rounded-xl"
                              title="아래로 이동"
                            >
                              {orderingCategoryId === cat.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <MoveDown className="w-4 h-4" />}
                            </button>
                            <button 
                              onClick={() => { 
                                setEditingId(cat.id); 
                                setEditCategory({
                                  name: cat.name,
                                  name_en: cat.name_en || '',
                                  description: cat.description || '',
                                  description_en: cat.description_en || '',
                                  icon_image_url: cat.icon_image_url || '',
                                  category_image_url: cat.category_image_url || ''
                                }); 
                              }}
                              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => handleDelete(cat.id)}
                              className="p-2 text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl"
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

function CategoryIconPreview({ iconUrl }: { iconUrl?: string | null }) {
  return (
    <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-gray-200 bg-gray-100 dark:border-gray-700 dark:bg-gray-800">
      {iconUrl ? (
        <Image src={iconUrl} alt="" width={48} height={48} className="h-full w-full object-cover" />
      ) : (
        <ImageIcon className="h-5 w-5 text-gray-400" />
      )}
    </div>
  );
}
