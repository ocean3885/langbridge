import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowRight,
  BookOpen,
  Compass,
  HelpCircle,
  Layers,
  Shuffle,
  Star,
} from 'lucide-react';
import { StudyfullAsset } from '@/components/assets/CharacterBadges';
import type { LearningProgressSummary, RecentLearningActivity, RecentStudiedBundle } from '@/lib/supabase/services/bundle-progress';
import type { LearningStreakSummary } from '@/lib/supabase/services/learning-daily-activity';
import type { LearningGoalSummary } from '@/lib/supabase/services/learning-goal-preferences';
import { GoalCard } from './ProgressCards';
import { SectionHeader } from './SectionHeader';
import { StreakCard } from './StreakCard';

type DisplayLanguage = 'ko' | 'en';

const continueLearningActionClassName = 'rounded-full border border-zinc-200 bg-white px-5 py-2 text-sm font-semibold text-zinc-600 shadow-sm transition-colors hover:border-[#8bbf87] hover:bg-[#f1f8ef] hover:text-[#3f7d42] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#63a464]/35 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:shadow-black/20 dark:hover:border-emerald-700 dark:hover:bg-emerald-950/30 dark:hover:text-emerald-100';

const continueLearningCopy = {
  ko: {
    sectionTitle: '이어서 학습하기',
    viewAll: '전체 보기',
    fallbackCategory: '학습 번들',
    fallbackTitle: '제목 없는 번들',
    currentItem: (current: number, total: number) => `${current} / ${total} 항목`,
    completedItems: (completed: number, total: number) => `${completed} / ${total} 완료`,
    fallbackPreview: '이어서 학습을 시작해보세요.',
    continueLesson: '학습 계속하기',
    emptyTitle: '첫 번들을 시작해보세요',
    emptyDescription: '학습 번들을 선택하면 진행 상황이 여기에 표시됩니다.',
    browseBundles: '번들 둘러보기',
    today: '오늘',
    yesterday: '어제',
    daysAgo: (days: number) => `${days}일 전`,
  },
  en: {
    sectionTitle: 'Continue Learning',
    viewAll: 'View all',
    fallbackCategory: 'Learning Bundle',
    fallbackTitle: 'Untitled Bundle',
    currentItem: (current: number, total: number) => `Item ${current} of ${total}`,
    completedItems: (completed: number, total: number) => `${completed} of ${total} completed`,
    fallbackPreview: 'Pick up where you left off.',
    continueLesson: 'Continue Lesson',
    emptyTitle: 'Start your first bundle',
    emptyDescription: 'Choose a lesson bundle and your progress will appear here.',
    browseBundles: 'Browse Bundles',
    today: 'Today',
    yesterday: 'Yesterday',
    daysAgo: (days: number) => `${days} days ago`,
  },
};

const welcomeDescription = {
  ko: '계속해봐요! 짧은 학습이 큰 성장으로 이어져요.',
  en: 'Keep going! Small lessons, big progress.',
};

const encouragementCopy = {
  ko: {
    title: '잘하고 있어요!',
    description: '꾸준함이 실력을 만듭니다.',
  },
  en: {
    title: "You're doing amazing!",
    description: 'Consistency is the key to fluency.',
  },
};

const loggedInSectionCopy = {
  ko: {
    exploreBundles: '새로운 번들 탐색하기',
    recentActivity: '최근 활동',
    browseBundles: '번들 둘러보기',
    noRecentActivityTitle: '아직 다른 활동이 없어요',
    noRecentActivityDescription: '번들을 더 학습하면 최근 활동이 여기에 표시됩니다.',
    quickPractice: '빠른 연습',
    quickPracticeDescription: (title: string) => `${title} 번들로 바로 연습해보세요.`,
    progressTitle: '학습 현황',
    completedSentences: '완료한 문장',
    earnedStars: '획득한 별',
    completedBundles: '완료한 번들',
    activeBundles: '진행 중인 번들',
    practicedWords: '연습한 단어',
    practiceAccuracy: '정답률',
  },
  en: {
    exploreBundles: 'Explore More Bundles',
    recentActivity: 'Recent Activity',
    browseBundles: 'Browse bundles',
    noRecentActivityTitle: 'No other activity yet',
    noRecentActivityDescription: 'Study more bundles and your recent activity will appear here.',
    quickPractice: 'Quick Practice',
    quickPracticeDescription: (title: string) => `Jump back into ${title} with a short practice session.`,
    progressTitle: 'Your Progress',
    completedSentences: 'Sentences Completed',
    earnedStars: 'Earned Stars',
    completedBundles: 'Bundles Completed',
    activeBundles: 'Active Bundles',
    practicedWords: 'Words Practiced',
    practiceAccuracy: 'Practice Accuracy',
  },
};

