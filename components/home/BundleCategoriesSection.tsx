import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  FileText,
  Gift,
  Grid2X2,
} from 'lucide-react';
import { getBundleLevelDisplay } from '@/lib/bundle-level';
import {
  getBundleDescription,
  getBundleImage,
  getBundleTitle,
  getCategoryHref,
  getCategoryKey,
  getCategoryName,
  getCategoryTitle,
  bundleItemCount,
} from '@/app/bundles/bundle-utils';
import type { BundleCategoryRow, BundleRow, Language } from '@/app/bundles/types';

const translations = {
  ko: {
    badge: '3. 번들 카테고리',
    title: (
      <>
        다양한 <span className="text-[#5B8A61]">번들</span>로 배우는 스페인어
      </>
    ),
    description: '여행, 일상, 비즈니스까지. 상황에 맞는 번들을 선택하고 체계적으로 학습해보세요.',
    all: '전체',
    viewAll: '모든 번들 보기',
    items: '항목',
    moreBundles: {
      title: '더 많은 번들을 만나보세요!',
      desc: 'LangBridge는 계속 새로운 번들을 추가하고 있어요.',
    },
  },
  en: {
    badge: 'Bundle Categories',
    title: (
      <>
        Learn Spanish with <span className="text-[#5B8A61]">Diverse Bundles</span>
      </>
    ),
    description: 'From travel to business, choose bundles that fit your situation and learn systematically.',
    all: 'All',
    viewAll: 'View All Bundles',
    items: 'Items',
    moreBundles: {
      title: 'Discover more bundles!',
      desc: 'LangBridge is constantly adding new learning content.',
    },
  },
} satisfies Record<Language, Record<string, React.ReactNode | { title: string; desc: string }>>;

const colorStyles = [
  {
    border: 'border-[#F4D8CB] dark:border-orange-500/30',
    bg: 'bg-[#FFF8F4] dark:bg-orange-950/10',
    text: 'text-[#EA7A4C] dark:text-orange-400',
    badge: 'bg-[#FFF1EA] dark:bg-orange-950/30',
  },
  {
    border: 'border-[#D6E5F5] dark:border-blue-500/30',
    bg: 'bg-[#F7FBFF] dark:bg-blue-950/10',
    text: 'text-[#4A83C7] dark:text-blue-400',
    badge: 'bg-[#EEF5FD] dark:bg-blue-950/30',
  },
  {
    border: 'border-[#DCEBDE] dark:border-emerald-500/30',
    bg: 'bg-[#F8FCF8] dark:bg-emerald-950/10',
    text: 'text-[#5B9A66] dark:text-emerald-400',
    badge: 'bg-[#EEF8F0] dark:bg-emerald-950/30',
  },
  {
    border: 'border-[#E7DCF5] dark:border-purple-500/30',
    bg: 'bg-[#FCFAFF] dark:bg-purple-950/10',
    text: 'text-[#9B73D6] dark:text-purple-400',
    badge: 'bg-[#F5F0FD] dark:bg-purple-950/30',
  },
  {
    border: 'border-[#F6E2B8] dark:border-amber-500/30',
    bg: 'bg-[#FFFDF7] dark:bg-amber-950/10',
    text: 'text-[#E5A92E] dark:text-amber-400',
    badge: 'bg-[#FFF5DB] dark:bg-amber-950/30',
  },
  {
    border: 'border-[#F6D8D8] dark:border-red-500/30',
    bg: 'bg-[#FFF8F8] dark:bg-red-950/10',
    text: 'text-[#E36D6D] dark:text-red-400',
    badge: 'bg-[#FFF0F0] dark:bg-red-950/30',
  },
];

