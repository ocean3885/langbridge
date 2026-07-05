import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, BookOpen, CheckCircle2, Star, Target } from 'lucide-react';
import { getAppUserFromServer, getDisplayLanguage } from '@/lib/auth/app-user';
import {
  getActiveLearningBundles,
  getLearningProgressSummary,
  getRecentLearningActivities,
} from '@/lib/supabase/services/bundle-progress';
import { getReviewNeededSummary } from '@/lib/supabase/services/learning-review';
import { getBundleTitle, getCategoryName } from '../../bundles/bundle-utils';

type DisplayLanguage = 'ko' | 'en';

const copy = {
  ko: {
    loginRequired: '로그인이 필요합니다.',
    goToLogin: '로그인 페이지로 이동',
    backToLearn: '학습 홈으로 돌아가기',
    eyebrow: 'Learning Progress',
    title: '내 학습 현황',
    description: '완료한 문장, 획득한 별, 진행 중인 번들, 복습이 필요한 항목을 한 곳에서 확인해보세요.',
    earnedStars: '획득한 별',
    completedSentences: '완료한 문장',
    completedBundles: '완료한 번들',
    activeBundles: '진행 중인 번들',
    practicedWords: '연습한 단어',
    wordsInMemory: '기억 중인 단어',
    practiceAccuracy: '정답률',
    reviewNeeded: '복습 필요',
    reviewDescription: '기억이 약해지기 전에 다시 보면 더 오래 남아요.',
    sentenceReview: '문장 복습',
    wordReview: '단어 복습',
    activeTitle: '진행 중인 번들',
    recentTitle: '최근 학습 기록',
    emptyActive: '아직 진행 중인 번들이 없습니다.',
    emptyRecent: '아직 학습 기록이 없습니다.',
    continue: '계속하기',
    viewBundle: '번들 보기',
    itemProgress: (completed: number, total: number) => `${completed} / ${total} 항목 완료`,
  },
  en: {
    loginRequired: 'Login is required.',
    goToLogin: 'Go to Login Page',
    backToLearn: 'Back to Learn',
    eyebrow: 'Learning Progress',
    title: 'Your learning progress',
    description: 'See completed sentences, earned stars, active bundles, and review needs in one place.',
    earnedStars: 'Earned Stars',
    completedSentences: 'Completed Sentences',
    completedBundles: 'Completed Bundles',
    activeBundles: 'Active Bundles',
    practicedWords: 'Practiced Words',
    wordsInMemory: 'Words in Memory',
    practiceAccuracy: 'Practice Accuracy',
    reviewNeeded: 'Review Needed',
    reviewDescription: 'Review before memory fades so it stays longer.',
    sentenceReview: 'Sentence Review',
    wordReview: 'Word Review',
    activeTitle: 'Active Bundles',
    recentTitle: 'Recent Learning History',
    emptyActive: 'No active bundles yet.',
    emptyRecent: 'No learning history yet.',
    continue: 'Continue',
    viewBundle: 'View Bundle',
    itemProgress: (completed: number, total: number) => `${completed} / ${total} items completed`,
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
        <Link href="/auth/login" className="mt-5 inline-flex rounded-lg bg-[#63a464] px-5 py-3 text-sm font-bold text-white">
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

  const stats = [
    { label: t.earnedStars, value: formatCount(progressSummary.earnedStars), icon: Star },
    { label: t.completedSentences, value: formatCount(progressSummary.completedSentences), icon: CheckCircle2 },
    { label: t.completedBundles, value: formatCount(progressSummary.completedBundles), icon: BookOpen },
    { label: t.activeBundles, value: formatCount(activeBundles.length), icon: Target },
    { label: t.practicedWords, value: formatCount(progressSummary.practicedWords), icon: BookOpen },
    { label: t.wordsInMemory, value: formatCount(progressSummary.wordsInMemory), icon: CheckCircle2 },
    { label: t.practiceAccuracy, value: `${progressSummary.practiceAccuracyPercent}%`, icon: Target },
  ];

  return (
    <main className="mx-auto max-w-7xl px-2 pb-12 text-[#1f1b18] dark:text-zinc-100">
      <Link
        href="/learn"
        className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-zinc-500 transition hover:text-[#4f8a50] dark:text-zinc-400 dark:hover:text-emerald-300"
      >
        <ArrowLeft className="h-4 w-4" />
        {t.backToLearn}
      </Link>

      <section className="mb-8">
        <p className="text-xs font-black uppercase tracking-widest text-[#4f8a50] dark:text-emerald-300">
          {t.eyebrow}
        </p>
        <h1 className={`${getDisplayHeadingClass(language)} mt-3 text-4xl leading-tight sm:text-5xl`}>
          {t.title}
        </h1>
        <p className={`mt-4 max-w-2xl text-base leading-7 text-zinc-600 dark:text-zinc-300 ${getBodyClass(language)}`}>
          {t.description}
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-black/20">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-[#e5f0e4] text-[#5d9361] dark:bg-emerald-950/50 dark:text-emerald-200">
              <stat.icon className="h-5 w-5" />
            </div>
            <p className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">{stat.label}</p>
            <p className="mt-2 text-3xl font-black">{stat.value}</p>
          </div>
        ))}
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-8">
          <ProgressBundleSection
            title={t.activeTitle}
            emptyText={t.emptyActive}
            bundles={activeBundles}
            language={language}
            ctaLabel={t.continue}
          />
          <ProgressBundleSection
            title={t.recentTitle}
            emptyText={t.emptyRecent}
            bundles={recentActivities}
            language={language}
            ctaLabel={t.viewBundle}
          />
        </div>

        <aside className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-black/20 lg:self-start">
          <h2 className={`${getDisplayHeadingClass(language)} text-2xl`}>{t.reviewNeeded}</h2>
          <p className={`mt-3 text-sm leading-6 text-zinc-500 dark:text-zinc-400 ${getBodyClass(language)}`}>
            {t.reviewDescription}
          </p>
          <div className="mt-6 space-y-3">
            <ReviewLink href="/learn/review/sentences" label={t.sentenceReview} value={reviewSummary.availableSentences} />
            <ReviewLink href="/learn/review/words" label={t.wordReview} value={reviewSummary.availableWords} />
          </div>
        </aside>
      </section>
    </main>
  );
}

