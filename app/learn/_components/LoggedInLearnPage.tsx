import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowRight,
  Compass,
  Layers,
} from 'lucide-react';
import { StudyfullAsset } from '@/components/assets/CharacterBadges';
import type { RecentStudiedBundle } from '@/lib/supabase/services/bundle-progress';
import type { LearningStreakSummary } from '@/lib/supabase/services/learning-daily-activity';
import type { LearningGoalSummary } from '@/lib/supabase/services/learning-goal-preferences';
import { GoalCard, MiniListCard, ProgressChartCard } from './ProgressCards';
import { SectionHeader } from './SectionHeader';
import { StreakCard } from './StreakCard';
import { activities, lessonCards, quickPractice } from './learn-page-data';

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
    todaysPicks: '오늘의 추천 학습',
    recentActivity: '최근 활동',
    viewFullHistory: '전체 기록 보기',
    quickPractice: '빠른 연습',
    quickPracticeDescription: '스페인어 감각을 짧게 유지해보세요.',
    progressTitle: '학습 현황',
    viewDetails: '자세히 보기',
    progressRows: [
      ['완료한 레슨', '28'],
      ['학습한 단어', '236'],
      ['익힌 표현', '57'],
      ['현재 레벨', 'Beginner A2'],
    ],
  },
  en: {
    todaysPicks: "Today's Picks for You",
    recentActivity: 'Recent Activity',
    viewFullHistory: 'View full history',
    quickPractice: 'Quick Practice',
    quickPracticeDescription: 'Short activities to keep your Spanish fresh.',
    progressTitle: 'Your Progress',
    viewDetails: 'View details',
    progressRows: [
      ['Lessons Completed', '28'],
      ['Words Learned', '236'],
      ['Expressions Mastered', '57'],
      ['Current Level', 'Beginner A2'],
    ],
  },
};

