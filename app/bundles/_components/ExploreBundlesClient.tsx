'use client';

import { useState, useMemo } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { getBundleLevelDisplay } from '@/lib/bundle-level';
import { BundlesHero } from './BundlesHero';
import { BundleRowCard } from './BundleRowCard';
import { categoryStyles } from '../bundle-data';
import { getCategoryKey, getCategoryTitle, getBundleTitle, getBundleDescription } from '../bundle-utils';
import type { BundleCategoryRow, BundleCopy, BundleProgressSnapshot, BundleRow, Language } from '../types';

type BundleProgressStatus = 'in_progress' | 'not_started' | 'completed';

const levelFilterValues = ['1', '2', '3', '4', '5', '6', '7'];

function getProgressStatus(progress?: BundleProgressSnapshot | null): BundleProgressStatus {
  const ratio = Number(progress?.progress_ratio || 0);

  if (progress?.is_completed || ratio >= 1) {
    return 'completed';
  }

  if (progress?.is_started || ratio > 0) {
    return 'in_progress';
  }

  return 'not_started';
}

export function ExploreBundlesClient({
  bundles,
  categories,
  bundleProgress,
  isLoggedIn,
  copy,
  language,
}: {
  bundles: BundleRow[];
  categories: BundleCategoryRow[];
  bundleProgress: BundleProgressSnapshot[];
  isLoggedIn: boolean;
  copy: BundleCopy;
  language: Language;
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [selectedLevel, setSelectedLevel] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [sortBy, setSortBy] = useState('latest');
  const [currentPage, setCurrentPage] = useState(1);

  const itemsPerPage = 6;

  const categoryCounts = useMemo(() => {
    const counts = new Map<string, number>();

    bundles.forEach((bundle) => {
      const categoryKey = getCategoryKey(bundle.bundle_category);
      counts.set(categoryKey, (counts.get(categoryKey) || 0) + 1);
    });

    return counts;
  }, [bundles]);

  const progressByBundleId = useMemo(
    () => new Map(bundleProgress.map((progress) => [progress.bundle_id, progress])),
    [bundleProgress],
  );

  // Filtered & Sorted Bundles
  const processedBundles = useMemo(() => {
    let result = [...bundles];

    // 1. Category Filter
    if (activeCategory !== 'all') {
      result = result.filter(
        (b) => getCategoryKey(b.bundle_category) === activeCategory
      );
    }

    // 2. Search Filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((b) => {
        const title = getBundleTitle(b, language).toLowerCase();
        const desc = getBundleDescription(b, language).toLowerCase();
        const titleEn = (b.title_en || '').toLowerCase();
        const descEn = (b.description_en || '').toLowerCase();
        return title.includes(q) || desc.includes(q) || titleEn.includes(q) || descEn.includes(q);
      });
    }

    // 3. Level Filter
    if (selectedLevel) {
      result = result.filter(
        (b) => String(getBundleLevelDisplay(b.level, language).value) === selectedLevel
      );
    }

    // 4. Progress Status Filter (logged-in users only)
    if (isLoggedIn && selectedStatus) {
      result = result.filter(
        (b) => getProgressStatus(progressByBundleId.get(b.id)) === selectedStatus
      );
    }

    // 5. Sorting
    result.sort((a, b) => {
      const dateA = new Date(a.created_at || 0).getTime();
      const dateB = new Date(b.created_at || 0).getTime();

      if (sortBy === 'latest') {
        return dateB - dateA;
      } else if (sortBy === 'oldest') {
        return dateA - dateB;
      }
      return 0;
    });

    return result;
  }, [bundles, activeCategory, searchQuery, selectedLevel, selectedStatus, sortBy, language, isLoggedIn, progressByBundleId]);

  // Pagination Calculations
  const totalItems = processedBundles.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  
  const displayedBundles = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return processedBundles.slice(startIndex, startIndex + itemsPerPage);
  }, [processedBundles, currentPage, itemsPerPage]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Generate page numbers logic
  const pageNumbers = useMemo(() => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) {
        pages.push('...');
      }
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      if (currentPage < totalPages - 2) {
        pages.push('...');
      }
      pages.push(totalPages);
    }
    return pages;
  }, [currentPage, totalPages]);

  return (
    <div className="space-y-8">
      {/* Interactive Hero with Search */}
      <BundlesHero
        copy={copy}
        searchQuery={searchQuery}
        setSearchQuery={(q) => {
          setSearchQuery(q);
          setCurrentPage(1);
        }}
      />

      {/* Category Tabs & Sort Filter */}
      <div className="border-b border-zinc-200/50 pb-5 dark:border-zinc-800">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          {/* Horizontal tabs */}
          <div className="hidden flex-wrap items-center gap-2 md:flex">
            {/* "All" Tab */}
            <button
              onClick={() => {
                setActiveCategory('all');
                setCurrentPage(1);
              }}
              className={`rounded-full px-4 py-2 text-xs font-semibold md:text-sm transition-all duration-200 ${
                activeCategory === 'all'
                  ? 'bg-[#4e8d53] text-white shadow-sm shadow-emerald-700/20'
                  : 'border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-750'
              }`}
            >
              <span>{language === 'ko' ? '전체' : 'All'}</span>
              <span className={`ml-2 rounded-full px-2 py-0.5 text-[11px] ${
                activeCategory === 'all'
                  ? 'bg-white/20 text-white'
                  : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-700 dark:text-zinc-300'
              }`}>
                {bundles.length}
              </span>
            </button>

            {/* Categories Tabs */}
            {categories.map((category) => {
              const catKey = getCategoryKey(category);
              const title = getCategoryTitle(category, language);
              const isActive = activeCategory === catKey;
              const categoryCount = categoryCounts.get(catKey) || 0;

              return (
                <button
                  key={catKey}
                  onClick={() => {
                    setActiveCategory(catKey);
                    setCurrentPage(1);
                  }}
                  className={`rounded-full px-4 py-2 text-xs font-semibold md:text-sm transition-all duration-200 ${
                    isActive
                      ? 'bg-[#4e8d53] text-white shadow-sm shadow-emerald-700/20'
                      : 'border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-750'
                  }`}
                >
                  <span>{title}</span>
                  <span className={`ml-2 rounded-full px-2 py-0.5 text-[11px] ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-700 dark:text-zinc-300'
                  }`}>
                    {categoryCount}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Filters & Sort Dropdown */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:flex md:flex-wrap md:items-center md:justify-end">
            <div className="relative md:hidden">
              <select
                value={activeCategory}
                onChange={(e) => {
                  setActiveCategory(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full appearance-none rounded-xl border border-zinc-200 bg-white py-2 pl-4 pr-10 text-xs font-semibold text-zinc-700 shadow-sm outline-none transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-750"
                aria-label={language === 'ko' ? '카테고리 필터' : 'Category filter'}
              >
                <option value="all">{language === 'ko' ? `전체 (${bundles.length})` : `All (${bundles.length})`}</option>
                {categories.map((category) => {
                  const catKey = getCategoryKey(category);
                  const title = getCategoryTitle(category, language);
                  const categoryCount = categoryCounts.get(catKey) || 0;

                  return (
                    <option key={catKey} value={catKey}>
                      {title} ({categoryCount})
                    </option>
                  );
                })}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-zinc-500 dark:text-zinc-400">
                <ChevronDown className="h-4 w-4" />
              </div>
            </div>
            <div className="relative">
              <select
                value={selectedLevel}
                onChange={(e) => {
                  setSelectedLevel(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full appearance-none rounded-xl border border-zinc-200 bg-white py-2 pl-4 pr-10 text-xs font-semibold text-zinc-700 shadow-sm outline-none transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-750 md:w-auto md:text-sm"
                aria-label={language === 'ko' ? '난이도 필터' : 'Level filter'}
              >
                <option value="">{language === 'ko' ? '모든 난이도' : 'All levels'}</option>
                {levelFilterValues.map((levelValue) => (
                  <option key={levelValue} value={levelValue}>
                    {getBundleLevelDisplay(Number(levelValue), language).shortLabel}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-zinc-500 dark:text-zinc-400">
                <ChevronDown className="h-4 w-4" />
              </div>
            </div>
            {isLoggedIn && (
              <div className="relative">
                <select
                  value={selectedStatus}
                  onChange={(e) => {
                    setSelectedStatus(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full appearance-none rounded-xl border border-zinc-200 bg-white py-2 pl-4 pr-10 text-xs font-semibold text-zinc-700 shadow-sm outline-none transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-750 md:w-auto md:text-sm"
                  aria-label={language === 'ko' ? '진행단계 필터' : 'Progress status filter'}
                >
                  <option value="">{language === 'ko' ? '모든 진행단계' : 'All statuses'}</option>
                  <option value="in_progress">{language === 'ko' ? '진행 중' : 'In Progress'}</option>
                  <option value="not_started">{language === 'ko' ? '시작 전' : 'Not Started'}</option>
                  <option value="completed">{language === 'ko' ? '완료' : 'Completed'}</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-zinc-500 dark:text-zinc-400">
                  <ChevronDown className="h-4 w-4" />
                </div>
              </div>
            )}
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => {
                  setSortBy(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full appearance-none rounded-xl border border-zinc-200 bg-white py-2 pl-4 pr-10 text-xs font-semibold text-zinc-700 shadow-sm outline-none transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-750 md:w-auto md:text-sm"
              >
                <option value="latest">{language === 'ko' ? '최신순' : 'Latest'}</option>
                <option value="oldest">{language === 'ko' ? '오래된순' : 'Oldest'}</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-zinc-500 dark:text-zinc-400">
                <ChevronDown className="h-4 w-4" />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 md:text-sm">
            {language === 'ko'
              ? `${totalItems} / ${bundles.length}개 번들`
              : `${totalItems} / ${bundles.length} ${copy.bundles}`}
          </p>
        </div>
      </div>

      {/* Bundles List */}
      <div className="space-y-6">
        {displayedBundles.length > 0 ? (
          displayedBundles.map((bundle, index) => {
            // Find style index for this category
            const catIndex = categories.findIndex(
              (c) => getCategoryKey(c) === getCategoryKey(bundle.bundle_category)
            );
            const style =
              catIndex !== -1
                ? categoryStyles[catIndex % categoryStyles.length]
                : categoryStyles[0];

            return (
              <BundleRowCard
                key={bundle.id}
                bundle={bundle}
                language={language}
                categoryStyle={style}
                progress={isLoggedIn ? progressByBundleId.get(bundle.id) || null : null}
                isLoggedIn={isLoggedIn}
                priority={index < 2}
              />
            );
          })
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50">
            <p className="text-zinc-500 dark:text-zinc-400 font-medium">
              {language === 'ko' ? '일치하는 번들이 없습니다.' : 'No bundles found.'}
            </p>
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-6">
          {/* Previous Button */}
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-600 shadow-sm transition hover:bg-zinc-50 disabled:opacity-50 disabled:hover:bg-white dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-750"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          {/* Page Numbers */}
          {pageNumbers.map((page, idx) => {
            if (page === '...') {
              return (
                <span
                  key={`dots-${idx}`}
                  className="flex h-9 w-9 items-center justify-center text-sm font-medium text-zinc-400"
                >
                  ...
                </span>
              );
            }

            const isCurrent = page === currentPage;
            return (
              <button
                key={`page-${page}`}
                onClick={() => handlePageChange(Number(page))}
                className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold transition-all ${
                  isCurrent
                    ? 'bg-[#4e8d53] text-white shadow-sm shadow-emerald-700/20'
                    : 'border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-750'
                }`}
              >
                {page}
              </button>
            );
          })}

          {/* Next Button */}
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-600 shadow-sm transition hover:bg-zinc-50 disabled:opacity-50 disabled:hover:bg-white dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-750"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
