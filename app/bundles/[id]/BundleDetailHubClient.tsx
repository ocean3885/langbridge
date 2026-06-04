'use client';

import type { ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowLeft,
  Layers,
  Library,
  MessageCircleQuestion,
  MoreVertical,
  Shuffle,
  Star,
} from 'lucide-react';
import { getBundleLevelDisplay } from '@/lib/bundle-level';
import { getBundleDescription, getBundleTitle, getCategoryHref } from '../bundle-utils';
import type { BundleProgressSummary } from '@/lib/supabase/services/bundle-progress';

interface BundleDetailHubClientProps {
  bundle: any;
  items: any[];
  language: 'ko' | 'en';
  progress: BundleProgressSummary;
}

const copy = {
  ko: {
    itemUnit: '표현 수',
    estimate: '예상 시간',
    level: 'Level',
    cefr: 'CEFR',
    progressTitle: '내 진행률',
    completed: (done: number, total: number) => `${done} / ${total} 완료`,
    status: '상태',
    notStarted: '시작 전',
    inProgress: '진행 중',
    completedStatus: '완료',
    remaining: '남은 항목',
    remainingItems: (count: number) => `${count}개`,
    estimatedLeft: '남은 시간',
    minutes: (count: number) => `${count}분`,
    lastStudied: '최근 학습',
    noRecord: '-',
    continue: 'Continue Learning',
    start: 'Start Learning',
    viewItems: 'View All Items',
    practiceModes: 'Practice Modes',
    flashcards: 'Flashcards',
    quickQuiz: 'Quick Quiz',
    scramble: 'Scramble',
  },
  en: {
    itemUnit: 'Items',
    estimate: 'Estimated',
    level: 'Level',
    cefr: 'CEFR',
    progressTitle: 'My progress',
    completed: (done: number, total: number) => `${done} / ${total} complete`,
    status: 'Status',
    notStarted: 'Not started',
    inProgress: 'In progress',
    completedStatus: 'Completed',
    remaining: 'Remaining',
    remainingItems: (count: number) => `${count} items`,
    estimatedLeft: 'Est. left',
    minutes: (count: number) => `${count} min`,
    lastStudied: 'Last studied',
    noRecord: '-',
    continue: 'Continue Learning',
    start: 'Start Learning',
    viewItems: 'View All Items',
    practiceModes: 'Practice Modes',
    flashcards: 'Flashcards',
    quickQuiz: 'Quick Quiz',
    scramble: 'Scramble',
  },
};

