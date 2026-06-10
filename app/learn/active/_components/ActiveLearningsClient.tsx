'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { 
  ArrowLeft, 
  Layers, 
  TrendingUp, 
  CheckCircle2, 
  Star, 
  FileText, 
  Clock, 
  Calendar, 
  Play, 
  ArrowRight,
  MoreVertical,
  Compass,
  Award,
  Sparkles,
  Leaf
} from 'lucide-react';
import { CharacterAsset } from '@/components/assets/CharacterAsset';
import { getDisplayFontClass } from '@/app/bundles/bundle-utils';

export type DisplayLanguage = 'ko' | 'en';

export interface BundleWithProgress {
  id: string;
  title: string;
  title_en: string;
  thumbnail_url: string | null;
  categoryName: string;
  typeName: string;
  totalItems: number;
  completedItems: number;
  progressPercent: number;
  lastStudiedAt: string | null;
  status: 'In Progress' | 'Not Started' | 'Completed';
  lastPracticeItemId: string | null;
}

interface ActiveLearningsClientProps {
  bundles: BundleWithProgress[];
  language: DisplayLanguage;
  stats: {
    activeBundles: number;
    inProgress: number;
    completed: number;
    sentencesDone: number;
  };
  reviewNeeded: {
    sentences: number;
    words: number;
  };
}

const copy = {
  ko: {
    title: '나의 진행 중인 번들',
    backToLearn: '학습 홈으로',
    subtitle: '나만의 스페인어 여정, 한 번에 조금씩 계속해 보세요.',
    activeBundles: '진행 중인 번들',
    inProgress: '학습 중',
    completed: '완료됨',
    sentencesDone: '완료한 문장',
    keepGoing: '계속 달려봐요!',
    doingGreat: '잘하고 계세요!',
    niceWork: '멋진 성과예요!',
    totalCompleted: '총 완료 개수',
    continueFirst: '이어서 학습하기',
    pickUpLeftOff: '마지막으로 학습하던 곳에서 이어보세요.',
    itemsCompleted: (completed: number, total: number) => `${completed} / ${total} 항목 완료`,
    itemsLeft: (left: number) => `${left}개 남음`,
    estimatedTime: (min: number) => `약 ${min}분`,
    lastStudied: '최근 학습:',
    continueLesson: '학습 계속하기',
    start: '시작하기',
    continue: '계속하기',
    reviewAgain: '다시 학습하기',
    allTab: (count: number) => `전체 (${count})`,
    inProgressTab: (count: number) => `학습 중 (${count})`,
    notStartedTab: (count: number) => `시작 안 함 (${count})`,
    completedTab: (count: number) => `완료됨 (${count})`,
    sortBy: '정렬 기준',
    recentlyStudied: '최근 학습순',
    alphabetical: '가나다순',
    notStartedHeader: '시작 안 함',
    inProgressHeader: '학습 중',
    completedHeader: '완료됨',
    smallSteps: '매일매일의 작은 노력이 큰 변화를 만듭니다!',
    todayFocus: '오늘의 목표',
    makeCount: '오늘도 한 걸음 나아가 볼까요?',
    activeStats: '학습 통계',
    sentencesCompletedLabel: '완료한 문장 수',
    viewMyProgress: '나의 진행 상황 보기',
    reviewNeeded: '복습이 필요해요',
    keepFresh: '학습한 내용을 기억 속에 유지하세요!',
    sentences: '문장',
    words: '단어',
    startReview: '복습 시작하기',
    youAreDoingAmazing: '정말 잘하고 계세요!',
    consistencyKey: '꾸준함이 유창함으로 가는 가장 빠른 지름길입니다.',
    emptyTitle: '진행 중인 번들이 없습니다',
    emptyDescription: '학습 번들을 둘러보고 첫 학습을 시작해 보세요.',
    browseBundles: '번들 둘러보기',
  },
  en: {
    title: 'Your Active Bundles',
    backToLearn: 'Back to Learn',
    subtitle: 'Continue your Spanish journey, one small lesson at a time.',
    activeBundles: 'Active Bundles',
    inProgress: 'In Progress',
    completed: 'Completed',
    sentencesDone: 'Sentences Done',
    keepGoing: 'Keep going!',
    doingGreat: "You're doing great!",
    niceWork: 'Nice work!',
    totalCompleted: 'Total completed',
    continueFirst: 'Continue First',
    pickUpLeftOff: 'Pick up where you left off.',
    itemsCompleted: (completed: number, total: number) => `${completed} of ${total} items completed`,
    itemsLeft: (left: number) => `${left} items left`,
    estimatedTime: (min: number) => `~${min} min`,
    lastStudied: 'Last studied',
    continueLesson: 'Continue Lesson',
    start: 'Start',
    continue: 'Continue',
    reviewAgain: 'Review Again',
    allTab: (count: number) => `All (${count})`,
    inProgressTab: (count: number) => `In Progress (${count})`,
    notStartedTab: (count: number) => `Not Started (${count})`,
    completedTab: (count: number) => `Completed (${count})`,
    sortBy: 'Sort by',
    recentlyStudied: 'Recently Studied',
    alphabetical: 'Alphabetical',
    notStartedHeader: 'NOT STARTED',
    inProgressHeader: 'IN PROGRESS',
    completedHeader: 'COMPLETED',
    smallSteps: 'Small steps every day lead to big progress!',
    todayFocus: "Today's Focus",
    makeCount: 'Let\'s make today count!',
    activeStats: 'Active Stats',
    sentencesCompletedLabel: 'Sentences Completed',
    viewMyProgress: 'View My Progress',
    reviewNeeded: 'Review Needed',
    keepFresh: 'Keep your memory fresh!',
    sentences: 'Sentences',
    words: 'Words',
    startReview: 'Start Review',
    youAreDoingAmazing: "You're doing amazing!",
    consistencyKey: 'Consistency is the key to fluency.',
    emptyTitle: 'No active bundles',
    emptyDescription: 'Browse lesson bundles and start your learning journey.',
    browseBundles: 'Browse Bundles',
  },
};

