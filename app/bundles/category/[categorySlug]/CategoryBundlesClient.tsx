'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Lock,
  Search,
  X,
} from 'lucide-react';
import { getBundleLevelDisplay } from '@/lib/bundle-level';
import { translations } from '../../bundle-data';
import {
  bundleItemCount,
  estimateBundleMinutesForBundle,
  getBundleDescription,
  getBundleImage,
  getBundleTitle,
  getDisplayFontClass,
} from '../../bundle-utils';
import type { BundleCopy, BundleProgressSnapshot, BundleRow, Language } from '../../types';

const ITEMS_PER_PAGE = 9;
const levelFilterValues = ['1', '2', '3', '4', '5', '6', '7'];

type BundleProgressStatus = 'in_progress' | 'not_started' | 'completed';

type CategoryBundleCopy = {
  filters: string[];
  level: string;
  status: string;
  sort: string;
  allLevels: string;
  allStatuses: string;
  newest: string;
  oldest: string;
  shortest: string;
  longest: string;
  new: string;
  inProgress: string;
  notStarted: string;
  completed: string;
  preview: string;
  searchPlaceholder: (categoryTitle: string) => string;
  clearSearch: string;
  noResultsTitle: string;
  noResultsDesc: string;
  noBundlesTitle: string;
  noBundlesDesc: string;
};

const pageCopy = {
  ko: {
    filters: ['전체', '진행 중', '시작 전', '완료'],
    level: '난이도',
    status: '상태',
    sort: '정렬',
    allLevels: '모든 난이도',
    allStatuses: '모든 상태',
    newest: '최신순',
    oldest: '오래된순',
    shortest: '짧은순',
    longest: '긴 순',
    new: '신규',
    inProgress: '진행 중',
    notStarted: '시작 전',
    completed: '완료',
    preview: '미리보기',
    searchPlaceholder: (categoryTitle: string) => `${categoryTitle} 번들 검색`,
    clearSearch: '검색어 지우기',
    noResultsTitle: '조건에 맞는 번들이 없습니다',
    noResultsDesc: '검색어나 필터를 조금 넓혀보세요.',
    noBundlesTitle: '아직 공개된 번들이 없습니다',
    noBundlesDesc: '이 카테고리의 새 번들을 준비하고 있어요.',
  },
  en: {
    filters: ['All', 'In Progress', 'Not Started', 'Completed'],
    level: 'Level',
    status: 'Status',
    sort: 'Sort',
    allLevels: 'All levels',
    allStatuses: 'All statuses',
    newest: 'Newest',
    oldest: 'Oldest',
    shortest: 'Shortest',
    longest: 'Longest',
    new: 'New',
    inProgress: 'In Progress',
    notStarted: 'Not Started',
    completed: 'Completed',
    preview: 'Preview',
    searchPlaceholder: (categoryTitle: string) => `Search ${categoryTitle} bundles`,
    clearSearch: 'Clear search',
    noResultsTitle: 'No bundles match your filters',
    noResultsDesc: 'Try broadening your search or filters.',
    noBundlesTitle: 'No published bundles yet',
    noBundlesDesc: 'New bundles for this category are being prepared.',
  },
} satisfies Record<Language, CategoryBundleCopy>;

type BundleStatusBadge = {
  label: string;
  className: string;
};

type BundleWithStatus = {
  bundle: BundleRow;
  statusKey: BundleProgressStatus;
  badge: BundleStatusBadge | null;
};

