import { ArrowRight } from 'lucide-react';
import { categoryStyles } from '../bundle-data';
import {
  getCategoryDescription,
  getCategoryHref,
  getCategoryKey,
  getCategoryTitle,
} from '../bundle-utils';
import type { BundleCategoryRow, BundleCopy, BundleRow, Language } from '../types';

export function BundleCategoriesSection({
  categories,
  copy,
  groupedBundles,
  language,
}: {
  categories: BundleCategoryRow[];
  copy: BundleCopy;
  groupedBundles: Record<string, BundleRow[]>;
  language: Language;
}) {
  if (categories.length === 0) return null;

  return (
    <section>
      <h2 className="font-serif text-2xl font-semibold">{copy.categories}</h2>
      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6">
        {categories.map((category, index) => {
          const count = groupedBundles[getCategoryKey(category)]?.length || 0;
          const title = getCategoryTitle(category, language);
          const description = getCategoryDescription(category, language);
          const style = categoryStyles[index % categoryStyles.length];
          const content = (
            <>
              <div className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-full dark:bg-zinc-800 sm:mx-auto sm:h-20 sm:w-20 ${style.color}`}>
                {category.icon_image_url ? (
                  <img src={category.icon_image_url} alt="" className="h-full w-full rounded-full object-cover" />
                ) : (
                  <style.icon className={`h-8 w-8 sm:h-10 sm:w-10 ${style.iconColor}`} />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-serif text-lg font-semibold sm:mt-5 sm:text-center sm:text-xl">{title}</h3>
                <p className="mt-1 line-clamp-2 text-sm leading-5 text-zinc-600 dark:text-zinc-400 sm:mt-2 sm:line-clamp-3 sm:text-center sm:leading-6">{description}</p>
                <div className="mt-3 flex items-center justify-between sm:mt-5">
                  <span className="text-sm font-bold text-[#2f7d4a] dark:text-emerald-400">
                    {count} {copy.bundles}
                  </span>
                  <span className="flex h-8 w-8 items-center justify-center rounded-full border border-zinc-200 bg-white transition group-hover:bg-[#2f7d4a] group-hover:text-white dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:group-hover:bg-[#3f9d5b] dark:group-hover:text-white">
                    <ArrowRight className="h-4 w-4" />
                  </span>
                </div>
              </div>
            </>
          );

          if (count === 0) {
            return (
              <div
                key={getCategoryKey(category)}
                className="flex min-h-0 items-center gap-4 rounded-xl border border-zinc-200 bg-white p-4 opacity-70 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-black/20 sm:min-h-64 sm:flex-col sm:items-stretch sm:gap-0 sm:p-5"
              >
                {content}
              </div>
            );
          }

          return (
            <a
              key={getCategoryKey(category)}
              href={getCategoryHref(category, language)}
              className="group flex min-h-0 items-center gap-4 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-black/20 dark:hover:border-zinc-700 sm:min-h-64 sm:flex-col sm:items-stretch sm:gap-0 sm:p-5"
            >
              {content}
            </a>
          );
        })}
      </div>
    </section>
  );
}
