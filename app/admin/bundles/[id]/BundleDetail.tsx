'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Book, Layout, MessageCircle, Tag, Edit2, Trash2, Save, X, Loader2, ImageIcon, UploadCloud } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { updateBundle, deleteBundle, listCategories } from '@/lib/supabase/services/bundles';
import { uploadThumbnail } from '@/lib/supabase/services/storage';

export default function BundleDetail({ bundle: initialBundle, items }: { bundle: any; items: any[] }) {
  const router = useRouter();
  const [bundle, setBundle] = useState(initialBundle);
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  // Edit Form State
  const [editForm, setEditForm] = useState({
    title: initialBundle.title,
    description: initialBundle.description || '',
    level: initialBundle.level,
    is_published: initialBundle.is_published,
    category_id: initialBundle.category_id,
    thumbnail_url: initialBundle.thumbnail_url || ''
  });
  
  const [categories, setCategories] = useState<any[]>([]);

  useEffect(() => {
    const fetchCats = async () => {
      const data = await listCategories();
      setCategories(data);
    };
    fetchCats();
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const url = await uploadThumbnail(formData);
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
      const updated = await updateBundle(bundle.id, editForm);
      // Join logic might be needed to get category name if changed
      const selectedCat = categories.find(c => c.id === editForm.category_id);
      setBundle({ 
        ...bundle, 
        ...updated, 
        bundle_category: selectedCat ? { id: selectedCat.id, name: selectedCat.name } : null 
      });
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

  return (
    <div className="md:ml-64 p-4 md:p-8 pt-20 md:pt-8 bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Navigation and Actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <Link 
            href="/admin/bundles"
            className="inline-flex items-center gap-2 text-gray-500 hover:text-blue-600 transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
            <span>번들 목록으로 돌아가기</span>
          </Link>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setIsEditing(!isEditing)}
              title={isEditing ? '취소' : '정보 수정'}
              className={`inline-flex items-center justify-center w-10 h-10 rounded-xl transition-all ${isEditing ? 'bg-gray-200 text-gray-700' : 'bg-white border border-gray-100 text-gray-600 hover:bg-gray-50 shadow-sm'}`}
            >
              {isEditing ? <X className="w-5 h-5" /> : <Edit2 className="w-5 h-5" />}
            </button>
            <button 
              disabled={isDeleting}
              onClick={handleDelete}
              title="번들 삭제"
              className="inline-flex items-center justify-center w-10 h-10 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl transition-all shadow-sm shadow-red-100 disabled:opacity-50"
            >
              {isDeleting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Bundle Info Card */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          {isEditing ? (
            <div className="p-6 md:p-8 space-y-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                  <Edit2 className="w-5 h-5" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">번들 정보 수정</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700 ml-1">번들 제목</label>
                  <input 
                    type="text"
                    value={editForm.title}
                    onChange={(e) => setEditForm({...editForm, title: e.target.value})}
                    placeholder="번들 제목을 입력하세요"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700 ml-1">카테고리</label>
                  <select 
                    value={editForm.category_id || ''}
                    onChange={(e) => setEditForm({...editForm, category_id: e.target.value || null})}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all appearance-none cursor-pointer"
                  >
                    <option value="">카테고리 없음</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-bold text-gray-700 ml-1">설명</label>
                  <textarea 
                    rows={3}
                    value={editForm.description}
                    onChange={(e) => setEditForm({...editForm, description: e.target.value})}
                    placeholder="번들에 대한 상세 설명을 입력하세요"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none resize-none transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700 ml-1">학습 레벨 (1-10)</label>
                  <input 
                    type="number"
                    min={1}
                    max={10}
                    value={editForm.level}
                    onChange={(e) => setEditForm({...editForm, level: parseInt(e.target.value) || 1})}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all"
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
                      <span className="text-sm font-medium text-gray-600 group-hover:text-blue-600 transition-colors">공개</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <input 
                        type="radio"
                        checked={!editForm.is_published}
                        onChange={() => setEditForm({...editForm, is_published: false})}
                        className="w-4 h-4 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                      <span className="text-sm font-medium text-gray-600 group-hover:text-amber-600 transition-colors">비공개</span>
                    </label>
                  </div>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-bold text-gray-700 ml-1">썸네일 이미지</label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-1">
                    {/* Preview */}
                    <div className="relative aspect-video bg-gray-100 rounded-2xl border border-gray-100 overflow-hidden flex items-center justify-center">
                      {editForm.thumbnail_url ? (
                        <img 
                          src={editForm.thumbnail_url} 
                          alt="Thumbnail preview"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <ImageIcon className="w-8 h-8 text-gray-300" />
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
                        <div className="flex items-center justify-center gap-2 px-4 py-8 border-2 border-dashed border-gray-200 rounded-2xl group-hover:border-blue-400 group-hover:bg-blue-50 transition-all">
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
                          className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all font-mono text-xs"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-6 border-t border-gray-50">
                <button 
                  onClick={() => setIsEditing(false)}
                  className="px-8 py-3.5 bg-gray-100 text-gray-600 font-bold rounded-2xl hover:bg-gray-200 transition-all active:scale-95"
                >
                  취소
                </button>
                <button 
                  disabled={isLoading}
                  onClick={handleUpdate}
                  className="px-8 py-3.5 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 flex items-center gap-2 active:scale-95"
                >
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                  설정 저장
                </button>
              </div>
            </div>
          ) : (
            <div className="md:flex">
              {bundle.thumbnail_url ? (
                <div className="md:w-1/3 h-64 md:h-auto relative">
                  <img 
                    src={bundle.thumbnail_url} 
                    alt={bundle.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
                </div>
              ) : (
                <div className="md:w-1/3 h-64 md:h-auto bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center relative overflow-hidden">
                  <Layout className="w-20 h-20 text-white/20 relative z-10" />
                  <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
                  <div className="absolute -top-10 -left-10 w-32 h-32 bg-blue-400/20 rounded-full blur-2xl" />
                </div>
              )}
              
              <div className="p-6 md:p-10 flex-1">
                <div className="flex flex-wrap items-center gap-3 mb-6">
                  {bundle.bundle_category && (
                    <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-xs font-bold uppercase tracking-wider">
                      {bundle.bundle_category.name}
                    </span>
                  )}
                  <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-bold">
                    Lv. {bundle.level}
                  </span>
                  {bundle.is_published ? (
                    <span className="px-3 py-1 bg-green-50 text-green-600 rounded-full text-xs font-bold">
                      공개됨
                    </span>
                  ) : (
                    <span className="px-3 py-1 bg-amber-50 text-amber-600 rounded-full text-xs font-bold">
                      비공개
                    </span>
                  )}
                </div>
                
                <h1 className="text-4xl font-black text-gray-900 mb-3 tracking-tight">{bundle.title}</h1>
                <p className="text-gray-500 text-lg leading-relaxed mb-10 max-w-2xl">
                  {bundle.description || '추가 설명이 없습니다.'}
                </p>
                
                <div className="grid grid-cols-2 gap-8 text-sm pt-6 border-t border-gray-50">
                  <div className="flex flex-col">
                    <span className="text-gray-400 font-medium mb-1 uppercase tracking-widest text-[10px]">생성일</span>
                    <span className="font-bold text-gray-700 text-base">{formatDate(bundle.created_at)}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-gray-400 font-medium mb-1 uppercase tracking-widest text-[10px]">학습 컨텐츠</span>
                    <span className="font-bold text-gray-700 text-base">{items.length}개 아이템</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bundle Items Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <Book className="w-5 h-5 text-blue-500" />
              번들 아이템 구성
            </h2>
          </div>

          {items.length === 0 ? (
            <div className="bg-white p-20 rounded-3xl border border-dashed border-gray-200 text-center">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Book className="w-8 h-8 text-gray-300" />
              </div>
              <p className="text-gray-500 font-medium">이 번들에는 아직 아이템이 없습니다.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {items.map((item, idx) => (
                <div 
                  key={item.id} 
                  className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all flex items-start gap-4 group"
                >
                  <div className="flex-shrink-0 w-10 h-10 bg-gray-50 group-hover:bg-blue-50 group-hover:text-blue-500 rounded-2xl flex items-center justify-center text-gray-400 font-black transition-colors">
                    {(idx + 1).toString().padStart(2, '0')}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    {item.words ? (
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-50 text-purple-600 rounded text-[10px] font-black uppercase">
                            <Tag className="w-3 h-3" />
                            WORD
                          </span>
                          <span className="text-xs text-gray-400 uppercase font-bold tracking-tighter">{item.words.lang_code}</span>
                        </div>
                        <h3 className="text-lg font-bold text-gray-800 tracking-tight">{item.words.word}</h3>
                        <p className="text-gray-500 font-medium">{getMeaningDisplay(item.words.meaning_ko)}</p>
                      </div>
                    ) : item.sentences ? (
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded text-[10px] font-black uppercase">
                            <MessageCircle className="w-3 h-3" />
                            SENTENCE
                          </span>
                        </div>
                        <h3 className="text-lg font-bold text-gray-800 tracking-tight leading-snug">{item.sentences.sentence}</h3>
                        <p className="text-gray-500 font-medium leading-snug">{item.sentences.translation}</p>
                        {item.sentences.translation_en && (
                          <p className="text-xs text-gray-400 italic leading-snug">{item.sentences.translation_en}</p>
                        )}
                      </div>
                    ) : (
                      <div className="py-2 text-gray-400 italic">데이터 정보 없음</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
