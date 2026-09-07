'use client';

import { practiceModeColors } from '@/components/practice/practice-mode-colors';
import { PracticeModeIcon } from '@/components/practice/PracticeModeIcon';

import { getBundleStarProgress } from '@/lib/practice/progress';
import { PRACTICE_REGISTRY, PRACTICE_MODES, isBundlePracticeMode } from '@/lib/practice/registry';

import { useState, type ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowLeft,
  Info,
  Layers,
  Lock,
  Star,
} from 'lucide-react';
import { getBundleLevelDisplay } from '@/lib/bundle-level';
import { estimateBundleMinutes, getBundleDescription, getBundleTitle, getCategoryHref } from '../bundle-utils';
import type { BundleProgressSummary } from '@/lib/supabase/services/bundle-progress';
import type { BundleAccessResult } from '@/lib/bundle-access';

interface BundleDetailHubClientProps {
  bundle: any;
  items: any[];
  language: 'ko' | 'en';
  progress: BundleProgressSummary;
  isLoggedIn: boolean;
  access: BundleAccessResult;
}

const copy = {
  ko: {
    itemUnit: '표현 수',
    estimate: '예상 시간',
    level: 'Level',
    cefr: 'CEFR',
    progressTitle: '내 진행률',
    progressInfoLabel: '진행률 반영 기준 보기',
    progressInfo: '문장 연습에서 한 번 이상 정답을 맞힌 문장을 학습한 문장으로 집계합니다. 단어 연습과 듣기는 문장 완료에 포함되지 않습니다.',
    practiceStars: 'Sentence Stars',
    saveBundle: '번들 저장',
    unsaveBundle: '번들 저장 해제',
    loginRequired: '번들을 저장하려면 로그인이 필요합니다.',
    saveFailed: '번들 저장 상태를 변경하지 못했습니다.',
    completed: (done: number, total: number) => `학습한 문장 ${done} / ${total}`,
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
    premium: 'Premium',
    subscribe: '구독하고 학습하기',
    loginToAccess: '로그인하고 학습하기',
    premiumNotice: '구독 회원 전용 번들입니다.',
    viewItems: 'View All Items',
    practiceModes: 'Practice Modes',
    practiceModesInfoLabel: '연습 모드 설명 보기',
    practiceModesInfo: '문장 연습에서 처음 정답을 맞히면 별을 획득합니다. 획득한 별은 유지되며, 단어 연습은 단어 숙련도에 반영됩니다.',
    flashcards: 'Flashcards',
    quickQuiz: 'Sentence Quiz',
    scramble: 'Scramble',
    wordFill: 'Word Fill',
  },
  en: {
    itemUnit: 'Items',
    estimate: 'Estimated',
    level: 'Level',
    cefr: 'CEFR',
    progressTitle: 'My progress',
    progressInfoLabel: 'View how progress is measured',
    progressInfo: 'A sentence counts as practiced after a correct answer in a sentence practice mode. Word practice and listening do not complete sentences.',
    practiceStars: 'Sentence Stars',
    saveBundle: 'Save bundle',
    unsaveBundle: 'Remove saved bundle',
    loginRequired: 'Log in to save this bundle.',
    saveFailed: 'Failed to update the saved bundle.',
    completed: (done: number, total: number) => `${done} / ${total} sentences practiced`,
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
    premium: 'Premium',
    subscribe: 'Subscribe to learn',
    loginToAccess: 'Log in to learn',
    premiumNotice: 'Subscribers only.',
    viewItems: 'View All Items',
    practiceModes: 'Practice Modes',
    practiceModesInfoLabel: 'View practice mode details',
    practiceModesInfo: 'Earn permanent stars for first correct answers in sentence practice. Word practice builds word proficiency.',
    flashcards: 'Flashcards',
    quickQuiz: 'Sentence Quiz',
    scramble: 'Scramble',
    wordFill: 'Word Fill',
  },
};

