'use client';

import { practiceModeColors } from '@/components/practice/practice-mode-colors';
import { PracticeModeIcon } from '@/components/practice/PracticeModeIcon';

import { getBundleStarProgress, type BundleWordProgress } from '@/lib/practice/progress';
import { PRACTICE_REGISTRY, PRACTICE_MODES, isBundlePracticeMode } from '@/lib/practice/registry';
import { getNextIncompletePracticeMode } from './practice-session';

import { useState, type ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowLeft,
  CheckCircle2,
  Headphones,
  Info,
  Layers,
  Lock,
  RotateCcw,
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
  wordProgress?: BundleWordProgress;
}

const copy = {
  ko: {
    itemUnit: '표현 수',
    estimate: '예상 시간',
    level: 'Level',
    cefr: 'CEFR',
    progressTitle: '실전 마스터 달성률',
    progressSubtitle: '퀴즈를 풀고 마스터리 스타를 모아 마스터 게이지를 완성해보세요',
    progressInfoLabel: '진행률 반영 기준 보기',
    progressInfo: '듣기로 문장을 귀에 익힌 뒤, 실전 퀴즈를 풀고 정답을 맞히면 마스터리 스타가 채워져요. 모든 스타를 모아 100% 마스터를 완성해보세요!',
    starProgress: (earned: number, max: number) => `마스터리 스타 ${earned} / ${max}`,
    practiceStars: '문장 마스터리 스타',
    saveBundle: '번들 저장',
    unsaveBundle: '번들 저장 해제',
    loginRequired: '번들을 저장하려면 로그인이 필요합니다.',
    saveFailed: '번들 저장 상태를 변경하지 못했습니다.',
    completed: (done: number, total: number) => `학습 완료 ${done} / ${total} 문장`,
    listeningStream: '청취 진도',
    listeningStep: (current: number, total: number, plays?: number) =>
      plays && plays > 0
        ? `${total}개 중 ${current}번째 문장 학습 중 (누적 ${plays}회 청취)`
        : `${total}개 중 ${current}번째 문장 학습 중`,
    listeningNotStarted: '아직 청취 기록이 없습니다',
    listenStart: '듣기 시작',
    listenContinue: '이어서 듣기',
    listenAgain: '다시 듣기',
    primaryStartListening: '🎧 듣기로 시작하기',
    primaryContinueQuiz: '✍️ 퀴즈 풀기',
    primaryContinueModes: {
      quiz: '✍️ 퀴즈 풀기',
      scramble: '✍️ 단어 배열',
      wordfill: '✍️ 빈칸 채우기',
    } as Record<string, string>,
    primaryReviewQuiz: '🔄 복습 퀴즈 풀기',
    secondaryQuiz: '✍️ 바로 퀴즈 풀기',
    secondaryModes: {
      quiz: '✍️ 바로 퀴즈 풀기',
      scramble: '✍️ 단어 배열 바로 풀기',
      wordfill: '✍️ 빈칸 채우기 바로 풀기',
    } as Record<string, string>,
    secondaryListen: (step: number) => `🎧 이어서 듣기 (${step}번 문장)`,
    bundleCompletedBadge: '번들 마스터 완료!',
    guestNotice: '로그인하면 나의 학습 진도와 마스터리 스타가 안전하게 저장됩니다.',
    loginAction: '로그인하기',
    status: '상태',
    notStarted: '시작 전',
    inProgress: '진행 중',
    completedStatus: '완료',
    currentLocation: '학습 위치',
    currentStepLabel: (step: number) => `${step}번째 문장`,
    lastStudied: '최근 학습',
    noRecord: '-',
    premium: 'Premium',
    subscribe: '구독하고 학습하기',
    loginToAccess: '로그인하고 학습하기',
    premiumNotice: '구독 회원 전용 번들입니다.',
    viewItems: '전체 문장 목록 보기',
    practiceModes: '실전 연습 모드',
    practiceModesInfoLabel: '연습 모드 설명 보기',
    practiceModesInfo: '문장 퀴즈를 맞히면 마스터리 스타가 채워져요. 스타를 모두 모아 100% 마스터에 도전해보세요!',
    sentencePractice: '문장 연습',
    wordPractice: '단어 연습',
  },
  en: {
    itemUnit: 'Items',
    estimate: 'Estimated',
    level: 'Level',
    cefr: 'CEFR',
    progressTitle: 'Sentence Mastery',
    progressSubtitle: 'Pass quizzes and collect stars to reach 100%',
    progressInfoLabel: 'View how mastery is measured',
    progressInfo: 'Listen to the sentences, then pass practice quizzes to earn Mastery Stars. Collect all stars to complete 100% bundle mastery!',
    starProgress: (earned: number, max: number) => `Stars ${earned} / ${max}`,
    practiceStars: 'Sentence Stars',
    saveBundle: 'Save bundle',
    unsaveBundle: 'Remove saved bundle',
    loginRequired: 'Log in to save this bundle.',
    saveFailed: 'Failed to update the saved bundle.',
    completed: (done: number, total: number) => `${done} / ${total} sentences mastered`,
    listeningStream: 'Listening Stream',
    listeningStep: (current: number, total: number, plays?: number) =>
      plays && plays > 0
        ? `Listening to #${current} of ${total} (${plays} total plays)`
        : `Listening to #${current} of ${total}`,
    listeningNotStarted: 'No listening record yet',
    listenStart: 'Start listening',
    listenContinue: 'Continue listening',
    listenAgain: 'Listen again',
    primaryStartListening: '🎧 Start with Listening',
    primaryContinueQuiz: '✍️ Practice Quiz',
    primaryContinueModes: {
      quiz: '✍️ Practice Quiz',
      scramble: '✍️ Word Scramble',
      wordfill: '✍️ Word Fill',
    } as Record<string, string>,
    primaryReviewQuiz: '🔄 Review Practice',
    secondaryQuiz: '✍️ Practice Quiz Directly',
    secondaryModes: {
      quiz: '✍️ Practice Quiz Directly',
      scramble: '✍️ Practice Scramble Directly',
      wordfill: '✍️ Practice Word Fill Directly',
    } as Record<string, string>,
    secondaryListen: (step: number) => `🎧 Continue Listening (#${step})`,
    bundleCompletedBadge: 'Bundle Mastered!',
    guestNotice: 'Log in to track your learning progress and mastery stars.',
    loginAction: 'Log in',
    status: 'Status',
    notStarted: 'Not started',
    inProgress: 'In progress',
    completedStatus: 'Completed',
    currentLocation: 'Current Step',
    currentStepLabel: (step: number) => `Sentence #${step}`,
    lastStudied: 'Last studied',
    noRecord: '-',
    premium: 'Premium',
    subscribe: 'Subscribe to learn',
    loginToAccess: 'Log in to learn',
    premiumNotice: 'Subscribers only.',
    viewItems: 'View All Items',
    practiceModes: 'Practice Modes',
    practiceModesInfoLabel: 'View practice mode details',
    practiceModesInfo: 'Pass sentence quizzes to earn Mastery Stars. Collect all stars to complete 100% bundle mastery!',
    sentencePractice: 'Sentence Practice',
    wordPractice: 'Word Practice',
  },
};

