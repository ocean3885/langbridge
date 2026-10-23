'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronDown, Play } from 'lucide-react';
import { BundleLearningMetrics, getHomeLearningActionLabel } from './BundleLearningMetrics';
import { getBundleLevelDisplay } from '@/lib/bundle-level';
import type { ActiveLearningBundle } from '@/lib/supabase/services/bundle-progress';

type DisplayLanguage = 'ko' | 'en';

const copy = {
  ko: {
    title: '진행 중인 번들',
    subtitle: '이어서 학습하기 외의 진행 중인 번들을 한곳에 모았어요.',
    viewAll: '전체 보기',
    collapse: '접기',
    continue: '계속하기',
    completedItems: (completed: number, total: number) => `${completed} / ${total} 완료`,
    emptyTitle: '진행 중인 번들이 없습니다',
    emptyDescription: '관심 있는 번들을 선택하고 학습을 시작하면 여기에 표시됩니다.',
    fallbackCategory: '학습 번들',
    fallbackTitle: '제목 없는 번들',
    lastStudied: '최근 학습',
    today: '오늘',
    yesterday: '어제',
    daysAgo: (days: number) => `${days}일 전`,
  },
  en: {
    title: 'Active Bundles',
    subtitle: 'Keep the rest of your started bundles within reach.',
    viewAll: 'View all',
    collapse: 'Collapse',
    continue: 'Continue',
    completedItems: (completed: number, total: number) => `${completed} of ${total} completed`,
    emptyTitle: 'No active bundles yet',
    emptyDescription: 'Start learning from a bundle and it will appear here.',
    fallbackCategory: 'Learning Bundle',
    fallbackTitle: 'Untitled Bundle',
    lastStudied: 'Last studied',
    today: 'Today',
    yesterday: 'Yesterday',
    daysAgo: (days: number) => `${days} days ago`,
  },
};

const PREVIEW_COUNT = 4;
const EXPANDED_COUNT = 10;