export default function BundleDetailHubClient({ bundle, items, language, progress, isLoggedIn, access }: BundleDetailHubClientProps) {
  const [showProgressInfo, setShowProgressInfo] = useState(false);
  const [isPinned, setIsPinned] = useState(Boolean(progress.bundleInteraction?.is_pinned));
  const [isUpdatingPinned, setIsUpdatingPinned] = useState(false);
  const t = copy[language] || copy.ko;
  const title = getBundleTitle(bundle, language);
  const description = getBundleDescription(bundle, language);
  const level = getBundleLevelDisplay(bundle.level, language);
  const categoryName =
    (language === 'en' ? bundle.bundle_category?.name_en : bundle.bundle_category?.name) ||
    bundle.bundle_category?.name ||
    bundle.bundle_category?.name_en ||
    'Hola Start';
  const minutes = estimateBundleMinutes(items.length);
  const minuteLabel = language === 'en' ? `${minutes} min` : `${minutes}분`;
  const hasStarted = progress.completedItems > 0 || !!progress.bundleInteraction?.is_started;
  const remainingItems = Math.max(0, progress.totalItems - progress.completedItems);
  const estimatedLeftMinutes = estimateBundleMinutes(remainingItems);
  const isCompleted = progress.totalItems > 0 && progress.progressPercent >= 100;
  const statusLabel = isCompleted ? t.completedStatus : hasStarted ? t.inProgress : t.notStarted;
  const lastStudiedLabel = formatProgressDate(progress.bundleInteraction?.last_studied_at, language) || t.noRecord;
  const backHref = bundle.bundle_category ? getCategoryHref(bundle.bundle_category, language) : '/bundles';
  const learnHref = progress.currentBundleItemId
    ? `/bundles/${bundle.id}/learn?item=${progress.currentBundleItemId}`
    : `/bundles/${bundle.id}/learn`;
  const canAccessLearning = access.canView;
  const gatedHref = access.reason === 'login_required'
    ? `/auth/login?redirectTo=${encodeURIComponent(learnHref)}`
    : `/pricing?redirectTo=${encodeURIComponent(learnHref)}`;
  const primaryHref = canAccessLearning ? learnHref : gatedHref;
  const primaryLabel = canAccessLearning ? (hasStarted ? t.continue : t.start) : access.reason === 'login_required' ? t.loginToAccess : t.subscribe;
  const modeHref = (path: string) => canAccessLearning ? path : gatedHref;
  const practiceStars = getBundleStarProgress(items, progress.itemInteractions, language);

  const handleTogglePinned = async () => {
    if (!isLoggedIn) {
      alert(t.loginRequired);
      return;
    }

    if (isUpdatingPinned) return;

    const nextPinned = !isPinned;
    setIsPinned(nextPinned);
    setIsUpdatingPinned(true);

    try {
      const response = await fetch('/api/bundle-progress', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bundle_id: bundle.id,
          is_pinned: nextPinned,
        }),
      });

      if (!response.ok) throw new Error('Failed to update bundle pin');
    } catch {
      setIsPinned(!nextPinned);
      alert(t.saveFailed);
    } finally {
      setIsUpdatingPinned(false);
    }
  };

  return (
    <div className="mx-auto min-h-[calc(100vh-8rem)] max-w-6xl bg-[#fbf8f2] text-[#191715] shadow-sm dark:bg-zinc-950 dark:text-zinc-100 md:rounded-[28px] md:border md:border-zinc-200 md:dark:border-zinc-800 lg:border-0 lg:bg-transparent lg:shadow-none lg:dark:border-0 lg:dark:bg-transparent">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(340px,0.65fr)] lg:items-start">
      <div className="relative overflow-hidden rounded-b-[28px] bg-white dark:bg-zinc-900 lg:rounded-[28px] lg:border lg:border-zinc-100 lg:shadow-sm lg:dark:border-zinc-800 lg:dark:shadow-black/20">
        <div className="absolute inset-0 bg-gradient-to-b from-[#fffaf1] via-white/75 to-white dark:from-zinc-800 dark:via-zinc-900/85 dark:to-zinc-900" />
        <div className="relative z-10 flex items-center justify-between px-5 pb-2 pt-4">
          <Link
            href={backHref}
            className="flex h-10 w-10 items-center justify-center rounded-full text-zinc-800 transition hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
            aria-label="Back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleTogglePinned}
              disabled={isUpdatingPinned}
              className={`flex h-10 w-10 items-center justify-center rounded-full transition hover:bg-zinc-100 disabled:cursor-wait disabled:opacity-60 dark:hover:bg-zinc-800 ${
                isPinned ? 'text-amber-500' : 'text-zinc-800 dark:text-zinc-200'
              }`}
              aria-label={isPinned ? t.unsaveBundle : t.saveBundle}
              aria-pressed={isPinned}
              title={isPinned ? t.unsaveBundle : t.saveBundle}
            >
              <Star className={`h-5 w-5 ${isPinned ? 'fill-current' : ''}`} />
            </button>
          </div>
        </div>

        <section className="relative z-10 px-7 pb-5 lg:px-9 lg:pb-7">
          <span className="inline-flex rounded-full bg-[#dff1e5] px-3 py-1 text-xs font-bold text-[#2f7d4a] dark:bg-emerald-950/80 dark:text-emerald-300">
            {categoryName}
          </span>
          {access.isPremium && (
            <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-[#FBE9E2] px-3 py-1 text-xs font-bold text-[#C65D47] dark:bg-orange-950/40 dark:text-orange-200">
              <Lock className="h-3 w-3" />
              {t.premium}
            </span>
          )}
          <h1 className="mt-3 text-2xl font-bold leading-tight tracking-normal text-zinc-950 dark:text-zinc-50 lg:max-w-2xl lg:text-5xl">{title}</h1>
          <p className="mt-3 text-sm font-normal leading-6 text-zinc-700 dark:text-zinc-300 lg:max-w-xl lg:text-base lg:leading-7">{description}</p>
        </section>

        <div className="relative z-10 h-44 w-full overflow-hidden lg:h-[360px]">
          <Image
            src={bundle.thumbnail_url || '/images/bundle-fallback.webp'}
            alt={title}
            fill
            priority
            className="object-cover"
            sizes="(max-width: 1024px) 448px, 760px"
          />
          <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-white to-transparent dark:from-zinc-900" />
        </div>

        <div className="relative z-20 mx-5 -mt-4 grid grid-cols-4 rounded-2xl border border-zinc-100 bg-white shadow-md dark:border-zinc-700 dark:bg-zinc-800 dark:shadow-black/30 lg:mx-8 lg:-mt-8">
          <Stat label={t.level} value={level.label} />
          <Stat label={t.itemUnit} value={String(items.length)} />
          <Stat label={t.estimate} value={minuteLabel} />
          <Stat label={t.cefr} value={level.shortLabel} />
        </div>
      </div>

      <main className="space-y-4 px-5 pb-8 pt-4 lg:px-0 lg:pt-0">
        <section className="rounded-2xl border border-zinc-100 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-black/20 lg:p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-bold tracking-tight text-zinc-950 dark:text-zinc-100">{t.progressTitle}</h2>
            <button
              type="button"
              onClick={() => setShowProgressInfo((visible) => !visible)}
              aria-label={t.progressInfoLabel}
              aria-expanded={showProgressInfo}
              className={`flex h-8 w-8 items-center justify-center rounded-full transition ${
                showProgressInfo
                  ? 'bg-[#e3f1e7] text-[#2f7d4a] dark:bg-emerald-950 dark:text-emerald-300'
                  : 'text-zinc-400 hover:bg-zinc-100 hover:text-[#2f7d4a] dark:text-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-emerald-300'
              }`}
            >
              <Info className="h-4 w-4" />
            </button>
          </div>
          {progress.totalItems > 0 && <>
          <div className="mt-3 flex items-end justify-between gap-4">
            <p className="text-lg font-bold tracking-tight text-zinc-950 dark:text-zinc-100">{t.completed(progress.completedItems, progress.totalItems)}</p>
            <p className="text-sm font-semibold tabular-nums text-zinc-700 dark:text-zinc-300">{progress.progressPercent}%</p>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
            <div className="h-full rounded-full bg-[#3f8d54] dark:bg-emerald-500" style={{ width: `${Math.min(100, progress.progressPercent)}%` }} />
          </div>
          </>}
          {practiceStars.max > 0 ? <>
          <div className="mt-3 flex items-center justify-between rounded-xl border border-amber-100 bg-amber-50/70 px-3 py-2.5 text-amber-800 dark:border-amber-900/70 dark:bg-amber-950/30 dark:text-amber-200">
            <span className="inline-flex items-center gap-2 text-sm font-semibold">
              <Star className="h-4 w-4 fill-current" />
              {t.practiceStars}
            </span>
            <span className="text-base font-bold tabular-nums">{practiceStars.earned} / {practiceStars.max}</span>
          </div>
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-zinc-600 dark:text-zinc-400">
            {practiceStars.modes.filter(mode => mode.max > 0).map(mode => (
              <span key={mode.mode}>{PRACTICE_REGISTRY[mode.mode].label} {mode.earned}/{mode.max}</span>
            ))}
          </div>
          </> : <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">{language === 'ko' ? '획득 가능한 문장 별이 없습니다. 단어 연습은 단어 숙련도에 반영됩니다.' : 'No sentence stars are available. Word practice builds word proficiency.'}</p>}
          {showProgressInfo && (
            <div className="mt-3 flex gap-2 rounded-xl border border-emerald-100 bg-emerald-50/60 px-3 py-3 text-sm font-medium leading-6 text-zinc-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-zinc-300">
              <Info className="mt-1 h-4 w-4 shrink-0 text-[#2f7d4a] dark:text-emerald-400" />
              <p>{t.progressInfo}</p>
            </div>
          )}
          <div className="mt-4 grid grid-cols-2 gap-2">
            <ProgressMeta label={t.status} value={statusLabel} />
            <ProgressMeta label={t.remaining} value={t.remainingItems(remainingItems)} />
            <ProgressMeta label={t.estimatedLeft} value={t.minutes(estimatedLeftMinutes)} />
            <ProgressMeta label={t.lastStudied} value={lastStudiedLabel} />
          </div>
          <Link
            href={primaryHref}
            className="mt-5 flex h-12 w-full items-center justify-center rounded-lg bg-[#3f8d54] text-sm font-bold text-white shadow-sm transition hover:bg-[#347946] dark:bg-emerald-600 dark:hover:bg-emerald-500"
          >
            {primaryLabel}
          </Link>
          {!canAccessLearning && (
            <p className="mt-2 rounded-lg bg-[#FBE9E2] px-3 py-2 text-center text-xs font-semibold leading-5 text-[#A94C3A] dark:bg-orange-950/30 dark:text-orange-200">
              {t.premiumNotice}
            </p>
          )}
          <Link
            href={modeHref(`/bundles/${bundle.id}/items`)}
            className="mt-2 flex h-11 w-full items-center justify-center rounded-lg border border-zinc-200 bg-white text-sm font-semibold text-zinc-800 transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
          >
            {t.viewItems}
          </Link>
        </section>

        <section className="rounded-2xl border border-zinc-100 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-black/20 lg:p-6">
          <div className="mb-3">
            <h2 className="text-base font-bold tracking-tight text-zinc-950 dark:text-zinc-100">{t.practiceModes}</h2>
          </div>
          <div className="mb-4 flex gap-2 rounded-xl border border-amber-100 bg-amber-50/70 px-3 py-3 text-sm font-medium leading-6 text-zinc-700 dark:border-amber-900/70 dark:bg-amber-950/30 dark:text-zinc-300">
            <Star className="mt-1 h-4 w-4 shrink-0 fill-current text-amber-500 dark:text-amber-300" />
            <p>{t.practiceModesInfo}</p>
          </div>
          {(['sentence', 'word'] as const).map(target => (
            <div key={target} className="mb-4">
              <h3 className="mb-2 text-sm font-semibold">{target === 'sentence' ? (language === 'ko' ? '문장 연습' : 'Sentence practice') : (language === 'ko' ? '단어 연습' : 'Word practice')}</h3>
              <div className="grid grid-cols-2 gap-2 lg:gap-3">
                {PRACTICE_MODES.filter(mode => isBundlePracticeMode(mode) && PRACTICE_REGISTRY[mode].target === target).map(mode => (
                  <ModeLink key={mode} href={modeHref(`/bundles/${bundle.id}/${PRACTICE_REGISTRY[mode].path}`)} icon={<PracticeModeIcon mode={mode} className="h-5 w-5" />} label={PRACTICE_REGISTRY[mode].label} color={practiceModeColors[mode]} />
                ))}
              </div>
            </div>
          ))}
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
    <div className="border-r border-zinc-100 px-2 py-3 text-center last:border-r-0 dark:border-zinc-700">
      <p className="truncate text-sm font-bold text-[#2f7d4a] dark:text-emerald-400">{value}</p>
      <p className="mt-1 truncate text-[10px] font-semibold text-zinc-500 dark:text-zinc-400">{label}</p>
    </div>
  );
}

function ProgressMeta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-[#f8f6f0] px-3 py-2 dark:bg-zinc-800">
      <p className="text-xs font-medium leading-4 text-zinc-500 dark:text-zinc-400">{label}</p>
      <p className="mt-1 truncate text-sm font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">{value}</p>
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
  color: string;
}) {

  return (
    <Link href={href} className="flex min-h-[88px] flex-col items-center justify-center gap-2 rounded-xl bg-white px-1 text-center shadow-sm ring-1 ring-zinc-100 transition hover:-translate-y-0.5 hover:shadow-md dark:bg-zinc-800 dark:shadow-black/20 dark:ring-zinc-700 dark:hover:bg-zinc-700">
      <span className={`flex h-10 w-10 items-center justify-center rounded-full ${color}`}>{icon}</span>
      <span className="text-xs font-bold leading-tight text-zinc-700 dark:text-zinc-200">{label}</span>
    </Link>
  );
}
