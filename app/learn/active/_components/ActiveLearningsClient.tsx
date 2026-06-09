'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Compass, Layers } from 'lucide-react';
import type { RecentLearningActivity } from '@/lib/supabase/services/bundle-progress';

type DisplayLanguage = 'ko' | 'en';

const copy = {
  ko: {
    title: '진행 중인 학습',
    backToLearn: '학습 홈으로',
    fallbackCategory: '학습 번들',
    fallbackTitle: '제목 없는 번들',
    completedItems: (completed: number, total: number) => `${completed} / ${total} 항목 완료`,
    continueLesson: '학습 계속하기',
    emptyTitle: '진행 중인 학습이 없습니다',
    emptyDescription: '학습 번들을 탐색하고 첫 학습을 시작해보세요.',
    browseBundles: '번들 둘러보기',
  },
  en: {
    title: 'Ongoing Learnings',
    backToLearn: 'Back to Learn',
    fallbackCategory: 'Learning Bundle',
    fallbackTitle: 'Untitled Bundle',
    completedItems: (completed: number, total: number) => `${completed} of ${total} items completed`,
    continueLesson: 'Continue Lesson',
    emptyTitle: 'No active learnings',
    emptyDescription: 'Browse lesson bundles and start your learning journey.',
    browseBundles: 'Browse Bundles',
  },
};

export default function ActiveLearningsClient({
  activities,
  language,
}: {
  activities: RecentLearningActivity[];
  language: DisplayLanguage;
}) {
  const t = copy[language] || copy.ko;

  // 필터링: 완료되지 않은 (진행 중인) 학습만 선별
  const activeActivities = useMemo(() => {
    return activities.filter((activity) => !activity.interaction.is_completed);
  }, [activities]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 text-[#1f1b18] dark:text-zinc-100 min-h-[calc(100vh-8rem)]">
      {/* 상단 네비게이션 헤더 */}
      <div className="flex items-center gap-4 mb-8">
        <Link
          href="/learn"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-800 transition hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
          aria-label={t.backToLearn}
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-serif">{t.title}</h1>
        </div>
      </div>

      {activeActivities.length === 0 ? (
        /* Empty State */
        <div className="flex flex-col items-center justify-center text-center rounded-2xl border border-dashed border-zinc-300 bg-white p-12 shadow-sm dark:border-zinc-700 dark:bg-zinc-900/50 min-h-[300px]">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[#e5f0e4] text-[#5d9361] dark:bg-emerald-950/50 dark:text-emerald-200 mb-4">
            <Compass className="h-8 w-8" />
          </span>
          <h2 className="text-2xl font-bold font-serif text-zinc-800 dark:text-zinc-100 mb-2">{t.emptyTitle}</h2>
          <p className="text-zinc-500 dark:text-zinc-400 mb-6 max-w-md">{t.emptyDescription}</p>
          <Link
            href="/bundles"
            className="inline-flex items-center justify-center rounded-full bg-[#63a464] px-8 py-3.5 text-sm font-bold text-white transition hover:bg-[#4e9250]"
          >
            {t.browseBundles}
          </Link>
        </div>
      ) : (
        /* Grid of Active Learnings */
        <div className="grid grid-cols-1 gap-6">
          {activeActivities.map((activity) => {
            const { bundle, interaction, progressPercent, totalItems, completedItems } = activity;
            const categoryName = language === 'ko'
              ? bundle.bundle_category?.name || bundle.bundle_category?.name_en || bundle.bundle_type?.name || t.fallbackCategory
              : bundle.bundle_category?.name_en || bundle.bundle_category?.name || bundle.bundle_type?.name || t.fallbackCategory;
            const title = language === 'ko'
              ? bundle.title || bundle.title_en || t.fallbackTitle
              : bundle.title_en || bundle.title || t.fallbackTitle;
            const imageSrc = bundle.thumbnail_url || '/images/heroimg_land.jpg';
            const currentLabel = t.completedItems(completedItems, totalItems);
            const learnHref = interaction.current_bundle_item_id
              ? `/bundles/${bundle.id}/learn?item=${interaction.current_bundle_item_id}`
              : `/bundles/${bundle.id}/learn`;

            return (
              <div
                key={bundle.id}
                className="flex flex-col sm:flex-row gap-5 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50 transition-all hover:shadow-md"
              >
                {/* Thumbnail Image */}
                <div className="relative aspect-video w-full sm:w-48 overflow-hidden rounded-lg bg-[#f3ede3] dark:bg-zinc-800 shrink-0 shadow-sm">
                  {imageSrc ? (
                    <Image
                      src={imageSrc}
                      alt={title}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 100vw, 192px"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-[#8b7c66] dark:text-zinc-500">
                      <Layers className="h-10 w-10" />
                    </div>
                  )}
                </div>

                {/* Content Info */}
                <div className="flex flex-1 flex-col justify-between min-w-0">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-[#4d8b4f]">{categoryName}</p>
                    <h2 className="mt-2 font-serif text-xl font-bold leading-snug truncate text-zinc-950 dark:text-zinc-50">{title}</h2>
                    <p className="mt-1 text-xs font-semibold text-zinc-500 dark:text-zinc-400">{currentLabel}</p>
                  </div>
                  
                  <div className="mt-4">
                    <div className="flex items-center justify-between gap-3 text-xs font-semibold">
                      <div className="h-2 flex-1 rounded-full bg-zinc-100 dark:bg-zinc-800">
                        <div className="h-full rounded-full bg-[#63a464]" style={{ width: `${progressPercent}%` }} />
                      </div>
                      <span className="tabular-nums text-zinc-700 dark:text-zinc-300">{progressPercent}%</span>
                    </div>
                    <div className="mt-4 flex justify-end">
                      <Link
                        href={learnHref}
                        className="rounded-full bg-[#63a464] px-6 py-2.5 text-xs font-bold text-white transition hover:bg-[#4e9250]"
                      >
                        {t.continueLesson}
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
