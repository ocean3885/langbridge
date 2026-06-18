import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Home,
  Lock,
  Search,
  SlidersHorizontal,
} from 'lucide-react';
import { getAppUserFromServer, getDisplayLanguage } from '@/lib/auth/app-user';
import { getBundleLevelDisplay } from '@/lib/bundle-level';
import { listUserBundleInteractionsForBundles, type UserBundleInteraction } from '@/lib/supabase/services/bundle-progress';
import { listBundles, listCategories } from '@/lib/supabase/services/bundles';
import { translations } from '../../bundle-data';
import {
  getBundleDescription,
  getBundleImage,
  getBundleTitle,
  getCategoryDescription,
  getCategoryHref,
  getCategoryKey,
  getCategoryTitle,
  isCategorySlugMatch,
  bundleItemCount,
  estimateBundleMinutesForBundle,
  getBundleMinutesRange,
  getDisplayFontClass,
} from '../../bundle-utils';
import type { BundleCategoryRow, BundleRow, Language } from '../../types';

export const dynamic = 'force-dynamic';

interface CategoryBundlesPageProps {
  params: Promise<{
    categorySlug: string;
  }>;
  searchParams?: Promise<{
    q?: string | string[];
    level?: string | string[];
    page?: string | string[];
    status?: string | string[];
    sort?: string | string[];
  }>;
}

const pageCopy = {
  ko: {
    home: '홈',
    filters: ['전체', 'A1', 'A2', '진행 중', '시작 전', '완료'],
    level: '레벨',
    status: '상태',
    allLevels: '모든 레벨',
    allStatuses: '모든 상태',
    apply: '적용',
    newest: '최신순',
    oldest: '오래된순',
    shortest: '짧은순',
    longest: '긴 순',
    new: '신규',
    inProgress: '진행 중',
    notStarted: '시작 전',
    completed: '완료',
    preview: '미리보기',
    searchPrefix: '검색',
    noResultsTitle: '조건에 맞는 번들이 없습니다',
    noResultsDesc: '검색어나 필터를 조금 넓혀보세요.',
    noBundlesTitle: '아직 공개된 번들이 없습니다',
    noBundlesDesc: '이 카테고리의 새 번들을 준비하고 있어요.',
  },
  en: {
    home: 'Home',
    filters: ['All', 'A1', 'A2', 'In Progress', 'Not Started', 'Completed'],
    level: 'Level',
    status: 'Status',
    allLevels: 'All levels',
    allStatuses: 'All statuses',
    apply: 'Apply',
    newest: 'Newest',
    oldest: 'Oldest',
    shortest: 'Shortest',
    longest: 'Longest',
    new: 'New',
    inProgress: 'In Progress',
    notStarted: 'Not Started',
    completed: 'Completed',
    preview: 'Preview',
    searchPrefix: 'Search',
    noResultsTitle: 'No bundles match your filters',
    noResultsDesc: 'Try broadening your search or filters.',
    noBundlesTitle: 'No published bundles yet',
    noBundlesDesc: 'New bundles for this category are being prepared.',
  },
} satisfies Record<Language, Record<string, string | string[]>>;

const FILTER_SECTION_ID = 'bundle-filters';
const ITEMS_PER_PAGE = 6;

type BundleProgressStatus = 'inProgress' | 'notStarted' | 'completed';
type FilterStatusValue = 'in_progress' | 'not_started' | 'completed';

type BundleWithStatus = {
  bundle: BundleRow;
  statusKey: BundleProgressStatus;
  badge: BundleStatusBadge | null;
};

type BundleStatusBadge = {
  label: string;
  className: string;
};

function getStatusBadge(
  status: 'new' | 'inProgress' | 'notStarted' | 'completed',
  language: Language,
): BundleStatusBadge {
  const copy = pageCopy[language];

  const badges = {
    new: { label: copy.new as string, className: 'bg-[#dbeafe] text-[#1d5fa7] dark:bg-blue-950/90 dark:text-blue-300' },
    inProgress: { label: copy.inProgress as string, className: 'bg-[#dff1e5] text-[#2f7d4a] dark:bg-emerald-950/90 dark:text-emerald-300' },
    notStarted: { label: copy.notStarted as string, className: 'bg-[#fff7e6] text-[#7f6330] dark:bg-amber-950/90 dark:text-amber-300' },
    completed: { label: copy.completed as string, className: 'bg-[#edf7ed] text-[#497a4d] dark:bg-green-950/90 dark:text-green-300' },
  } satisfies Record<typeof status, BundleStatusBadge>;

  return badges[status];
}