function formatRelativeTime(dateStr: string | null, lang: 'ko' | 'en') {
  if (!dateStr) return lang === 'ko' ? '학습 이력 없음' : 'Never studied';
  
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays <= 0) {
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours <= 0) {
      const diffMins = Math.floor(diffMs / (1000 * 60));
      if (diffMins <= 1) return lang === 'ko' ? '방금 전' : 'Just now';
      return lang === 'ko' ? `${diffMins}분 전` : `${diffMins}m ago`;
    }
    return lang === 'ko' ? `${diffHours}시간 전` : `${diffHours}h ago`;
  }
  if (diffDays === 1) {
    return lang === 'ko' ? '어제' : 'Yesterday';
  }
  if (diffDays < 7) {
    return lang === 'ko' ? `${diffDays}일 전` : `${diffDays}d ago`;
  }
  
  return date.toLocaleDateString(lang === 'ko' ? 'ko-KR' : 'en-US', {
    month: 'short',
    day: 'numeric',
  });
}

export default function ActiveLearningsClient({
  bundles,
  language,
  stats,
  reviewNeeded,
}: ActiveLearningsClientProps) {
  const t = copy[language] || copy.ko;

  const [activeTab, setActiveTab] = useState<'all' | 'in-progress' | 'not-started' | 'completed'>('all');
  const [sortBy, setSortBy] = useState<'recent' | 'alphabetical'>('recent');

  // Find most recently studied bundle for the main hero card
  const continueFirstBundle = useMemo(() => {
    if (bundles.length === 0) return null;
    
    // Sort in-progress bundles by last studied
    const inProgress = bundles
      .filter((b) => b.status === 'In Progress' && b.lastStudiedAt)
      .sort((a, b) => new Date(b.lastStudiedAt!).getTime() - new Date(a.lastStudiedAt!).getTime());
    
    if (inProgress.length > 0) return inProgress[0];

    const anyInProgress = bundles.filter((b) => b.status === 'In Progress');
    if (anyInProgress.length > 0) return anyInProgress[0];

    const completed = bundles
      .filter((b) => b.status === 'Completed' && b.lastStudiedAt)
      .sort((a, b) => new Date(b.lastStudiedAt!).getTime() - new Date(a.lastStudiedAt!).getTime());
    if (completed.length > 0) return completed[0];

    const notStarted = bundles.filter((b) => b.status === 'Not Started');
    if (notStarted.length > 0) return notStarted[0];

    return bundles[0];
  }, [bundles]);

  // Filters & Sorting for the main list
  const filteredBundles = useMemo(() => {
    let list = [...bundles];
    if (activeTab === 'in-progress') {
      list = list.filter((b) => b.status === 'In Progress');
    } else if (activeTab === 'not-started') {
      list = list.filter((b) => b.status === 'Not Started');
    } else if (activeTab === 'completed') {
      list = list.filter((b) => b.status === 'Completed');
    }

    list.sort((a, b) => {
      if (sortBy === 'recent') {
        const timeA = a.lastStudiedAt ? new Date(a.lastStudiedAt).getTime() : 0;
        const timeB = b.lastStudiedAt ? new Date(b.lastStudiedAt).getTime() : 0;
        if (timeB !== timeA) return timeB - timeA;
        return (language === 'ko' ? a.title : a.title_en).localeCompare(language === 'ko' ? b.title : b.title_en);
      } else {
        const titleA = language === 'ko' ? a.title : a.title_en;
        const titleB = language === 'ko' ? b.title : b.title_en;
        return titleA.localeCompare(titleB);
      }
    });

    return list;
  }, [bundles, activeTab, sortBy, language]);

  // Group bundles by status for sections (used in 'all' tab)
  const groupedSections = useMemo(() => {
    const inProgress = filteredBundles.filter((b) => b.status === 'In Progress');
    const notStarted = filteredBundles.filter((b) => b.status === 'Not Started');
    const completed = filteredBundles.filter((b) => b.status === 'Completed');

    if (activeTab === 'all') {
      return [
        { id: 'in-progress', title: t.inProgressHeader, count: inProgress.length, items: inProgress },
        { id: 'not-started', title: t.notStartedHeader, count: notStarted.length, items: notStarted },
        { id: 'completed', title: t.completedHeader, count: completed.length, items: completed },
      ].filter((s) => s.count > 0);
    } else {
      // For specific tabs, render them as a single list under their header
      const singleTitle = activeTab === 'in-progress' ? t.inProgressHeader : activeTab === 'not-started' ? t.notStartedHeader : t.completedHeader;
      return [
        { id: activeTab, title: singleTitle, count: filteredBundles.length, items: filteredBundles }
      ].filter((s) => s.count > 0);
    }
  }, [filteredBundles, activeTab, t]);

  const allActiveCount = bundles.filter((b) => b.status !== 'Completed').length;
  const inProgressTotal = bundles.filter((b) => b.status === 'In Progress').length;
  const notStartedTotal = bundles.filter((b) => b.status === 'Not Started').length;
  const completedTotal = bundles.filter((b) => b.status === 'Completed').length;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 text-zinc-800 dark:text-zinc-100 min-h-[calc(100vh-8rem)]">
      {/* 1. Header Navigation & Mascot */}
      <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-8 relative">
        <div className="flex items-center gap-4">
          <Link
            href="/learn"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-700 shadow-sm transition hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
            aria-label={t.backToLearn}
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className={`text-3xl font-bold tracking-tight ${getDisplayFontClass(t.title)} text-zinc-900 dark:text-white`}>{t.title}</h1>
            <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mt-1">{t.subtitle}</p>
          </div>
        </div>
        {/* Study Mascot placement on right */}
        <div className="hidden md:block absolute right-4 -top-8">
          <div className="relative">
            <CharacterAsset name="studyfull" alt="Mascot" size={100} className="w-[100px] h-[100px] object-contain" />
            <div className="absolute top-2 right-2 animate-bounce">
              <Sparkles className="h-4 w-4 text-emerald-400 dark:text-emerald-300" />
            </div>
          </div>
        </div>
      </header>

      {/* 2. Top Statistics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {/* Active Bundles Card */}
        <div className="flex items-center gap-4 bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-150 dark:border-zinc-800 shadow-sm">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
            <Layers className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">{t.activeBundles}</p>
            <h3 className="text-2xl font-bold text-zinc-900 dark:text-white leading-tight mt-0.5">{stats.activeBundles}</h3>
            <p className="text-[10px] font-semibold text-[#3f8d54] dark:text-emerald-400">{t.keepGoing}</p>
          </div>
        </div>

        {/* In Progress Card */}
        <div className="flex items-center gap-4 bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-150 dark:border-zinc-800 shadow-sm">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
            <TrendingUp className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">{t.inProgress}</p>
            <h3 className="text-2xl font-bold text-zinc-900 dark:text-white leading-tight mt-0.5">{stats.inProgress}</h3>
            <p className="text-[10px] font-semibold text-amber-600 dark:text-amber-400">{t.doingGreat}</p>
          </div>
        </div>

        {/* Completed Card */}
        <div className="flex items-center gap-4 bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-150 dark:border-zinc-800 shadow-sm">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">{t.completed}</p>
            <h3 className="text-2xl font-bold text-zinc-900 dark:text-white leading-tight mt-0.5">{stats.completed}</h3>
            <p className="text-[10px] font-semibold text-purple-600 dark:text-purple-400">{t.niceWork}</p>
          </div>
        </div>

        {/* Sentences Done Card */}
        <div className="flex items-center gap-4 bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-150 dark:border-zinc-800 shadow-sm">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400">
            <Star className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">{t.sentencesDone}</p>
            <h3 className="text-2xl font-bold text-zinc-900 dark:text-white leading-tight mt-0.5">{stats.sentencesDone}</h3>
            <p className="text-[10px] font-semibold text-sky-600 dark:text-sky-400">{t.totalCompleted}</p>
          </div>
        </div>
      </div>

      {/* 3. Continue First Primary Hero Section */}
      {continueFirstBundle && (
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="h-4 w-4 text-emerald-500" />
            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">{t.continueFirst}</h2>
            <span className="text-xs font-medium text-zinc-400 dark:text-zinc-500">· {t.pickUpLeftOff}</span>
          </div>
          <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-150 dark:border-zinc-800 overflow-hidden shadow-sm hover:shadow-md transition flex flex-col md:flex-row p-6 gap-6">
            {/* Banner Thumbnail */}
            <div className="relative aspect-[16/10] w-full md:w-[280px] overflow-hidden rounded-2xl bg-zinc-50 dark:bg-zinc-800 shrink-0 shadow-sm">
              {continueFirstBundle.thumbnail_url ? (
                <Image
                  src={continueFirstBundle.thumbnail_url}
                  alt={continueFirstBundle.title}
                  fill
                  className="object-cover transition duration-300 hover:scale-105"
                  sizes="(max-width: 768px) 100vw, 280px"
                  priority
                />
              ) : (
                <div className="flex h-full items-center justify-center text-zinc-400 dark:text-zinc-600">
                  <Layers className="h-12 w-12" />
                </div>
              )}
            </div>

            {/* Banner Content */}
            <div className="flex flex-col flex-1 justify-between min-w-0">
              <div>
                <span className="inline-flex rounded-full bg-[#f4fbf6] dark:bg-emerald-950/40 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-[#3f8d54] dark:text-emerald-400">
                  {continueFirstBundle.categoryName}
                </span>
                <h3 className={`mt-3 text-2xl font-semibold ${getDisplayFontClass(language === 'ko' ? continueFirstBundle.title : continueFirstBundle.title_en)} text-zinc-950 dark:text-white leading-tight truncate`}>
                  {language === 'ko' ? continueFirstBundle.title : continueFirstBundle.title_en}
                </h3>
                <p className="mt-1 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                  {t.itemsCompleted(continueFirstBundle.completedItems, continueFirstBundle.totalItems)}
                </p>

                {/* Progress Bar */}
                <div className="mt-4 flex items-center gap-4">
                  <div className="h-3 flex-1 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                    <div 
                      className="h-full rounded-full bg-[#3f8d54] dark:bg-emerald-500 transition-all duration-500" 
                      style={{ width: `${continueFirstBundle.progressPercent}%` }} 
                    />
                  </div>
                  <span className="font-semibold text-sm text-zinc-800 dark:text-zinc-200 shrink-0 tabular-nums">
                    {continueFirstBundle.progressPercent}%
                  </span>
                </div>
              </div>

              {/* Bottom Metadata & Button */}
              <div className="mt-6 flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                  <span className="flex items-center gap-1.5">
                    <FileText className="h-4 w-4 text-zinc-400" />
                    {t.itemsLeft(continueFirstBundle.totalItems - continueFirstBundle.completedItems)}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Clock className="h-4 w-4 text-zinc-400" />
                    {t.estimatedTime(Math.max(1, Math.round((continueFirstBundle.totalItems - continueFirstBundle.completedItems) * 0.5)))}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-4 w-4 text-zinc-400" />
                    {t.lastStudied} {formatRelativeTime(continueFirstBundle.lastStudiedAt, language)}
                  </span>
                </div>
                
                <Link
                  href={
                    continueFirstBundle.lastPracticeItemId
                      ? `/bundles/${continueFirstBundle.id}/learn?item=${continueFirstBundle.lastPracticeItemId}`
                      : `/bundles/${continueFirstBundle.id}/learn`
                  }
                  className="group inline-flex items-center justify-center gap-2 rounded-xl bg-[#3f8d54] dark:bg-emerald-600 px-6 py-3 text-sm font-semibold text-white hover:bg-[#347946] dark:hover:bg-emerald-500 shadow-sm transition-all duration-200"
                >
                  <span>{t.continueLesson}</span>
                  <Play className="h-4 w-4 fill-white shrink-0 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 4. Two-Column Layout (Main Content) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* 4.1 Left Side: Bundle Filtering and Lists (2/3 width) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-zinc-50 dark:bg-zinc-900/50 p-2 rounded-2xl border border-zinc-150 dark:border-zinc-800">
            <div className="flex flex-wrap gap-1">
              <button
                onClick={() => setActiveTab('all')}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition ${
                  activeTab === 'all'
                    ? 'bg-[#3f8d54] text-white dark:bg-emerald-600 shadow-sm'
                    : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800'
                }`}
              >
                {t.allTab(allActiveCount + completedTotal)}
              </button>
              <button
                onClick={() => setActiveTab('in-progress')}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition ${
                  activeTab === 'in-progress'
                    ? 'bg-[#3f8d54] text-white dark:bg-emerald-600 shadow-sm'
                    : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800'
                }`}
              >
                {t.inProgressTab(inProgressTotal)}
              </button>
              <button
                onClick={() => setActiveTab('not-started')}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition ${
                  activeTab === 'not-started'
                    ? 'bg-[#3f8d54] text-white dark:bg-emerald-600 shadow-sm'
                    : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800'
                }`}
              >
                {t.notStartedTab(notStartedTotal)}
              </button>
              <button
                onClick={() => setActiveTab('completed')}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition ${
                  activeTab === 'completed'
                    ? 'bg-[#3f8d54] text-white dark:bg-emerald-600 shadow-sm'
                    : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800'
                }`}
              >
                {t.completedTab(completedTotal)}
              </button>
            </div>

            <div className="flex items-center gap-2 px-2 shrink-0">
              <span className="text-[11px] font-semibold uppercase text-zinc-400 dark:text-zinc-500">{t.sortBy}</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs font-semibold rounded-xl px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#3f8d54] dark:focus:ring-emerald-500 text-zinc-700 dark:text-zinc-200 shadow-sm cursor-pointer"
              >
                <option value="recent">{t.recentlyStudied}</option>
                <option value="alphabetical">{t.alphabetical}</option>
              </select>
            </div>
          </div>

          {/* List of Bundles Grouped by Status */}
          {filteredBundles.length === 0 ? (
            /* Empty State for filtering */
            <div className="flex flex-col items-center justify-center text-center rounded-3xl border border-dashed border-zinc-250 bg-white p-12 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50 min-h-[280px]">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#e5f0e4] text-[#3f8d54] dark:bg-emerald-950/50 dark:text-emerald-300 mb-4">
                <Compass className="h-7 w-7" />
              </span>
              <h3 className={`text-xl font-bold ${getDisplayFontClass(t.emptyTitle)} text-zinc-850 dark:text-zinc-150 mb-1`}>{t.emptyTitle}</h3>
              <p className="text-sm font-semibold text-zinc-400 dark:text-zinc-500 mb-6 max-w-sm">{t.emptyDescription}</p>
              <Link
                href="/bundles"
                className="inline-flex items-center justify-center rounded-xl bg-[#3f8d54] px-6 py-3 text-xs font-bold text-white hover:bg-[#347946] dark:bg-emerald-600 transition"
              >
                {t.browseBundles}
              </Link>
            </div>
          ) : (
            <div className="space-y-8">
              {groupedSections.map((section) => (
                <div key={section.id} className="space-y-3">
                  {/* Status Group Header */}
                  <h3 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 flex items-center gap-2">
                    <span>{section.title}</span>
                    <span className="h-1.5 w-1.5 rounded-full bg-zinc-300 dark:bg-zinc-700" />
                    <span>{section.count}</span>
                  </h3>
                  
                  {/* List Container */}
                  <div className="space-y-3">
                    {section.items.map((bundle) => {
                      const imageSrc = bundle.thumbnail_url;
                      const bundleTitle = language === 'ko' ? bundle.title : bundle.title_en;
                      
                      // Target route for buttons
                      const studyRoute = bundle.lastPracticeItemId
                        ? `/bundles/${bundle.id}/learn?item=${bundle.lastPracticeItemId}`
                        : `/bundles/${bundle.id}/learn`;

                      return (
                        <div
                          key={bundle.id}
                          className="flex items-center gap-4 bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-150 dark:border-zinc-800 shadow-sm hover:shadow transition"
                        >
                          {/* Bundle Cover */}
                          <div className="relative aspect-square w-16 overflow-hidden rounded-xl bg-zinc-50 dark:bg-zinc-800 shrink-0 shadow-sm">
                            {imageSrc ? (
                              <Image
                                src={imageSrc}
                                alt={bundleTitle}
                                fill
                                className="object-cover"
                                sizes="64px"
                              />
                            ) : (
                              <div className="flex h-full items-center justify-center text-zinc-400 dark:text-zinc-600">
                                <Layers className="h-6 w-6" />
                              </div>
                            )}
                          </div>

                          {/* Content Details */}
                          <div className="flex-1 min-w-0">
                            <span className="text-[9px] font-semibold uppercase tracking-wider text-[#3f8d54] dark:text-emerald-400">
                              {bundle.categoryName}
                            </span>
                            <h4 className={`font-semibold ${getDisplayFontClass(bundleTitle)} text-base text-zinc-900 dark:text-white leading-snug truncate mt-0.5`}>
                              {bundleTitle}
                            </h4>
                            <p className="text-[11px] font-medium text-zinc-400 dark:text-zinc-500 mt-0.5">
                              {t.itemsCompleted(bundle.completedItems, bundle.totalItems)}
                            </p>

                            {/* Progress Gauge */}
                            <div className="mt-2 flex items-center gap-2">
                              <div className="h-1.5 flex-1 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                                <div 
                                  className="h-full bg-[#3f8d54] dark:bg-emerald-500" 
                                  style={{ width: `${bundle.progressPercent}%` }} 
                                />
                              </div>
                              <span className="text-[10px] font-semibold text-zinc-600 dark:text-zinc-400 tabular-nums">
                                {bundle.progressPercent}%
                              </span>
                            </div>
                          </div>

                          {/* Right Buttons */}
                          <div className="flex items-center gap-2 shrink-0">
                            {bundle.status === 'Completed' ? (
                              <Link
                                href={`/bundles/${bundle.id}`}
                                className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-2 text-xs font-semibold text-zinc-600 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-700 shadow-sm transition"
                              >
                                {t.reviewAgain}
                              </Link>
                            ) : bundle.status === 'In Progress' ? (
                              <Link
                                href={studyRoute}
                                className="rounded-xl bg-[#3f8d54] hover:bg-[#347946] dark:bg-emerald-600 dark:hover:bg-emerald-500 px-4 py-2 text-xs font-semibold text-white shadow-sm transition"
                              >
                                {t.continue}
                              </Link>
                            ) : (
                              <Link
                                href={`/bundles/${bundle.id}`}
                                className="rounded-xl border border-[#3f8d54]/20 hover:border-[#3f8d54]/40 bg-[#f4fbf6] px-4 py-2 text-xs font-semibold text-[#3f8d54] dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30 dark:hover:bg-emerald-950/35 transition"
                              >
                                {t.start}
                              </Link>
                            )}
                            
                            <button
                              aria-label="Menu"
                              className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-50 hover:text-zinc-700 dark:text-zinc-500 dark:hover:bg-zinc-800/60 dark:hover:text-zinc-300 transition"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Leaf progress micro-banner */}
          <div className="flex items-center justify-center gap-2 py-4 bg-emerald-50/40 dark:bg-emerald-950/10 rounded-2xl text-[11px] font-medium text-[#3f8d54] dark:text-emerald-400 border border-emerald-50/20 dark:border-emerald-900/20">
            <Leaf className="h-4 w-4 text-emerald-500 fill-emerald-500 animate-pulse" />
            <span>{t.smallSteps}</span>
          </div>

        </div>

        {/* 4.2 Right Side: Sidebar sections (1/3 width) */}
        <div className="space-y-6">
          
          {/* Card 1: Today's Focus */}
          {continueFirstBundle && (
            <div className="bg-white dark:bg-zinc-900 p-5 rounded-3xl border border-zinc-150 dark:border-zinc-800 shadow-sm space-y-4">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-amber-400 animate-ping" />
                  {t.todayFocus}
                </h3>
                <p className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 mt-1">{t.makeCount}</p>
              </div>

              {/* Minimal Card */}
              <div className="p-3 bg-zinc-50/50 dark:bg-zinc-800/40 rounded-2xl border border-zinc-100 dark:border-zinc-800 flex items-center gap-3">
                <div className="relative aspect-square w-12 overflow-hidden rounded-lg bg-zinc-200 dark:bg-zinc-700 shrink-0">
                  {continueFirstBundle.thumbnail_url && (
                    <Image
                      src={continueFirstBundle.thumbnail_url}
                      alt={continueFirstBundle.title}
                      fill
                      className="object-cover"
                      sizes="48px"
                      priority
                    />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[8px] font-semibold uppercase text-zinc-400 dark:text-zinc-500">
                    {continueFirstBundle.categoryName}
                  </span>
                  <h4 className="text-xs font-semibold text-zinc-850 dark:text-zinc-200 leading-snug truncate">
                    {language === 'ko' ? continueFirstBundle.title : continueFirstBundle.title_en}
                  </h4>
                </div>
              </div>

              <Link
                href={
                  continueFirstBundle.lastPracticeItemId
                    ? `/bundles/${continueFirstBundle.id}/learn?item=${continueFirstBundle.lastPracticeItemId}`
                    : `/bundles/${continueFirstBundle.id}/learn`
                }
                className="group flex w-full items-center justify-center gap-2 rounded-xl bg-[#3f8d54] hover:bg-[#347946] dark:bg-emerald-600 dark:hover:bg-emerald-500 py-3 text-xs font-semibold text-white transition-all duration-200 shadow-sm"
              >
                <span>{t.continueLesson}</span>
                <Play className="h-3.5 w-3.5 fill-white group-hover:translate-x-0.5 transition-transform" />
              </Link>
              
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px] font-medium text-zinc-400 dark:text-zinc-500">
                  <span>{t.itemsCompleted(continueFirstBundle.completedItems, continueFirstBundle.totalItems)}</span>
                  <span>{continueFirstBundle.progressPercent}%</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                  <div className="h-full bg-emerald-500" style={{ width: `${continueFirstBundle.progressPercent}%` }} />
                </div>
              </div>
            </div>
          )}

          {/* Card 2: Active Stats */}
          <div className="bg-white dark:bg-zinc-900 p-5 rounded-3xl border border-zinc-150 dark:border-zinc-800 shadow-sm space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">{t.activeStats}</h3>
            
            <div className="space-y-3">
              {/* Stat rows */}
              <div className="flex items-center justify-between text-xs font-medium py-1 border-b border-zinc-50 dark:border-zinc-800/40">
                <span className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400">
                  <Layers className="h-4 w-4 text-emerald-500" />
                  {t.activeBundles}
                </span>
                <span className="text-zinc-800 dark:text-zinc-200 font-semibold">{stats.activeBundles}</span>
              </div>
              <div className="flex items-center justify-between text-xs font-medium py-1 border-b border-zinc-50 dark:border-zinc-800/40">
                <span className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400">
                  <TrendingUp className="h-4 w-4 text-amber-500" />
                  {t.inProgress}
                </span>
                <span className="text-zinc-800 dark:text-zinc-200 font-semibold">{stats.inProgress}</span>
              </div>
              <div className="flex items-center justify-between text-xs font-medium py-1 border-b border-zinc-50 dark:border-zinc-800/40">
                <span className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400">
                  <Compass className="h-4 w-4 text-zinc-400" />
                  {t.notStartedHeader}
                </span>
                <span className="text-zinc-800 dark:text-zinc-200 font-semibold">{bundles.filter(b => b.status === 'Not Started').length}</span>
              </div>
              <div className="flex items-center justify-between text-xs font-medium py-1 border-b border-zinc-50 dark:border-zinc-800/40">
                <span className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400">
                  <CheckCircle2 className="h-4 w-4 text-purple-500" />
                  {t.completed}
                </span>
                <span className="text-zinc-800 dark:text-zinc-200 font-semibold">{stats.completed}</span>
              </div>
              <div className="flex items-center justify-between text-xs font-medium py-1">
                <span className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400">
                  <Star className="h-4 w-4 text-sky-500" />
                  {t.sentencesCompletedLabel}
                </span>
                <span className="text-zinc-800 dark:text-zinc-200 font-semibold">{stats.sentencesDone}</span>
              </div>
            </div>

            <Link
              href="/learn"
              className="group flex w-full items-center justify-center gap-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 py-2.5 text-xs font-semibold text-zinc-600 dark:text-zinc-300 transition shadow-sm"
            >
              <span>{t.viewMyProgress}</span>
              <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>

          {/* Card 3: Review Needed */}
          <div className="bg-white dark:bg-zinc-900 p-5 rounded-3xl border border-zinc-150 dark:border-zinc-800 shadow-sm space-y-4">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">{t.reviewNeeded}</h3>
              <p className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 mt-1">{t.keepFresh}</p>
            </div>

            {/* Counts Display Box */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-rose-50/50 dark:bg-rose-950/10 rounded-2xl border border-rose-100/30 dark:border-rose-950/20 text-center">
                <p className="text-2xl font-bold text-rose-600 dark:text-rose-400">{reviewNeeded.sentences}</p>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-rose-400 dark:text-rose-500 mt-0.5">{t.sentences}</p>
              </div>
              <div className="p-3 bg-amber-50/40 dark:bg-amber-950/10 rounded-2xl border border-amber-100/30 dark:border-amber-950/20 text-center">
                <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{reviewNeeded.words}</p>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-400 dark:text-amber-500 mt-0.5">{t.words}</p>
              </div>
            </div>

            <Link
              href="/bundles"
              className="group flex w-full items-center justify-center gap-1 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 py-2.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300 transition shadow-sm"
            >
              <span>{t.startReview}</span>
              <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>

          {/* Card 4: Encouragement */}
          <div className="bg-gradient-to-br from-emerald-500 to-teal-600 dark:from-emerald-600 dark:to-teal-700 p-5 rounded-3xl text-white shadow-sm space-y-4 relative overflow-hidden">
            {/* Background pattern */}
            <div className="absolute right-0 bottom-0 opacity-10 translate-x-4 translate-y-4 shrink-0">
              <Award className="h-32 w-32" />
            </div>

            <div className="flex justify-between items-start gap-4">
              <div className="space-y-2 relative z-10">
                <span className="inline-flex rounded-full bg-white/20 px-2.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider">
                  LINCO TIP
                </span>
                <h4 className={`text-base font-semibold ${getDisplayFontClass(t.youAreDoingAmazing)} leading-tight`}>
                  {t.youAreDoingAmazing}
                </h4>
                <p className="text-xs font-medium text-emerald-100 leading-normal">
                  {t.consistencyKey}
                </p>
              </div>
              <div className="shrink-0">
                <CharacterAsset name="studyfull" alt="Mascot" size={64} className="w-16 h-16 object-contain" />
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
