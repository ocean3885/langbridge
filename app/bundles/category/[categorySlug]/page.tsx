import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Home,
  Search,
  SlidersHorizontal,
} from 'lucide-react';
import { CharacterAsset } from '@/components/assets/CharacterAsset';
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
}

const pageCopy = {
  ko: {
    home: '홈',
    filters: ['전체', 'A1', 'A2', '진행 중', '시작 전', '완료'],
    level: '레벨',
    duration: '소요 시간',
    status: '상태',
    newest: '최신순',
    new: '신규',
    inProgress: '진행 중',
    notStarted: '시작 전',
    completed: '완료',
    preview: '미리보기',
    searchPrefix: '검색',
    noBundlesTitle: '아직 공개된 번들이 없습니다',
    noBundlesDesc: '이 카테고리의 새 번들을 준비하고 있어요.',
    quizTitle: '어디서 시작할지 고민되나요?',
    quizDesc: '짧은 퀴즈로 지금 레벨과 목표에 맞는 번들을 추천받아보세요.',
    quizButton: '퀴즈 시작',
    quizTime: '2분이면 충분해요!',
  },
  en: {
    home: 'Home',
    filters: ['All', 'A1', 'A2', 'In Progress', 'Not Started', 'Completed'],
    level: 'Level',
    duration: 'Duration',
    status: 'Status',
    newest: 'Newest',
    new: 'New',
    inProgress: 'In Progress',
    notStarted: 'Not Started',
    completed: 'Completed',
    preview: 'Preview',
    searchPrefix: 'Search',
    noBundlesTitle: 'No published bundles yet',
    noBundlesDesc: 'New bundles for this category are being prepared.',
    quizTitle: 'Not sure where to start?',
    quizDesc: "Take a quick quiz and we'll recommend bundles for your level and goals.",
    quizButton: 'Take the Quiz',
    quizTime: 'It only takes 2 minutes!',
  },
} satisfies Record<Language, Record<string, string | string[]>>;

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
}: {
  bundle: BundleRow;
  interaction?: UserBundleInteraction;
  language: Language;
  newestBundleId: string | null;
}) {
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
  status: BundleStatusBadge;
}) {
  const copy = translations[language];
  const title = getBundleTitle(bundle, language);

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
        <span className={`absolute left-3 top-3 rounded-full px-3 py-1 text-xs font-semibold ${status.className}`}>
          {status.label}
        </span>
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

function SelectButton({ children }: { children: React.ReactNode }) {
  return (
    <button className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 text-sm font-semibold text-[#1f1b18] shadow-sm transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:shadow-black/20 dark:hover:bg-zinc-800">
      {children}
      <ChevronDown className="h-4 w-4" />
    </button>
  );
}

export default async function CategoryBundlesPage({ params }: CategoryBundlesPageProps) {
  const { categorySlug } = await params;
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
  const featuredBundle = categoryBundles[0] ?? null;
  const gridBundles = featuredBundle ? categoryBundles.slice(1) : categoryBundles;
  const newestBundleId = categoryBundles[0]?.id ?? null;
  const bundleInteractions = await listUserBundleInteractionsForBundles(user?.id, categoryBundles.map((bundle) => bundle.id));
  const interactionByBundleId = new Map(bundleInteractions.map((interaction) => [interaction.bundle_id, interaction]));
  const featuredStatus = featuredBundle
    ? getBundleStatusBadge({
        bundle: featuredBundle,
        interaction: interactionByBundleId.get(featuredBundle.id),
        language,
        newestBundleId,
      })
    : null;
  const heroImage = category.category_image_url || (featuredBundle ? getBundleImage(featuredBundle, 0) : '/images/heroimg_land.jpg');
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

        <nav className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide" aria-label="Bundle categories">
          {bundleCategories.map((item) => {
            const itemKey = getCategoryKey(item);
            const isActive = itemKey === categoryKey;

            return (
              <Link
                key={itemKey}
                href={getCategoryHref(item, language)}
                className={`shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition ${
                  isActive
                    ? 'border-[#dff1e5] bg-[#dff1e5] text-[#2f7d4a] dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                    : 'border-zinc-200 bg-white text-zinc-700 hover:border-[#b9d8bc] hover:bg-[#f5faf6] hover:text-[#2f7d4a] dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-emerald-800 dark:hover:bg-emerald-950/50 dark:hover:text-emerald-300'
                }`}
                aria-current={isActive ? 'page' : undefined}
              >
                {getCategoryTitle(item, language)}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="border-y border-zinc-200 bg-background dark:border-zinc-800">
        <div className="mx-auto max-w-7xl px-4 py-7 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <label className="relative block w-full lg:max-w-[420px]">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-500 dark:text-zinc-400" />
              <input
                className="h-12 w-full rounded-xl border border-zinc-200 bg-white pl-12 pr-4 text-sm shadow-sm outline-none placeholder:text-zinc-500 focus:border-[#8dbd8f] focus:ring-2 focus:ring-[#dff1e5] dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:shadow-black/20 dark:placeholder:text-zinc-500 dark:focus:border-emerald-700 dark:focus:ring-emerald-950"
                placeholder={`${localCopy.searchPrefix as string} ${categoryTitle} bundles...`}
              />
            </label>
            <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:justify-end">
              <SelectButton>{localCopy.level as string}</SelectButton>
              <SelectButton>{localCopy.duration as string}</SelectButton>
              <SelectButton>{localCopy.status as string}</SelectButton>
              <SelectButton>
                <SlidersHorizontal className="h-4 w-4" />
                {localCopy.newest as string}
              </SelectButton>
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-2 overflow-x-auto pb-1">
              {(localCopy.filters as string[]).map((filter, index) => (
                <button
                  key={filter}
                  className={`shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition ${
                    index === 0
                      ? 'border-[#dff1e5] bg-[#dff1e5] text-[#2f7d4a] dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      : 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800'
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>
            <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
              {categoryBundles.length} {copy.bundles}
            </p>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {featuredBundle ? (
          <section className="grid gap-6 overflow-hidden rounded-lg border border-[#f4c89c] bg-[#fffaf1] p-3 shadow-sm dark:border-orange-900/70 dark:bg-zinc-900 dark:shadow-black/20 md:grid-cols-[320px_1fr_auto] md:items-center md:p-4 lg:grid-cols-[340px_1fr_210px]">
            <Link href={`/bundles/${featuredBundle.id}`} className="relative aspect-[2/1] overflow-hidden rounded-md bg-[#f3ede3] dark:bg-zinc-800">
              <Image
                src={getBundleImage(featuredBundle, 0)}
                alt={getBundleTitle(featuredBundle, language)}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 92vw, 340px"
              />
              {featuredStatus && (
                <span className={`absolute left-3 top-3 rounded-full px-3 py-1 text-xs font-semibold ${featuredStatus.className}`}>
                  {featuredStatus.label}
                </span>
              )}
            </Link>
            <div className="px-1 md:px-0">
              <h2 className={`${getDisplayFontClass(getBundleTitle(featuredBundle, language))} text-2xl font-bold leading-tight sm:text-3xl`}>
                {getBundleTitle(featuredBundle, language)}
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-700 dark:text-zinc-300">
                {getBundleDescription(featuredBundle, language)}
              </p>
              <div className="mt-4 flex flex-wrap gap-2 text-xs font-medium text-[#735b31] dark:text-amber-300">
                <span className="rounded-full bg-[#fff0c8] px-3 py-1 dark:bg-amber-950/70">{levelLabel(featuredBundle, language)}</span>
                <span className="rounded-full bg-[#fff0c8] px-3 py-1 dark:bg-amber-950/70">{bundleItemCount(featuredBundle)} {copy.items}</span>
                <span className="rounded-full bg-[#fff0c8] px-3 py-1 dark:bg-amber-950/70">{estimateBundleMinutesForBundle(featuredBundle)} {copy.minutes}</span>
              </div>
            </div>
            <div className="flex flex-col gap-3 md:px-2">
              <Link
                href={`/bundles/${featuredBundle.id}/learn`}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[#57985a] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#477f4a] dark:bg-emerald-600 dark:hover:bg-emerald-500"
              >
                {copy.start}
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href={`/bundles/${featuredBundle.id}`}
                className="inline-flex items-center justify-center rounded-full border border-zinc-200 bg-white px-6 py-3 text-sm font-bold text-[#1f1b18] transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
              >
                {localCopy.preview as string}
              </Link>
            </div>
          </section>
        ) : (
          <section className="rounded-lg border border-zinc-200 bg-white p-10 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-black/20">
            <h2 className="text-xl font-bold">{localCopy.noBundlesTitle as string}</h2>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{localCopy.noBundlesDesc as string}</p>
          </section>
        )}

        {gridBundles.length > 0 && (
          <section className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {gridBundles.map((bundle, index) => (
              <CategoryBundleCard
                key={bundle.id}
                bundle={bundle}
                index={index + 1}
                language={language}
                status={getBundleStatusBadge({
                  bundle,
                  interaction: interactionByBundleId.get(bundle.id),
                  language,
                  newestBundleId,
                })}
              />
            ))}
          </section>
        )}

        <section className="mt-8 grid items-center gap-5 rounded-lg border border-zinc-200 bg-[#f9f7ed] p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-black/20 sm:grid-cols-[220px_1fr_auto] sm:p-6">
          <CharacterAsset name="studyfull" width={190} height={140} className="mx-auto sm:mx-0" />
          <div>
            <h2 className={`${getDisplayFontClass(localCopy.quizTitle as string)} text-2xl font-bold`}>{localCopy.quizTitle as string}</h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-zinc-700 dark:text-zinc-300">{localCopy.quizDesc as string}</p>
          </div>
          <div className="flex flex-col items-center gap-2 sm:items-end">
            <Link
              href="/learn"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-[#57985a] px-8 py-3 text-sm font-bold text-white transition hover:bg-[#477f4a] dark:bg-emerald-600 dark:hover:bg-emerald-500"
            >
              {localCopy.quizButton as string}
              <ArrowRight className="h-4 w-4" />
            </Link>
            <span className="inline-flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400">
              <CheckCircle2 className="h-3.5 w-3.5" />
              {localCopy.quizTime as string}
            </span>
          </div>
        </section>
      </div>
    </div>
  );
}
