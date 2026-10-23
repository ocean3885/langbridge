import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowRight,
  Compass,
  Play,
} from 'lucide-react';
import { StudyfullAsset } from '@/components/assets/CharacterBadges';
import { getBundleLevelDisplay } from '@/lib/bundle-level';
import type { ActiveLearningBundle, LearningProficiencySummary, LearningProgressSummary, RecentStudiedBundle } from '@/lib/supabase/services/bundle-progress';
import type { LearningStreakSummary } from '@/lib/supabase/services/learning-daily-activity';
import type { LearningGoalSummary } from '@/lib/supabase/services/learning-goal-preferences';
import type { ReviewNeededSummary } from '@/lib/supabase/services/learning-review';
import { getBundleTitle, getCategoryName } from '../../bundles/bundle-utils';
import { BundleLearningMetrics, getHomeLearningActionLabel } from './BundleLearningMetrics';
import { PracticeModeIcon } from '@/components/practice/PracticeModeIcon';
import { practiceModeColors } from '@/components/practice/practice-mode-colors';
import { PRACTICE_REGISTRY } from '@/lib/practice/registry';
import { ActiveBundlesSection } from './ActiveBundlesSection';
import { GoalCard } from './ProgressCards';
import { ReviewNeededSection } from './ReviewNeededSection';
import { SectionHeader } from './SectionHeader';
import { StreakCard } from './StreakCard';

type DisplayLanguage = 'ko' | 'en';

const continueLearningCopy = {
  ko: {
    sectionTitle: '이어서 학습하기',
    fallbackCategory: '학습 번들',
    fallbackTitle: '제목 없는 번들',
    currentItem: (current: number, total: number) => `${current} / ${total} 항목`,
    completedItems: (completed: number, total: number) => `${completed} / ${total} 완료`,
    fallbackPreview: '이어서 학습을 시작해보세요.',
    continueLesson: '학습 계속하기',
    emptyTitle: '학습할 번들을 선택해보세요',
    emptyDescription: '학습 번들을 선택하면 진행 상황이 여기에 표시됩니다.',
    browseBundles: '번들 둘러보기',
    today: '오늘',
    yesterday: '어제',
    daysAgo: (days: number) => `${days}일 전`,
  },
  en: {
    sectionTitle: 'Continue Learning',
    fallbackCategory: 'Learning Bundle',
    fallbackTitle: 'Untitled Bundle',
    currentItem: (current: number, total: number) => `Item ${current} of ${total}`,
    completedItems: (completed: number, total: number) => `${completed} of ${total} completed`,
    fallbackPreview: 'Pick up where you left off.',
    continueLesson: 'Continue Lesson',
    emptyTitle: 'Choose a bundle to learn',
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
    todaySummary: '오늘 학습 요약',
    exploreBundles: '새로운 번들 탐색하기',
    quickPractice: '빠른 연습',
    quickPracticeDescriptionPrefix: '최근 학습하던',
    quickPracticeDescriptionSuffix: '번들로 돌아가 가볍게 복습해 보세요.',
    progressTitle: '학습 현황',
    learnedSentences: '학습한 문장',
    learnedWords: '학습한 단어',
    completedBundles: '전체 완료 번들',
    practiceAccuracy: '연습 정답률',
    viewDetailedProgress: '자세한 학습 현황 보기',
    viewAllBundles: '전체 번들 보기',
  },
  en: {
    todaySummary: "Today's Summary",
    exploreBundles: 'Explore More Bundles',
    quickPractice: 'Quick Practice',
    quickPracticeDescriptionPrefix: 'Jump back into',
    quickPracticeDescriptionSuffix: 'with a short practice session.',
    progressTitle: 'Your Progress',
    learnedSentences: 'Sentences studied',
    learnedWords: 'Words studied',
    completedBundles: 'Fully completed bundles',
    practiceAccuracy: 'Practice Accuracy',
    viewDetailedProgress: 'View detailed progress',
    viewAllBundles: 'View all bundles',
  },
};

