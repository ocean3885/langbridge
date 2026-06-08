import { ChevronRight } from 'lucide-react';
import Link from 'next/link';
import type { BundleCategoryRow, BundleCopy, BundleRow, Language } from '../types';
import { getCategoryAnchorId, getCategoryDescription, getCategoryHref, getCategoryTitle, getDisplayFontClass } from '../bundle-utils';
import { BundleCard } from './BundleCard';

export function BundleCategorySection({
  bundles,
  category,
  copy,
  language,
}: {
  bundles: BundleRow[];
  category: BundleCategoryRow;
  copy: BundleCopy;
  language: Language;
}) {
  if (bundles.length === 0) return null;

  const title = getCategoryTitle(category, language);

  return (
    <section id={getCategoryAnchorId(category)} className="scroll-mt-24">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div className="min-w-0">
          <h2 className={`${getDisplayFontClass(title)} text-2xl font-semibold`}>{title}</h2>
          <p className="mt-1 hidden truncate text-sm text-zinc-500 dark:text-zinc-400 sm:block">
            {getCategoryDescription(category, language)}
          </p>
        </div>
        <Link
          href={getCategoryHref(category, language)}
          className="flex shrink-0 items-center gap-1 text-sm font-medium text-zinc-700 transition hover:text-[#2f7d4a] dark:text-zinc-300 dark:hover:text-emerald-400"
        >
          {copy.viewAll}
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
      <div className="grid grid-cols-[repeat(3,minmax(150px,1fr))] gap-4 overflow-x-auto pb-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {bundles.map((bundle, index) => (
          <BundleCard key={`${getCategoryAnchorId(category)}-${bundle.id}`} bundle={bundle} index={index} language={language} />
        ))}
      </div>
    </section>
  );
}