export function LoggedInLearnPage({
  name,
  recentBundle,
  recentActivities,
  recommendedBundles,
  streakSummary,
  goalSummary,
  progressSummary,
  language,
}: {
  name: string;
  recentBundle: RecentStudiedBundle | null;
  recentActivities: RecentLearningActivity[];
  recommendedBundles: any[];
  streakSummary: LearningStreakSummary;
  goalSummary: LearningGoalSummary;
  progressSummary: LearningProgressSummary;
  language: DisplayLanguage;
}) {
  const hasRecommendedBundles = recommendedBundles.length > 0;

  return (
    <div className="mx-auto grid max-w-7xl gap-7 px-2 pb-10 text-[#1f1b18] dark:text-zinc-100 lg:grid-cols-[1fr_360px]">
      <div className="space-y-9">
        <WelcomeSection name={name} language={language} />
        <ContinueLearningSection recentBundle={recentBundle} language={language} />
        {hasRecommendedBundles && <ExploreBundlesSection bundles={recommendedBundles} language={language} />}
        <RecentActivitySection activities={recentActivities} language={language} />
        <QuickPracticeSection recentBundle={recentBundle} language={language} />
      </div>

      <LearnSidebar
        streakSummary={streakSummary}
        goalSummary={goalSummary}
        progressSummary={progressSummary}
        language={language}
      />
    </div>
  );
}

function WelcomeSection({ name, language }: { name: string; language: DisplayLanguage }) {
  return (
    <section>
      <h1 className="font-serif text-4xl font-semibold sm:text-5xl">¡Buenos dias, {name}!</h1>
      <p className="mt-4 text-zinc-600 dark:text-zinc-300">{welcomeDescription[language]}</p>
    </section>
  );
}