export function LoggedInLearnPage({
  name,
  recentBundle,
  activeBundles,
  reviewNeededSummary,
  recommendedBundles,
  streakSummary,
  goalSummary,
  progressSummary,
  proficiencySummary,
  language,
}: {
  name: string;
  recentBundle: RecentStudiedBundle | null;
  activeBundles: ActiveLearningBundle[];
  reviewNeededSummary: ReviewNeededSummary;
  recommendedBundles: any[];
  streakSummary: LearningStreakSummary;
  goalSummary: LearningGoalSummary;
  progressSummary: LearningProgressSummary;
  proficiencySummary: LearningProficiencySummary;
  language: DisplayLanguage;
}) {
  const displayedProgressSummary = {
    ...progressSummary,
    activeBundles: activeBundles.length,
  };

  return (
    <div className="mx-auto grid max-w-7xl gap-7 px-2 pb-10 text-[#1f1b18] dark:text-zinc-100 lg:grid-cols-[1fr_360px]">
      <div className="space-y-9">
        <WelcomeSection name={name} language={language} />
        <MobileTodaySummary
          streakSummary={streakSummary}
          goalSummary={goalSummary}
          reviewNeededSummary={reviewNeededSummary}
          language={language}
        />
        <ContinueLearningSection recentBundle={recentBundle} language={language} />
        <ActiveBundlesSection
          bundles={activeBundles}
          featuredBundleId={recentBundle?.bundle.id}
          language={language}
        />
        {recommendedBundles.length > 0 && <ExploreBundlesSection bundles={recommendedBundles} language={language} />}
        <QuickPracticeSection recentBundle={recentBundle} language={language} />
      </div>

      <LearnSidebar
        streakSummary={streakSummary}
        goalSummary={goalSummary}
        reviewNeededSummary={reviewNeededSummary}
        progressSummary={displayedProgressSummary}
        proficiencySummary={proficiencySummary}
        language={language}
      />
    </div>
  );
}

