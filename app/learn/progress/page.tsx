import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowRight,
  Award,
  BookOpen,
  CalendarDays,
  CircleGauge,
  Home,
  HelpCircle,
  MessagesSquare,
  RotateCcw,
  Send,
  Share2,
  Target,
  TimerReset,
} from 'lucide-react';
import { WelcomefullAsset } from '@/components/assets/CharacterBadges';
import { getAppUserFromServer, getDisplayLanguage } from '@/lib/auth/app-user';
import {
  getActiveLearningBundles,
  getLearningProgressSummary,
  getRecentLearningActivities,
  type ActiveLearningBundle,
  type RecentLearningActivity,
} from '@/lib/supabase/services/bundle-progress';
import { getReviewNeededSummary } from '@/lib/supabase/services/learning-review';
import { getBundleTitle, getCategoryName } from '../../bundles/bundle-utils';
import ProgressMobileMenu from './ProgressMobileMenu';

type DisplayLanguage = 'ko' | 'en';

const copy = {
  ko: {
    loginRequired: '로그인이 필요합니다.',
    goToLogin: '로그인 페이지로 이동',
    learnHome: 'Learn 홈',
    sidebarTitle: '학습 리포트',
    nav: ['Overview', 'Words', 'Sentences', 'Bundles', 'Review', 'Awards', 'Activity'],
    mascotTitle: '꾸준함이 실력을 만듭니다.',
    mascotBody: '매일 조금씩 성장해요.',
    title: 'Overview',
    description: '현재 학습 현황을 확인하고 오늘의 학습을 계획해보세요.',
    share: '공유',
    overall: '성취도',
    level: 'Level B1',
    levelHint: (remaining: number) => `다음 레벨까지 ${remaining}% 남았어요!`,
    learnedSentences: '학습한 문장',
    learnedWords: '학습한 단어',
    reviewNeeded: '복습 필요',
    sentenceWordCount: (sentences: number, words: number) => `문장 ${sentences} · 단어 ${words}`,
    totalSentenceBasis: '전체 문장 기준',
    totalWordBasis: '전체 단어 기준',
    todayTitle: '오늘의 학습',
    todaySubtitle: '우선순위가 높은 항목부터 시작해요.',
    reviewSentences: '복습 문장',
    reviewWords: '복습 단어',
    activeBundle: '이어할 번들',
    noActiveBundle: '새 번들',
    startRecommended: '시작하기',
    reviewOnly: '복습하기',
    areaTitle: '영역별 성취도',
    detailHint: '상세 복습은 메뉴에서 확인할 수 있어요.',
    words: 'Words (단어)',
    sentences: 'Sentences (문장)',
    bundles: 'Bundles (번들)',
    gettingUsed: '익숙해지는 중',
    stable: '안정적',
    learning: '학습 중',
    reviewPanelTitle: '복습 항목',
    sentenceReview: '문장 복습',
    wordReview: '단어 복습',
    allReview: '전체 복습',
    reviewAction: '복습',
    reviewBoost: '복습을 하면 기억이 더 오래 유지돼요!',
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
    sidebarTitle: 'Learning Report',
    nav: ['Overview', 'Words', 'Sentences', 'Bundles', 'Review', 'Awards', 'Activity'],
    mascotTitle: 'Consistency builds skill.',
    mascotBody: 'Grow a little every day.',
    title: 'Overview',
    description: "Check your progress and plan today's study.",
    share: 'Share',
    overall: 'Progress',
    level: 'Level B1',
    levelHint: (remaining: number) => `${remaining}% left until the next level.`,
    learnedSentences: 'Learned sentences',
    learnedWords: 'Learned words',
    reviewNeeded: 'Review needed',
    sentenceWordCount: (sentences: number, words: number) => `Sentences ${sentences} · Words ${words}`,
    totalSentenceBasis: 'Based on all sentences',
    totalWordBasis: 'Based on all words',
    todayTitle: "Today's Study",
    todaySubtitle: 'Start with the highest-priority items.',
    reviewSentences: 'Review sentences',
    reviewWords: 'Review words',
    activeBundle: 'Continue bundle',
    noActiveBundle: 'New bundle',
    startRecommended: 'Start',
    reviewOnly: 'Review',
    areaTitle: 'Progress by area',
    detailHint: 'Detailed review is available from the menu.',
    words: 'Words',
    sentences: 'Sentences',
    bundles: 'Bundles',
    gettingUsed: 'Getting familiar',
    stable: 'Stable',
    learning: 'Learning',
    reviewPanelTitle: 'Review items',
    sentenceReview: 'Sentence review',
    wordReview: 'Word review',
    allReview: 'Full review',
    reviewAction: 'Review',
    reviewBoost: 'Review helps memories last longer.',
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

  const [progressSummary, activeBundles, recentActivities, reviewSummary] = await Promise.all([
    getLearningProgressSummary(user.id),
    getActiveLearningBundles(user.id, 6),
    getRecentLearningActivities(user.id, { limit: 6 }),
    getReviewNeededSummary(user.id),
  ]);

  const recentBundles = mergeRecentBundles(activeBundles, recentActivities).slice(0, 3);
  const featuredBundle = activeBundles[0] || recentBundles[0] || null;
  const overallPercent = calculateOverallPercent(progressSummary.practiceAccuracyPercent, activeBundles);
  const remainingPercent = Math.max(0, 100 - overallPercent);
  const wordsPercent = clampPercent(progressSummary.practiceAccuracyPercent || progressSummary.wordsInMemory * 4);
  const sentencesPercent = clampPercent(progressSummary.completedSentences ? 50 + Math.min(45, progressSummary.completedSentences * 2) : 0);
  const bundlesPercent = clampPercent(activeBundles.length ? Math.round(activeBundles.reduce((sum, item) => sum + item.progressPercent, 0) / activeBundles.length) : progressSummary.completedBundles * 20);

  return (
    <main className="mx-auto max-w-7xl px-0 pb-10 text-[#171717] dark:text-zinc-100 lg:px-2">
      <div className="grid min-h-[calc(100vh-140px)] gap-0 overflow-hidden rounded-none border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 lg:grid-cols-[238px_1fr] lg:rounded-xl lg:border">
        <ProgressSidebar language={language} />
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
              icon={Target}
              iconClassName="text-[#3f9657]"
              title={t.overall}
              value={`${overallPercent}%`}
              badge={t.level}
              progress={overallPercent}
              footer={t.levelHint(remainingPercent)}
              footerStrong="B1"
            />
            <OverviewCard
              icon={MessagesSquare}
              iconClassName="text-[#3f9657]"
              title={t.learnedSentences}
              value={formatCount(progressSummary.completedSentences)}
              suffix={language === 'ko' ? '개' : ''}
              footer={t.totalSentenceBasis}
            />
            <OverviewCard
              icon={BookOpen}
              iconClassName="text-[#4f83e6]"
              title={t.learnedWords}
              value={formatCount(progressSummary.practicedWords)}
              suffix={language === 'ko' ? '개' : ''}
              footer={t.totalWordBasis}
            />
            <OverviewCard
              icon={RotateCcw}
              iconClassName="text-[#ff6848]"
              title={t.reviewNeeded}
              value={formatCount(reviewSummary.availableTotal)}
              suffix={language === 'ko' ? '개' : ''}
              footer={t.sentenceWordCount(reviewSummary.availableSentences, reviewSummary.availableWords)}
            />
          </section>

          <TodayRecommendation
            language={language}
            reviewSentences={reviewSummary.availableSentences}
            reviewWords={reviewSummary.availableWords}
            featuredBundle={featuredBundle}
          />

          <section className="mt-7 grid gap-6 xl:grid-cols-[1fr_1.12fr]">
            <AreaProgressCard
              language={language}
              rows={[
                { label: t.words, value: wordsPercent, tone: 'amber', status: t.gettingUsed },
                { label: t.sentences, value: sentencesPercent, tone: 'green', status: t.stable },
                { label: t.bundles, value: bundlesPercent, tone: 'violet', status: t.learning },
              ]}
            />
            <ReviewNeededCard
              language={language}
              sentences={reviewSummary.availableSentences}
              words={reviewSummary.availableWords}
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

function ProgressSidebar({ language }: { language: DisplayLanguage }) {
  const t = copy[language];
  const icons = [CalendarDays, Target, MessagesSquare, BookOpen, TimerReset, Award, CircleGauge];

  return (
    <aside className="hidden border-r border-zinc-200 bg-white px-4 py-5 dark:border-zinc-800 dark:bg-zinc-950 lg:block">
      <h2 className="px-2 text-sm font-bold tracking-tight">{t.sidebarTitle}</h2>
      <nav className="mt-5 flex flex-col gap-2">
        {t.nav.map((item, index) => {
          const Icon = icons[index] || HelpCircle;
          const active = index === 0;
          const href = getSidebarHref(index);
          return (
            <Link
              key={item}
              href={href}
                className={`inline-flex min-w-fit items-center gap-3 rounded-lg px-4 py-3 text-sm font-semibold transition ${
                active
                  ? 'bg-[#eef8ef] text-[#2f8748] dark:bg-emerald-950/50 dark:text-emerald-200'
                  : 'text-zinc-650 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900'
              }`}
            >
              <Icon className="h-4 w-4" />
              {item}
            </Link>
          );
        })}
      </nav>

      <div className="mt-8 overflow-hidden rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex min-h-[178px] flex-col">
          <div>
            <p className="text-sm font-bold leading-5">{t.mascotTitle}</p>
            <p className="mt-2 text-xs leading-5 text-zinc-500 dark:text-zinc-400">{t.mascotBody}</p>
          </div>
          <WelcomefullAsset
            size={112}
            className="!mx-auto !mb-[-8px] !mt-4"
            priority
          />
        </div>
      </div>
    </aside>
  );
}

function OverviewCard({
  icon: Icon,
  iconClassName,
  title,
  value,
  suffix,
  badge,
  progress,
  footer,
  footerStrong,
}: {
  icon: React.ElementType;
  iconClassName: string;
  title: string;
  value: string;
  suffix?: string;
  badge?: string;
  progress?: number;
  footer: string;
  footerStrong?: string;
}) {
  return (
    <article className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-5 lg:p-6">
      <div className="flex items-start gap-3 lg:block">
        <Icon className={`h-7 w-7 shrink-0 sm:h-8 sm:w-8 lg:h-10 lg:w-10 ${iconClassName}`} strokeWidth={2.4} />
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold sm:text-base lg:mt-6 lg:text-lg">{title}</h2>
          <div className="mt-2 flex flex-wrap items-center gap-2 lg:mt-6 lg:gap-3">
            <p className="text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl">
              {value}
              {suffix && <span className="ml-1 text-sm font-bold lg:text-base">{suffix}</span>}
            </p>
            {badge && (
              <span className="rounded-full bg-[#e8f4ea] px-2.5 py-1 text-xs font-bold text-[#2f8748] dark:bg-emerald-950 dark:text-emerald-200 lg:px-3 lg:text-sm">
                {badge}
              </span>
            )}
          </div>
        </div>
      </div>
      {typeof progress === 'number' && (
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800 lg:mt-6 lg:h-2">
          <div className="h-full rounded-full bg-[#3f9657]" style={{ width: `${progress}%` }} />
        </div>
      )}
      <p className="mt-3 hidden text-xs leading-5 text-zinc-600 dark:text-zinc-400 sm:block sm:text-sm lg:mt-4 lg:leading-6">
        {footerStrong && <span className="font-bold text-zinc-800 dark:text-zinc-200">{footerStrong} </span>}
        {footer}
      </p>
    </article>
  );
}

function TodayRecommendation({
  language,
  reviewSentences,
  reviewWords,
  featuredBundle,
}: {
  language: DisplayLanguage;
  reviewSentences: number;
  reviewWords: number;
  featuredBundle: ActiveLearningBundle | RecentLearningActivity | null;
}) {
  const t = copy[language];
  const title = featuredBundle ? getBundleTitle(featuredBundle.bundle, language) : t.noActiveBundle;
  const category = featuredBundle ? getCategoryName(featuredBundle.bundle, language) : '';
  const href = featuredBundle
    ? 'currentBundleItemId' in featuredBundle && featuredBundle.currentBundleItemId
      ? `/bundles/${featuredBundle.bundle.id}/learn?item=${featuredBundle.currentBundleItemId}`
      : `/bundles/${featuredBundle.bundle.id}/learn`
    : '/bundles';

  return (
    <section className="mt-6 rounded-lg border border-[#dcebdd] bg-[#fbfffb] p-4 shadow-sm dark:border-emerald-900/60 dark:bg-emerald-950/10 sm:p-5 lg:mt-8 lg:p-6">
      <div className="grid gap-5 xl:grid-cols-[1fr_210px] xl:items-center">
        <div className="min-w-0">
          <div className="flex items-start gap-3 sm:gap-4">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#e6f5e8] text-[#3f9657] dark:bg-emerald-950 dark:text-emerald-200 sm:h-11 sm:w-11">
              <CalendarDays className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-bold sm:text-xl">{t.todayTitle}</h2>
              <p className="mt-1 text-sm leading-5 text-zinc-600 dark:text-zinc-400 sm:mt-2">{t.todaySubtitle}</p>
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <RecommendationMiniCard icon={MessagesSquare} tone="green" title={t.reviewSentences} value={reviewSentences} language={language} />
            <RecommendationMiniCard icon={BookOpen} tone="sky" title={t.reviewWords} value={reviewWords} language={language} />
            <Link href={href} className="min-w-0 rounded-lg border border-zinc-200 bg-white p-3 transition hover:border-[#8bbf87] hover:bg-[#f8fcf7] dark:border-zinc-800 dark:bg-zinc-900 sm:col-span-2 xl:col-span-1 xl:p-4">
              <div className="grid min-w-0 grid-cols-[40px_1fr_auto] items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-600 dark:bg-violet-950 dark:text-violet-200">
                  <Send className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-zinc-600 dark:text-zinc-400">{t.activeBundle}</p>
                  <p className="mt-0.5 truncate text-base font-bold sm:text-lg">{featuredBundle ? '1' : '0'}</p>
                  <p className="mt-0.5 truncate text-xs text-zinc-500">{category ? `${category}: ${title}` : title}</p>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0" />
              </div>
            </Link>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 xl:flex xl:flex-col">
          <Link href={href} className="inline-flex min-h-10 items-center justify-center rounded-md bg-[#3f9657] px-3 py-2.5 text-center text-sm font-bold text-white shadow-sm transition hover:bg-[#2f7f45] sm:px-5 lg:py-3">
            {t.startRecommended}
          </Link>
          <Link href="/learn/review/sentences" className="inline-flex min-h-10 items-center justify-center rounded-md border border-zinc-200 bg-white px-3 py-2.5 text-center text-sm font-bold text-zinc-700 transition hover:border-[#8bbf87] hover:bg-[#f8fcf7] dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 sm:px-5 lg:py-3">
            {t.reviewOnly}
          </Link>
        </div>
      </div>
    </section>
  );
}

function RecommendationMiniCard({
  icon: Icon,
  tone,
  title,
  value,
  language,
}: {
  icon: React.ElementType;
  tone: 'green' | 'sky';
  title: string;
  value: number;
  language: DisplayLanguage;
}) {
  const toneClass = tone === 'green'
    ? 'bg-[#e7f4e8] text-[#3f9657] dark:bg-emerald-950 dark:text-emerald-200'
    : 'bg-sky-100 text-sky-600 dark:bg-sky-950 dark:text-sky-200';

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900 xl:p-4">
      <div className="flex items-center gap-3 xl:gap-4">
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${toneClass}`}>
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-zinc-600 dark:text-zinc-400">{title}</p>
          <p className="mt-0.5 text-lg font-bold xl:mt-1 xl:text-xl">
            {formatCount(value)}
            {language === 'ko' && <span className="ml-1 text-sm">개</span>}
          </p>
        </div>
      </div>
    </div>
  );
}

function AreaProgressCard({
  language,
  rows,
}: {
  language: DisplayLanguage;
  rows: Array<{ label: string; value: number; status: string; tone: 'amber' | 'green' | 'violet' }>;
}) {
  const t = copy[language];

  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center gap-2">
        <h2 className="text-xl font-bold">{t.areaTitle}</h2>
        <HelpCircle className="h-4 w-4 text-zinc-400" />
      </div>
      <div className="mt-7 space-y-5">
        {rows.map((row) => (
          <div key={row.label} className="text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="font-bold">{row.label}</span>
              <span className={`shrink-0 rounded-full px-2.5 py-1 text-center text-xs font-bold ${getStatusToneClass(row.tone)}`}>{row.status}</span>
            </div>
            <div className="mt-3 grid grid-cols-[1fr_44px] items-center gap-3">
              <div className="h-1.5 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                <div className={`h-full rounded-full ${getProgressToneClass(row.tone)}`} style={{ width: `${row.value}%` }} />
              </div>
              <span className="text-right text-xs font-bold tabular-nums">{row.value}%</span>
            </div>
          </div>
        ))}
      </div>
      <p className="mt-8 border-t border-zinc-100 pt-5 text-sm text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">{t.detailHint}</p>
    </section>
  );
}

function ReviewNeededCard({ language, sentences, words }: { language: DisplayLanguage; sentences: number; words: number }) {
  const t = copy[language];
  const rows = [
    { icon: MessagesSquare, label: t.sentenceReview, value: sentences, href: '/learn/review/sentences', color: 'text-[#3f9657]' },
    { icon: BookOpen, label: t.wordReview, value: words, href: '/learn/review/words', color: 'text-sky-600' },
    { icon: RotateCcw, label: t.allReview, value: sentences + words, href: '/learn/review/sentences', color: 'text-[#ff6848]' },
  ];

  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center gap-2">
        <h2 className="text-xl font-bold">{t.reviewPanelTitle}</h2>
        <HelpCircle className="h-4 w-4 text-zinc-400" />
      </div>
      <div className="mt-6 divide-y divide-zinc-100 dark:divide-zinc-800">
        {rows.map((row) => (
          <Link key={row.label} href={row.href} className="grid grid-cols-[1fr_auto] items-center gap-4 py-3 transition hover:text-[#2f7f45] sm:grid-cols-[1fr_auto_auto]">
            <span className="inline-flex items-center gap-3 text-sm font-bold">
              <row.icon className={`h-5 w-5 ${row.color}`} />
              {row.label}
            </span>
            <span className="text-2xl font-bold tabular-nums">
              {formatCount(row.value)}
              {language === 'ko' && <span className="ml-1 text-sm font-bold">개</span>}
            </span>
            <span className="hidden rounded-md border border-zinc-200 px-4 py-2 text-sm font-bold dark:border-zinc-700 sm:inline-flex">
              {t.reviewAction}
            </span>
          </Link>
        ))}
      </div>
      <p className="mt-5 text-sm text-zinc-500 dark:text-zinc-400">{t.reviewBoost}</p>
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

function calculateOverallPercent(accuracy: number, activeBundles: ActiveLearningBundle[]) {
  const activeAverage = activeBundles.length
    ? Math.round(activeBundles.reduce((sum, item) => sum + item.progressPercent, 0) / activeBundles.length)
    : 0;
  return clampPercent(Math.round((accuracy * 0.45) + (activeAverage * 0.55)));
}

function getSidebarHref(index: number) {
  switch (index) {
    case 1:
      return '/learn/review/words';
    case 2:
      return '/learn/review/sentences';
    case 3:
      return '/bundles';
    case 4:
      return '/learn/review/sentences';
    case 5:
      return '/learn';
    case 6:
      return '/learn/active';
    default:
      return '/learn/progress';
  }
}

function getProgressToneClass(tone: 'amber' | 'green' | 'violet') {
  if (tone === 'amber') return 'bg-amber-400';
  if (tone === 'violet') return 'bg-violet-500';
  return 'bg-[#3f9657]';
}

function getStatusToneClass(tone: 'amber' | 'green' | 'violet') {
  if (tone === 'amber') return 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-200';
  if (tone === 'violet') return 'bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-200';
  return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-200';
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
