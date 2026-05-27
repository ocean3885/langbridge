import { ArrowRight } from 'lucide-react';
import { categoryStyles } from '../bundle-data';
import {
  getCategoryAnchorId,
  getCategoryDescription,
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
      <div className="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-6">
        {categories.map((category, index) => {
          const count = groupedBundles[getCategoryKey(category)]?.length || 0;
          const title = getCategoryTitle(category, language);
          const description = getCategoryDescription(category, language);
          const style = categoryStyles[index % categoryStyles.length];
          const content = (
            <>
              <div className={`mx-auto flex h-20 w-20 items-center justify-center rounded-full ${style.color}`}>
                {category.icon_image_url ? (
                  <img src={category.icon_image_url} alt="" className="h-full w-full rounded-full object-cover" />
                ) : (
                  <style.icon className={`h-10 w-10 ${style.iconColor}`} />
                )}
              </div>
              <h3 className="mt-5 text-center font-serif text-xl font-semibold">{title}</h3>
              <p className="mt-2 flex-1 text-center text-sm leading-6 text-zinc-600">{description}</p>
              <div className="mt-5 flex items-center justify-between">
                <span className="text-sm font-bold text-[#2f7d4a]">
                  {count} {copy.bundles}
                </span>
                <span className="flex h-8 w-8 items-center justify-center rounded-full border border-zinc-200 bg-white transition group-hover:bg-[#2f7d4a] group-hover:text-white">
                  <ArrowRight className="h-4 w-4" />
                </span>
              </div>
            </>
          );

          if (count === 0) {
            return (
              <div
                key={getCategoryKey(category)}
                className="flex min-h-64 flex-col rounded-xl border border-zinc-200 bg-white p-5 opacity-70 shadow-sm"
              >
                {content}
              </div>
            );
          }

          return (
            <a
              key={getCategoryKey(category)}
              href={`#${getCategoryAnchorId(category)}`}
              className="group flex min-h-64 flex-col rounded-xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              {content}
            </a>
          );
        })}
      </div>
    </section>
  );
}
