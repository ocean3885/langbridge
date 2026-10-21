import { getAppUserFromServer, getDisplayLanguage } from '@/lib/auth/app-user';
import { listUserBundleInteractionsForBundles } from '@/lib/supabase/services/bundle-progress';
import { listBundles, listCategories } from '@/lib/supabase/services/bundles';
import { ExploreBundlesClient } from './_components/ExploreBundlesClient';
import { EmptyState } from './_components/EmptyState';
import { translations } from './bundle-data';
import { getCategoryKey, isCategorySlugMatch } from './bundle-utils';
import type { BundleCategoryRow, BundleProgressSnapshot, BundleRow } from './types';

export const dynamic = 'force-dynamic';

interface BundlesPageProps {
  searchParams?: Promise<{ category?: string }>;
}

export default async function BundlesPage({ searchParams }: BundlesPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const categoryQuery = resolvedSearchParams?.category;

  const [allBundles, categories, lang, user] = await Promise.all([
    listBundles(),
    listCategories(),
    getDisplayLanguage(),
    getAppUserFromServer(),
  ]);
  const copy = translations[lang];
  const publishedBundles = (allBundles as BundleRow[]).filter((bundle) => bundle.is_published);
  const bundleCategories = categories as BundleCategoryRow[];

  let initialCategory = 'all';
  if (categoryQuery) {
    const matchedCategory = bundleCategories.find((cat) => isCategorySlugMatch(cat, categoryQuery));
    if (matchedCategory) {
      initialCategory = getCategoryKey(matchedCategory);
    }
  }

  const bundleInteractions = await listUserBundleInteractionsForBundles(user?.id, publishedBundles.map((bundle) => bundle.id));
  const bundleProgress = bundleInteractions.map((interaction) => ({
    bundle_id: interaction.bundle_id,
    is_started: interaction.is_started,
    is_completed: interaction.is_completed,
    progress_ratio: interaction.progress_ratio,
    earned_stars: interaction.earned_stars,
    max_stars: interaction.max_stars,
  })) satisfies BundleProgressSnapshot[];

  if (publishedBundles.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-2 pb-12 text-[#1f1b18] dark:text-zinc-100">
        <EmptyState title={copy.noBundlesTitle} description={copy.noBundlesDesc} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-2 pb-12 text-[#1f1b18] dark:text-zinc-100">
      <ExploreBundlesClient
        bundles={publishedBundles}
        categories={bundleCategories}
        bundleProgress={bundleProgress}
        isLoggedIn={Boolean(user)}
        copy={copy}
        language={lang}
        initialCategory={initialCategory}
      />
    </div>
  );
}
