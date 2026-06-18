import Link from 'next/link';
import Image from 'next/image';
import { Layers, ChevronRight, Clock } from 'lucide-react';
import { getBundleLevelDisplay } from '@/lib/bundle-level';

export type Bundle = {
  id: string;
  title: string;
  title_en?: string | null;
  description: string;
  description_en?: string | null;
  thumbnail_url: string | null;
  level: number;
  created_at: string;
  category_name?: string | null;
  category_name_en?: string | null;
};

interface BundleSectionProps {
  bundles: Bundle[];
  lang?: 'ko' | 'en';
}

const translations = {
  ko: {
    section: 'Learning Bundles',
    title: '추천 학습 번들',
    subtitle: '정교하게 선별된 문장 세트로 실력을 쌓아보세요.',
    viewAll: '전체보기',
    mobileViewAll: '전체 번들 보기'
  },
  en: {
    section: 'Learning Bundles',
    title: 'Recommended Bundles',
    subtitle: 'Improve your skills with carefully curated sentence sets.',
    viewAll: 'View All',
    mobileViewAll: 'View All Bundles'
  }
};

export default function BundleSection({ bundles, lang = 'ko' }: BundleSectionProps) {
  if (bundles.length === 0) return null;

  const t = translations[lang];

  return (
    <section className="py-12 bg-white dark:bg-transparent">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-end justify-between mb-10">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-100 dark:shadow-none">
                <Layers className="w-4 h-4 text-white" />
              </div>
              <span className="text-sm font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">{t.section}</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-gray-900 dark:text-white tracking-tight">{t.title}</h2>
            <p className="mt-3 text-gray-500 dark:text-gray-400 font-medium">{t.subtitle}</p>
          </div>
          <Link
            href="/bundles"
            className="hidden sm:flex items-center gap-2 text-sm font-bold text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors group"
          >
            {t.viewAll}
            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {bundles.map((bundle) => {
            const displayTitle = lang === 'en' && bundle.title_en ? bundle.title_en : bundle.title;
            const displayDesc = lang === 'en' && bundle.description_en ? bundle.description_en : bundle.description;
            const displayCategory = lang === 'en' && bundle.category_name_en ? bundle.category_name_en : bundle.category_name;
            const level = getBundleLevelDisplay(bundle.level, lang);

            return (
              <Link
                key={bundle.id}
                href={`/bundles/${bundle.id}`}
                className="group bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 hover:border-blue-100 dark:hover:border-blue-900/50 hover:shadow-xl transition-all duration-300 flex flex-col h-full overflow-hidden"
              >
                <div className="relative aspect-[4/3] overflow-hidden bg-gray-50 dark:bg-gray-800">
                  <Image
                    src={bundle.thumbnail_url || '/images/bundle-fallback.webp'}
                    alt={displayTitle}
                    fill
                    className="object-cover group-hover:scale-110 transition-transform duration-700"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                  />
                  <div className="absolute top-3 left-3">
                    <span className="px-2.5 py-0.5 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm text-blue-600 dark:text-blue-400 text-[10px] font-black rounded-full shadow-sm uppercase tracking-wider">
                      {level.shortLabel}
                    </span>
                  </div>
                </div>

                <div className="p-5 flex flex-col flex-grow">
                  <div className="mb-4">
                    {displayCategory && (
                      <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1 block">
                        {displayCategory}
                      </span>
                    )}
                    <h3 className="font-bold text-gray-900 dark:text-gray-100 line-clamp-1 group-hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                      {displayTitle}
                    </h3>
                    <p className="mt-2 text-xs text-gray-400 dark:text-gray-500 font-medium line-clamp-2 min-h-[2rem]">
                      {displayDesc || (lang === 'ko' ? '설명이 없습니다.' : 'No description.')}
                    </p>
                  </div>

                  <div className="mt-auto pt-4 flex items-center justify-between border-t border-gray-50 dark:border-gray-800">
                    <div className="flex items-center gap-1.5 text-[11px] text-gray-400 dark:text-gray-500 font-medium">
                      <Clock className="w-3 h-3" />
                      {new Date(bundle.created_at).toLocaleDateString(lang === 'ko' ? 'ko-KR' : 'en-US')}
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-300 dark:text-gray-600 group-hover:text-blue-600 dark:hover:text-blue-400 transition-colors" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        <div className="mt-10 sm:hidden">
          <Link
            href="/bundles"
            className="flex items-center justify-center w-full py-4 bg-gray-50 dark:bg-gray-800 rounded-2xl text-sm font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            {t.mobileViewAll}
          </Link>
        </div>
      </div>
    </section>
  );
}
