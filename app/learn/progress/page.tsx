import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  CircleCheckBig,
  Home,
  Layers3,
  MessagesSquare,
  RotateCcw,
  Send,
  Share2,
  Star,
  XCircle,
} from 'lucide-react';
import { getAppUserFromServer, getDisplayLanguage } from '@/lib/auth/app-user';
import { getReviewHref, getReviewRecommendation } from '@/lib/learning/review-recommendation';
import {
  getActiveLearningBundles,
  getLearningProficiencySummary,
  getLearningProgressSummary,
  getRecentLearningActivities,
  type ActiveLearningBundle,
  type RecentLearningActivity,
} from '@/lib/supabase/services/bundle-progress';
import { getReviewNeededSummary, type ReviewNeededSummary } from '@/lib/supabase/services/learning-review';
import { getBundleTitle, getCategoryName } from '../../bundles/bundle-utils';
import ProgressMobileMenu from './ProgressMobileMenu';
import ProgressSidebar from './ProgressSidebar';

type DisplayLanguage = 'ko' | 'en';

const copy = {
  ko: {
    loginRequired: '로그인이 필요합니다.',
    goToLogin: '로그인 페이지로 이동',
    learnHome: 'Learn 홈',
    title: 'Overview',
    description: '현재 학습 현황을 확인하고 오늘의 학습을 계획해보세요.',
    share: '공유',
    completedBundles: '완료한 번들',
    completedBundleBasis: '모든 항목을 완료한 번들',
    learnedSentences: '학습한 문장',
    learnedWords: '학습한 단어',
    reviewNeeded: '복습 필요',
    sentenceWordCount: (sentences: number, words: number) => `문장 ${sentences} · 단어 ${words}`,
    proficiencyLearning: '학습중',
    proficiencyFamiliar: '익숙함',
    proficiencyAlmostMastered: '숙련',
    proficiencyMastered: '숙달',
    todayTitle: '오늘의 학습',
    todaySubtitle: '지금 가장 필요한 학습을 추천해드려요.',
    reviewRecommendation: (type: string, count: number) => `${type} ${count}개를 먼저 복습해보세요.`,
    reviewBreakdown: (sentences: number, words: number) => `문장 ${sentences}개 · 단어 ${words}개 복습 필요`,
    sentenceType: '문장',
    wordType: '단어',
    continueRecommendation: '최근 학습을 이어가세요.',
    bundleProgress: (completed: number, total: number, percent: number) => `${completed} / ${total} 완료 · ${percent}%`,
    newRecommendation: '새로운 학습을 시작해보세요.',
    newRecommendationBody: '관심 있는 번들을 골라 첫 학습을 시작할 수 있어요.',
    startReview: '복습 시작',
    continueLearning: '계속 학습',
    browseBundles: '번들 둘러보기',
    learningRecord: '학습 기록',
    learningRecordHint: '지금까지의 연습 결과와 학습 활동을 확인해보세요.',
    practiceAccuracy: '연습 정답률',
    correctAnswers: '총 정답',
    incorrectAnswers: '총 오답',
    earnedStars: '획득한 별',
    activeBundles: '진행 중인 번들',
    recentTitle: '최근 학습한 번들',
    viewAllBundles: '전체 보기',
    continue: '계속하기',
    tip: 'TIP',
    tipText: '매일 꾸준히 학습하면 실력이 더 빠르게 성장해요! 오늘도 화이팅!',
    emptyRecent: '아직 학습한 번들이 없습니다.',
    itemProgress: (completed: number, total: number) => `${completed} / ${total}`,
  },
  en: {
    loginRequired: 'Login is required.',
    goToLogin: 'Go to Login Page',
    learnHome: 'Learn Home',
    title: 'Overview',
    description: "Check your progress and plan today's study.",
    share: 'Share',
    completedBundles: 'Completed bundles',
    completedBundleBasis: 'Bundles with every item completed',
    learnedSentences: 'Learned sentences',
    learnedWords: 'Learned words',
    reviewNeeded: 'Review needed',
    sentenceWordCount: (sentences: number, words: number) => `Sentences ${sentences} · Words ${words}`,
    proficiencyLearning: 'Learning',
    proficiencyFamiliar: 'Familiar',
    proficiencyAlmostMastered: 'Advanced',
    proficiencyMastered: 'Mastered',
    todayTitle: "Today's Study",
    todaySubtitle: 'Here is the most useful thing to study next.',
    reviewRecommendation: (type: string, count: number) => `Review ${count} ${type.toLowerCase()} first.`,
    reviewBreakdown: (sentences: number, words: number) => `${sentences} sentences · ${words} words due`,
    sentenceType: 'Sentences',
    wordType: 'Words',
    continueRecommendation: 'Continue your latest lesson.',
    bundleProgress: (completed: number, total: number, percent: number) => `${completed} / ${total} complete · ${percent}%`,
    newRecommendation: 'Start something new.',
    newRecommendationBody: 'Choose a bundle that interests you and begin your first lesson.',
    startReview: 'Start review',
    continueLearning: 'Continue learning',
    browseBundles: 'Explore bundles',
    learningRecord: 'Learning record',
    learningRecordHint: 'See your practice results and learning activity so far.',
    practiceAccuracy: 'Practice accuracy',
    correctAnswers: 'Correct answers',
    incorrectAnswers: 'Incorrect answers',
    earnedStars: 'Earned stars',
    activeBundles: 'Active bundles',
    recentTitle: 'Recently studied bundles',
    viewAllBundles: 'View all',
    continue: 'Continue',
    tip: 'TIP',
    tipText: 'Small daily practice helps your skill grow faster. Keep going today!',
    emptyRecent: 'No recently studied bundles yet.',
    itemProgress: (completed: number, total: number) => `${completed} / ${total}`,
  },
};

