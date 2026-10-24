import Image from 'next/image';
import Link from 'next/link';
import type { RecentLearningActivity } from '@/lib/supabase/services/bundle-progress';
import { getBundleTitle, getCategoryName } from '../../bundles/bundle-utils';
import { BundleLearningMetrics, getHomeLearningActionLabel } from '../_components/BundleLearningMetrics';

type DisplayLanguage = 'ko' | 'en';

export function RecentBundleCard({ item, language }: { item: RecentLearningActivity; language: DisplayLanguage }) {
  const title = getBundleTitle(item.bundle, language);
  const category = getCategoryName(item.bundle, language);
  const { learning } = item;

  return (
    <article className="flex min-w-0 flex-col rounded-lg border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="grid grid-cols-[84px_minmax(0,1fr)] gap-4">
        <div className="relative aspect-square overflow-hidden rounded-md bg-[#f3ede3] dark:bg-zinc-800">
          <Image
            src={item.bundle.thumbnail_url || '/images/bundle-fallback.webp'}
            alt={title}
            fill
            className="object-cover"
            sizes="84px"
          />
        </div>
        <div className="min-w-0">
          <h3 className="line-clamp-2 break-words text-base font-bold leading-6"><Link href={`/bundles/${item.bundle.id}`}>{title}</Link></h3>
          <p className="mt-1 truncate text-sm text-zinc-500 dark:text-zinc-400">{category}</p>
        </div>
      </div>
      <div className="mb-5"><BundleLearningMetrics learning={learning} language={language} /></div>
      <Link href={learning.href} className="mt-auto inline-flex w-full justify-center rounded-md border border-zinc-200 px-4 py-2.5 text-sm font-bold text-[#2f7f45] transition hover:border-[#8bbf87] hover:bg-[#f8fcf7] dark:border-zinc-700 dark:text-emerald-300">
        {getHomeLearningActionLabel(learning.action, language)}
      </Link>
    </article>
  );
}
