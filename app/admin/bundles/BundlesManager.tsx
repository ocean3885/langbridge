'use client';

import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Layout, Plus, Search, Filter, Layers, ExternalLink, Settings2, Sparkles } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { getBundleLevelDisplay } from '@/lib/bundle-level';
import { formatDate } from '@/lib/utils';
import CategoryManagerModal from './CategoryManagerModal';
import BundleTypeManagerModal from './BundleTypeManagerModal';
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
  access_level?: 'free' | 'premium' | null;
  created_at: string;
  updated_at: string;
  bundle_category?: {
    id: string;
    name: string;
    name_en: string | null;
  } | null;
  bundle_type?: {
    id: string;
    name: string;
    code: string | null;
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
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedLevel, setSelectedLevel] = useState('all');
  const [selectedPublishStatus, setSelectedPublishStatus] = useState('all');
  const [selectedAccessLevel, setSelectedAccessLevel] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isTypeModalOpen, setIsTypeModalOpen] = useState(false);
  const itemsPerPage = 12;

  const refreshBundles = async () => {
    const data = await listBundles();
    setBundles(data as Bundle[]);
    setCurrentPage(1);
  };

  const categoryOptions = useMemo(() => {
    const categories = new Map<string, string>();
    bundles.forEach((bundle) => {
      if (!bundle.bundle_category?.id) return;
      categories.set(String(bundle.bundle_category.id), bundle.bundle_category.name);
    });
    return Array.from(categories.entries()).sort((a, b) => a[1].localeCompare(b[1], 'ko'));
  }, [bundles]);

  const typeOptions = useMemo(() => {
    const types = new Map<string, string>();
    bundles.forEach((bundle) => {
      if (!bundle.bundle_type?.id) return;
      types.set(String(bundle.bundle_type.id), bundle.bundle_type.name);
    });
    return Array.from(types.entries()).sort((a, b) => a[1].localeCompare(b[1], 'ko'));
  }, [bundles]);

  const levelOptions = useMemo(() => {
    const levels = Array.from(new Set(bundles.map((bundle) => Number(bundle.level || 1)))).filter(Number.isFinite);
    return levels.sort((a, b) => a - b);
  }, [bundles]);

  const filteredBundles = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return bundles.filter((bundle) => {
      const matchesSearch = !normalizedQuery ||
        bundle.title.toLowerCase().includes(normalizedQuery) ||
        (bundle.title_en || '').toLowerCase().includes(normalizedQuery) ||
        (bundle.description || '').toLowerCase().includes(normalizedQuery) ||
        (bundle.description_en || '').toLowerCase().includes(normalizedQuery);

      const matchesCategory = selectedCategory === 'all' || String(bundle.bundle_category?.id || '') === selectedCategory;
      const matchesType = selectedType === 'all' || String(bundle.bundle_type?.id || '') === selectedType;
      const matchesLevel = selectedLevel === 'all' || String(getBundleLevelDisplay(bundle.level, 'ko').value) === selectedLevel;
      const matchesPublishStatus =
        selectedPublishStatus === 'all' ||
        (selectedPublishStatus === 'published' ? bundle.is_published : !bundle.is_published);
      const matchesAccessLevel =
        selectedAccessLevel === 'all' ||
        (selectedAccessLevel === 'premium' ? bundle.access_level === 'premium' : bundle.access_level !== 'premium');

      return matchesSearch && matchesCategory && matchesType && matchesLevel && matchesPublishStatus && matchesAccessLevel;
    });
  }, [
    bundles,
    searchQuery,
    selectedCategory,
    selectedType,
    selectedLevel,
    selectedPublishStatus,
    selectedAccessLevel,
  ]);

  const totalPages = Math.max(1, Math.ceil(filteredBundles.length / itemsPerPage));
  const displayedBundles = useMemo(() => {
    const safePage = Math.min(currentPage, totalPages);
    const startIndex = (safePage - 1) * itemsPerPage;
    return filteredBundles.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredBundles, currentPage, totalPages]);

  const pageNumbers = useMemo(() => getPageNumbers(Math.min(currentPage, totalPages), totalPages), [currentPage, totalPages]);

  const resetToFirstPage = () => setCurrentPage(1);

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('all');
    setSelectedType('all');
    setSelectedLevel('all');
    setSelectedPublishStatus('all');
    setSelectedAccessLevel('all');
    setCurrentPage(1);
  };

  const hasActiveFilters =
    searchQuery.trim() ||
    selectedCategory !== 'all' ||
    selectedType !== 'all' ||
    selectedLevel !== 'all' ||
    selectedPublishStatus !== 'all' ||
    selectedAccessLevel !== 'all';

  return (
    <div className="md:ml-64 p-4 md:p-8 pt-20 md:pt-8 bg-gray-50 dark:bg-background min-h-[calc(100vh-5rem)]">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">번들 관리</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">학습 컨텐츠를 번들 단위로 구성하고 관리합니다.</p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/admin/bundles/make-items"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-2xl transition-all shadow-sm active:scale-95"
            >
              <Sparkles className="w-5 h-5" />
              문장 생성
            </Link>
            <button 
              onClick={() => setIsCategoryModalOpen(true)}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200 font-bold rounded-2xl transition-all shadow-sm active:scale-95"
            >
              <Settings2 className="w-5 h-5" />
              카테고리
            </button>
            <button 
              onClick={() => setIsTypeModalOpen(true)}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200 font-bold rounded-2xl transition-all shadow-sm active:scale-95"
            >
              <Layers className="w-5 h-5" />
              번들 타입
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
              onChange={(e) => {
                setSearchQuery(e.target.value);
                resetToFirstPage();
              }}
              className="w-full pl-12 pr-4 py-3.5 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl shadow-sm focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/20 focus:border-blue-400 dark:focus:border-blue-500 outline-none transition-all text-gray-900 dark:text-gray-100"
            />
          </div>
          <div className="inline-flex items-center gap-2 px-5 py-3.5 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl text-gray-600 dark:text-gray-400 font-medium shadow-sm">
            <Filter className="w-5 h-5" />
            <span>{filteredBundles.length} / {bundles.length}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <FilterSelect
            label="카테고리"
            value={selectedCategory}
            onChange={(value) => {
              setSelectedCategory(value);
              resetToFirstPage();
            }}
            options={[
              { value: 'all', label: '모든 카테고리' },
              ...categoryOptions.map(([value, label]) => ({ value, label })),
            ]}
          />
          <FilterSelect
            label="타입"
            value={selectedType}
            onChange={(value) => {
              setSelectedType(value);
              resetToFirstPage();
            }}
            options={[
              { value: 'all', label: '모든 타입' },
              ...typeOptions.map(([value, label]) => ({ value, label })),
            ]}
          />
          <FilterSelect
            label="난이도"
            value={selectedLevel}
            onChange={(value) => {
              setSelectedLevel(value);
              resetToFirstPage();
            }}
            options={[
              { value: 'all', label: '모든 난이도' },
              ...levelOptions.map((level) => ({
                value: String(getBundleLevelDisplay(level, 'ko').value),
                label: getBundleLevelDisplay(level, 'ko').label,
              })),
            ]}
          />
          <FilterSelect
            label="공개 상태"
            value={selectedPublishStatus}
            onChange={(value) => {
              setSelectedPublishStatus(value);
              resetToFirstPage();
            }}
            options={[
              { value: 'all', label: '전체 상태' },
              { value: 'published', label: '공개 중' },
              { value: 'draft', label: '비공개' },
            ]}
          />
          <FilterSelect
            label="접근 권한"
            value={selectedAccessLevel}
            onChange={(value) => {
              setSelectedAccessLevel(value);
              resetToFirstPage();
            }}
            options={[
              { value: 'all', label: '전체 권한' },
              { value: 'free', label: '무료' },
              { value: 'premium', label: '유료' },
            ]}
          />
        </div>

        <div className="flex flex-col gap-3 rounded-2xl border border-gray-100 bg-white px-5 py-4 text-sm text-gray-500 shadow-sm dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 sm:flex-row sm:items-center sm:justify-between">
          <p>
            조건에 맞는 번들 <span className="font-bold text-gray-900 dark:text-gray-100">{filteredBundles.length}</span>개
            {filteredBundles.length > 0 && (
              <span className="ml-1">
                ({Math.min((Math.min(currentPage, totalPages) - 1) * itemsPerPage + 1, filteredBundles.length)}-
                {Math.min(Math.min(currentPage, totalPages) * itemsPerPage, filteredBundles.length)} 표시)
              </span>
            )}
          </p>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex items-center justify-center rounded-xl border border-gray-200 px-4 py-2 text-sm font-bold text-gray-600 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              필터 초기화
            </button>
          )}
        </div>

        {/* Bundles Grid */}
        {filteredBundles.length === 0 ? (
          <div className="bg-white dark:bg-gray-900 rounded-3xl border border-dashed border-gray-200 dark:border-gray-800 p-20 text-center">
            <div className="w-20 h-20 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <Layers className="w-10 h-10 text-gray-300 dark:text-gray-700" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">검색 결과가 없습니다</h3>
            <p className="text-gray-500 dark:text-gray-400 mt-2">다른 검색어로 시도해 보시겠어요?</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {displayedBundles.map(bundle => (
              <Link 
                key={bundle.id}
                href={`/admin/bundles/${bundle.id}`}
                className="group bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all overflow-hidden flex flex-col"
              >
                {/* Thumbnail Area */}
                <div className="relative aspect-video overflow-hidden bg-gray-50 dark:bg-gray-800">
                  {bundle.thumbnail_url ? (
                    <Image
                      src={bundle.thumbnail_url}
                      alt={bundle.title}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-gray-50 to-gray-200 dark:from-gray-800 dark:to-gray-950 flex items-center justify-center">
                      <Layout className="w-12 h-12 text-gray-300 dark:text-gray-700" />
                    </div>
                  )}
                  
                  {/* Category Badge */}
                  {bundle.bundle_category && (
                    <div className="absolute top-4 left-4">
                      <span className="px-3 py-1 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm text-blue-600 dark:text-blue-400 text-[10px] font-extrabold rounded-lg shadow-sm border border-blue-50/50 dark:border-blue-900/50 uppercase tracking-wider">
                        {bundle.bundle_category.name}
                      </span>
                    </div>
                  )}

                  {/* Level Badge */}
                  <div className="absolute top-4 right-4">
                    <span className="px-2 py-1 bg-black/50 backdrop-blur-sm text-white text-[10px] font-bold rounded-lg border border-white/10">
                      {getBundleLevelDisplay(bundle.level, 'ko').shortLabel}
                    </span>
                  </div>

                  {/* Overlay Link Indicator */}
                  <div className="absolute inset-0 bg-blue-600/0 group-hover:bg-blue-600/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm p-3 rounded-full shadow-lg transform scale-90 group-hover:scale-100 transition-transform">
                      <ExternalLink className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    </div>
                  </div>
                </div>

                {/* Content Area */}
                <div className="p-6 flex-1 flex flex-col">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex flex-col gap-0.5">
                      <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 line-clamp-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {bundle.title}
                      </h3>
                      {bundle.title_en && (
                        <p className="text-xs text-gray-400 dark:text-gray-500 font-medium line-clamp-1">{bundle.title_en}</p>
                      )}
                    </div>
                  </div>
                  
                  <p className="text-gray-500 dark:text-gray-400 text-sm line-clamp-2 mb-6 flex-1">
                    {bundle.description || '설명이 등록되지 않았습니다.'}
                  </p>

                  <div className="flex items-center justify-between pt-6 border-t border-gray-50 dark:border-gray-800">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${bundle.is_published ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-700'}`} />
                    <span className="text-xs font-medium text-gray-400 dark:text-gray-500">
                      {bundle.is_published ? '공개 중' : '비공개'}
                    </span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${bundle.access_level === 'premium' ? 'bg-orange-50 text-orange-600 dark:bg-orange-950/40 dark:text-orange-300' : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300'}`}>
                        {bundle.access_level === 'premium' ? '유료' : '무료'}
                      </span>
                    </div>
                    <span className="text-xs text-gray-300 dark:text-gray-600">
                      {formatDate(bundle.created_at)}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {filteredBundles.length > itemsPerPage && (
          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
            <button
              type="button"
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              disabled={currentPage <= 1}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 shadow-sm transition hover:bg-gray-50 disabled:opacity-40 disabled:hover:bg-white dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
              aria-label="이전 페이지"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            {pageNumbers.map((page, index) => {
              if (page === '...') {
                return (
                  <span key={`dots-${index}`} className="flex h-10 w-10 items-center justify-center text-sm font-bold text-gray-400">
                    ...
                  </span>
                );
              }

              const isCurrent = page === Math.min(currentPage, totalPages);
              return (
                <button
                  key={page}
                  type="button"
                  onClick={() => setCurrentPage(page)}
                  className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold transition ${
                    isCurrent
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800'
                  }`}
                >
                  {page}
                </button>
              );
            })}

            <button
              type="button"
              onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
              disabled={currentPage >= totalPages}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 shadow-sm transition hover:bg-gray-50 disabled:opacity-40 disabled:hover:bg-white dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
              aria-label="다음 페이지"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      <CategoryManagerModal 
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        onRefresh={refreshBundles}
      />

      <BundleTypeManagerModal 
        isOpen={isTypeModalOpen}
        onClose={() => setIsTypeModalOpen(false)}
        onRefresh={refreshBundles}
      />
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <label className="space-y-1.5">
      <span className="ml-1 text-xs font-bold text-gray-500 dark:text-gray-400">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-2xl border border-gray-100 bg-white px-4 py-3 text-sm font-semibold text-gray-700 shadow-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:focus:border-blue-500 dark:focus:ring-blue-900/20"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function getPageNumbers(currentPage: number, totalPages: number) {
  const pages: Array<number | '...'> = [];

  if (totalPages <= 7) {
    for (let page = 1; page <= totalPages; page += 1) {
      pages.push(page);
    }
    return pages;
  }

  pages.push(1);
  if (currentPage > 3) pages.push('...');

  const start = Math.max(2, currentPage - 1);
  const end = Math.min(totalPages - 1, currentPage + 1);
  for (let page = start; page <= end; page += 1) {
    pages.push(page);
  }

  if (currentPage < totalPages - 2) pages.push('...');
  pages.push(totalPages);

  return pages;
}