export default function BundleCategoriesSection({
  categories,
  bundles,
  lang = 'ko',
}: {
  categories: BundleCategoryRow[];
  bundles: BundleRow[];
  lang?: Language;
}) {
  const t = translations[lang];
  const moreBundles = t.moreBundles as { title: string; desc: string };

  return (
    <section className="bg-[#F8F5F1] py-12 transition-colors duration-300 dark:bg-zinc-950 sm:py-16">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="flex justify-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#BFD6C2] bg-white px-5 py-2 text-sm font-medium text-[#5B8A61] dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300">
            <BookOpen className="h-4 w-4" />
            {t.badge}
          </div>
        </div>

        <div className="mx-auto mt-8 max-w-4xl text-center">
          <h2 className="break-words text-3xl font-extrabold leading-tight tracking-tight text-[#1D1D1D] dark:text-zinc-100 sm:text-4xl md:text-5xl lg:text-6xl">
            {t.title}
          </h2>
          <p className="mt-4 break-words text-base leading-relaxed text-[#6F6F6F] dark:text-zinc-400 md:mt-6 md:text-lg">
            {t.description}
          </p>
        </div>

        <nav className="mt-10 flex gap-3 overflow-x-auto pb-4 scrollbar-hide" aria-label={lang === 'ko' ? '번들 카테고리' : 'Bundle categories'}>
          <Link
            href="/bundles"
            className="flex shrink-0 items-center gap-2 rounded-full border border-[#5B8A61] bg-[#5B8A61] px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-emerald-900/10 transition-all duration-200 hover:bg-[#4D7953]"
          >
            <Grid2X2 className="h-4 w-4" />
            {t.all}
          </Link>
          {categories.map((category) => (
            <Link
              key={getCategoryKey(category)}
              href={getCategoryHref(category, lang)}
              className="flex shrink-0 items-center gap-2 rounded-full border border-[#E8E3DC] bg-white px-5 py-2.5 text-sm font-bold text-[#555] transition-all duration-200 hover:border-[#C7D8C9] hover:bg-[#F7FBF7] hover:text-[#5B8A61] dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              {category.icon_image_url ? (
                <Image
                  src={category.icon_image_url}
                  alt=""
                  width={20}
                  height={20}
                  className="h-5 w-5 rounded-full object-cover"
                />
              ) : (
                <BookOpen className="h-4 w-4" />
              )}
              {getCategoryTitle(category, lang)}
            </Link>
          ))}
        </nav>

        {bundles.length > 0 && (
          <div className="mt-8 flex snap-x snap-mandatory gap-5 overflow-x-auto pb-8 scrollbar-hide md:grid md:grid-cols-2 md:overflow-visible md:pb-0 xl:grid-cols-3">
            {bundles.map((bundle, index) => {
              const style = colorStyles[index % colorStyles.length];
              const title = getBundleTitle(bundle, lang);
              const description = getBundleDescription(bundle, lang);
              const level = getBundleLevelDisplay(bundle.level, lang);

              return (
                <Link
                  key={bundle.id}
                  href={`/bundles/${bundle.id}`}
                  className={`group isolate w-[calc(100vw-120px)] shrink-0 snap-start overflow-hidden rounded-[2rem] border transition-all duration-300 md:w-auto md:hover:-translate-y-1 md:hover:shadow-xl ${style.border} ${style.bg}`}
                >
                  <div className="relative h-[160px] overflow-hidden rounded-t-[2rem] sm:h-[180px]">
                    <Image
                      src={getBundleImage(bundle, index)}
                      alt={title}
                      fill
                      className="rounded-t-[2rem] object-cover transition duration-500 group-hover:scale-105"
                      sizes="(max-width: 768px) 80vw, (max-width: 1200px) 50vw, 33vw"
                    />
                  </div>

                  <div className="p-5 sm:p-6">
                    <div className={`inline-flex rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ${style.badge} ${style.text}`}>
                      {getCategoryName(bundle, lang)}
                    </div>
                    <h3 className="mt-4 break-words text-2xl font-bold leading-tight text-[#1D1D1D] dark:text-zinc-100 sm:text-3xl">
                      {title}
                    </h3>
                    <p className="mt-3 line-clamp-2 break-words text-sm leading-relaxed text-[#666] dark:text-zinc-400 sm:text-base">
                      {description}
                    </p>
                    <div className="mt-6 flex items-center justify-between border-t border-black/5 pt-4 dark:border-white/10">
                      <div className="flex items-center gap-5 text-sm font-medium text-[#777] dark:text-zinc-400">
                        <span className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-zinc-400" />
                          {bundleItemCount(bundle)} {t.items}
                        </span>
                        <span className="flex items-center gap-2">
                          <BarChart3 className="h-4 w-4 text-zinc-400" />
                          {level.label}
                        </span>
                      </div>
                      <ArrowRight className={`h-5 w-5 transition-transform group-hover:translate-x-1 ${style.text}`} />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        <div className="mt-8 flex flex-col items-start justify-between gap-6 rounded-[2rem] border border-[#EAE5DE] bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 md:mt-10 lg:flex-row lg:items-center lg:p-8">
          <div className="flex items-center gap-5">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#EEF7EF] text-[#5B8A61] dark:bg-emerald-500/10 dark:text-emerald-400">
              <Gift className="h-7 w-7" />
            </div>
            <div>
              <h3 className="break-words text-xl font-bold text-[#1D1D1D] dark:text-zinc-100 sm:text-2xl">
                {moreBundles.title}
              </h3>
              <p className="mt-1 break-words text-sm text-[#6B6B6B] dark:text-zinc-400 sm:text-base">
                {moreBundles.desc}
              </p>
            </div>
          </div>

          <Link
            href="/bundles"
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#5B8A61] px-8 py-4 text-base font-bold text-white transition-all duration-200 hover:scale-[1.02] hover:bg-[#4D7953] active:scale-95 lg:w-auto"
          >
            {t.viewAll}
            <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </div>
    </section>
  );
}