function ContinueLearningSection({ recentBundle, language }: { recentBundle: RecentStudiedBundle | null; language: DisplayLanguage }) {
  const t = continueLearningCopy[language];

  if (!recentBundle) {
    return <ContinueLearningEmptyState language={language} />;
  }

  const { bundle, currentItem, interaction, progressPercent, totalItems, completedItems } = recentBundle;
  const categoryName = language === 'ko'
    ? bundle.bundle_category?.name || bundle.bundle_category?.name_en || bundle.bundle_type?.name || t.fallbackCategory
    : bundle.bundle_category?.name_en || bundle.bundle_category?.name || bundle.bundle_type?.name || t.fallbackCategory;
  const title = language === 'ko'
    ? bundle.title || bundle.title_en || t.fallbackTitle
    : bundle.title_en || bundle.title || t.fallbackTitle;
  const imageSrc = bundle.thumbnail_url || '/images/heroimg_land.jpg';
  const currentLabel = currentItem?.order_index != null
    ? t.currentItem(currentItem.order_index + 1, Math.max(totalItems, currentItem.order_index + 1))
    : t.completedItems(completedItems, totalItems);
  const sentencePreview =
    currentItem?.sentence?.sentence ||
    (language === 'ko' ? bundle.description || bundle.description_en : bundle.description_en || bundle.description) ||
    t.fallbackPreview;
  const lastStudiedLabel = formatRelativeStudyDate(interaction.last_studied_at, language);
  const learnHref = interaction.current_bundle_item_id
    ? `/bundles/${bundle.id}/learn?item=${interaction.current_bundle_item_id}`
    : `/bundles/${bundle.id}/learn`;

  return (
    <section>
      <SectionHeader
        title={t.sectionTitle}
        href="/bundles"
        actionLabel={t.viewAll}
        titleClassName={`${getDisplayHeadingClass(language)} text-2xl`}
        actionClassName={continueLearningActionClassName}
      />
      <div className="mt-4 grid gap-5 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-black/20 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1fr)] lg:items-center lg:gap-7">
        <div className="relative aspect-video overflow-hidden rounded-lg bg-[#f3ede3] dark:bg-zinc-800">
          {imageSrc ? (
            <Image
              src={imageSrc}
              alt={title}
              fill
              priority
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, (max-width: 1280px) 42vw, 520px"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-[#8b7c66] dark:text-zinc-500">
              <Layers className="h-14 w-14" />
            </div>
          )}
        </div>
        <div className="flex min-w-0 flex-col justify-center px-1 pb-2 pt-1 sm:px-2 lg:p-0 lg:pr-3">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-black uppercase tracking-widest text-[#4d8b4f]">{categoryName}</p>
            {lastStudiedLabel && (
              <span className="rounded-full bg-zinc-100 px-2 py-1 text-xs font-semibold text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                {lastStudiedLabel}
              </span>
            )}
          </div>
          <h2 className={`mt-4 ${getDisplayHeadingClass(language)} text-3xl`}>{title}</h2>
          <p className="mt-3 text-sm font-semibold text-zinc-500 dark:text-zinc-400">{currentLabel}</p>
          <p className="mt-3 line-clamp-2 text-zinc-600 dark:text-zinc-300">{sentencePreview}</p>
          <div className="mt-6 flex items-center gap-4">
            <div className="h-2 flex-1 rounded-full bg-zinc-100 dark:bg-zinc-800">
              <div className="h-full rounded-full bg-[#63a464]" style={{ width: `${Math.min(100, Math.max(0, progressPercent))}%` }} />
            </div>
            <span className="text-sm font-medium tabular-nums">{progressPercent}%</span>
          </div>
          <div className="mt-7 flex items-center justify-center gap-4 lg:justify-start">
            <Link href={learnHref} className="rounded-full bg-[#63a464] px-7 py-3 text-sm font-bold text-white transition hover:bg-[#4e9250]">
              {t.continueLesson}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function ContinueLearningEmptyState({ language }: { language: DisplayLanguage }) {
  const t = continueLearningCopy[language];

  return (
    <section>
      <SectionHeader
        title={t.sectionTitle}
        titleClassName={`${getDisplayHeadingClass(language)} text-2xl`}
      />
      <div className="mt-4 flex flex-col gap-5 rounded-xl border border-dashed border-zinc-300 bg-white p-7 shadow-sm dark:border-zinc-700 dark:bg-zinc-900 dark:shadow-black/20 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#e5f0e4] text-[#5d9361] dark:bg-emerald-950/50 dark:text-emerald-200">
            <Compass className="h-7 w-7" />
          </span>
          <div>
            <h2 className={`${getDisplayHeadingClass(language)} text-2xl`}>{t.emptyTitle}</h2>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{t.emptyDescription}</p>
          </div>
        </div>
        <Link href="/bundles" className="inline-flex items-center justify-center rounded-full bg-[#63a464] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#4e9250]">
          {t.browseBundles}
        </Link>
      </div>
    </section>
  );
}

function ExploreBundlesSection({ bundles, language }: { bundles: any[]; language: DisplayLanguage }) {
  const t = loggedInSectionCopy[language];

  return (
    <section>
      <h2 className={`${getDisplayHeadingClass(language)} text-2xl`}>{t.exploreBundles}</h2>
      <div className="mt-5 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {bundles.map((bundle) => {
          const title = language === 'ko' ? bundle.title || bundle.title_en : bundle.title_en || bundle.title;
          const imageSrc = bundle.thumbnail_url || '/images/heroimg_land.jpg';
          const categoryName = language === 'ko'
            ? bundle.bundle_category?.name || bundle.bundle_category?.name_en || bundle.bundle_type?.name || 'Bundle'
            : bundle.bundle_category?.name_en || bundle.bundle_category?.name || bundle.bundle_type?.name || 'Bundle';

          return (
            <Link
              key={bundle.id}
              href={`/bundles/${bundle.id}`}
              className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-black/20 dark:hover:bg-zinc-800"
            >
              <div className="p-5">
                <p className="text-xs font-black uppercase tracking-wide text-[#5a975d]">{categoryName}</p>
                <h3 className="mt-3 line-clamp-2 min-h-14 font-serif text-2xl font-semibold leading-tight">{title}</h3>
              </div>
              <div className="relative h-40">
                <Image src={imageSrc} alt={title || ''} fill className="object-cover" sizes="(max-width: 1280px) 50vw, 260px" />
              </div>
              <div className="flex items-center justify-between px-5 py-4 text-xs text-zinc-500 dark:text-zinc-400">
                <span>Beginner</span>
                <span>{bundle.bundle_items?.[0]?.count || 0} items</span>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function RecentActivitySection({ activities, language }: { activities: RecentLearningActivity[]; language: DisplayLanguage }) {
  const t = loggedInSectionCopy[language];

  return (
    <section>
      <SectionHeader
        title={t.recentActivity}
        titleClassName={`${getDisplayHeadingClass(language)} text-2xl`}
      />
      <div className="mt-4 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-black/20">
        {activities.length === 0 ? (
          <div className="p-6 text-center">
            <h3 className="font-bold">{t.noRecentActivityTitle}</h3>
            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">{t.noRecentActivityDescription}</p>
          </div>
        ) : (
          activities.map((activity) => {
            const title = getActivityBundleTitle(activity, language);
            const meta = getActivityBundleMeta(activity, language);
            const status = activity.interaction.is_completed
              ? (language === 'ko' ? '완료' : 'Completed')
              : `${activity.progressPercent}%`;
            const date = formatRelativeStudyDate(activity.interaction.last_studied_at, language);
            const image = activity.bundle.thumbnail_url || '/images/heroimg_land.jpg';

            return (
              <Link
                key={activity.interaction.id}
                href={`/bundles/${activity.bundle.id}`}
                className="grid grid-cols-[76px_1fr_auto] items-center gap-4 border-b border-zinc-100 p-4 transition hover:bg-zinc-50 last:border-b-0 dark:border-zinc-800 dark:hover:bg-zinc-800/70"
              >
                <div className="relative h-14 overflow-hidden rounded-lg bg-[#f3ede3] dark:bg-zinc-800">
                  <Image src={image} alt="" fill className="object-cover" sizes="76px" />
                </div>
                <div className="min-w-0">
                  <h3 className="truncate font-bold">{title}</h3>
                  <p className="mt-1 truncate text-sm text-zinc-500 dark:text-zinc-400">{meta}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-[#4f934f]">{status}</p>
                  {date && <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{date}</p>}
                </div>
              </Link>
            );
          })
        )}
        <div className="flex justify-center p-4">
          <Link href="/bundles" className="rounded-full border border-zinc-200 px-10 py-2 text-sm font-semibold transition hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800">
            {t.browseBundles}
          </Link>
        </div>
      </div>
    </section>
  );
}

function getActivityBundleTitle(activity: RecentLearningActivity, language: DisplayLanguage) {
  return language === 'ko'
    ? activity.bundle.title || activity.bundle.title_en || continueLearningCopy[language].fallbackTitle
    : activity.bundle.title_en || activity.bundle.title || continueLearningCopy[language].fallbackTitle;
}

function getActivityBundleMeta(activity: RecentLearningActivity, language: DisplayLanguage) {
  const categoryName = language === 'ko'
    ? activity.bundle.bundle_category?.name || activity.bundle.bundle_category?.name_en || activity.bundle.bundle_type?.name || continueLearningCopy[language].fallbackCategory
    : activity.bundle.bundle_category?.name_en || activity.bundle.bundle_category?.name || activity.bundle.bundle_type?.name || continueLearningCopy[language].fallbackCategory;

  return activity.totalItems > 0
    ? `${categoryName} · ${continueLearningCopy[language].completedItems(activity.completedItems, activity.totalItems)}`
    : categoryName;
}

function QuickPracticeSection({ recentBundle, language }: { recentBundle: RecentStudiedBundle | null; language: DisplayLanguage }) {
  if (!recentBundle) return null;

  const t = loggedInSectionCopy[language];
  const title = getRecentBundleTitle(recentBundle, language);
  const practiceItems = getQuickPracticeItems(recentBundle.bundle.id, language);

  return (
    <section>
      <h2 className={`${getDisplayHeadingClass(language)} text-2xl`}>{t.quickPractice}</h2>
      <p className="mt-2 line-clamp-2 text-sm text-zinc-500 dark:text-zinc-400">{t.quickPracticeDescription(title)}</p>
      <div className="mt-5 grid gap-5 md:grid-cols-3">
        {practiceItems.map((item) => (
          <Link
            key={item.title}
            href={item.href}
            className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-black/20 dark:hover:bg-zinc-800"
          >
            <div className="flex min-w-0 items-center gap-4">
              <span className={`flex h-14 w-14 items-center justify-center rounded-full ${item.color}`}>
                <item.icon className="h-7 w-7" />
              </span>
              <span className="min-w-0">
                <strong className="block truncate">{item.title}</strong>
                <span className="line-clamp-2 text-sm text-zinc-500 dark:text-zinc-400">{item.desc}</span>
              </span>
            </div>
            <ArrowRight className="h-5 w-5 shrink-0" />
          </Link>
        ))}
      </div>
    </section>
  );
}

function getRecentBundleTitle(recentBundle: RecentStudiedBundle, language: DisplayLanguage) {
  return language === 'ko'
    ? recentBundle.bundle.title || recentBundle.bundle.title_en || continueLearningCopy[language].fallbackTitle
    : recentBundle.bundle.title_en || recentBundle.bundle.title || continueLearningCopy[language].fallbackTitle;
}

function getQuickPracticeItems(bundleId: string, language: DisplayLanguage) {
  const copy = {
    ko: [
      {
        title: 'Flashcards',
        desc: '표현을 빠르게 복습',
        href: `/bundles/${bundleId}/flashcards`,
        icon: BookOpen,
        color: 'bg-[#e5f0e4] text-[#5d9361] dark:bg-emerald-950/50 dark:text-emerald-200',
      },
      {
        title: 'Quick Quiz',
        desc: '퀴즈로 이해도 확인',
        href: `/bundles/${bundleId}/quiz`,
        icon: HelpCircle,
        color: 'bg-[#ede5fb] text-[#8564cf] dark:bg-violet-950/50 dark:text-violet-200',
      },
      {
        title: 'Scramble',
        desc: '문장 순서 맞추기',
        href: `/bundles/${bundleId}/scramble`,
        icon: Shuffle,
        color: 'bg-[#fde8d5] text-[#c66f2e] dark:bg-orange-950/50 dark:text-orange-200',
      },
    ],
    en: [
      {
        title: 'Flashcards',
        desc: 'Review expressions',
        href: `/bundles/${bundleId}/flashcards`,
        icon: BookOpen,
        color: 'bg-[#e5f0e4] text-[#5d9361] dark:bg-emerald-950/50 dark:text-emerald-200',
      },
      {
        title: 'Quick Quiz',
        desc: 'Check understanding',
        href: `/bundles/${bundleId}/quiz`,
        icon: HelpCircle,
        color: 'bg-[#ede5fb] text-[#8564cf] dark:bg-violet-950/50 dark:text-violet-200',
      },
      {
        title: 'Scramble',
        desc: 'Rebuild sentences',
        href: `/bundles/${bundleId}/scramble`,
        icon: Shuffle,
        color: 'bg-[#fde8d5] text-[#c66f2e] dark:bg-orange-950/50 dark:text-orange-200',
      },
    ],
  };

  return copy[language];
}

function LearnSidebar({
  streakSummary,
  goalSummary,
  progressSummary,
  language,
}: {
  streakSummary: LearningStreakSummary;
  goalSummary: LearningGoalSummary;
  progressSummary: LearningProgressSummary;
  language: DisplayLanguage;
}) {
  return (
    <aside className="space-y-5 lg:self-start">
      <StreakCard summary={streakSummary} language={language} />
      <GoalCard summary={goalSummary} language={language} editable />
      <ProgressSummaryCard summary={progressSummary} language={language} />
      <EncouragementCard language={language} />
    </aside>
  );
}

function ProgressSummaryCard({ summary, language }: { summary: LearningProgressSummary; language: DisplayLanguage }) {
  const t = loggedInSectionCopy[language];
  const rows = [
    [t.earnedStars, formatCount(summary.earnedStars)],
    [t.completedBundles, formatCount(summary.completedBundles)],
    [t.activeBundles, formatCount(summary.activeBundles)],
    [t.completedSentences, formatCount(summary.completedSentences)],
    [t.practicedWords, formatCount(summary.practicedWords)],
    [t.practiceAccuracy, `${summary.practiceAccuracyPercent}%`],
  ];

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-black/20">
      <div className="mb-5">
        <h3 className={`${getDisplayHeadingClass(language)} text-xl`}>{t.progressTitle}</h3>
      </div>
      <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between py-3 text-sm">
            <span className="inline-flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
              {label === t.earnedStars && <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-500" />}
              {label}
            </span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

function formatCount(value: number) {
  return new Intl.NumberFormat('en').format(value);
}

function EncouragementCard({ language }: { language: DisplayLanguage }) {
  const t = encouragementCopy[language];

  return (
    <div className="overflow-hidden rounded-xl border border-[#f1dfc6] bg-[#fff8ec] p-7 shadow-sm dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100 dark:shadow-black/20">
      <div className="flex items-end justify-between gap-4">
        <div className="min-w-0 pb-1">
          <h3 className={`${getDisplayHeadingClass(language)} text-xl`}>{t.title}</h3>
          <p className="mt-4 leading-7 text-zinc-600 dark:text-amber-100/80">{t.description}</p>
        </div>
        <StudyfullAsset
          size={136}
          className="!-mb-2 !-mr-3 !h-[104px] !w-[104px]"
          priority
        />
      </div>
    </div>
  );
}

function formatRelativeStudyDate(value: string | null | undefined, language: DisplayLanguage) {
  if (!value) return null;
  const t = continueLearningCopy[language];

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