export default function BundleDetailHubClient({ bundle, items, language, progress }: BundleDetailHubClientProps) {
  const t = copy[language] || copy.ko;
  const title = getBundleTitle(bundle, language);
  const description = getBundleDescription(bundle, language);
  const level = getBundleLevelDisplay(bundle.level, language);
  const categoryName =
    (language === 'en' ? bundle.bundle_category?.name_en : bundle.bundle_category?.name) ||
    bundle.bundle_category?.name ||
    bundle.bundle_category?.name_en ||
    'Hola Start';
  const minutes = items.length;
  const minuteLabel = language === 'en' ? `${minutes} min` : `${minutes}분`;
  const hasStarted = progress.completedItems > 0 || !!progress.bundleInteraction?.is_started;
  const remainingItems = Math.max(0, items.length - progress.completedItems);
  const estimatedLeftMinutes = remainingItems;
  const isCompleted = progress.progressPercent >= 100 || !!progress.bundleInteraction?.is_completed;
  const statusLabel = isCompleted ? t.completedStatus : hasStarted ? t.inProgress : t.notStarted;
  const lastStudiedLabel = formatProgressDate(progress.bundleInteraction?.last_studied_at, language) || t.noRecord;
  const backHref = bundle.bundle_category ? getCategoryHref(bundle.bundle_category, language) : '/bundles';
  const learnHref = progress.currentBundleItemId
    ? `/bundles/${bundle.id}/learn?item=${progress.currentBundleItemId}`
    : `/bundles/${bundle.id}/learn`;

  return (
    <div className="mx-auto min-h-[calc(100vh-8rem)] max-w-6xl bg-[#fbf8f2] text-[#191715] shadow-sm md:rounded-[28px] md:border md:border-zinc-200 lg:border-0 lg:bg-transparent lg:shadow-none">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(340px,0.65fr)] lg:items-start">
      <div className="relative overflow-hidden rounded-b-[28px] bg-white lg:rounded-[28px] lg:border lg:border-zinc-100 lg:shadow-sm">
        <div className="absolute inset-0 bg-gradient-to-b from-[#fffaf1] via-white/75 to-white" />
        <div className="relative z-10 flex items-center justify-between px-5 pb-2 pt-4">
          <Link
            href={backHref}
            className="flex h-10 w-10 items-center justify-center rounded-full text-zinc-800 transition hover:bg-zinc-100"
            aria-label="Back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex items-center gap-1">
            <button className="flex h-10 w-10 items-center justify-center rounded-full text-zinc-800 transition hover:bg-zinc-100" aria-label="Save bundle">
              <Star className="h-5 w-5" />
            </button>
            <button className="flex h-10 w-10 items-center justify-center rounded-full text-zinc-800 transition hover:bg-zinc-100" aria-label="More">
              <MoreVertical className="h-5 w-5" />
            </button>
          </div>
        </div>

        <section className="relative z-10 px-7 pb-5 lg:px-9 lg:pb-7">
          <span className="inline-flex rounded-full bg-[#dff1e5] px-3 py-1 text-xs font-bold text-[#2f7d4a]">
            {categoryName}
          </span>
          <h1 className="mt-3 text-2xl font-extrabold leading-tight tracking-normal text-zinc-950 lg:max-w-2xl lg:text-5xl">{title}</h1>
          <p className="mt-3 text-sm font-semibold leading-6 text-zinc-700 lg:max-w-xl lg:text-base lg:leading-7">{description}</p>
        </section>

        <div className="relative z-10 h-44 w-full overflow-hidden lg:h-[360px]">
          {bundle.thumbnail_url ? (
            <Image src={bundle.thumbnail_url} alt={title} fill priority className="object-cover" sizes="(max-width: 1024px) 448px, 760px" />
          ) : (
            <div className="flex h-full items-center justify-center bg-[#f3ede3] text-[#8b7c66]">
              <Layers className="h-14 w-14" />
            </div>
          )}
          <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-white to-transparent" />
        </div>

        <div className="relative z-20 mx-5 -mt-4 grid grid-cols-4 rounded-2xl border border-zinc-100 bg-white shadow-md lg:mx-8 lg:-mt-8">
          <Stat label={t.level} value={level.label} />
          <Stat label={t.itemUnit} value={String(items.length)} />
          <Stat label={t.estimate} value={minuteLabel} />
          <Stat label={t.cefr} value={level.shortLabel} />
        </div>
      </div>

      <main className="space-y-4 px-5 pb-8 pt-4 lg:px-0 lg:pt-0">
        <section className="rounded-2xl border border-zinc-100 bg-white p-4 shadow-sm lg:p-6">
          <h2 className="text-base font-bold tracking-tight text-zinc-950">{t.progressTitle}</h2>
          <div className="mt-3 flex items-end justify-between gap-4">
            <p className="text-lg font-extrabold tracking-tight text-zinc-950">{t.completed(progress.completedItems, items.length)}</p>
            <p className="text-sm font-semibold tabular-nums text-zinc-700">{progress.progressPercent}%</p>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-200">
            <div className="h-full rounded-full bg-[#3f8d54]" style={{ width: `${Math.min(100, progress.progressPercent)}%` }} />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <ProgressMeta label={t.status} value={statusLabel} />
            <ProgressMeta label={t.remaining} value={t.remainingItems(remainingItems)} />
            <ProgressMeta label={t.estimatedLeft} value={t.minutes(estimatedLeftMinutes)} />
            <ProgressMeta label={t.lastStudied} value={lastStudiedLabel} />
          </div>
          <Link
            href={learnHref}
            className="mt-5 flex h-12 w-full items-center justify-center rounded-lg bg-[#3f8d54] text-sm font-bold text-white shadow-sm transition hover:bg-[#347946]"
          >
            {hasStarted ? t.continue : t.start}
          </Link>
          <Link
            href={`/bundles/${bundle.id}/items`}
            className="mt-2 flex h-11 w-full items-center justify-center rounded-lg border border-zinc-200 bg-white text-sm font-bold text-zinc-800 transition hover:bg-zinc-50"
          >
            {t.viewItems}
          </Link>
        </section>

        <section className="rounded-2xl border border-zinc-100 bg-white p-4 shadow-sm lg:p-6">
          <h2 className="mb-4 text-base font-bold tracking-tight text-zinc-950">{t.practiceModes}</h2>
          <div className="grid grid-cols-3 gap-2 lg:gap-3">
            <ModeLink href={`/bundles/${bundle.id}/flashcards`} icon={<Library className="h-5 w-5" />} label={t.flashcards} color="blue" />
            <ModeLink href={`/bundles/${bundle.id}/quiz`} icon={<MessageCircleQuestion className="h-5 w-5" />} label={t.quickQuiz} color="violet" />
            <ModeLink href={`/bundles/${bundle.id}/scramble`} icon={<Shuffle className="h-5 w-5" />} label={t.scramble} color="orange" />
          </div>
        </section>
      </main>
      </div>
    </div>
  );
}

function formatProgressDate(date: string | null | undefined, language: 'ko' | 'en') {
  if (!date) return '';

  return new Date(date).toLocaleDateString(language === 'ko' ? 'ko-KR' : 'en-US', {
    month: 'short',
    day: 'numeric',
  });
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-r border-zinc-100 px-2 py-3 text-center last:border-r-0">
      <p className="truncate text-sm font-bold text-[#2f7d4a]">{value}</p>
      <p className="mt-1 truncate text-[10px] font-semibold text-zinc-500">{label}</p>
    </div>
  );
}

function ProgressMeta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-[#f8f6f0] px-3 py-2">
      <p className="text-xs font-medium leading-4 text-zinc-500">{label}</p>
      <p className="mt-1 truncate text-sm font-semibold tabular-nums text-zinc-900">{value}</p>
    </div>
  );
}

function ModeLink({
  href,
  icon,
  label,
  color,
}: {
  href: string;
  icon: ReactNode;
  label: string;
  color: 'blue' | 'violet' | 'orange';
}) {
  const colors = {
    blue: 'bg-sky-50 text-sky-700',
    violet: 'bg-violet-50 text-violet-700',
    orange: 'bg-orange-50 text-orange-700',
  };

  return (
    <Link href={href} className="flex min-h-[88px] flex-col items-center justify-center gap-2 rounded-xl bg-white px-1 text-center shadow-sm ring-1 ring-zinc-100 transition hover:-translate-y-0.5 hover:shadow-md">
      <span className={`flex h-10 w-10 items-center justify-center rounded-full ${colors[color]}`}>{icon}</span>
      <span className="text-xs font-bold leading-tight text-zinc-700">{label}</span>
    </Link>
  );
}