export function CategoryBundlesClient({
  categoryTitle,
  bundles,
  bundleProgress,
  newestBundleId,
  isLoggedIn,
  language,
}: {
  categoryTitle: string;
  bundles: BundleRow[];
  bundleProgress: BundleProgressSnapshot[];
  newestBundleId: string | null;
  isLoggedIn: boolean;
  language: Language;
}) {
  const copy = translations[language];
  const localCopy = pageCopy[language];
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLevel, setSelectedLevel] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedSort, setSelectedSort] = useState('newest');
  const [currentPage, setCurrentPage] = useState(1);

  const progressByBundleId = useMemo(
    () => new Map(bundleProgress.map((progress) => [progress.bundle_id, progress])),
    [bundleProgress],
  );
  const levelQuickFilters = useMemo(() => {
    const levels = new Map<string, string>();

    bundles.forEach((bundle) => {
      const level = getBundleLevelDisplay(bundle.level, language);
      levels.set(String(level.value), level.shortLabel);
    });

    return Array.from(levels.entries())
      .sort(([first], [second]) => Number(first) - Number(second))
      .map(([value, label]) => ({ value, label }));
  }, [bundles, language]);

  const filteredBundleEntries = useMemo(() => {
    const normalizedQuery = searchQuery.toLowerCase().trim();

    const result = bundles
      .map((bundle) => {
        const progress = progressByBundleId.get(bundle.id);
        const statusKey = getBundleProgressStatus(progress);

        return {
          bundle,
          statusKey,
          badge: getBundleStatusBadge({
            bundle,
            progress,
            language,
            newestBundleId,
            isLoggedIn,
          }),
        };
      })
      .filter((entry) => {
        if (!normalizedQuery) return true;

        const title = getBundleTitle(entry.bundle, language).toLowerCase();
        const description = getBundleDescription(entry.bundle, language).toLowerCase();
        const titleEn = (entry.bundle.title_en || '').toLowerCase();
        const descriptionEn = (entry.bundle.description_en || '').toLowerCase();
        return title.includes(normalizedQuery) || description.includes(normalizedQuery) || titleEn.includes(normalizedQuery) || descriptionEn.includes(normalizedQuery);
      })
      .filter((entry) => {
        if (!selectedLevel) return true;
        return String(getBundleLevelDisplay(entry.bundle.level, language).value) === selectedLevel;
      })
      .filter((entry) => {
        if (!isLoggedIn || !selectedStatus) return true;
        return entry.statusKey === selectedStatus;
      });

    return result.sort((a, b) => {
      if (selectedSort === 'oldest') {
        return getBundleTime(a.bundle) - getBundleTime(b.bundle);
      }
      if (selectedSort === 'shortest') {
        return estimateBundleMinutesForBundle(a.bundle) - estimateBundleMinutesForBundle(b.bundle);
      }
      if (selectedSort === 'longest') {
        return estimateBundleMinutesForBundle(b.bundle) - estimateBundleMinutesForBundle(a.bundle);
      }

      return getBundleTime(b.bundle) - getBundleTime(a.bundle);
    });
  }, [bundles, progressByBundleId, searchQuery, selectedLevel, selectedStatus, selectedSort, language, newestBundleId, isLoggedIn]);

  const totalPages = Math.max(1, Math.ceil(filteredBundleEntries.length / ITEMS_PER_PAGE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pageEntries = filteredBundleEntries.slice(
    (safeCurrentPage - 1) * ITEMS_PER_PAGE,
    safeCurrentPage * ITEMS_PER_PAGE,
  );
  const pageNumbers = getPageNumbers(safeCurrentPage, totalPages);
  const featuredEntry = pageEntries[0] ?? null;
  const gridEntries = featuredEntry ? pageEntries.slice(1) : pageEntries;
  const hasCategoryBundles = bundles.length > 0;
  const hasFilteredResults = filteredBundleEntries.length > 0;

  const updateFilter = (update: () => void) => {
    update();
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    document.getElementById('bundle-filters')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <>
      <div id="bundle-filters" className="scroll-mt-4 border-y border-zinc-200 bg-background dark:border-zinc-800">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <label className="relative block w-full lg:max-w-[420px]">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-500 dark:text-zinc-400" />
              <input
                value={searchQuery}
                onChange={(event) => updateFilter(() => setSearchQuery(event.target.value))}
                className="h-12 w-full rounded-full border border-zinc-200 bg-white pl-12 pr-12 text-sm shadow-sm outline-none placeholder:text-zinc-500 focus:border-[#559c63] focus:ring-1 focus:ring-[#559c63] dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:shadow-black/20 dark:placeholder:text-zinc-500"
                placeholder={localCopy.searchPlaceholder(categoryTitle)}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => updateFilter(() => setSearchQuery(''))}
                  aria-label={localCopy.clearSearch}
                  title={localCopy.clearSearch}
                  className="absolute right-3 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700 focus:outline-none focus:ring-2 focus:ring-[#559c63]/40 dark:text-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </label>
            <div className="grid grid-cols-2 gap-2 rounded-xl border border-zinc-200/70 bg-zinc-50/70 p-2 shadow-sm lg:flex lg:flex-wrap lg:items-center lg:justify-end lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none">
              <FilterSelect
                id="category-level-filter"
                label={localCopy.level}
                value={selectedLevel}
                onChange={(value) => updateFilter(() => setSelectedLevel(value))}
                options={[
                  { label: localCopy.allLevels, value: '' },
                  ...levelFilterValues.map((levelValue) => ({
                    label: getBundleLevelDisplay(Number(levelValue), language).shortLabel,
                    value: levelValue,
                  })),
                ]}
              />
              {isLoggedIn && (
                <FilterSelect
                  id="category-status-filter"
                  label={localCopy.status}
                  value={selectedStatus}
                  onChange={(value) => updateFilter(() => setSelectedStatus(value))}
                  options={[
                    { label: localCopy.allStatuses, value: '' },
                    { label: localCopy.inProgress, value: 'in_progress' },
                    { label: localCopy.notStarted, value: 'not_started' },
                    { label: localCopy.completed, value: 'completed' },
                  ]}
                />
              )}
              <FilterSelect
                id="category-sort-filter"
                label={localCopy.sort}
                value={selectedSort}
                onChange={(value) => updateFilter(() => setSelectedSort(value))}
                options={[
                  { label: localCopy.newest, value: 'newest' },
                  { label: localCopy.oldest, value: 'oldest' },
                  { label: localCopy.shortest, value: 'shortest' },
                  { label: localCopy.longest, value: 'longest' },
                ]}
              />
            </div>
          </div>

          <div className="mt-4 flex justify-end md:mt-5 md:flex-col md:gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="hidden gap-2 overflow-x-auto pb-1 md:flex">
              {getQuickFilters(localCopy.filters, levelQuickFilters, selectedLevel, selectedStatus, isLoggedIn).map((filter) => (
                <button
                  key={filter.label}
                  type="button"
                  onClick={() => updateFilter(() => {
                    setSelectedLevel(filter.level);
                    setSelectedStatus(filter.status);
                  })}
                  className={`shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition ${
                    filter.active
                      ? 'border-[#dff1e5] bg-[#dff1e5] text-[#2f7d4a] dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      : 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800'
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
            <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
              {filteredBundleEntries.length} / {bundles.length} {copy.bundles}
            </p>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 pb-16 pt-8 sm:px-6 sm:pb-20 lg:px-8">
        {featuredEntry ? (
          <FeaturedBundle entry={featuredEntry} language={language} copy={copy} previewLabel={localCopy.preview} />
        ) : hasCategoryBundles && !hasFilteredResults ? (
          <EmptyPanel title={localCopy.noResultsTitle} description={localCopy.noResultsDesc} />
        ) : (
          <EmptyPanel title={localCopy.noBundlesTitle} description={localCopy.noBundlesDesc} />
        )}

        {gridEntries.length > 0 && (
          <section className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {gridEntries.map((entry, index) => (
              <CategoryBundleCard
                key={entry.bundle.id}
                bundle={entry.bundle}
                index={index + 1}
                language={language}
                status={entry.badge}
              />
            ))}
          </section>
        )}

        {totalPages > 1 && (
          <nav className="flex items-center justify-center gap-2 pt-8" aria-label="Pagination">
            <button
              type="button"
              onClick={() => handlePageChange(Math.max(1, safeCurrentPage - 1))}
              disabled={safeCurrentPage === 1}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-600 shadow-sm transition hover:bg-zinc-50 disabled:opacity-50 disabled:hover:bg-white dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700 dark:disabled:hover:bg-zinc-800"
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            {pageNumbers.map((page, index) => {
              if (page === '...') {
                return (
                  <span key={`dots-${index}`} className="flex h-9 w-9 items-center justify-center text-sm font-medium text-zinc-400">
                    ...
                  </span>
                );
              }

              const isCurrent = page === safeCurrentPage;
              return (
                <button
                  key={`page-${page}`}
                  type="button"
                  onClick={() => handlePageChange(page)}
                  className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold transition-all ${
                    isCurrent
                      ? 'bg-[#4e8d53] text-white shadow-sm shadow-emerald-700/20'
                      : 'border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700'
                  }`}
                  aria-current={isCurrent ? 'page' : undefined}
                >
                  {page}
                </button>
              );
            })}

            <button
              type="button"
              onClick={() => handlePageChange(Math.min(totalPages, safeCurrentPage + 1))}
              disabled={safeCurrentPage === totalPages}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-600 shadow-sm transition hover:bg-zinc-50 disabled:opacity-50 disabled:hover:bg-white dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700 dark:disabled:hover:bg-zinc-800"
              aria-label="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </nav>
        )}
      </div>
    </>
  );
}