function getBundleStatusBadge({
  bundle,
  interaction,
  language,
  newestBundleId,
  isLoggedIn,
}: {
  bundle: BundleRow;
  interaction?: UserBundleInteraction;
  language: Language;
  newestBundleId: string | null;
  isLoggedIn: boolean;
}) {
  if (!isLoggedIn) return null;

  if (bundle.id === newestBundleId) {
    return getStatusBadge('new', language);
  }

  const progressRatio = Number(interaction?.progress_ratio || 0);

  if (interaction?.is_completed || progressRatio >= 1) {
    return getStatusBadge('completed', language);
  }

  if (interaction?.is_started || progressRatio > 0) {
    return getStatusBadge('inProgress', language);
  }

  return getStatusBadge('notStarted', language);
}

function getBundleProgressStatus(interaction?: UserBundleInteraction): BundleProgressStatus {
  const progressRatio = Number(interaction?.progress_ratio || 0);

  if (interaction?.is_completed || progressRatio >= 1) {
    return 'completed';
  }

  if (interaction?.is_started || progressRatio > 0) {
    return 'inProgress';
  }

  return 'notStarted';
}

function levelLabel(bundle: BundleRow, language: Language) {
  return getBundleLevelDisplay(bundle.level, language).label;
}

function shortLevelLabel(bundle: BundleRow, language: Language) {
  return getBundleLevelDisplay(bundle.level, language).shortLabel;
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
  label,
  name,
  value,
  options,
}: {
  label: string;
  name: string;
  value: string;
  options: Array<{ label: string; value: string }>;
}) {
  return (
    <label className="block">
      <span className="sr-only">{label}</span>
      <select
        name={name}
        defaultValue={value}
        className="h-11 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm font-semibold text-[#1f1b18] shadow-sm outline-none transition hover:bg-zinc-50 focus:border-[#8dbd8f] focus:ring-2 focus:ring-[#dff1e5] dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:shadow-black/20 dark:hover:bg-zinc-800 dark:focus:border-emerald-700 dark:focus:ring-emerald-950 sm:w-auto"
      >
        {options.map((option) => (
          <option key={option.value || option.label} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function getQueryValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] || '';
  return value || '';
}

function getPageValue(value: string | string[] | undefined) {
  const page = Number(getQueryValue(value));
  if (!Number.isFinite(page)) return 1;
  return Math.max(1, Math.floor(page));
}

function toStatusQueryValue(status: BundleProgressStatus): FilterStatusValue {
  if (status === 'inProgress') return 'in_progress';
  if (status === 'completed') return 'completed';
  return 'not_started';
}

function filterAndSortBundles({
  bundles,
  interactionByBundleId,
  language,
  newestBundleId,
  query,
  selectedLevel,
  selectedStatus,
  selectedSort,
  isLoggedIn,
}: {
  bundles: BundleRow[];
  interactionByBundleId: Map<string, UserBundleInteraction>;
  language: Language;
  newestBundleId: string | null;
  query: string;
  selectedLevel: string;
  selectedStatus: string;
  selectedSort: string;
  isLoggedIn: boolean;
}): BundleWithStatus[] {
  const normalizedQuery = query.toLowerCase();

  const result = bundles
    .map((bundle) => {
      const interaction = interactionByBundleId.get(bundle.id);

      return {
        bundle,
        statusKey: getBundleProgressStatus(interaction),
        badge: getBundleStatusBadge({ bundle, interaction, language, newestBundleId, isLoggedIn }),
      };
    })
    .filter((entry) => {
      if (!normalizedQuery) return true;

      const title = getBundleTitle(entry.bundle, language).toLowerCase();
      const description = getBundleDescription(entry.bundle, language).toLowerCase();
      return title.includes(normalizedQuery) || description.includes(normalizedQuery);
    })
    .filter((entry) => {
      if (!selectedLevel) return true;
      return String(getBundleLevelDisplay(entry.bundle.level, language).value) === selectedLevel;
    })
    .filter((entry) => {
      if (!selectedStatus) return true;
      return toStatusQueryValue(entry.statusKey) === selectedStatus;
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
}

function getBundleTime(bundle: BundleRow) {
  const time = bundle.created_at ? new Date(bundle.created_at).getTime() : 0;
  return Number.isFinite(time) ? time : 0;
}

function getQuickFilters(labels: string[], selectedLevel: string, selectedStatus: string) {
  return [
    {
      label: labels[0],
      level: '',
      status: '',
      active: !selectedLevel && !selectedStatus,
    },
    {
      label: labels[1],
      level: '2',
      status: '',
      active: selectedLevel === '2',
    },
    {
      label: labels[2],
      level: '3',
      status: '',
      active: selectedLevel === '3',
    },
    {
      label: labels[3],
      level: '',
      status: 'in_progress',
      active: selectedStatus === 'in_progress',
    },
    {
      label: labels[4],
      level: '',
      status: 'not_started',
      active: selectedStatus === 'not_started',
    },
    {
      label: labels[5],
      level: '',
      status: 'completed',
      active: selectedStatus === 'completed',
    },
  ];
}

function buildFilterHref(
  category: BundleCategoryRow,
  language: Language,
  values: {
    q: string;
    level: string;
    status: string;
    sort: string;
  },
) {
  const params = new URLSearchParams();
  if (values.q) params.set('q', values.q);
  if (values.level) params.set('level', values.level);
  if (values.status) params.set('status', values.status);
  if (values.sort && values.sort !== 'newest') params.set('sort', values.sort);

  const query = params.toString();
  return `${getCategoryHref(category, language)}${query ? `?${query}` : ''}#${FILTER_SECTION_ID}`;
}

function buildPageHref(
  category: BundleCategoryRow,
  language: Language,
  values: {
    q: string;
    level: string;
    status: string;
    sort: string;
    page: number;
  },
) {
  const params = new URLSearchParams();
  if (values.q) params.set('q', values.q);
  if (values.level) params.set('level', values.level);
  if (values.status) params.set('status', values.status);
  if (values.sort && values.sort !== 'newest') params.set('sort', values.sort);
  if (values.page > 1) params.set('page', String(values.page));

  const query = params.toString();
  return `${getCategoryHref(category, language)}${query ? `?${query}` : ''}#${FILTER_SECTION_ID}`;
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

export default async function CategoryBundlesPage({ params, searchParams }: CategoryBundlesPageProps) {
  const { categorySlug } = await params;
  const resolvedSearchParams = await searchParams;
  const query = getQueryValue(resolvedSearchParams?.q).trim();
  const selectedLevel = getQueryValue(resolvedSearchParams?.level);
  const requestedPage = getPageValue(resolvedSearchParams?.page);
  const selectedStatus = getQueryValue(resolvedSearchParams?.status);
  const selectedSort = getQueryValue(resolvedSearchParams?.sort) || 'newest';
  const [allBundles, categories, language, user] = await Promise.all([
    listBundles(),
    listCategories(),
    getDisplayLanguage(),
    getAppUserFromServer(),
  ]);
  const copy = translations[language];
  const localCopy = pageCopy[language];
  const bundleCategories = categories as BundleCategoryRow[];
  const category = bundleCategories.find((item) => isCategorySlugMatch(item, categorySlug));

  if (!category) {
    notFound();
  }

  const categoryKey = getCategoryKey(category);
  const categoryTitle = getCategoryTitle(category, language);
  const categoryDescription = getCategoryDescription(category, language);
  const categoryBundles = (allBundles as BundleRow[])
    .filter((bundle) => bundle.is_published)
    .filter((bundle) => getCategoryKey(bundle.bundle_category) === categoryKey);
  const newestBundleId = categoryBundles[0]?.id ?? null;
  const bundleInteractions = await listUserBundleInteractionsForBundles(user?.id, categoryBundles.map((bundle) => bundle.id));
  const interactionByBundleId = new Map(bundleInteractions.map((interaction) => [interaction.bundle_id, interaction]));
  const filteredBundleEntries = filterAndSortBundles({
    bundles: categoryBundles,
    interactionByBundleId,
    language,
    newestBundleId,
    query,
    selectedLevel,
    selectedStatus,
    selectedSort,
    isLoggedIn: Boolean(user),
  });
  const totalPages = Math.max(1, Math.ceil(filteredBundleEntries.length / ITEMS_PER_PAGE));
  const currentPage = Math.min(requestedPage, totalPages);
  const pageEntries = filteredBundleEntries.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );
  const pageNumbers = getPageNumbers(currentPage, totalPages);
  const featuredEntry = pageEntries[0] ?? null;
  const featuredBundle = featuredEntry?.bundle ?? null;
  const gridEntries = featuredEntry ? pageEntries.slice(1) : pageEntries;
  const hasCategoryBundles = categoryBundles.length > 0;
  const hasFilteredResults = filteredBundleEntries.length > 0;
  const heroImage = category.category_image_url || (featuredBundle ? getBundleImage(featuredBundle, 0) : '/images/bundle-fallback.webp');
  const minutesRange = getBundleMinutesRange(categoryBundles);
  const minutesRangeLabel = minutesRange
    ? `${minutesRange.min}${minutesRange.min === minutesRange.max ? '' : `-${minutesRange.max}`}`
    : '0';

  return (
    <div className="-mx-4 -my-4 bg-background text-[#1f1b18] dark:text-zinc-100 sm:-mx-8 sm:-my-8">
      <div className="mx-auto max-w-7xl px-4 pb-10 pt-5 sm:px-6 lg:px-8">
        <nav className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
          <Link href="/" className="inline-flex items-center gap-1 hover:text-[#2f7d4a] dark:hover:text-emerald-400">
            <Home className="h-4 w-4" />
            <span className="sr-only">{localCopy.home as string}</span>
          </Link>
          <span>/</span>
          <Link href="/bundles" className="hover:text-[#2f7d4a] dark:hover:text-emerald-400">
            Bundles
          </Link>
          <span>/</span>
          <span className="font-medium text-[#1f1b18] dark:text-zinc-200">{categoryTitle}</span>
        </nav>

        <section className="grid items-center gap-8 py-8 md:grid-cols-[380px_1fr] lg:gap-14">
          <div className="relative mx-auto aspect-[4/3] w-full max-w-[380px] overflow-hidden rounded-[2rem] bg-[#f3ede3] p-2 ring-1 ring-black/5 dark:bg-zinc-800 dark:ring-white/10 md:mx-0">
            <div className="relative h-full w-full overflow-hidden rounded-[1.5rem]">
              <Image
                src={heroImage}
                alt={categoryTitle}
                fill
                priority
                className="object-cover"
                sizes="(max-width: 768px) 92vw, 380px"
              />
              <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-white/45" />
            </div>
          </div>
          <div>
            <span className="inline-flex rounded-full border border-[#f4c89c] bg-[#fff8ed] px-3 py-1 text-sm font-semibold text-[#e36d28] dark:border-orange-900 dark:bg-orange-950/60 dark:text-orange-300">
              {categoryTitle}
            </span>
            <h1 className={`${getDisplayFontClass(categoryTitle)} mt-4 max-w-3xl text-4xl font-bold leading-tight sm:text-5xl`}>
              {categoryTitle}
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-zinc-700 dark:text-zinc-300">{categoryDescription}</p>
            <div className="mt-6 flex flex-wrap items-center gap-5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
              <span className="inline-flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                {categoryBundles.length} {copy.bundles}
              </span>
              <span className="inline-flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                {getBundleLevelDisplay(1, language).shortLabel} - {getBundleLevelDisplay(3, language).shortLabel}
              </span>
              <span className="inline-flex items-center gap-2">
                <Clock3 className="h-5 w-5" />
                {minutesRangeLabel} {copy.minutes} per bundle
              </span>
            </div>
          </div>
        </section>

        <nav className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide lg:flex-wrap lg:justify-center lg:overflow-visible lg:pb-0" aria-label="Bundle categories">
          {bundleCategories.map((item) => {
            const itemKey = getCategoryKey(item);
            const isActive = itemKey === categoryKey;

            return (
              <Link
                key={itemKey}
                href={getCategoryHref(item, language)}
                className={`max-w-full shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition lg:shrink ${
                  isActive
                    ? 'border-[#dff1e5] bg-[#dff1e5] text-[#2f7d4a] dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                    : 'border-zinc-200 bg-white text-zinc-700 hover:border-[#b9d8bc] hover:bg-[#f5faf6] hover:text-[#2f7d4a] dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-emerald-800 dark:hover:bg-emerald-950/50 dark:hover:text-emerald-300'
                }`}
                aria-current={isActive ? 'page' : undefined}
              >
                <span className="block truncate">{getCategoryTitle(item, language)}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <div id={FILTER_SECTION_ID} className="scroll-mt-4 border-y border-zinc-200 bg-background dark:border-zinc-800">
        <div className="mx-auto max-w-7xl px-4 py-7 sm:px-6 lg:px-8">
          <form action={`${getCategoryHref(category, language)}#${FILTER_SECTION_ID}`} className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <label className="relative block w-full lg:max-w-[420px]">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-500 dark:text-zinc-400" />
              <input
                name="q"
                defaultValue={query}
                className="h-12 w-full rounded-xl border border-zinc-200 bg-white pl-12 pr-4 text-sm shadow-sm outline-none placeholder:text-zinc-500 focus:border-[#8dbd8f] focus:ring-2 focus:ring-[#dff1e5] dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:shadow-black/20 dark:placeholder:text-zinc-500 dark:focus:border-emerald-700 dark:focus:ring-emerald-950"
                placeholder={`${localCopy.searchPrefix as string} ${categoryTitle} bundles...`}
              />
            </label>
            <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:justify-end">
              <FilterSelect
                label={localCopy.level as string}
                name="level"
                value={selectedLevel}
                options={[
                  { label: localCopy.allLevels as string, value: '' },
                  { label: 'Beginner', value: '1' },
                  { label: 'A1', value: '2' },
                  { label: 'A2', value: '3' },
                  { label: 'B1', value: '4' },
                  { label: 'B2', value: '5' },
                  { label: 'C1', value: '6' },
                  { label: 'C2', value: '7' },
                ]}
              />
              <FilterSelect
                label={localCopy.status as string}
                name="status"
                value={selectedStatus}
                options={[
                  { label: localCopy.allStatuses as string, value: '' },
                  { label: localCopy.inProgress as string, value: 'in_progress' },
                  { label: localCopy.notStarted as string, value: 'not_started' },
                  { label: localCopy.completed as string, value: 'completed' },
                ]}
              />
              <FilterSelect
                label={localCopy.newest as string}
                name="sort"
                value={selectedSort}
                options={[
                  { label: localCopy.newest as string, value: 'newest' },
                  { label: localCopy.oldest as string, value: 'oldest' },
                  { label: localCopy.shortest as string, value: 'shortest' },
                  { label: localCopy.longest as string, value: 'longest' },
                ]}
              />
              <button className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#57985a] px-5 text-sm font-bold text-white shadow-sm transition hover:bg-[#477f4a] sm:w-auto">
                <SlidersHorizontal className="h-4 w-4" />
                {localCopy.apply as string}
              </button>
            </div>
          </form>

          <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-2 overflow-x-auto pb-1">
              {getQuickFilters(localCopy.filters as string[], selectedLevel, selectedStatus).map((filter) => (
                <Link
                  key={filter.label}
                  href={buildFilterHref(category, language, {
                    q: query,
                    level: filter.level,
                    status: filter.status,
                    sort: selectedSort,
                  })}
                  className={`shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition ${
                    filter.active
                      ? 'border-[#dff1e5] bg-[#dff1e5] text-[#2f7d4a] dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      : 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800'
                  }`}
                >
                  {filter.label}
                </Link>
              ))}
            </div>
            <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
              {filteredBundleEntries.length} / {categoryBundles.length} {copy.bundles}
            </p>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 pb-16 pt-8 sm:px-6 sm:pb-20 lg:px-8">
        {featuredEntry ? (
          <section className="grid gap-6 overflow-hidden rounded-lg border border-[#f4c89c] bg-[#fffaf1] p-3 shadow-sm dark:border-orange-900/70 dark:bg-zinc-900 dark:shadow-black/20 md:grid-cols-[320px_1fr_auto] md:items-center md:p-4 lg:grid-cols-[340px_1fr_210px]">
            <Link href={`/bundles/${featuredEntry.bundle.id}`} className="relative aspect-[2/1] overflow-hidden rounded-md bg-[#f3ede3] dark:bg-zinc-800">
              <Image
                src={getBundleImage(featuredEntry.bundle, 0)}
                alt={getBundleTitle(featuredEntry.bundle, language)}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 92vw, 340px"
              />
              {featuredEntry.badge && (
                <span className={`absolute left-3 top-3 rounded-full px-3 py-1 text-xs font-semibold ${featuredEntry.badge.className}`}>
                  {featuredEntry.badge.label}
                </span>
              )}
              {featuredEntry.bundle.access_level === 'premium' && (
                <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-[#FBE9E2] px-3 py-1 text-xs font-bold text-[#C65D47] shadow-sm dark:bg-orange-950/60 dark:text-orange-200">
                  <Lock className="h-3 w-3" />
                  Premium
                </span>
              )}
            </Link>
            <div className="px-1 md:px-0">
              <h2 className={`${getDisplayFontClass(getBundleTitle(featuredEntry.bundle, language))} text-2xl font-bold leading-tight sm:text-3xl`}>
                {getBundleTitle(featuredEntry.bundle, language)}
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-700 dark:text-zinc-300">
                {getBundleDescription(featuredEntry.bundle, language)}
              </p>
              <div className="mt-4 flex flex-wrap gap-2 text-xs font-medium text-[#735b31] dark:text-amber-300">
                <span className="rounded-full bg-[#fff0c8] px-3 py-1 dark:bg-amber-950/70">{levelLabel(featuredEntry.bundle, language)}</span>
                <span className="rounded-full bg-[#fff0c8] px-3 py-1 dark:bg-amber-950/70">{bundleItemCount(featuredEntry.bundle)} {copy.items}</span>
                <span className="rounded-full bg-[#fff0c8] px-3 py-1 dark:bg-amber-950/70">{estimateBundleMinutesForBundle(featuredEntry.bundle)} {copy.minutes}</span>
              </div>
            </div>
            <div className="flex flex-col gap-3 md:px-2">
              <Link
                href={`/bundles/${featuredEntry.bundle.id}/learn`}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[#57985a] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#477f4a] dark:bg-emerald-600 dark:hover:bg-emerald-500"
              >
                {copy.start}
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href={`/bundles/${featuredEntry.bundle.id}`}
                className="inline-flex items-center justify-center rounded-full border border-zinc-200 bg-white px-6 py-3 text-sm font-bold text-[#1f1b18] transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
              >
                {localCopy.preview as string}
              </Link>
            </div>
          </section>
        ) : hasCategoryBundles && !hasFilteredResults ? (
          <section className="rounded-lg border border-zinc-200 bg-white p-10 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-black/20">
            <h2 className="text-xl font-bold">{localCopy.noResultsTitle as string}</h2>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{localCopy.noResultsDesc as string}</p>
          </section>
        ) : (
          <section className="rounded-lg border border-zinc-200 bg-white p-10 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-black/20">
            <h2 className="text-xl font-bold">{localCopy.noBundlesTitle as string}</h2>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{localCopy.noBundlesDesc as string}</p>
          </section>
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
            <Link
              href={buildPageHref(category, language, {
                q: query,
                level: selectedLevel,
                status: selectedStatus,
                sort: selectedSort,
                page: Math.max(1, currentPage - 1),
              })}
              className={`flex h-9 w-9 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-600 shadow-sm transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700 ${
                currentPage === 1 ? 'pointer-events-none opacity-50 hover:bg-white dark:hover:bg-zinc-800' : ''
              }`}
              aria-disabled={currentPage === 1}
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </Link>

            {pageNumbers.map((page, index) => {
              if (page === '...') {
                return (
                  <span
                    key={`dots-${index}`}
                    className="flex h-9 w-9 items-center justify-center text-sm font-medium text-zinc-400"
                  >
                    ...
                  </span>
                );
              }

              const isCurrent = page === currentPage;
              return (
                <Link
                  key={`page-${page}`}
                  href={buildPageHref(category, language, {
                    q: query,
                    level: selectedLevel,
                    status: selectedStatus,
                    sort: selectedSort,
                    page,
                  })}
                  className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold transition-all ${
                    isCurrent
                      ? 'pointer-events-none bg-[#4e8d53] text-white shadow-sm shadow-emerald-700/20'
                      : 'border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700'
                  }`}
                  aria-current={isCurrent ? 'page' : undefined}
                >
                  {page}
                </Link>
              );
            })}

            <Link
              href={buildPageHref(category, language, {
                q: query,
                level: selectedLevel,
                status: selectedStatus,
                sort: selectedSort,
                page: Math.min(totalPages, currentPage + 1),
              })}
              className={`flex h-9 w-9 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-600 shadow-sm transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700 ${
                currentPage === totalPages ? 'pointer-events-none opacity-50 hover:bg-white dark:hover:bg-zinc-800' : ''
              }`}
              aria-disabled={currentPage === totalPages}
              aria-label="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </Link>
          </nav>
        )}

      </div>
    </div>
  );
}