function MobileTodaySummary({
  streakSummary,
  goalSummary,
  reviewNeededSummary,
  language,
}: {
  streakSummary: LearningStreakSummary;
  goalSummary: LearningGoalSummary;
  reviewNeededSummary: ReviewNeededSummary;
  language: DisplayLanguage;
}) {
  const t = loggedInSectionCopy[language];

  return (
    <section className="lg:hidden">
      <h2 className={`${getDisplayHeadingClass(language)} text-2xl`}>{t.todaySummary}</h2>
      <div className="mt-4 space-y-4">
        <StreakCard summary={streakSummary} language={language} />
        <GoalCard summary={goalSummary} language={language} editable />
        <ReviewNeededSection summary={reviewNeededSummary} language={language} compact />
      </div>
    </section>
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

export function ContinueLearningSection({ recentBundle, language }: { recentBundle: RecentStudiedBundle | null; language: DisplayLanguage }) {
  const t = continueLearningCopy[language];

  if (!recentBundle) {
    return <ContinueLearningEmptyState language={language} />;
  }

  const { bundle, currentItem, interaction, learning } = recentBundle;
  const categoryName = language === 'ko'
    ? bundle.bundle_category?.name || bundle.bundle_category?.name_en || bundle.bundle_type?.name || t.fallbackCategory
    : bundle.bundle_category?.name_en || bundle.bundle_category?.name || bundle.bundle_type?.name || t.fallbackCategory;
  const title = language === 'ko'
    ? bundle.title || bundle.title_en || t.fallbackTitle
    : bundle.title_en || bundle.title || t.fallbackTitle;
  const imageSrc = bundle.thumbnail_url || '/images/bundle-fallback.webp';
  const level = getBundleLevelDisplay(bundle.level, language);
  const currentLabel = learning.sentenceCount > 0
    ? learning.hasListened
      ? (language === 'ko' ? `청취 위치 ${learning.currentStep}/${learning.sentenceCount}` : `Listening position ${learning.currentStep}/${learning.sentenceCount}`)
      : (language === 'ko' ? '아직 청취 기록이 없습니다' : 'No listening history yet')
    : (language === 'ko' ? '단어 연습 번들' : 'Word practice bundle');
  const sentencePreview =
    currentItem?.sentence?.sentence ||
    (language === 'ko' ? bundle.description || bundle.description_en : bundle.description_en || bundle.description) ||
    t.fallbackPreview;
  const lastStudiedLabel = formatRelativeStudyDate(interaction.last_studied_at, language);
  const learnHref = learning.href;

  return (
    <section>
      <SectionHeader
        title={t.sectionTitle}
        titleClassName={`${getDisplayHeadingClass(language)} text-2xl`}
      />
      <div className="mt-4 grid gap-5 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-black/20 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1fr)] lg:items-center lg:gap-7">
        <Link href={`/bundles/${bundle.id}`} className="relative block aspect-video overflow-hidden rounded-lg bg-[#f3ede3] dark:bg-zinc-800">
          <Image
            src={imageSrc}
            alt={title}
            fill
            priority
            className="object-cover"
            sizes="(max-width: 1024px) 100vw, (max-width: 1280px) 42vw, 520px"
          />
        </Link>
        <div className="flex min-w-0 flex-col justify-center px-1 pb-2 pt-1 sm:px-2 lg:p-0 lg:pr-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="rounded-md bg-zinc-100 px-2.5 py-0.5 text-xs font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
              {categoryName}
            </span>
            <span
              className="rounded-md bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
              title={level.label}
            >
              {level.shortLabel}
            </span>
            {lastStudiedLabel && (
              <span className="text-xs font-medium text-zinc-400 dark:text-zinc-500">
                · {lastStudiedLabel}
              </span>
            )}
          </div>
          <h2 className={`mt-3 ${getDisplayHeadingClass(language)} text-2xl sm:text-3xl font-bold`}><Link href={`/bundles/${bundle.id}`}>{title}</Link></h2>
          <p className="mt-2 text-sm font-semibold text-zinc-500 dark:text-zinc-400">{currentLabel}</p>
          <p className="mt-2 line-clamp-2 text-sm sm:text-base leading-relaxed text-zinc-600 dark:text-zinc-300">{sentencePreview}</p>
          <BundleLearningMetrics learning={learning} language={language} />
          <div className="mt-6 flex items-center justify-center gap-4 lg:justify-start">
            <Link
              href={learnHref}
              className="inline-flex items-center gap-2 rounded-lg bg-[#3f9657] px-6 py-2.5 text-sm font-bold text-white shadow-xs transition hover:bg-[#2f7d4a] active:scale-95"
            >
              <Play className="h-4 w-4 fill-current" />
              <span>{getHomeLearningActionLabel(learning.action, language)}</span>
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

export function ExploreBundlesSection({ bundles, language }: { bundles: any[]; language: DisplayLanguage }) {
  const t = loggedInSectionCopy[language];

  return (
    <section>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className={`${getDisplayHeadingClass(language)} text-2xl`}>{t.exploreBundles}</h2>
        <Link
          href="/bundles"
          className="inline-flex items-center justify-center gap-2 rounded-full border border-zinc-200 bg-white px-5 py-2 text-sm font-semibold text-zinc-600 shadow-sm transition hover:border-[#8bbf87] hover:bg-[#f1f8ef] hover:text-[#3f7d42] dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:shadow-black/20 dark:hover:border-emerald-700 dark:hover:bg-emerald-950/30 dark:hover:text-emerald-100"
        >
          {t.viewAllBundles}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
      <div className="mt-5 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {bundles.map((bundle) => {
          const title = getBundleTitle(bundle, language);
          const imageSrc = bundle.thumbnail_url || '/images/bundle-fallback.webp';
          const categoryName = getCategoryName(bundle, language);
          const level = getBundleLevelDisplay(bundle.level, language);
          const itemCount = bundle.sentence_count || 0;
          const wordCount = bundle.study_words_count || 0;
          const itemLabel = language === 'ko' ? `문장 ${itemCount}개 · 단어 ${wordCount}개` : `${itemCount} sentences · ${wordCount} words`;

          return (
            <Link
              key={bundle.id}
              href={`/bundles/${bundle.id}`}
              className="group flex flex-col justify-between overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xs transition hover:border-[#8bbf87] hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
            >
              <div className="p-4 sm:p-5">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="rounded-md bg-zinc-100 px-2 py-0.5 text-[11px] font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                    {categoryName}
                  </span>
                  <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                    {level.shortLabel}
                  </span>
                </div>
                <h3 className="mt-2.5 line-clamp-2 min-h-12 text-lg sm:text-xl font-bold leading-snug text-zinc-900 group-hover:text-[#2f7d4a] dark:text-zinc-100 dark:group-hover:text-emerald-400 transition-colors">
                  {title}
                </h3>
              </div>
              <div className="relative aspect-[16/10] w-full overflow-hidden bg-zinc-100 dark:bg-zinc-800">
                <Image src={imageSrc} alt={title || ''} fill className="object-cover transition duration-300 group-hover:scale-105" sizes="(max-width: 1280px) 50vw, 260px" />
              </div>
              <div className="flex items-center justify-between border-t border-zinc-100 px-5 py-3 text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                <span className="font-medium text-zinc-500">{level.label}</span>
                <span className="font-semibold text-zinc-700 dark:text-zinc-300">{itemLabel}</span>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

export function QuickPracticeSection({ recentBundle, language }: { recentBundle: RecentStudiedBundle | null; language: DisplayLanguage }) {
  if (!recentBundle) return null;

  const t = loggedInSectionCopy[language];
  const title = getRecentBundleTitle(recentBundle, language);
  const practiceItems = recentBundle.learning.modes;
  if (!practiceItems.length) return null;

  return (
    <section>
      <h2 className={`${getDisplayHeadingClass(language)} text-2xl`}>{t.quickPractice}</h2>
      <p className="mt-2 line-clamp-2 text-sm text-zinc-500 dark:text-zinc-400">
        {t.quickPracticeDescriptionPrefix}{' '}
        <strong className="font-bold text-zinc-800 dark:text-zinc-100">"{title}"</strong>{' '}
        {t.quickPracticeDescriptionSuffix}
      </p>
      <div className="mt-5 grid gap-5 md:grid-cols-3">
        {practiceItems.map((item) => (
          <Link
            key={item.mode}
            href={item.href}
            className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-black/20 dark:hover:bg-zinc-800"
          >
            <div className="flex min-w-0 items-center gap-4">
              <span className={`flex h-14 w-14 items-center justify-center rounded-full ${practiceModeColors[item.mode]}`}>
                <PracticeModeIcon mode={item.mode} className="h-7 w-7" />
              </span>
              <span className="min-w-0">
                <strong className="block truncate">{language === 'ko' ? quickModeLabels[item.mode] : PRACTICE_REGISTRY[item.mode].label}</strong>
                <span className="line-clamp-2 text-sm text-zinc-500 dark:text-zinc-400">{item.completed ? (language === 'ko' ? '복습하기' : 'Review again') : (language === 'ko' ? '이어서 연습하기' : 'Continue practicing')}</span>
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

const quickModeLabels = {
  quiz: '문장 퀴즈', scramble: '스크램블', wordfill: '단어 채우기', spelling: '스펠링',
  flashcards: '문장 플래시카드', word_quiz: '단어 퀴즈', word_flashcards: '단어 플래시카드',
};

function LearnSidebar({
  streakSummary,
  goalSummary,
  reviewNeededSummary,
  progressSummary,
  proficiencySummary,
  language,
}: {
  streakSummary: LearningStreakSummary;
  goalSummary: LearningGoalSummary;
  reviewNeededSummary: ReviewNeededSummary;
  progressSummary: LearningProgressSummary;
  proficiencySummary: LearningProficiencySummary;
  language: DisplayLanguage;
}) {
  return (
    <aside className="space-y-5 lg:self-start">
      <div className="hidden space-y-5 lg:block">
        <StreakCard summary={streakSummary} language={language} />
        <GoalCard summary={goalSummary} language={language} editable />
        <ReviewNeededSection summary={reviewNeededSummary} language={language} compact />
      </div>
      <ProgressSummaryCard summary={progressSummary} proficiencySummary={proficiencySummary} language={language} />
      <EncouragementCard language={language} />
    </aside>
  );
}

function ProgressSummaryCard({ summary, proficiencySummary, language }: { summary: LearningProgressSummary; proficiencySummary: LearningProficiencySummary; language: DisplayLanguage }) {
  const t = loggedInSectionCopy[language];
  const rows = [
    [t.learnedSentences, formatCount(proficiencySummary.sentences.total)],
    [t.learnedWords, formatCount(proficiencySummary.words.total)],
    [t.completedBundles, formatCount(summary.completedBundles)],
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
              {label}
            </span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
      <Link
        href="/learn/progress"
        className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm font-bold text-zinc-700 transition hover:border-[#8bbf87] hover:bg-[#f1f8ef] hover:text-[#3f7d42] dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:border-emerald-700 dark:hover:bg-emerald-950/30 dark:hover:text-emerald-100"
      >
        {t.viewDetailedProgress}
        <ArrowRight className="h-4 w-4" />
      </Link>
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
