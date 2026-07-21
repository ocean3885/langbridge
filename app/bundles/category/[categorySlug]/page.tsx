import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { BarChart3, BookOpen, Clock3, Home } from 'lucide-react';
import { getAppUserFromServer, getDisplayLanguage } from '@/lib/auth/app-user';
import { getBundleLevelDisplay } from '@/lib/bundle-level';
import { listUserBundleInteractionsForBundles } from '@/lib/supabase/services/bundle-progress';
import { listBundles, listCategories } from '@/lib/supabase/services/bundles';
import { translations } from '../../bundle-data';
import {
  getBundleImage,
  getBundleMinutesRange,
  getCategoryDescription,
  getCategoryHref,
  getCategoryKey,
  getCategoryTitle,
  getDisplayFontClass,
  isCategorySlugMatch,
} from '../../bundle-utils';
import type { BundleCategoryRow, BundleProgressSnapshot, BundleRow } from '../../types';
import { CategoryBundlesClient } from './CategoryBundlesClient';

export const dynamic = 'force-dynamic';

interface CategoryBundlesPageProps {
  params: Promise<{
    categorySlug: string;
  }>;
}

const pageCopy = {
  ko: {
    home: '홈',
  },
  en: {
    home: 'Home',
  },
};

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
  const newestBundleId = categoryBundles[0]?.id ?? null;
  const bundleInteractions = await listUserBundleInteractionsForBundles(user?.id, categoryBundles.map((bundle) => bundle.id));
  const bundleProgress = bundleInteractions.map((interaction) => ({
    bundle_id: interaction.bundle_id,
    is_started: interaction.is_started,
    is_completed: interaction.is_completed,
    progress_ratio: interaction.progress_ratio,
  })) satisfies BundleProgressSnapshot[];
  const featuredBundle = categoryBundles[0] ?? null;
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
            <span className="sr-only">{localCopy.home}</span>
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

      <CategoryBundlesClient
        categoryTitle={categoryTitle}
        bundles={categoryBundles}
        bundleProgress={bundleProgress}
        newestBundleId={newestBundleId}
        isLoggedIn={Boolean(user)}
        language={language}
      />
    </div>
  );
}
