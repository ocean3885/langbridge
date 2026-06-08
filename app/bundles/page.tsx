import { getDisplayLanguage } from '@/lib/auth/app-user';
import { listBundles, listCategories } from '@/lib/supabase/services/bundles';
import { ExploreBundlesClient } from './_components/ExploreBundlesClient';
import { EmptyState } from './_components/EmptyState';
import { translations } from './bundle-data';
import type { BundleCategoryRow, BundleRow } from './types';

export const dynamic = 'force-dynamic';

export default async function BundlesPage() {
  const [allBundles, categories, lang] = await Promise.all([listBundles(), listCategories(), getDisplayLanguage()]);
  const copy = translations[lang];
  const publishedBundles = (allBundles as BundleRow[]).filter((bundle) => bundle.is_published);
  const bundleCategories = categories as BundleCategoryRow[];

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
        copy={copy}
        language={lang}
      />
    </div>
  );
}
