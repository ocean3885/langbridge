'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, ChevronDown } from 'lucide-react';
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
    fallbackCategory: '학습 번들',
    fallbackTitle: '제목 없는 번들',
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
    fallbackCategory: 'Learning Bundle',
    fallbackTitle: 'Untitled Bundle',
    today: 'Today',
    yesterday: 'Yesterday',
    daysAgo: (days: number) => `${days} days ago`,
  },
};

const PREVIEW_COUNT = 4;

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
    () => (showAll ? displayBundles : displayBundles.slice(0, PREVIEW_COUNT)),
    [displayBundles, showAll],
  );
  const hasMore = displayBundles.length > PREVIEW_COUNT;

  if (displayBundles.length === 0) {
    return null;
  }

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

      <div className="mt-4 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-black/20">
        <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {visibleBundles.map((item) => (
            <ActiveBundleRow key={item.interaction.id} item={item} language={language} />
          ))}
        </div>
      </div>
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
  const imageSrc = item.bundle.thumbnail_url || '/images/heroimg_land.jpg';
  const lastStudied = formatRelativeStudyDate(item.interaction.last_studied_at, language);
  const href = item.currentBundleItemId
    ? `/bundles/${item.bundle.id}/learn?item=${item.currentBundleItemId}`
    : `/bundles/${item.bundle.id}/learn`;

  return (
    <Link
      href={href}
      className="grid gap-4 p-4 transition hover:bg-zinc-50 dark:hover:bg-zinc-800/70 sm:grid-cols-[88px_1fr_auto] sm:items-center"
    >
      <div className="relative aspect-video overflow-hidden rounded-lg bg-[#f3ede3] dark:bg-zinc-800 sm:aspect-square">
        <Image src={imageSrc} alt={title} fill className="object-cover" sizes="(max-width: 640px) 100vw, 88px" />
      </div>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-xs font-black uppercase tracking-wide text-[#5a975d]">{categoryName}</p>
          {lastStudied && <p className="text-xs font-semibold text-zinc-400 dark:text-zinc-500">{lastStudied}</p>}
        </div>
        <h3 className={`${getDisplayHeadingClass(language)} mt-2 truncate text-xl`}>{title}</h3>
        <div className="mt-3 flex items-center gap-3">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
            <div className="h-full rounded-full bg-[#63a464]" style={{ width: `${Math.min(100, Math.max(0, item.progressPercent))}%` }} />
          </div>
          <span className="text-sm font-semibold tabular-nums text-zinc-700 dark:text-zinc-200">{item.progressPercent}%</span>
        </div>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">{t.completedItems(item.completedItems, item.totalItems)}</p>
      </div>
      <span className="inline-flex items-center justify-center gap-2 rounded-full bg-[#63a464] px-5 py-2 text-sm font-bold text-white transition hover:bg-[#4e9250] sm:justify-self-end">
        {t.continue}
        <ArrowRight className="h-4 w-4" />
      </span>
    </Link>
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