export function LoggedInLearnPage({
  name,
  recentBundle,
  streakSummary,
  goalSummary,
  language,
}: {
  name: string;
  recentBundle: RecentStudiedBundle | null;
  streakSummary: LearningStreakSummary;
  goalSummary: LearningGoalSummary;
  language: DisplayLanguage;
}) {
  return (
    <div className="mx-auto grid max-w-7xl gap-7 px-2 pb-10 text-[#1f1b18] dark:text-zinc-100 lg:grid-cols-[1fr_360px]">
      <div className="space-y-9">
        <WelcomeSection name={name} language={language} />
        <ContinueLearningSection recentBundle={recentBundle} language={language} />
        <TodaysPicksSection language={language} />
        <RecentActivitySection language={language} />
        <QuickPracticeSection language={language} />
      </div>

      <LearnSidebar streakSummary={streakSummary} goalSummary={goalSummary} language={language} />
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
              loading="eager"
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
        href="/bundles"
        actionLabel={t.viewAll}
        titleClassName={`${getDisplayHeadingClass(language)} text-2xl`}
        actionClassName={continueLearningActionClassName}
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

function TodaysPicksSection({ language }: { language: DisplayLanguage }) {
  const t = loggedInSectionCopy[language];

  return (
    <section>
      <h2 className={`${getDisplayHeadingClass(language)} text-2xl`}>{t.todaysPicks}</h2>
      <div className="mt-5 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {lessonCards.map((card) => (
          <Link
            key={card.title}
            href="/bundles"
            className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-black/20 dark:hover:bg-zinc-800"
          >
            <div className="p-5">
              <p className="text-xs font-black uppercase tracking-wide text-[#5a975d]">{card.label}</p>
              <h3 className="mt-3 min-h-14 font-serif text-2xl font-semibold leading-tight">{card.title}</h3>
            </div>
            <div className="relative h-40">
              <Image src={card.image} alt={card.title} fill className="object-cover" sizes="(max-width: 1280px) 50vw, 260px" />
            </div>
            <div className="flex items-center justify-between px-5 py-4 text-xs text-zinc-500 dark:text-zinc-400">
              <span>Beginner</span>
              <span>{card.minutes}</span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

function RecentActivitySection({ language }: { language: DisplayLanguage }) {
  const t = loggedInSectionCopy[language];

  return (
    <section>
      <SectionHeader
        title={t.recentActivity}
        href="/my-videos"
        titleClassName={`${getDisplayHeadingClass(language)} text-2xl`}
      />
      <div className="mt-4 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-black/20">
        {activities.map((activity) => (
          <div key={activity.title} className="grid grid-cols-[76px_1fr_auto] items-center gap-4 border-b border-zinc-100 p-4 last:border-b-0 dark:border-zinc-800">
            <div className="relative h-14 overflow-hidden rounded-lg">
              <Image src={activity.image} alt="" fill className="object-cover" sizes="76px" />
            </div>
            <div className="min-w-0">
              <h3 className="truncate font-bold">{activity.title}</h3>
              <p className="mt-1 truncate text-sm text-zinc-500 dark:text-zinc-400">{activity.meta}</p>
            </div>
            <div className="text-right">
              <p className="font-bold text-[#4f934f]">{activity.status}</p>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{activity.date}</p>
            </div>
          </div>
        ))}
        <div className="flex justify-center p-4">
          <Link href="/my-videos" className="rounded-full border border-zinc-200 px-10 py-2 text-sm font-semibold transition hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800">
            {t.viewFullHistory}
          </Link>
        </div>
      </div>
    </section>
  );
}

function QuickPracticeSection({ language }: { language: DisplayLanguage }) {
  const t = loggedInSectionCopy[language];

  return (
    <section>
      <h2 className={`${getDisplayHeadingClass(language)} text-2xl`}>{t.quickPractice}</h2>
      <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">{t.quickPracticeDescription}</p>
      <div className="mt-5 grid gap-5 md:grid-cols-3">
        {quickPractice.map((item) => (
          <Link
            key={item.title}
            href="/bundles"
            className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-black/20 dark:hover:bg-zinc-800"
          >
            <div className="flex items-center gap-4">
              <span className={`flex h-14 w-14 items-center justify-center rounded-full ${item.color}`}>
                <item.icon className="h-7 w-7" />
              </span>
              <span>
                <strong className="block">{item.title}</strong>
                <span className="text-sm text-zinc-500 dark:text-zinc-400">{item.desc}</span>
              </span>
            </div>
            <ArrowRight className="h-5 w-5" />
          </Link>
        ))}
      </div>
    </section>
  );
}

function LearnSidebar({
  streakSummary,
  goalSummary,
  language,
}: {
  streakSummary: LearningStreakSummary;
  goalSummary: LearningGoalSummary;
  language: DisplayLanguage;
}) {
  return (
    <aside className="space-y-5 lg:self-start">
      <StreakCard summary={streakSummary} language={language} />
      <GoalCard summary={goalSummary} language={language} editable />
      <ProgressSummaryCard language={language} />
      <EncouragementCard language={language} />
    </aside>
  );
}

function ProgressSummaryCard({ language }: { language: DisplayLanguage }) {
  const t = loggedInSectionCopy[language];

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-black/20">
      <div className="mb-5 flex items-center justify-between">
        <h3 className={`${getDisplayHeadingClass(language)} text-xl`}>{t.progressTitle}</h3>
        <Link href="/profile" className="text-sm text-zinc-500 dark:text-zinc-400">{t.viewDetails}</Link>
      </div>
      <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
        {t.progressRows.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between py-3 text-sm">
            <span className="text-zinc-600 dark:text-zinc-400">{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

function EncouragementCard({ language }: { language: DisplayLanguage }) {
  const t = encouragementCopy[language];

  return (
    <div className="overflow-hidden rounded-xl bg-[#fff0d9] p-7 shadow-sm dark:bg-amber-950/30 dark:text-amber-100 dark:shadow-black/20">
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