export const dynamic = 'force-dynamic';

export default async function LearnProgressPage() {
  const [user, language] = await Promise.all([
    getAppUserFromServer(),
    getDisplayLanguage(),
  ]);
  const t = copy[language];

  if (!user) {
    return (
      <main className="mx-auto max-w-xl px-4 py-12">
        <h1 className="text-3xl font-bold">{t.loginRequired}</h1>
        <Link href="/auth/login" className="mt-5 inline-flex rounded-lg bg-[#3f9657] px-5 py-3 text-sm font-bold text-white">
          {t.goToLogin}
        </Link>
      </main>
    );
  }

  const [progressSummary, proficiencySummary, activeBundles, recentActivities, reviewSummary] = await Promise.all([
    getLearningProgressSummary(user.id),
    getLearningProficiencySummary(user.id),
    getActiveLearningBundles(user.id, 6),
    getRecentLearningActivities(user.id, { limit: 6 }),
    getReviewNeededSummary(user.id),
  ]);

  const recentBundles = mergeRecentBundles(activeBundles, recentActivities).slice(0, 3);
  const featuredBundle = activeBundles[0] || null;

  return (
    <main className="mx-auto max-w-7xl px-0 pb-10 text-[#171717] dark:text-zinc-100 lg:px-2">
      <div className="grid min-h-[calc(100vh-140px)] gap-0 overflow-hidden rounded-none border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 lg:grid-cols-[238px_1fr] lg:rounded-xl lg:border">
        <ProgressSidebar language={language} activeIndex={0} />
        <ProgressMobileMenu language={language} />

        <section className="min-w-0 px-4 py-7 pb-24 sm:px-8 lg:px-10 lg:pb-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <Link
                href="/learn"
                className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold text-zinc-500 transition hover:text-[#2f7f45] dark:text-zinc-400 dark:hover:text-emerald-300"
              >
                <Home className="h-4 w-4" />
                {t.learnHome}
              </Link>
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{t.title}</h1>
              <p className={`mt-3 text-sm leading-6 text-zinc-600 dark:text-zinc-300 ${getBodyClass(language)}`}>
                {t.description}
              </p>
            </div>
            <button
              type="button"
              className="inline-flex w-fit items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 shadow-sm transition hover:border-[#8bbf87] hover:bg-[#f5fbf4] hover:text-[#2f7f45] dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
            >
              <Share2 className="h-4 w-4" />
              {t.share}
            </button>
          </div>

          <section className="mt-6 grid grid-cols-2 gap-3 lg:mt-9 lg:gap-5 xl:grid-cols-4">
            <OverviewCard
              icon={CircleCheckBig}
              iconClassName="text-[#3f9657]"
              title={t.completedBundles}
              value={formatCount(progressSummary.completedBundles)}
              suffix={language === 'ko' ? '개' : ''}
              footer={t.completedBundleBasis}
            />
            <OverviewCard
              icon={MessagesSquare}
              iconClassName="text-[#3f9657]"
              title={t.learnedSentences}
              value={formatCount(proficiencySummary.sentences.total)}
              suffix={language === 'ko' ? '개' : ''}
              details={getProficiencyDetails(proficiencySummary.sentences, t)}
            />
            <OverviewCard
              icon={BookOpen}
              iconClassName="text-[#4f83e6]"
              title={t.learnedWords}
              value={formatCount(proficiencySummary.words.total)}
              suffix={language === 'ko' ? '개' : ''}
              details={getProficiencyDetails(proficiencySummary.words, t)}
            />
            <OverviewCard
              icon={RotateCcw}
              iconClassName="text-[#ff6848]"
              title={t.reviewNeeded}
              value={formatCount(reviewSummary.availableTotal)}
              suffix={language === 'ko' ? '개' : ''}
              footer={t.sentenceWordCount(reviewSummary.availableSentences, reviewSummary.availableWords)}
              href="/learn/review"
            />
          </section>

          <TodayRecommendation
            language={language}
            reviewSummary={reviewSummary}
            featuredBundle={featuredBundle}
          />

          <section className="mt-7">
            <LearningRecordCard
              language={language}
              summary={progressSummary}
            />
          </section>

          <section className="mt-9">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-xl font-bold tracking-tight">{t.recentTitle}</h2>
              <Link href="/bundles" className="inline-flex items-center gap-2 text-sm font-semibold text-[#2f7f45] hover:underline dark:text-emerald-300">
                {t.viewAllBundles}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            {recentBundles.length === 0 ? (
              <div className="mt-5 rounded-lg border border-dashed border-zinc-300 p-7 text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
                {t.emptyRecent}
              </div>
            ) : (
              <div className="mt-5 grid gap-5 lg:grid-cols-3">
                {recentBundles.map((item) => (
                  <RecentBundleCard key={item.bundle.id} item={item} language={language} />
                ))}
              </div>
            )}
          </section>

          <div className="mt-8 rounded-lg border border-[#f0dfbf] bg-[#fff7e7] px-5 py-4 text-sm text-[#6d5a2f] dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
            <p className="flex gap-3">
              <span className="font-black text-amber-600">{t.tip}</span>
              <span>{t.tipText}</span>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}

function OverviewCard({
  icon: Icon,
  iconClassName,
  title,
  value,
  suffix,
  footer,
  details,
  href,
}: {
  icon: React.ElementType;
  iconClassName: string;
  title: string;
  value: string;
  suffix?: string;
  footer?: string;
  details?: Array<{ label: string; value: number }>;
  href?: string;
}) {
  const card = (
    <article className="h-full rounded-lg border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-5 lg:p-6">
      <div className="flex items-start gap-3 lg:block">
        <Icon className={`h-7 w-7 shrink-0 sm:h-8 sm:w-8 lg:h-10 lg:w-10 ${iconClassName}`} strokeWidth={2.4} />
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold sm:text-base lg:mt-6 lg:text-lg">{title}</h2>
          <div className="mt-2 flex flex-wrap items-center gap-2 lg:mt-6 lg:gap-3">
            <p className="text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl">
              {value}
              {suffix && <span className="ml-1 text-sm font-bold lg:text-base">{suffix}</span>}
            </p>
          </div>
        </div>
      </div>
      {details ? (
        <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 border-t border-zinc-100 pt-3 text-[11px] dark:border-zinc-800 sm:text-xs lg:mt-4 lg:pt-4">
          {details.map(detail => (
            <div key={detail.label} className="flex min-w-0 items-center justify-between gap-1.5">
              <dt className="truncate text-zinc-500 dark:text-zinc-400">{detail.label}</dt>
              <dd className="shrink-0 font-bold tabular-nums">{formatCount(detail.value)}</dd>
            </div>
          ))}
        </dl>
      ) : footer ? (
        <p className="mt-3 hidden text-xs leading-5 text-zinc-600 dark:text-zinc-400 sm:block sm:text-sm lg:mt-4 lg:leading-6">{footer}</p>
      ) : null}
    </article>
  );

  return href ? <Link href={href} className="block h-full">{card}</Link> : card;
}

function TodayRecommendation({
  language,
  reviewSummary,
  featuredBundle,
}: {
  language: DisplayLanguage;
  reviewSummary: ReviewNeededSummary;
  featuredBundle: ActiveLearningBundle | null;
}) {
  const t = copy[language];
  const recommendation = getReviewRecommendation(reviewSummary);
  const hasReview = recommendation !== null;
  const recommendedCount = recommendation === 'words' ? reviewSummary.availableWords : reviewSummary.availableSentences;
  const otherCount = recommendation === 'words' ? reviewSummary.availableSentences : reviewSummary.availableWords;
  const reviewType = recommendation === 'words' ? t.wordType : t.sentenceType;
  const bundleTitle = featuredBundle ? getBundleTitle(featuredBundle.bundle, language) : '';
  const category = featuredBundle ? getCategoryName(featuredBundle.bundle, language) : '';
  const bundleHref = featuredBundle
    ? featuredBundle.currentBundleItemId
      ? `/bundles/${featuredBundle.bundle.id}/learn?item=${featuredBundle.currentBundleItemId}`
      : `/bundles/${featuredBundle.bundle.id}/learn`
    : '/bundles';
  const href = recommendation ? getReviewHref(recommendation, otherCount) : bundleHref;
  const headline = hasReview
    ? t.reviewRecommendation(reviewType, recommendedCount)
    : featuredBundle
      ? t.continueRecommendation
      : t.newRecommendation;
  const description = hasReview
    ? t.reviewBreakdown(reviewSummary.availableSentences, reviewSummary.availableWords)
    : featuredBundle
      ? `${category ? `${category} · ` : ''}${bundleTitle} · ${t.bundleProgress(featuredBundle.completedItems, featuredBundle.totalItems, featuredBundle.progressPercent)}`
      : t.newRecommendationBody;
  const action = hasReview ? t.startReview : featuredBundle ? t.continueLearning : t.browseBundles;
  const ActionIcon = hasReview ? RotateCcw : Send;

  return (
    <section className="mt-6 rounded-lg border border-[#dcebdd] bg-[#fbfffb] p-4 shadow-sm dark:border-emerald-900/60 dark:bg-emerald-950/10 sm:p-5 lg:mt-8 lg:p-6">
      <div className="flex items-start gap-3 sm:gap-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#e6f5e8] text-[#3f9657] dark:bg-emerald-950 dark:text-emerald-200 sm:h-11 sm:w-11">
          <CalendarDays className="h-5 w-5 sm:h-6 sm:w-6" />
        </div>
        <div className="min-w-0">
          <h2 className="text-lg font-bold sm:text-xl">{t.todayTitle}</h2>
          <p className="mt-1 text-sm leading-5 text-zinc-600 dark:text-zinc-400 sm:mt-2">{t.todaySubtitle}</p>
        </div>
      </div>

      <div className="mt-5 grid gap-5 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center sm:p-5">
        <span className={`flex h-11 w-11 items-center justify-center rounded-full ${hasReview ? 'bg-[#fff0ec] text-[#e95c3e]' : 'bg-violet-100 text-violet-600 dark:bg-violet-950 dark:text-violet-200'}`}>
          <ActionIcon className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <h3 className="text-base font-bold sm:text-lg">{headline}</h3>
          <p className="mt-1 text-sm leading-6 text-zinc-500 dark:text-zinc-400">{description}</p>
        </div>
        <Link href={href} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-[#3f9657] px-5 text-sm font-bold text-white shadow-sm transition hover:bg-[#2f7f45] sm:justify-self-end">
          {action}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}

function LearningRecordCard({ language, summary }: { language: DisplayLanguage; summary: Awaited<ReturnType<typeof getLearningProgressSummary>> }) {
  const t = copy[language];
  const rows = [
    { label: t.practiceAccuracy, value: `${summary.practiceAccuracyPercent}%`, icon: BarChart3, tone: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-300' },
    { label: t.correctAnswers, value: formatCount(summary.totalCorrectCount), icon: CheckCircle2, tone: 'bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-300' },
    { label: t.incorrectAnswers, value: formatCount(summary.totalIncorrectCount), icon: XCircle, tone: 'bg-rose-50 text-rose-500 dark:bg-rose-950/60 dark:text-rose-300' },
    { label: t.earnedStars, value: formatCount(summary.earnedStars), icon: Star, tone: 'bg-amber-50 text-amber-500 dark:bg-amber-950/60 dark:text-amber-300' },
    { label: t.activeBundles, value: formatCount(summary.activeBundles), icon: Layers3, tone: 'bg-violet-50 text-violet-600 dark:bg-violet-950/60 dark:text-violet-300' },
  ];

  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="text-xl font-bold">{t.learningRecord}</h2>
      <p className="mt-2 text-sm leading-6 text-zinc-500 dark:text-zinc-400">{t.learningRecordHint}</p>
      <dl className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-5">
        {rows.map((row, index) => (
          <div key={row.label} className={`rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950/50 ${index === rows.length - 1 ? 'col-span-2 lg:col-span-1' : ''}`}>
            <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${row.tone}`}>
              <row.icon className="h-5 w-5" />
            </div>
            <dt className="mt-4 text-xs font-semibold leading-5 text-zinc-500 dark:text-zinc-400">{row.label}</dt>
            <dd className="mt-1 text-2xl font-bold tabular-nums tracking-tight">{row.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function RecentBundleCard({ item, language }: { item: ActiveLearningBundle | RecentLearningActivity; language: DisplayLanguage }) {
  const t = copy[language];
  const title = getBundleTitle(item.bundle, language);
  const category = getCategoryName(item.bundle, language);
  const href = 'currentBundleItemId' in item && item.currentBundleItemId
    ? `/bundles/${item.bundle.id}/learn?item=${item.currentBundleItemId}`
    : `/bundles/${item.bundle.id}/learn`;

  return (
    <article className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="grid grid-cols-[84px_1fr] gap-4">
        <div className="relative aspect-square overflow-hidden rounded-md bg-[#f3ede3] dark:bg-zinc-800">
          <Image
            src={item.bundle.thumbnail_url || '/images/bundle-fallback.webp'}
            alt={title}
            fill
            className="object-cover"
            sizes="84px"
          />
        </div>
        <div className="min-w-0">
          <h3 className="line-clamp-2 text-base font-bold leading-6">{title}</h3>
          <p className="mt-1 truncate text-sm text-zinc-500 dark:text-zinc-400">{category}</p>
        </div>
      </div>
      <div className="mt-5 flex items-center gap-3">
        <span className="text-sm font-bold tabular-nums text-zinc-600 dark:text-zinc-400">{t.itemProgress(item.completedItems, item.totalItems)}</span>
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
          <div className="h-full rounded-full bg-[#3f9657]" style={{ width: `${clampPercent(item.progressPercent)}%` }} />
        </div>
        <span className="text-sm font-bold tabular-nums">{clampPercent(item.progressPercent)}%</span>
      </div>
      <Link href={href} className="mt-5 inline-flex w-full justify-center rounded-md border border-zinc-200 px-4 py-2.5 text-sm font-bold text-[#2f7f45] transition hover:border-[#8bbf87] hover:bg-[#f8fcf7] dark:border-zinc-700 dark:text-emerald-300">
        {t.continue}
      </Link>
    </article>
  );
}

function mergeRecentBundles(active: ActiveLearningBundle[], recent: RecentLearningActivity[]) {
  const merged = new Map<string, ActiveLearningBundle | RecentLearningActivity>();
  for (const item of active) merged.set(item.bundle.id, item);
  for (const item of recent) {
    if (!merged.has(item.bundle.id)) merged.set(item.bundle.id, item);
  }
  return Array.from(merged.values());
}

function getProficiencyDetails(
  distribution: { learning: number; familiar: number; almostMastered: number; mastered: number },
  t: typeof copy.ko,
) {
  return [
    { label: t.proficiencyLearning, value: distribution.learning },
    { label: t.proficiencyFamiliar, value: distribution.familiar },
    { label: t.proficiencyAlmostMastered, value: distribution.almostMastered },
    { label: t.proficiencyMastered, value: distribution.mastered },
  ];
}

function clampPercent(value: number) {
  return Math.min(100, Math.max(0, Math.round(Number.isFinite(value) ? value : 0)));
}

function formatCount(value: number) {
  return new Intl.NumberFormat('en').format(value);
}

function getBodyClass(language: DisplayLanguage) {
  return language === 'ko' ? 'break-keep font-medium' : '';
}
