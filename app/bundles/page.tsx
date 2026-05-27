import { getDisplayLanguage } from '@/lib/auth/app-user';
import { listBundles, listCategories } from '@/lib/supabase/services/bundles';
import { BundleCategoriesSection } from './_components/BundleCategoriesSection';
import { BundleCategorySection } from './_components/BundleCategorySection';
import { BundlesHero } from './_components/BundlesHero';
import { EmptyState } from './_components/EmptyState';
import { FeaturedBundle } from './_components/FeaturedBundle';
import { translations } from './bundle-data';
import { getCategoryKey, groupBundlesByCategory } from './bundle-utils';
import type { BundleCategoryRow, BundleRow } from './types';

export const dynamic = 'force-dynamic';

export default async function BundlesPage() {
  const [allBundles, categories, lang] = await Promise.all([listBundles(), listCategories(), getDisplayLanguage()]);
  const copy = translations[lang];
  const publishedBundles = (allBundles as BundleRow[]).filter((bundle) => bundle.is_published);
  const bundleCategories = categories as BundleCategoryRow[];
  const featuredBundle = publishedBundles[0] ?? null;
  const groupedBundles = groupBundlesByCategory(publishedBundles);

  return (
    <div className="mx-auto max-w-7xl px-2 pb-12 text-[#1f1b18]">
      <BundlesHero copy={copy} />

      <BundleCategoriesSection
        categories={bundleCategories}
        copy={copy}
        groupedBundles={groupedBundles}
        language={lang}
      />

      {featuredBundle ? (
        <FeaturedBundle bundle={featuredBundle} language={lang} />
      ) : (
        <EmptyState title={copy.noBundlesTitle} description={copy.noBundlesDesc} />
      )}

      <div className="mt-8 space-y-8">
        {bundleCategories.map((category) => {
          const bundles = (groupedBundles[getCategoryKey(category)] || []).slice(0, 4);

          return (
            <BundleCategorySection
              key={getCategoryKey(category)}
              bundles={bundles}
              category={category}
              copy={copy}
              language={lang}
            />
          );
        })}
      </div>
    </div>
  );
}
