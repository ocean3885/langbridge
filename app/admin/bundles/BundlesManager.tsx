'use client';

import { useState } from 'react';
import { Layout, Plus, Search, Filter, Layers, ExternalLink, Settings2 } from 'lucide-react';
import Link from 'next/link';
import { formatDate } from '@/lib/utils';
import CategoryManagerModal from './CategoryManagerModal';
import { listBundles } from '@/lib/supabase/services/bundles';

export interface Bundle {
  id: string;
  category_id: string | null;
  title: string;
  title_en: string | null;
  description: string | null;
  description_en: string | null;
  level: number;
  thumbnail_url: string | null;
  is_published: boolean;
  created_at: string;
  updated_at: string;
  bundle_category?: {
    id: string;
    name: string;
    name_en: string | null;
  } | null;
}

export interface BundleItem {
  id: string;
  bundle_id: string;
  word_id: number | null;
  sentence_id: number | null;
  order_index: number;
  words?: {
    id: number;
    word: string;
    meaning_ko: any;
    lang_code: string;
  } | null;
  sentences?: {
    id: number;
    sentence: string;
    translation: string;
  } | null;
}

export default function BundlesManager({ initialBundles }: { initialBundles: Bundle[] }) {
  const [bundles, setBundles] = useState<Bundle[]>(initialBundles);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

  const refreshBundles = async () => {
    const data = await listBundles();
    setBundles(data as Bundle[]);
  };

  const filteredBundles = bundles.filter(bundle => 
    bundle.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (bundle.title_en || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    bundle.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    bundle.description_en?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="md:ml-64 p-4 md:p-8 pt-20 md:pt-8 bg-gray-50 min-h-[calc(100vh-5rem)]">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">번들 관리</h1>
            <p className="text-gray-500 mt-1">학습 컨텐츠를 번들 단위로 구성하고 관리합니다.</p>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setIsCategoryModalOpen(true)}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white border border-gray-100 hover:bg-gray-50 text-gray-700 font-bold rounded-2xl transition-all shadow-sm active:scale-95"
            >
              <Settings2 className="w-5 h-5" />
              카테고리 관리
            </button>
            <Link 
              href="/admin/bundles/new"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl transition-all shadow-sm active:scale-95"
            >
              <Plus className="w-5 h-5" />
              번들 생성
            </Link>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
            <input 
              type="text"
              placeholder="번들 제목 또는 설명으로 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3.5 bg-white border border-gray-100 rounded-2xl shadow-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all"
            />
          </div>
          <button className="inline-flex items-center gap-2 px-5 py-3.5 bg-white border border-gray-100 rounded-2xl text-gray-600 font-medium shadow-sm hover:bg-gray-50 transition-colors">
            <Filter className="w-5 h-5" />
            <span>필터</span>
          </button>
        </div>

        {/* Bundles Grid */}
        {filteredBundles.length === 0 ? (
          <div className="bg-white rounded-3xl border border-dashed border-gray-200 p-20 text-center">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Layers className="w-10 h-10 text-gray-300" />
            </div>
            <h3 className="text-xl font-bold text-gray-900">검색 결과가 없습니다</h3>
            <p className="text-gray-500 mt-2">다른 검색어로 시도해 보시겠어요?</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredBundles.map(bundle => (
              <Link 
                key={bundle.id}
                href={`/admin/bundles/${bundle.id}`}
                className="group bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all overflow-hidden flex flex-col"
              >
                {/* Thumbnail Area */}
                <div className="relative h-48 overflow-hidden bg-gray-100">
                  {bundle.thumbnail_url ? (
                    <img 
                      src={bundle.thumbnail_url} 
                      alt={bundle.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-gray-50 to-gray-200 flex items-center justify-center">
                      <Layout className="w-12 h-12 text-gray-300" />
                    </div>
                  )}
                  
                  {/* Category Badge */}
                  {bundle.bundle_category && (
                    <div className="absolute top-4 left-4">
                      <span className="px-3 py-1 bg-white/90 backdrop-blur-sm text-blue-600 text-[10px] font-extrabold rounded-lg shadow-sm border border-blue-50/50 uppercase tracking-wider">
                        {bundle.bundle_category.name}
                      </span>
                    </div>
                  )}

                  {/* Level Badge */}
                  <div className="absolute top-4 right-4">
                    <span className="px-2 py-1 bg-black/50 backdrop-blur-sm text-white text-[10px] font-bold rounded-lg border border-white/10">
                      Lv. {bundle.level}
                    </span>
                  </div>

                  {/* Overlay Link Indicator */}
                  <div className="absolute inset-0 bg-blue-600/0 group-hover:bg-blue-600/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <div className="bg-white/90 backdrop-blur-sm p-3 rounded-full shadow-lg transform scale-90 group-hover:scale-100 transition-transform">
                      <ExternalLink className="w-6 h-6 text-blue-600" />
                    </div>
                  </div>
                </div>

                {/* Content Area */}
                <div className="p-6 flex-1 flex flex-col">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex flex-col gap-0.5">
                      <h3 className="text-xl font-bold text-gray-900 line-clamp-1 group-hover:text-blue-600 transition-colors">
                        {bundle.title}
                      </h3>
                      {bundle.title_en && (
                        <p className="text-xs text-gray-400 font-medium line-clamp-1">{bundle.title_en}</p>
                      )}
                    </div>
                  </div>
                  
                  <p className="text-gray-500 text-sm line-clamp-2 mb-6 flex-1">
                    {bundle.description || '설명이 등록되지 않았습니다.'}
                  </p>

                  <div className="flex items-center justify-between pt-6 border-t border-gray-50">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${bundle.is_published ? 'bg-green-500' : 'bg-gray-300'}`} />
                      <span className="text-xs font-medium text-gray-400">
                        {bundle.is_published ? '공개 중' : '비공개'}
                      </span>
                    </div>
                    <span className="text-xs text-gray-300">
                      {formatDate(bundle.created_at)}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <CategoryManagerModal 
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        onRefresh={refreshBundles}
      />
    </div>
  );
}