const modeLabels: Record<'ko' | 'en', Record<string, string>> = {
  ko: {
    quiz: '문장 퀴즈',
    scramble: '단어 배열',
    wordfill: '빈칸 채우기',
    flashcards: '문장 플래시카드',
    spelling: '스펠링 연습',
    word_quiz: '단어 퀴즈',
    word_flashcards: '단어 플래시카드',
  },
  en: {
    quiz: 'Sentence Quiz',
    scramble: 'Sentence Scramble',
    wordfill: 'Word Fill',
    flashcards: 'Sentence Flashcards',
    spelling: 'Spelling',
    word_quiz: 'Word Quiz',
    word_flashcards: 'Word Flashcards',
  },
};

function getModeLabel(mode: string, language: 'ko' | 'en') {
  return modeLabels[language]?.[mode] || PRACTICE_REGISTRY[mode as keyof typeof PRACTICE_REGISTRY]?.label || mode;
}

export default function BundleDetailHubClient({
  bundle,
  items,
  language,
  progress,
  isLoggedIn,
  access,
  wordProgress,
}: BundleDetailHubClientProps) {
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
  const currentItemIndex = items.findIndex((item) => item.id === progress.currentBundleItemId);
  const currentItemStep = currentItemIndex >= 0 ? currentItemIndex + 1 : 1;
  const totalPlayCount = progress.itemInteractions.reduce(
    (sum, item) => sum + (Number(item.play_count) || 0),
    0
  );
  const practiceStars = getBundleStarProgress(items, progress.itemInteractions, language);
  const starProgressPercent = practiceStars.max > 0
    ? Math.min(100, Math.round((practiceStars.earned / practiceStars.max) * 100))
    : (progress.totalItems > 0 ? progress.progressPercent : 0);
  const isCompleted = practiceStars.max > 0
    ? practiceStars.earned >= practiceStars.max
    : (progress.totalItems > 0 && progress.progressPercent >= 100);
  const hasStarted = practiceStars.earned > 0 || progress.completedItems > 0 || Boolean(progress.bundleInteraction?.is_started);
  const hasStudied = hasStarted || Boolean(progress.bundleInteraction?.last_studied_at);
  const remainingItems = Math.max(0, progress.totalItems - progress.completedItems);
  const estimatedLeftMinutes = estimateBundleMinutes(remainingItems);
  const lastStudiedLabel = formatProgressDate(progress.bundleInteraction?.last_studied_at, language) || t.noRecord;
  const currentLocationLabel = hasStudied ? t.currentStepLabel(currentItemStep) : t.notStarted;
  const backHref = bundle.bundle_category ? getCategoryHref(bundle.bundle_category, language) : '/bundles';

  const learnHref = progress.currentBundleItemId
    ? `/bundles/${bundle.id}/learn?item=${progress.currentBundleItemId}`
    : `/bundles/${bundle.id}/learn`;
  const quizHref = `/bundles/${bundle.id}/quiz`;
  const nextPracticeMode = getNextIncompletePracticeMode(practiceStars.modes);
  const nextPracticePath = PRACTICE_REGISTRY[nextPracticeMode]?.path || 'quiz';
  const practiceHref = `/bundles/${bundle.id}/${nextPracticePath}`;
  const canAccessLearning = access.canView;
  const gatedHref = access.reason === 'login_required'
    ? `/auth/login?redirectTo=${encodeURIComponent(learnHref)}`
    : `/pricing?redirectTo=${encodeURIComponent(learnHref)}`;
  const modeHref = (path: string) => canAccessLearning ? path : gatedHref;

  let primaryActionHref = canAccessLearning ? learnHref : gatedHref;
  let primaryActionLabel = canAccessLearning
    ? t.primaryStartListening
    : access.reason === 'login_required'
    ? t.loginToAccess
    : t.subscribe;

  let secondaryActionHref: string | null = null;
  let secondaryActionLabel: string | null = null;

  if (canAccessLearning) {
    if (isCompleted) {
      primaryActionHref = quizHref;
      primaryActionLabel = t.primaryReviewQuiz;
      secondaryActionHref = learnHref;
      secondaryActionLabel = t.listenAgain;
    } else if (hasStudied) {
      primaryActionHref = practiceHref;
      primaryActionLabel = t.primaryContinueModes[nextPracticeMode] || t.primaryContinueQuiz;
      secondaryActionHref = learnHref;
      secondaryActionLabel = t.secondaryListen(currentItemStep);
    } else {
      primaryActionHref = learnHref;
      primaryActionLabel = t.primaryStartListening;
      secondaryActionHref = practiceHref;
      secondaryActionLabel = t.secondaryModes[nextPracticeMode] || t.secondaryQuiz;
    }
  }

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
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold tracking-tight text-zinc-950 dark:text-zinc-100">{t.progressTitle}</h2>
                {isCompleted && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300">
                    <CheckCircle2 className="h-3 w-3" />
                    {t.bundleCompletedBadge}
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">{t.progressSubtitle}</p>
            </div>
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

          {practiceStars.max > 0 ? (
            <div className="mt-4">
              <div className="flex items-end justify-between gap-4 mb-2">
                <span className="inline-flex items-center gap-1.5 text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  <Star className="h-4 w-4 fill-amber-500 text-amber-500" />
                  {t.starProgress(practiceStars.earned, practiceStars.max)}
                </span>
                <span className="text-sm font-extrabold tabular-nums text-amber-600 dark:text-amber-400">
                  {starProgressPercent}%
                </span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-400 via-amber-500 to-emerald-500 transition-all duration-500"
                  style={{ width: `${starProgressPercent}%` }}
                />
              </div>
              <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500 dark:text-zinc-400">
                {practiceStars.modes.filter((mode) => mode.max > 0).map((mode) => (
                  <span key={mode.mode} className="inline-flex items-center gap-1">
                    <span className="text-zinc-300 dark:text-zinc-600">•</span>
                    <span>{getModeLabel(mode.mode, language)}</span>
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                      {mode.earned}/{mode.max}
                    </span>
                  </span>
                ))}
              </div>
            </div>
          ) : progress.totalItems > 0 ? (
            <div className="mt-4">
              <div className="flex items-end justify-between gap-4 mb-2">
                <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  {t.completed(progress.completedItems, progress.totalItems)}
                </span>
                <span className="text-sm font-extrabold tabular-nums text-[#2f7d4a] dark:text-emerald-400">
                  {progress.progressPercent}%
                </span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#4ca562] to-[#2f7d4a] dark:from-emerald-500 dark:to-emerald-400 transition-all duration-500"
                  style={{ width: `${Math.min(100, progress.progressPercent)}%` }}
                />
              </div>
            </div>
          ) : (
            <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
              {language === 'ko'
                ? '획득 가능한 문장 별이 없습니다. 단어 연습은 단어 숙련도에 반영됩니다.'
                : 'No sentence stars are available. Word practice builds word proficiency.'}
            </p>
          )}

          {/* 청취 스트림 진도 카드 */}
          <div className="mt-3.5 flex items-center gap-3 rounded-xl border border-emerald-100 bg-[#f4faf5] p-3.5 dark:border-emerald-900/50 dark:bg-emerald-950/30">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#dff1e5] text-[#2f7d4a] dark:bg-emerald-900/60 dark:text-emerald-300">
              <Headphones className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                  {t.listeningStream}
                </span>
                {hasStudied && totalPlayCount > 0 && (
                  <span className="shrink-0 text-xs font-medium text-zinc-500 dark:text-zinc-400 tabular-nums">
                    {language === 'ko' ? `누적 ${totalPlayCount}회 청취` : `${totalPlayCount} plays`}
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-sm font-bold text-zinc-900 dark:text-zinc-100">
                {hasStudied
                  ? (language === 'ko'
                      ? `${items.length}개 중 ${currentItemStep}번째 문장 학습 중`
                      : `Sentence ${currentItemStep} of ${items.length}`)
                  : t.listeningNotStarted}
              </p>
            </div>
          </div>

          {showProgressInfo && (
            <div className="mt-3.5 flex gap-2 rounded-xl border border-emerald-100 bg-emerald-50/60 px-3.5 py-3 text-sm font-medium leading-6 text-zinc-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-zinc-300">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#2f7d4a] dark:text-emerald-400" />
              <p>{t.progressInfo}</p>
            </div>
          )}

          <div className="mt-4 grid grid-cols-2 gap-2">
            <ProgressMeta label={t.currentLocation} value={currentLocationLabel} />
            <ProgressMeta label={t.lastStudied} value={lastStudiedLabel} />
            <ProgressMeta label={t.estimate} value={minuteLabel} />
            <ProgressMeta label={t.cefr} value={level.shortLabel} />
          </div>

          {!isLoggedIn && (
            <div className="mt-3.5 flex items-center justify-between rounded-xl border border-zinc-200/80 bg-zinc-50 px-3.5 py-2.5 dark:border-zinc-800 dark:bg-zinc-800/50">
              <p className="text-xs text-zinc-600 dark:text-zinc-400">{t.guestNotice}</p>
              <Link
                href={`/auth/login?redirectTo=${encodeURIComponent(learnHref)}`}
                className="shrink-0 text-xs font-bold text-[#E27D60] hover:underline ml-2"
              >
                {t.loginAction}
              </Link>
            </div>
          )}

          {/* Primary Action Button */}
          <Link
            href={primaryActionHref}
            className="mt-5 flex h-12 w-full items-center justify-center rounded-lg bg-[#3f8d54] text-sm font-bold text-white shadow-sm transition hover:bg-[#347946] dark:bg-emerald-600 dark:hover:bg-emerald-500"
          >
            {primaryActionLabel}
          </Link>

          {/* Secondary Action Button (Smart Recommendation) */}
          {secondaryActionHref && (
            <Link
              href={secondaryActionHref}
              className="mt-2 flex h-11 w-full items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50/60 text-sm font-semibold text-[#2f7d4a] transition hover:bg-emerald-100/70 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-900/50"
            >
              {secondaryActionLabel}
            </Link>
          )}

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
          {(['sentence', 'word'] as const).map((target) => (
            <div key={target} className="mb-4">
              <div className="mb-2.5 flex items-center justify-between gap-2">
                <h3 className="min-w-0 truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  {target === 'sentence' ? t.sentencePractice : t.wordPractice}
                </h3>
                {target === 'word' && wordProgress && wordProgress.total > 0 && (
                  isLoggedIn ? (
                    <div
                      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold transition-colors ${
                        wordProgress.completed >= wordProgress.total
                          ? 'bg-emerald-100/90 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300'
                          : wordProgress.completed > 0
                          ? 'bg-emerald-50 text-[#2f7d4a] ring-1 ring-emerald-200/70 dark:bg-emerald-950/60 dark:text-emerald-300 dark:ring-emerald-800/60'
                          : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
                      }`}
                    >
                      {wordProgress.completed >= wordProgress.total && (
                        <CheckCircle2 className="h-3 w-3 shrink-0 text-emerald-600 dark:text-emerald-400" />
                      )}
                      <span className="tabular-nums font-extrabold">
                        {wordProgress.completed} / {wordProgress.total}
                      </span>
                      <span>{language === 'ko' ? '단어 완료' : 'words'}</span>
                      <span className="text-[11px] font-medium opacity-85">
                        ({wordProgress.percent}%)
                      </span>
                    </div>
                  ) : (
                    <div className="inline-flex shrink-0 items-center rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                      <span>
                        {language === 'ko' ? `총 ${wordProgress.total}단어` : `${wordProgress.total} words`}
                      </span>
                    </div>
                  )
                )}
              </div>
              <div className="grid grid-cols-2 gap-2 lg:gap-3">
                {PRACTICE_MODES.filter(
                  (mode) => isBundlePracticeMode(mode) && PRACTICE_REGISTRY[mode].target === target
                ).map((mode) => (
                  <ModeLink
                    key={mode}
                    href={modeHref(`/bundles/${bundle.id}/${PRACTICE_REGISTRY[mode].path}`)}
                    icon={<PracticeModeIcon mode={mode} className="h-5 w-5" />}
                    label={getModeLabel(mode, language)}
                    color={practiceModeColors[mode]}
                  />
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