function ProgressBundleSection({
  title,
  emptyText,
  bundles,
  language,
  ctaLabel,
}: {
  title: string;
  emptyText: string;
  bundles: Array<{
    bundle: {
      id: string;
      title: string;
      title_en: string | null;
      thumbnail_url: string | null;
      bundle_category?: { id: string | number; name: string | null; name_en: string | null } | null;
      bundle_type?: { id: string | number; name: string | null; code: string | null } | null;
    };
    totalItems: number;
    completedItems: number;
    progressPercent: number;
    currentBundleItemId?: string | null;
  }>;
  language: DisplayLanguage;
  ctaLabel: string;
}) {
  const t = copy[language];

  return (
    <section>
      <h2 className={`${getDisplayHeadingClass(language)} text-2xl`}>{title}</h2>
      {bundles.length === 0 ? (
        <div className={`mt-4 rounded-xl border border-dashed border-zinc-300 bg-white p-7 text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400 ${getBodyClass(language)}`}>
          {emptyText}
        </div>
      ) : (
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {bundles.map((item) => {
            const title = getBundleTitle(item.bundle, language);
            const category = getCategoryName(item.bundle, language);
            const href = item.currentBundleItemId
              ? `/bundles/${item.bundle.id}/learn?item=${item.currentBundleItemId}`
              : `/bundles/${item.bundle.id}`;

            return (
              <Link
                key={`${item.bundle.id}-${ctaLabel}`}
                href={href}
                className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-black/20 dark:hover:bg-zinc-800"
              >
                <div className="relative aspect-[16/8] bg-[#f3ede3] dark:bg-zinc-800">
                  <Image
                    src={item.bundle.thumbnail_url || '/images/bundle-fallback.webp'}
                    alt={title}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 420px"
                  />
                </div>
                <div className="p-5">
                  <p className="text-xs font-black uppercase tracking-wide text-[#5a975d]">{category}</p>
                  <h3 className={`${getDisplayHeadingClass(language)} mt-2 line-clamp-2 text-2xl leading-tight`}>
                    {title}
                  </h3>
                  <p className="mt-3 text-sm font-semibold text-zinc-500 dark:text-zinc-400">
                    {t.itemProgress(item.completedItems, item.totalItems)}
                  </p>
                  <div className="mt-4 flex items-center gap-3">
                    <div className="h-2 flex-1 rounded-full bg-zinc-100 dark:bg-zinc-800">
                      <div className="h-full rounded-full bg-[#63a464]" style={{ width: `${Math.min(100, Math.max(0, item.progressPercent))}%` }} />
                    </div>
                    <span className="text-sm font-bold tabular-nums">{item.progressPercent}%</span>
                  </div>
                  <span className="mt-5 inline-flex text-sm font-bold text-[#4f8a50] dark:text-emerald-300">
                    {ctaLabel}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}

function ReviewLink({ href, label, value }: { href: string; label: string; value: number }) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between rounded-lg border border-zinc-200 px-4 py-3 text-sm font-bold transition hover:border-[#8bbf87] hover:bg-[#f1f8ef] hover:text-[#3f7d42] dark:border-zinc-700 dark:hover:border-emerald-700 dark:hover:bg-emerald-950/30 dark:hover:text-emerald-100"
    >
      <span>{label}</span>
      <span>{formatCount(value)}</span>
    </Link>
  );
}

function formatCount(value: number) {
  return new Intl.NumberFormat('en').format(value);
}

function getDisplayHeadingClass(language: DisplayLanguage) {
  return language === 'ko'
    ? 'font-sans font-bold'
    : 'font-serif font-semibold';
}

function getBodyClass(language: DisplayLanguage) {
  return language === 'ko' ? 'break-keep font-medium' : '';
}
