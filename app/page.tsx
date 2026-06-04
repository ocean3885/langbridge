import { getDisplayLanguage } from '@/lib/auth/app-user';
import { countAuthUsers } from '@/lib/supabase/services/auth-users';
import { listBundles, listCategories } from '@/lib/supabase/services/bundles';
import HeroSection from '@/components/home/HeroSection';
import InteractiveLearningSection from '@/components/home/InteractiveLearningSection';
import BundleCategoriesSection from '@/components/home/BundleCategoriesSection';
import type { BundleCategoryRow, BundleRow } from './bundles/types';

export default async function HomePage() {
  const [lang, userCount, categories, bundles] = await Promise.all([
    getDisplayLanguage(),
    countAuthUsers(),
    listCategories(),
    listBundles({ publishedOnly: true, limit: 6 }),
  ]);

  return (
    <div className="flex flex-col">
      <HeroSection userCount={userCount} lang={lang} />
      <InteractiveLearningSection lang={lang} />
      <BundleCategoriesSection
        categories={categories as BundleCategoryRow[]}
        bundles={bundles as BundleRow[]}
        lang={lang}
      />
    </div>
  );
}
