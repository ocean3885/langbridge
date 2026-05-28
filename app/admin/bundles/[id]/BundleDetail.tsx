'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowDown, ArrowLeft, ArrowUp, Book, CheckCircle2, Edit2, ExternalLink, GripVertical, ImageIcon, Layout, Loader2, MessageCircle, Save, Tag, Trash2, UploadCloud, Volume2, X } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { updateBundle, deleteBundle, listCategories, updateBundleItemImage, deleteBundleItemsBulk, updateBundleItemsOrder } from '@/lib/supabase/services/bundles';
import { uploadThumbnail } from '@/lib/supabase/services/storage';
import BundleImageMapper from './BundleImageMapper';

export default function BundleDetail({ 
  bundle: initialBundle, 
  items, 
  words = [] 
}: { 
  bundle: any; 
  items: any[]; 
  words?: any[] 
}) {
  const router = useRouter();
  const [bundle, setBundle] = useState(initialBundle);
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  // Selection Mode State
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [currentItems, setCurrentItems] = useState(items);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [isSortMode, setIsSortMode] = useState(false);
  const [sortableItems, setSortableItems] = useState(items);
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const [isSavingOrder, setIsSavingOrder] = useState(false);
  
  // Edit Form State
  const [editForm, setEditForm] = useState({
    title: initialBundle.title,
    title_en: initialBundle.title_en || '',
    description: initialBundle.description || '',
    description_en: initialBundle.description_en || '',
    level: initialBundle.level,
    is_published: initialBundle.is_published,
    category_id: initialBundle.category_id,
    thumbnail_url: initialBundle.thumbnail_url || ''
  });

  const [itemMappings, setItemMappings] = useState<{ [key: string]: string | null }>(
    items.reduce((acc, item) => ({ ...acc, [item.id]: item.image_url || null }), {})
  );
  
  const [categories, setCategories] = useState<any[]>([]);

  useEffect(() => {
    const fetchCats = async () => {
      const data = await listCategories();
      setCategories(data);
    };
    fetchCats();
  }, []);

  const buildMappingsFromItems = (sourceItems: any[]) =>
    sourceItems.reduce((acc, item) => ({ ...acc, [item.id]: item.image_url || null }), {});

  const handleCancelEdit = () => {
    setEditForm({
      title: bundle.title,
      title_en: bundle.title_en || '',
      description: bundle.description || '',
      description_en: bundle.description_en || '',
      level: bundle.level,
      is_published: bundle.is_published,
      category_id: bundle.category_id,
      thumbnail_url: bundle.thumbnail_url || ''
    });
    setItemMappings(buildMappingsFromItems(currentItems));
    setIsEditing(false);
  };

  const moveSortableItem = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= sortableItems.length || fromIndex === toIndex) return;

    setSortableItems(prev => {
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  };

  const enterSortMode = () => {
    setSortableItems(currentItems);
    setSelectedItems([]);
    setIsSelectMode(false);
    setIsSortMode(true);
  };

  const cancelSortMode = () => {
    setSortableItems(currentItems);
    setDraggedItemId(null);
    setIsSortMode(false);
  };

  const handleSortDrop = (targetIndex: number) => {
    if (!draggedItemId) return;

    const fromIndex = sortableItems.findIndex(item => item.id === draggedItemId);
    moveSortableItem(fromIndex, targetIndex);
    setDraggedItemId(null);
  };

  const handleSaveOrder = async () => {
    setIsSavingOrder(true);

    try {
      await updateBundleItemsOrder(bundle.id, sortableItems.map(item => item.id));
      const orderedItems = sortableItems.map((item, index) => ({ ...item, order_index: index }));
      setCurrentItems(orderedItems);
      setSortableItems(orderedItems);
      setIsSortMode(false);
      router.refresh();
    } catch (e) {
      alert('순서 저장 중 오류가 발생했습니다.');
    } finally {
      setIsSavingOrder(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const url = await uploadThumbnail(formData, `bundles/${bundle.id}/thumbnail`);
      setEditForm({ ...editForm, thumbnail_url: url });
    } catch (err: any) {
      alert(err.message || '이미지 업로드에 실패했습니다.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleUpdate = async () => {
    setIsLoading(true);
    try {
      // 1. 번들 기본 정보 업데이트
      const updated = await updateBundle(bundle.id, {
        ...editForm,
        title_en: editForm.title_en || null,
        description_en: editForm.description_en || null
      });
      
      // 2. 각 아이템 이미지 업데이트 (변경된 것만)
      const itemUpdatePromises = Object.entries(itemMappings).map(([itemId, imageUrl]) => {
        const originalItem = currentItems.find(it => it.id === itemId);
        if (originalItem && originalItem.image_url !== imageUrl) {
          return updateBundleItemImage(itemId, imageUrl);
        }
        return Promise.resolve(null);
      });
      
      await Promise.all(itemUpdatePromises);

      const updatedItems = currentItems.map(item => ({
        ...item,
        image_url: itemMappings[item.id] || null
      }));
      
      const selectedCat = categories.find(c => c.id === editForm.category_id);
      setBundle({ 
        ...bundle, 
        ...updated, 
        bundle_category: selectedCat ? { 
          id: selectedCat.id, 
          name: selectedCat.name,
          name_en: selectedCat.name_en 
        } : null 
      });
      setCurrentItems(updatedItems);
      setItemMappings(buildMappingsFromItems(updatedItems));
      
      router.refresh();
      setIsEditing(false);
    } catch (e) {
      alert('수정 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('정말 이 번들을 삭제하시겠습니까? 관련 아이템도 모두 삭제됩니다.')) return;
    setIsDeleting(true);
    try {
      await deleteBundle(bundle.id);
      router.push('/admin/bundles');
      router.refresh();
    } catch (e) {
      alert('삭제 중 오류가 발생했습니다.');
      setIsDeleting(false);
    }
  };

  function getMeaningDisplay(meaning: any): string {
    if (!meaning) return '-';
    if (typeof meaning === 'string') {
      try {
        const parsed = JSON.parse(meaning);
        return getMeaningDisplay(parsed);
      } catch (e) {
        return meaning;
      }
    }
    if (typeof meaning === 'object') {
      const val = meaning.ko || meaning.en || Object.values(meaning)[0];
      if (Array.isArray(val)) return val[0] || '-';
      if (typeof val === 'string') return val;
    }
    return '-';
  }
  const handleBulkDelete = async () => {
    if (selectedItems.length === 0) return;
    if (!confirm(`선택한 ${selectedItems.length}개의 아이템을 삭제하시겠습니까?`)) return;
    
    setIsBulkDeleting(true);
    try {
      await deleteBundleItemsBulk(bundle.id, selectedItems);
      
      // Update local state
      const remainingItems = currentItems
        .filter(item => !selectedItems.includes(item.id))
        .map((item, index) => ({ ...item, order_index: index }));
      
      setCurrentItems(remainingItems);
      setItemMappings(buildMappingsFromItems(remainingItems));
      setSelectedItems([]);
      setIsSelectMode(false);
      
      router.refresh();
      alert('성공적으로 삭제되었습니다.');
    } catch (e) {
      console.error(e);
      alert('삭제 중 오류가 발생했습니다.');
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const toggleSelectItem = (id: string) => {
    setSelectedItems(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  return (
    <div className="md:ml-64 p-4 md:p-8 pt-20 md:pt-8 bg-gray-50 dark:bg-background min-h-screen">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Navigation and Actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <Link 
            href="/admin/bundles"
            className="inline-flex items-center gap-2 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
            <span>번들 목록으로 돌아가기</span>
          </Link>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={() => {
                if (isEditing) {
                  handleCancelEdit();
                } else {
                  setIsEditing(true);
                }
              }}
              title={isEditing ? '취소' : '정보 수정'}
              className={`inline-flex items-center justify-center w-10 h-10 rounded-xl transition-all ${isEditing ? 'bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300' : 'bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 shadow-sm'}`}
            >
              {isEditing ? <X className="w-5 h-5" /> : <Edit2 className="w-5 h-5" />}
            </button>
            <button 
              disabled={isDeleting}
              onClick={handleDelete}
              title="번들 삭제"
              className="inline-flex items-center justify-center w-10 h-10 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-xl transition-all shadow-sm shadow-red-100 dark:shadow-none disabled:opacity-50"
            >
              {isDeleting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Bundle Info Card */}
        <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
          {isEditing ? (
            <div className="p-6 md:p-8 space-y-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg">
                  <Edit2 className="w-5 h-5" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">번들 정보 수정</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700 dark:text-gray-300 ml-1">번들 제목 (KO)</label>
                  <input 
                    type="text"
                    value={editForm.title}
                    onChange={(e) => setEditForm({...editForm, title: e.target.value})}
                    placeholder="한국어 제목"
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/20 focus:border-blue-400 dark:focus:border-blue-500 outline-none transition-all text-gray-900 dark:text-gray-100"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700 dark:text-gray-300 ml-1">Bundle Title (EN)</label>
                  <input 
                    type="text"
                    value={editForm.title_en}
                    onChange={(e) => setEditForm({...editForm, title_en: e.target.value})}
                    placeholder="English Title"
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/20 focus:border-blue-400 dark:focus:border-blue-500 outline-none transition-all text-gray-900 dark:text-gray-100"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-bold text-gray-700 dark:text-gray-300 ml-1">설명 (KO)</label>
                  <textarea 
                    rows={2}
                    value={editForm.description}
                    onChange={(e) => setEditForm({...editForm, description: e.target.value})}
                    placeholder="한국어 설명"
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/20 focus:border-blue-400 dark:focus:border-blue-500 outline-none resize-none transition-all text-gray-900 dark:text-gray-100"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-bold text-gray-700 dark:text-gray-300 ml-1">Description (EN)</label>
                  <textarea 
                    rows={2}
                    value={editForm.description_en}
                    onChange={(e) => setEditForm({...editForm, description_en: e.target.value})}
                    placeholder="English Description"
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/20 focus:border-blue-400 dark:focus:border-blue-500 outline-none resize-none transition-all text-gray-900 dark:text-gray-100"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700 dark:text-gray-300 ml-1">카테고리</label>
                  <select 
                    value={editForm.category_id || ''}
                    onChange={(e) => setEditForm({...editForm, category_id: e.target.value || null})}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/20 focus:border-blue-400 dark:focus:border-blue-500 outline-none transition-all appearance-none cursor-pointer text-gray-900 dark:text-gray-100"
                  >
                    <option value="">카테고리 없음</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name} {cat.name_en ? `(${cat.name_en})` : ''}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700 dark:text-gray-300 ml-1">학습 레벨 (1-10)</label>
                  <input 
                    type="number"
                    min={1}
                    max={10}
                    value={editForm.level}
                    onChange={(e) => setEditForm({...editForm, level: parseInt(e.target.value) || 1})}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/20 focus:border-blue-400 dark:focus:border-blue-500 outline-none transition-all text-gray-900 dark:text-gray-100"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700 ml-1">공개 상태</label>
                  <div className="flex items-center gap-6 py-2 ml-1">
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <input 
                        type="radio"
                        checked={editForm.is_published}
                        onChange={() => setEditForm({...editForm, is_published: true})}
                        className="w-4 h-4 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400 group-hover:text-blue-600 transition-colors">공개</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <input 
                        type="radio"
                        checked={!editForm.is_published}
                        onChange={() => setEditForm({...editForm, is_published: false})}
                        className="w-4 h-4 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400 group-hover:text-amber-600 transition-colors">비공개</span>
                    </label>
                  </div>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-bold text-gray-700 ml-1">썸네일 이미지</label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-1">
                    {/* Preview */}
                    <div className="relative aspect-video bg-gray-100 dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden flex items-center justify-center">
                      {editForm.thumbnail_url ? (
                        <img 
                          src={editForm.thumbnail_url} 
                          alt="Thumbnail preview"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <ImageIcon className="w-8 h-8 text-gray-300 dark:text-gray-600" />
                      )}
                      {isUploading && (
                        <div className="absolute inset-0 bg-white/60 backdrop-blur-sm flex items-center justify-center">
                          <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
                        </div>
                      )}
                    </div>
                    
                    {/* Upload Controls */}
                    <div className="md:col-span-2 space-y-3">
                      <div className="relative group">
                        <input 
                          type="file"
                          accept="image/*"
                          onChange={handleFileChange}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        />
                        <div className="flex items-center justify-center gap-2 px-4 py-8 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl group-hover:border-blue-400 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20 transition-all">
                          <UploadCloud className="w-6 h-6 text-gray-400 group-hover:text-blue-500" />
                          <span className="text-sm font-medium text-gray-500 group-hover:text-blue-600">
                            {isUploading ? '업로드 중...' : '이미지 파일을 선택하거나 드래그하세요'}
                          </span>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">직접 URL 입력</span>
                        <input 
                          type="text"
                          placeholder="https://example.com/thumbnail.jpg"
                          value={editForm.thumbnail_url}
                          onChange={(e) => setEditForm({...editForm, thumbnail_url: e.target.value})}
                          className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/20 focus:border-blue-400 dark:focus:border-blue-500 outline-none transition-all font-mono text-xs text-gray-900 dark:text-gray-100"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col">
              {/* 1. Thumbnail Row (Independent & Centered) */}
              <div className="p-6 md:p-8 pb-0 flex justify-center">
                {bundle.thumbnail_url ? (
                  <div className="w-full max-w-xl aspect-video rounded-3xl overflow-hidden shadow-xl border border-gray-100 dark:border-gray-800 shrink-0">
                    <img 
                      src={bundle.thumbnail_url} 
                      alt={bundle.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-full max-w-xl aspect-video bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center rounded-3xl overflow-hidden shrink-0">
                    <Layout className="w-16 h-16 text-white/20" />
                  </div>
                )}
              </div>
              
              {/* 2. Content Row */}
              <div className="p-8 md:p-12 pt-8">
                <div className="flex flex-wrap items-center gap-3 mb-6">
                  {bundle.bundle_category && (
                    <span className="px-3 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full text-[10px] font-extrabold uppercase tracking-wider">
                      {bundle.bundle_category.name}
                    </span>
                  )}
                  <span className="px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 rounded-lg text-[10px] font-bold">
                    Lv. {bundle.level}
                  </span>
                  {bundle.is_published ? (
                    <span className="px-2 py-1 bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-lg text-[10px] font-bold">
                      공개됨
                    </span>
                  ) : (
                    <span className="px-2 py-1 bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-lg text-[10px] font-bold">
                      비공개
                    </span>
                  )}
                </div>
                
                <h1 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white mb-2 tracking-tight">{bundle.title}</h1>
                {bundle.title_en && <p className="text-lg text-gray-400 dark:text-gray-500 font-bold mb-8">{bundle.title_en}</p>}
                
                <div className="space-y-6 mb-12">
                  <p className="text-gray-600 dark:text-gray-400 text-lg leading-relaxed">
                    {bundle.description || '추가 설명이 없습니다.'}
                  </p>
                  {bundle.description_en && (
                    <p className="text-gray-400 dark:text-gray-500 text-base italic leading-relaxed border-l-4 border-gray-100 dark:border-gray-800 pl-6 py-2">
                      {bundle.description_en}
                    </p>
                  )}
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 text-sm pt-8 border-t border-gray-50 dark:border-gray-800">
                  <div className="flex flex-col">
                    <span className="text-gray-400 dark:text-gray-500 font-bold mb-1 uppercase tracking-widest text-[10px]">생성일</span>
                    <span className="font-bold text-gray-900 dark:text-gray-100">{formatDate(bundle.created_at)}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-gray-400 dark:text-gray-500 font-bold mb-1 uppercase tracking-widest text-[10px]">학습 컨텐츠</span>
                    <span className="font-bold text-gray-900 dark:text-gray-100">{currentItems.length}개 아이템</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-gray-400 dark:text-gray-500 font-bold mb-1 uppercase tracking-widest text-[10px]">최종 수정</span>
                    <span className="font-bold text-gray-900 dark:text-gray-100">{formatDate(bundle.updated_at)}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-gray-400 dark:text-gray-500 font-bold mb-1 uppercase tracking-widest text-[10px]">언어</span>
                    <span className="font-bold text-gray-900 dark:text-gray-100">Spanish</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Image Mapper Section (Edit Mode) */}
        {isEditing && (
          <div className="space-y-4">
            <BundleImageMapper 
              items={currentItems} 
              onItemsUpdate={(newMappings) => setItemMappings(newMappings)} 
              uploadFolder={`bundles/${bundle.id}/items`}
            />
            {/* Buttons moved here */}
            <div className="flex justify-end gap-3">
              <button 
                onClick={handleCancelEdit}
                className="px-8 py-3.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-bold rounded-2xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-all active:scale-95"
              >
                취소
              </button>
              <button 
                disabled={isLoading}
                onClick={handleUpdate}
                className="px-8 py-3.5 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 dark:shadow-none flex items-center gap-2 active:scale-95"
              >
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                모든 변경사항 저장
              </button>
            </div>
          </div>
        )}

        {/* Bundle Items Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
              <Book className="w-5 h-5 text-blue-500" />
              번들 아이템 구성
            </h2>
            <div className="flex items-center gap-2">
              {isSortMode ? (
                <>
                  <button 
                    disabled={isSavingOrder}
                    onClick={cancelSortMode}
                    className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-xs font-bold rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-all disabled:opacity-50"
                  >
                    취소
                  </button>
                  <button 
                    disabled={isSavingOrder}
                    onClick={handleSaveOrder}
                    className="px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl hover:bg-blue-700 transition-all disabled:opacity-50 flex items-center gap-2"
                  >
                    {isSavingOrder ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                    순서 저장
                  </button>
                </>
              ) : isSelectMode ? (
                <>
                  <button 
                    disabled={selectedItems.length === 0 || isBulkDeleting}
                    onClick={handleBulkDelete}
                    className="px-4 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs font-bold rounded-xl hover:bg-red-100 dark:hover:bg-red-900/40 transition-all disabled:opacity-50 flex items-center gap-2"
                  >
                    {isBulkDeleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                    삭제 ({selectedItems.length})
                  </button>
                  <button 
                    onClick={() => {
                      setIsSelectMode(false);
                      setSelectedItems([]);
                    }}
                    className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-xs font-bold rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-all"
                  >
                    취소
                  </button>
                </>
              ) : (
                <>
                  <button 
                    onClick={enterSortMode}
                    className="px-4 py-2 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 text-gray-600 dark:text-gray-400 text-xs font-bold rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all shadow-sm flex items-center gap-2"
                  >
                    <GripVertical className="w-3.5 h-3.5" />
                    정렬
                  </button>
                  <button 
                    onClick={() => setIsSelectMode(true)}
                    className="px-4 py-2 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 text-gray-600 dark:text-gray-400 text-xs font-bold rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all shadow-sm"
                  >
                    선택
                  </button>
                </>
              )}
            </div>
          </div>

          {(isSortMode ? sortableItems : currentItems).length === 0 ? (
            <div className="bg-white dark:bg-gray-900 p-20 rounded-3xl border border-dashed border-gray-200 dark:border-gray-800 text-center">
              <div className="w-16 h-16 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <Book className="w-8 h-8 text-gray-300 dark:text-gray-600" />
              </div>
              <p className="text-gray-500 dark:text-gray-400 font-medium">이 번들에는 아직 아이템이 없습니다.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {(isSortMode ? sortableItems : currentItems).map((item, idx) => (
                <div 
                  key={item.id} 
                  draggable={isSortMode}
                  onDragStart={(e) => {
                    if (!isSortMode) return;
                    setDraggedItemId(item.id);
                    e.dataTransfer.effectAllowed = 'move';
                  }}
                  onDragOver={(e) => {
                    if (!isSortMode) return;
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                  }}
                  onDrop={(e) => {
                    if (!isSortMode) return;
                    e.preventDefault();
                    handleSortDrop(idx);
                  }}
                  onDragEnd={() => setDraggedItemId(null)}
                  onClick={() => isSelectMode && toggleSelectItem(item.id)}
                  className={`bg-white dark:bg-gray-900 p-5 rounded-3xl border ${selectedItems.includes(item.id) ? 'border-blue-500 ring-2 ring-blue-500/10' : draggedItemId === item.id ? 'border-blue-300 opacity-60' : 'border-gray-100 dark:border-gray-800'} shadow-sm hover:shadow-md transition-all flex items-start gap-4 group ${isSortMode ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'}`}
                >
                  {isSortMode ? (
                    <div className="flex-shrink-0 flex flex-col items-center gap-2">
                      <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/20 text-blue-500 rounded-2xl flex items-center justify-center">
                        <GripVertical className="w-5 h-5" />
                      </div>
                      <div className="flex gap-1">
                        <button
                          disabled={idx === 0}
                          onClick={(e) => {
                            e.stopPropagation();
                            moveSortableItem(idx, idx - 1);
                          }}
                          className="p-1.5 bg-gray-50 dark:bg-gray-800 text-gray-400 hover:text-blue-500 rounded-lg disabled:opacity-30"
                          title="위로 이동"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          disabled={idx === sortableItems.length - 1}
                          onClick={(e) => {
                            e.stopPropagation();
                            moveSortableItem(idx, idx + 1);
                          }}
                          className="p-1.5 bg-gray-50 dark:bg-gray-800 text-gray-400 hover:text-blue-500 rounded-lg disabled:opacity-30"
                          title="아래로 이동"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ) : isSelectMode ? (
                    <div className={`flex-shrink-0 w-10 h-10 rounded-2xl flex items-center justify-center transition-all ${selectedItems.includes(item.id) ? 'bg-blue-600 text-white' : 'bg-gray-50 dark:bg-gray-800 text-gray-300'}`}>
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                  ) : (
                    <div className="flex-shrink-0 w-10 h-10 bg-gray-50 dark:bg-gray-800 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20 group-hover:text-blue-500 rounded-2xl flex items-center justify-center text-gray-400 dark:text-gray-500 font-black transition-colors">
                      {(idx + 1).toString().padStart(2, '0')}
                    </div>
                  )}
                  
                    <div className="flex-1 min-w-0">
                      {item.words ? (
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded text-[10px] font-black uppercase">
                                <Tag className="w-3 h-3" />
                                WORD
                              </span>
                              <span className="text-xs text-gray-400 dark:text-gray-500 uppercase font-bold tracking-tighter">{item.words.lang_code}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              {item.words.audio_url && (
                                <button 
                                  onClick={() => new Audio(item.words.audio_url).play()}
                                  className="p-1.5 bg-gray-50 dark:bg-gray-800 text-gray-400 dark:text-gray-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-500 rounded-lg transition-colors"
                                  title="재생"
                                >
                                  <Volume2 className="w-4 h-4" />
                                </button>
                              )}
                              <Link 
                                href={`/admin/words/${item.words.id}`}
                                className="p-1.5 bg-gray-50 dark:bg-gray-800 text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg transition-colors"
                                title="상세 정보"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </Link>
                            </div>
                          </div>
                          <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 tracking-tight">{item.words.word}</h3>
                          <p className="text-gray-500 dark:text-gray-400 font-medium">{getMeaningDisplay(item.words.meaning_ko)}</p>
                        </div>
                      ) : item.sentences ? (
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded text-[10px] font-black uppercase">
                                <MessageCircle className="w-3 h-3" />
                                SENTENCE
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              {item.sentences.audio_url && (
                                <button 
                                  onClick={() => new Audio(item.sentences.audio_url).play()}
                                  className="p-1.5 bg-gray-50 dark:bg-gray-800 text-gray-400 dark:text-gray-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-500 rounded-lg transition-colors"
                                  title="재생"
                                >
                                  <Volume2 className="w-4 h-4" />
                                </button>
                              )}
                              <Link 
                                href={`/admin/sentences/${item.sentences.id}`}
                                className="p-1.5 bg-gray-50 dark:bg-gray-800 text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg transition-colors"
                                title="상세 정보"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </Link>
                            </div>
                          </div>
                          <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 tracking-tight leading-snug">{item.sentences.sentence}</h3>
                          <p className="text-gray-500 dark:text-gray-400 font-medium leading-snug">{item.sentences.translation}</p>
                          {item.sentences.translation_en && (
                            <p className="text-xs text-blue-500/60 dark:text-blue-400/60 font-medium italic leading-snug mt-1 flex items-center gap-1">
                              <span className="w-1 h-1 bg-blue-200 dark:bg-blue-800 rounded-full" />
                              {item.sentences.translation_en}
                            </p>
                          )}
                        </div>
                      ) : (
                        <div className="py-2 text-gray-400 italic">데이터 정보 없음</div>
                      )}

                      {!isEditing && item.image_url && (
                        <div className="mt-3 relative w-32 aspect-video rounded-xl overflow-hidden border border-gray-100 dark:border-gray-800">
                          <img src={item.image_url} alt="Item" className="w-full h-full object-cover" />
                        </div>
                      )}
                    </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Key Vocabulary Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
              <Book className="w-5 h-5 text-purple-500" />
              핵심 어휘 ({words.length})
            </h2>
          </div>

          {words.length === 0 ? (
            <div className="bg-white dark:bg-gray-900 p-12 rounded-3xl border border-dashed border-gray-200 dark:border-gray-800 text-center">
              <p className="text-gray-400 dark:text-gray-500 font-medium">연결된 단어가 없습니다.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {words.map((w) => (
                <Link href={`/admin/words/${w.id}`} key={w.id} className="group">
                  <div className="bg-white dark:bg-gray-900 p-5 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md transition-all h-full flex flex-col">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {w.word}
                        </span>
                        <div className="flex gap-1">
                          {(w.pos || []).map((p: string, i: number) => (
                            <span key={i} className="bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-2 py-0.5 rounded text-[10px] font-bold uppercase">
                              {p}
                            </span>
                          ))}
                        </div>
                      </div>
                      {w.audio_url && (
                        <button 
                          onClick={(e) => {
                            e.preventDefault();
                            new Audio(w.audio_url).play();
                          }}
                          className="p-1.5 bg-gray-50 dark:bg-gray-800 text-gray-400 dark:text-gray-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-500 rounded-lg transition-colors"
                        >
                          <Volume2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <div className="mt-auto">
                      <p className="text-sm text-gray-600 dark:text-gray-400 font-bold">{getMeaningDisplay(w.meaning_ko)}</p>
                      {w.meaning_en && (
                        <p className="text-xs text-gray-400 dark:text-gray-500 italic mt-0.5">{getMeaningDisplay(w.meaning_en)}</p>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