function FeaturedBundle({
  entry,
  language,
  copy,
  previewLabel,
}: {
  entry: BundleWithStatus;
  language: Language;
  copy: BundleCopy;
  previewLabel: string;
}) {
  const title = getBundleTitle(entry.bundle, language);

  return (
    <section className="grid gap-5 overflow-hidden rounded-lg border border-[#f4c89c] bg-[#fffaf1] p-3 shadow-sm dark:border-orange-900/70 dark:bg-zinc-900 dark:shadow-black/20 md:grid-cols-[300px_1fr] md:items-center md:p-4 lg:grid-cols-[340px_1fr_210px] lg:gap-6">
      <Link href={`/bundles/${entry.bundle.id}`} className="relative aspect-[2/1] overflow-hidden rounded-md bg-[#f3ede3] dark:bg-zinc-800">
        <Image
          src={getBundleImage(entry.bundle, 0)}
          alt={title}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 92vw, 340px"
        />
        {entry.badge && (
          <span className={`absolute left-3 top-3 rounded-full px-3 py-1 text-xs font-semibold ${entry.badge.className}`}>
            {entry.badge.label}
          </span>
        )}
        {entry.bundle.access_level === 'premium' && (
          <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-[#FBE9E2] px-3 py-1 text-xs font-bold text-[#C65D47] shadow-sm dark:bg-orange-950/60 dark:text-orange-200">
            <Lock className="h-3 w-3" />
            Premium
          </span>
        )}
      </Link>
      <div className="px-1 md:px-0">
        <h2 className={`${getDisplayFontClass(title)} text-2xl font-bold leading-tight sm:text-3xl`}>{title}</h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-700 dark:text-zinc-300">
          {getBundleDescription(entry.bundle, language)}
        </p>
        <div className="mt-4 flex flex-wrap gap-2 text-xs font-medium text-[#735b31] dark:text-amber-300">
          <span className="rounded-full bg-[#fff0c8] px-3 py-1 dark:bg-amber-950/70">{levelLabel(entry.bundle, language)}</span>
          <span className="rounded-full bg-[#fff0c8] px-3 py-1 dark:bg-amber-950/70">{bundleItemCount(entry.bundle)} {copy.items}</span>
          <span className="rounded-full bg-[#fff0c8] px-3 py-1 dark:bg-amber-950/70">{estimateBundleMinutesForBundle(entry.bundle)} {copy.minutes}</span>
        </div>
      </div>
      <div className="flex flex-col gap-3 md:col-span-2 md:grid md:grid-cols-2 md:px-0 lg:col-span-1 lg:flex lg:px-2">
        <Link
          href={`/bundles/${entry.bundle.id}/learn`}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-[#57985a] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#477f4a] dark:bg-emerald-600 dark:hover:bg-emerald-500"
        >
          {copy.start}
          <ArrowRight className="h-4 w-4" />
        </Link>
        <Link
          href={`/bundles/${entry.bundle.id}`}
          className="inline-flex items-center justify-center rounded-full border border-zinc-200 bg-white px-6 py-3 text-sm font-bold text-[#1f1b18] transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
        >
          {previewLabel}
        </Link>
      </div>
    </section>
  );
}

function CategoryBundleCard({
  bundle,
  index,
  language,
  status,
}: {
  bundle: BundleRow;
  index: number;
  language: Language;
  status: BundleStatusBadge | null;
}) {
  const copy = translations[language];
  const title = getBundleTitle(bundle, language);
  const isPremium = bundle.access_level === 'premium';

  return (
    <Link
      href={`/bundles/${bundle.id}`}
      className="group overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-black/20 dark:hover:border-zinc-700"
    >
      <div className="relative aspect-[1.85/1] overflow-hidden bg-[#f3ede3] dark:bg-zinc-800">
        <Image
          src={getBundleImage(bundle, index)}
          alt={title}
          fill
          className="object-cover transition duration-500 group-hover:scale-105"
          sizes="(max-width: 640px) 92vw, (max-width: 1024px) 45vw, 280px"
        />
        {status && (
          <span className={`absolute left-3 top-3 rounded-full px-3 py-1 text-xs font-semibold ${status.className}`}>
            {status.label}
          </span>
        )}
        {isPremium && (
          <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-[#FBE9E2] px-3 py-1 text-xs font-bold text-[#C65D47] shadow-sm dark:bg-orange-950/60 dark:text-orange-200">
            <Lock className="h-3 w-3" />
            Premium
          </span>
        )}
      </div>
      <div className="p-4">
        <h3 className="line-clamp-2 min-h-11 text-lg font-bold leading-snug text-[#1f1b18] dark:text-zinc-100">{title}</h3>
        <p className="mt-2 line-clamp-2 min-h-10 text-sm leading-5 text-zinc-600 dark:text-zinc-400">
          {getBundleDescription(bundle, language)}
        </p>
        <div className="mt-4 flex items-center justify-between gap-2 text-xs font-medium text-zinc-600 dark:text-zinc-400">
          <span className="inline-flex items-center gap-1">
            <BarChart3 className="h-3.5 w-3.5" />
            {shortLevelLabel(bundle, language)}
          </span>
          <span className="inline-flex items-center gap-1">
            <BookOpen className="h-3.5 w-3.5" />
            {bundleItemCount(bundle)} {copy.items}
          </span>
          <span className="inline-flex items-center gap-1">
            <Clock3 className="h-3.5 w-3.5" />
            {estimateBundleMinutesForBundle(bundle)} {copy.minutes}
          </span>
        </div>
      </div>
    </Link>
  );
}

function FilterSelect({
  id,
  label,
  value,
  onChange,
  options,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ label: string; value: string }>;
}) {
  return (
    <div className="relative">
      <label htmlFor={id} className="mb-1 block text-[10px] font-bold uppercase text-zinc-500 dark:text-zinc-400 lg:sr-only">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full appearance-none rounded-lg border border-zinc-200 bg-white pl-3 pr-8 text-xs font-semibold text-zinc-700 shadow-sm outline-none transition-colors hover:bg-zinc-50 focus:border-[#559c63] focus:ring-1 focus:ring-[#559c63] dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-750 lg:w-auto lg:text-sm"
      >
        {options.map((option) => (
          <option key={option.value || option.label} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <div className="pointer-events-none absolute bottom-0 right-0 flex h-10 items-center pr-2.5 text-zinc-500 dark:text-zinc-400">
        <ChevronDown className="h-4 w-4" />
      </div>
    </div>
  );
}

function EmptyPanel({ title, description }: { title: string; description: string }) {
  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-10 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-black/20">
      <h2 className="text-xl font-bold">{title}</h2>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{description}</p>
    </section>
  );
}

function getStatusBadge(status: 'new' | 'in_progress' | 'not_started' | 'completed', language: Language): BundleStatusBadge {
  const copy = pageCopy[language];

  const badges = {
    new: { label: copy.new, className: 'bg-[#dbeafe] text-[#1d5fa7] dark:bg-blue-950/90 dark:text-blue-300' },
    in_progress: { label: copy.inProgress, className: 'bg-[#dff1e5] text-[#2f7d4a] dark:bg-emerald-950/90 dark:text-emerald-300' },
    not_started: { label: copy.notStarted, className: 'bg-[#fff7e6] text-[#7f6330] dark:bg-amber-950/90 dark:text-amber-300' },
    completed: { label: copy.completed, className: 'bg-[#edf7ed] text-[#497a4d] dark:bg-green-950/90 dark:text-green-300' },
  } satisfies Record<typeof status, BundleStatusBadge>;

  return badges[status];
}

function getBundleStatusBadge({
  bundle,
  progress,
  language,
  newestBundleId,
  isLoggedIn,
}: {
  bundle: BundleRow;
  progress?: BundleProgressSnapshot;
  language: Language;
  newestBundleId: string | null;
  isLoggedIn: boolean;
}) {
  if (!isLoggedIn) return null;

  if (bundle.id === newestBundleId) {
    return getStatusBadge('new', language);
  }

  return getStatusBadge(getBundleProgressStatus(progress), language);
}

function getBundleProgressStatus(progress?: BundleProgressSnapshot): BundleProgressStatus {
  const progressRatio = Number(progress?.progress_ratio || 0);

  if (progress?.is_completed || progressRatio >= 1) {
    return 'completed';
  }

  if (progress?.is_started || progressRatio > 0) {
    return 'in_progress';
  }

  return 'not_started';
}

function levelLabel(bundle: BundleRow, language: Language) {
  return getBundleLevelDisplay(bundle.level, language).label;
}

function shortLevelLabel(bundle: BundleRow, language: Language) {
  return getBundleLevelDisplay(bundle.level, language).shortLabel;
}

function getBundleTime(bundle: BundleRow) {
  const time = bundle.created_at ? new Date(bundle.created_at).getTime() : 0;
  return Number.isFinite(time) ? time : 0;
}

function getQuickFilters(
  labels: string[],
  levelFilters: Array<{ value: string; label: string }>,
  selectedLevel: string,
  selectedStatus: string,
  isLoggedIn: boolean,
) {
  const filters = [
    {
      label: labels[0],
      level: '',
      status: '',
      active: !selectedLevel && !selectedStatus,
    },
    ...levelFilters.map((filter) => ({
      label: filter.label,
      level: filter.value,
      status: '',
      active: selectedLevel === filter.value,
    })),
  ];

  if (!isLoggedIn) return filters;

  return [
    ...filters,
    {
      label: labels[1],
      level: '',
      status: 'in_progress',
      active: selectedStatus === 'in_progress',
    },
    {
      label: labels[2],
      level: '',
      status: 'not_started',
      active: selectedStatus === 'not_started',
    },
    {
      label: labels[3],
      level: '',
      status: 'completed',
      active: selectedStatus === 'completed',
    },
  ];
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
  if (currentPage > 3) {
    pages.push('...');
  }

  const start = Math.max(2, currentPage - 1);
  const end = Math.min(totalPages - 1, currentPage + 1);
  for (let page = start; page <= end; page += 1) {
    pages.push(page);
  }

  if (currentPage < totalPages - 2) {
    pages.push('...');
  }
  pages.push(totalPages);

  return pages;
}