export function ActiveBundlesSection({
  bundles,
  featuredBundleId,
  language,
}: {
  bundles: ActiveLearningBundle[];
  featuredBundleId?: string | null;
  language: DisplayLanguage;
}) {
  const t = copy[language];
  const [showAll, setShowAll] = useState(false);
  const displayBundles = useMemo(
    () => bundles.filter((item) => item.bundle.id !== featuredBundleId),
    [bundles, featuredBundleId],
  );
  const visibleBundles = useMemo(
    () => displayBundles.slice(0, showAll ? EXPANDED_COUNT : PREVIEW_COUNT),
    [displayBundles, showAll],
  );
  const hasMore = displayBundles.length > PREVIEW_COUNT;

  return (
    <section>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className={`${getDisplayHeadingClass(language)} text-2xl`}>{t.title}</h2>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">{t.subtitle}</p>
        </div>
        {hasMore && (
          <button
            type="button"
            onClick={() => setShowAll((value) => !value)}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-zinc-200 bg-white px-5 py-2 text-sm font-semibold text-zinc-600 shadow-sm transition hover:border-[#8bbf87] hover:bg-[#f1f8ef] hover:text-[#3f7d42] dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:shadow-black/20 dark:hover:border-emerald-700 dark:hover:bg-emerald-950/30 dark:hover:text-emerald-100"
          >
            <span>{showAll ? t.collapse : t.viewAll}</span>
            <ChevronDown className={`h-4 w-4 transition-transform ${showAll ? 'rotate-180' : ''}`} />
          </button>
        )}
      </div>

      {displayBundles.length === 0 ? (
        <div className="mt-4 rounded-xl border border-dashed border-zinc-300 bg-white p-7 shadow-sm dark:border-zinc-700 dark:bg-zinc-900 dark:shadow-black/20">
          <h3 className={`${getDisplayHeadingClass(language)} text-xl`}>{t.emptyTitle}</h3>
          <p className="mt-2 text-sm leading-6 text-zinc-500 dark:text-zinc-400">{t.emptyDescription}</p>
        </div>
      ) : (
        <div className="mt-4 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xs dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-black/20">
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {visibleBundles.map((item) => (
              <ActiveBundleRow key={item.interaction.id} item={item} language={language} />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function ActiveBundleRow({
  item,
  language,
}: {
  item: ActiveLearningBundle;
  language: DisplayLanguage;
}) {
  const t = copy[language];
  const title = language === 'ko'
    ? item.bundle.title || item.bundle.title_en || t.fallbackTitle
    : item.bundle.title_en || item.bundle.title || t.fallbackTitle;
  const categoryName = language === 'ko'
    ? item.bundle.bundle_category?.name || item.bundle.bundle_category?.name_en || item.bundle.bundle_type?.name || t.fallbackCategory
    : item.bundle.bundle_category?.name_en || item.bundle.bundle_category?.name || item.bundle.bundle_type?.name || t.fallbackCategory;
  const imageSrc = item.bundle.thumbnail_url || '/images/bundle-fallback.webp';
  const lastStudied = formatRelativeStudyDate(item.interaction.last_studied_at, language);
  const level = getBundleLevelDisplay(item.bundle.level, language);
  const href = item.learning.href;

  return (
    <article
      className="group flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 sm:gap-4 p-4 transition hover:bg-zinc-50/80 dark:hover:bg-zinc-850/60"
    >
      {/* Left Thumbnail + Content */}
      <div className="flex flex-1 min-w-0 items-start sm:items-center gap-3.5 sm:gap-4">
        <Link href={`/bundles/${item.bundle.id}`} className="relative block aspect-[16/10] w-24 sm:w-28 md:w-32 shrink-0 overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-800">
          <Image
            src={imageSrc}
            alt={title}
            fill
            className="object-cover transition duration-300 group-hover:scale-105"
            sizes="(max-width: 640px) 96px, 128px"
          />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="rounded-md bg-zinc-100 px-2 py-0.5 text-[11px] font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
              {categoryName}
            </span>
            <span
              className="rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
              title={level.label}
            >
              {level.shortLabel}
            </span>
            {lastStudied && (
              <span className="text-xs font-medium text-zinc-400 dark:text-zinc-500">
                · {t.lastStudied}: {lastStudied}
              </span>
            )}
          </div>
          <h3 className="mt-1 truncate text-base sm:text-lg font-bold text-zinc-900 group-hover:text-[#2f7d4a] dark:text-zinc-100 dark:group-hover:text-emerald-400 transition-colors">
            <Link href={`/bundles/${item.bundle.id}`}>{title}</Link>
          </h3>
          <BundleLearningMetrics learning={item.learning} language={language} />
        </div>
      </div>

      {/* Right: Continue button */}
      <Link href={href} className="inline-flex shrink-0 min-h-9 items-center justify-center gap-1.5 self-end sm:self-center rounded-lg bg-[#3f9657] px-4 py-2 text-xs font-bold text-white shadow-xs transition group-hover:bg-[#2f7d4a] active:scale-95 whitespace-nowrap">
        <Play className="h-3.5 w-3.5 fill-current" />
        <span>{getHomeLearningActionLabel(item.learning.action, language)}</span>
      </Link>
    </article>
  );
}

function formatRelativeStudyDate(value: string | null | undefined, language: DisplayLanguage) {
  if (!value) return null;
  const t = copy[language];

  const studiedAt = new Date(value);
  if (Number.isNaN(studiedAt.getTime())) return null;

  const now = new Date();
  const diffMs = now.getTime() - studiedAt.getTime();
  const diffDays = Math.floor(diffMs / 86_400_000);

  if (diffDays <= 0) return t.today;
  if (diffDays === 1) return t.yesterday;
  if (diffDays < 7) return t.daysAgo(diffDays);

  return studiedAt.toLocaleDateString(language === 'ko' ? 'ko-KR' : 'en', {
    month: 'short',
    day: 'numeric',
  });
}

function getDisplayHeadingClass(language: DisplayLanguage) {
  return language === 'ko'
    ? 'font-sans font-bold'
    : 'font-serif font-semibold';
}
