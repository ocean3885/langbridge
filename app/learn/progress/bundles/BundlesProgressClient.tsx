'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowLeft, ArrowRight, BookOpen, CheckCircle2, ChevronLeft, ChevronRight, CircleGauge,
  Clock3, Filter, FolderOpen, Layers3, Play, RotateCcw, Search, X,
} from 'lucide-react';
import ProgressMobileMenu from '../ProgressMobileMenu';
import ProgressSidebar from '../ProgressSidebar';
import { getBundleLevelDisplay } from '@/lib/bundle-level';
import type { UserBundleRecord, UserBundlesSummary, UserBundleStatus } from '@/lib/supabase/services/user-bundles';

import { compareBundleProgress, type BundleSortKey } from '@/lib/bundle-progress-sort';

type Language = 'ko' | 'en';
type StatusFilter = 'all' | UserBundleStatus | 'pinned';
type SortKey = BundleSortKey;
const PAGE_SIZE = 12;

const copy = {
  ko: {
    back: 'Overview로 돌아가기', title: 'Bundles', description: '학습 중이거나 완료한 번들의 진행 상황을 확인하세요.', explore: '새 번들 찾기',
    total: '내 번들', active: '학습중', completed: '전체 완료', average: '스타 달성률', averageHelp: '번들별 스타 달성률의 평균입니다. 스타 대상이 없는 번들은 제외합니다.', continueTitle: '이어서 학습', continue: '이어서 학습', start: '학습 시작', details: '상세 보기',
    myBundles: '내 번들 목록', results: (n: number) => `${n}개 번들`, search: '번들 제목이나 설명 검색', status: '상태', category: '카테고리', level: '난이도', sort: '정렬', all: '전체', pinned: '저장한 번들',
    saved: '시작 전', inProgress: '학습중', sentenceCompleted: '문장 완료', wordCompleted: '단어 완료', completedStatus: '전체 완료', recent: '최근 학습순', oldest: '오래된 학습순', highProgress: '달성률 높은 순', lowProgress: '달성률 낮은 순',
    progress: '진행률', completedItems: (done: number, total: number) => `${done} / ${total} 완료`, lastStudied: '마지막 학습', never: '아직 없음', accuracy: '정답률', noAttempts: '기록 없음', correctIncorrect: (c: number, i: number) => `정답 ${c} · 오답 ${i}`,
    bundleInfo: '번들 정보', startedAt: '학습 시작', completedAt: '완료일', practiceModes: '연습 모드', basicLearning: '기본 학습', flashcards: '플래시카드', quiz: '문장 퀴즈', scramble: '스크램블', wordfill: '단어 채우기', spelling: '스펠링', close: '닫기',
    emptyTitle: '조건에 맞는 번들이 없습니다.', emptyBody: '검색어나 필터를 바꾸어 확인해보세요.', emptyAllTitle: '아직 내 번들이 없습니다.', emptyAllBody: '관심 있는 번들을 저장하거나 첫 학습을 시작해보세요.', previous: '이전', next: '다음', saveFailed: '저장 상태를 변경하지 못했습니다.', resetFilters: '필터 초기화',
    stars: (earned: number, max: number) => `문장 스타 ${earned}/${max}`,
    plays: (n: number) => `청취 ${n}회`,
    wordsLearned: (learned: number, total: number) => `단어 ${learned}/${total}`,
    sentenceCount: (n: number) => `문장 ${n}개`,
    wordCount: (n: number) => `단어 ${n}개`,
    completedBadge: '전체 완료',
    starsLabel: '마스터리 스타',
    totalPlaysLabel: '누적 청취',
    wordsLabel: '단어 학습', knownWords: (n: number) => `이전에 학습한 단어 ${n}개 포함`,
  },
  en: {
    back: 'Back to Overview', title: 'Bundles', description: 'Track bundles you are learning or have completed.', explore: 'Explore bundles',
    total: 'My bundles', active: 'In progress', completed: 'Fully completed', average: 'Star achievement', averageHelp: 'Average star achievement across bundles with star targets.', continueTitle: 'Continue learning', continue: 'Continue', start: 'Start', details: 'View details',
    myBundles: 'My bundle list', results: (n: number) => `${n} bundles`, search: 'Search bundle titles or descriptions', status: 'Status', category: 'Category', level: 'Level', sort: 'Sort', all: 'All', pinned: 'Saved bundles',
    saved: 'Not started', inProgress: 'In progress', sentenceCompleted: 'Sentences complete', wordCompleted: 'Words complete', completedStatus: 'Fully completed', recent: 'Recently studied', oldest: 'Oldest studied', highProgress: 'Highest achievement', lowProgress: 'Lowest achievement',
    progress: 'Progress', completedItems: (done: number, total: number) => `${done} / ${total} complete`, lastStudied: 'Last studied', never: 'Not yet', accuracy: 'Accuracy', noAttempts: 'No attempts', correctIncorrect: (c: number, i: number) => `${c} correct · ${i} incorrect`,
    bundleInfo: 'Bundle details', startedAt: 'Started', completedAt: 'Completed on', practiceModes: 'Practice modes', basicLearning: 'Basic learning', flashcards: 'Flashcards', quiz: 'Sentence Quiz', scramble: 'Scramble', wordfill: 'Word Fill', spelling: 'Spelling', close: 'Close',
    emptyTitle: 'No bundles match these filters.', emptyBody: 'Try another search or filter.', emptyAllTitle: 'No bundles here yet.', emptyAllBody: 'Save a bundle or begin your first lesson.', previous: 'Previous', next: 'Next', saveFailed: 'Could not update the saved state.', resetFilters: 'Reset filters',
    stars: (earned: number, max: number) => `Sentence stars ${earned}/${max}`,
    plays: (n: number) => `${n} plays`,
    wordsLearned: (learned: number, total: number) => `Words ${learned}/${total}`,
    sentenceCount: (n: number) => `${n} sentences`,
    wordCount: (n: number) => `${n} words`,
    completedBadge: 'Fully completed',
    starsLabel: 'Mastery Stars',
    totalPlaysLabel: 'Total Plays',
    wordsLabel: 'Word Progress', knownWords: (n: number) => `Includes ${n} previously studied words`,
  },
};

export default function BundlesProgressClient({ initialData, language }: { initialData: { bundles: UserBundleRecord[]; summary: UserBundlesSummary }; language: Language }) {
  const t = copy[language];
  const [bundles, setBundles] = useState(initialData.bundles);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [category, setCategory] = useState('all');
  const [level, setLevel] = useState('all');
  const [sort, setSort] = useState<SortKey>('recent');
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = selectedId ? bundles.find(bundle => bundle.bundleId === selectedId) || null : null;
  const categories = useMemo(() => Array.from(new Map(bundles.filter(item => item.categoryId).map(item => [item.categoryId!, categoryLabel(item, language)])).entries()).sort((a, b) => a[1].localeCompare(b[1])), [bundles, language]);
  const levels = useMemo(() => Array.from(new Set(bundles.map(item => item.level).filter((value): value is number => value !== null))).sort((a, b) => a - b), [bundles]);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    return bundles
      .filter(bundle => !normalized || [bundle.title, bundle.titleEn, bundle.description, bundle.descriptionEn].some(value => value?.toLocaleLowerCase().includes(normalized)))
      .filter(bundle => matchesBundleStatus(bundle, status))
      .filter(bundle => category === 'all' || bundle.categoryId === category)
      .filter(bundle => level === 'all' || bundle.level === Number(level))
      .sort((a, b) => compareBundleProgress(a, b, sort));
  }, [bundles, query, status, category, level, sort, language]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const visible = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  function applyFilter(callback: () => void) { callback(); setPage(1); }

  function resetFilters() {
    setQuery('');
    setStatus('all');
    setCategory('all');
    setLevel('all');
    setSort('recent');
    setPage(1);
  }

  return <main className="mx-auto max-w-7xl px-0 pb-10 text-zinc-950 dark:text-zinc-100 lg:px-2">
    <ProgressMobileMenu language={language} activeIndex={3} />
    <div className="grid min-h-[calc(100vh-140px)] overflow-hidden bg-white dark:bg-zinc-950 lg:grid-cols-[238px_minmax(0,1fr)] lg:rounded-xl lg:border lg:border-zinc-200 lg:dark:border-zinc-800">
      <ProgressSidebar language={language} activeIndex={3} />
      <section className="min-w-0">
        <header className="border-b border-zinc-200 px-4 py-6 dark:border-zinc-800 sm:px-8 lg:px-10"><Link href="/learn/progress" className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-500 hover:text-[#2f7d4a] dark:text-zinc-400"><ArrowLeft className="h-4 w-4" />{t.back}</Link><div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><h1 className="text-3xl font-bold sm:text-4xl">{t.title}</h1><p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-300">{t.description}</p></div><Link href="/bundles" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-[#3f9657] px-5 text-sm font-bold text-white hover:bg-[#2f7d4a]"><FolderOpen className="h-4 w-4" />{t.explore}</Link></div></header>
        <div className="px-4 py-6 sm:px-8 lg:px-10">
          <section className="grid grid-cols-2 gap-3 xl:grid-cols-4"><SummaryItem icon={Layers3} label={t.total} value={initialData.summary.total} tone="green" /><SummaryItem icon={Clock3} label={t.active} value={initialData.summary.active} tone="coral" /><SummaryItem icon={CheckCircle2} label={t.completed} value={initialData.summary.completed} tone="blue" /><SummaryItem icon={CircleGauge} label={t.average} description={t.averageHelp} value={`${initialData.summary.averageStarAchievement}%`} tone="amber" /></section>
          <section className="mt-8"><div className="flex items-center justify-between"><h2 className="text-xl font-bold">{t.myBundles}</h2><span className="text-sm font-medium text-zinc-500">{t.results(filtered.length)}</span></div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-[minmax(230px,1fr)_170px_170px_130px_180px]">
              <label className="relative sm:col-span-2 lg:col-span-1 xl:col-auto">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                <input value={query} onChange={event => applyFilter(() => setQuery(event.target.value))} placeholder={t.search} className="h-11 w-full rounded-md border border-zinc-200 bg-white pl-10 pr-3 text-sm outline-none focus:border-[#3f9657] dark:border-zinc-700 dark:bg-zinc-900" />
              </label>
              <Select value={status} onChange={value => applyFilter(() => setStatus(value as StatusFilter))} label={t.status} options={statusOptions(t)} />
              <Select value={category} onChange={value => applyFilter(() => setCategory(value))} label={t.category} options={[{ value: 'all', label: t.all }, ...categories.map(([value, label]) => ({ value, label }))]} />
              <Select value={level} onChange={value => applyFilter(() => setLevel(value))} label={t.level} options={[{ value: 'all', label: t.all }, ...levels.map(value => ({ value: String(value), label: getBundleLevelDisplay(value, language).shortLabel }))]} />
              <Select value={sort} onChange={value => applyFilter(() => setSort(value as SortKey))} label={t.sort} options={[{ value: 'recent', label: t.recent }, { value: 'oldest', label: t.oldest }, { value: 'achievement-desc', label: t.highProgress }, { value: 'achievement-asc', label: t.lowProgress }]} />
            </div>
            {visible.length ? <div className="mt-5 flex flex-col gap-3">{visible.map(bundle => <BundleRow key={bundle.bundleId} bundle={bundle} language={language} t={t} onOpen={() => setSelectedId(bundle.bundleId)} />)}</div> : <EmptyState hasAny={bundles.length > 0} t={t} onReset={resetFilters} />}
            {totalPages > 1 && <nav className="mt-6 flex items-center justify-center gap-2" aria-label="Pagination"><PageButton label={t.previous} disabled={safePage === 1} onClick={() => setPage(Math.max(1, safePage - 1))}><ChevronLeft className="h-4 w-4" /></PageButton><span className="min-w-20 text-center text-sm font-bold">{safePage} / {totalPages}</span><PageButton label={t.next} disabled={safePage === totalPages} onClick={() => setPage(Math.min(totalPages, safePage + 1))}><ChevronRight className="h-4 w-4" /></PageButton></nav>}
          </section>
        </div>
      </section>
    </div>
    {selected && <BundleSheet bundle={selected} language={language} t={t} onClose={() => setSelectedId(null)} />}
  </main>;
}

function BundleRow({
  bundle,
  language,
  t,
  onOpen,
}: {
  bundle: UserBundleRecord;
  language: Language;
  t: typeof copy.ko;
  onOpen: () => void;
}) {
  const title = bundleTitle(bundle, language);
  const isCompleted = bundle.isCompleted;
  const hasStarted = bundle.isStarted || bundle.progressPercent > 0 || bundle.totalPlays > 0;
  const level = getBundleLevelDisplay(bundle.level, language);

  return (
    <article className="group flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 sm:gap-4 rounded-xl border border-zinc-200/90 bg-white p-3.5 sm:p-4 shadow-xs transition hover:border-[#8bbf87] hover:shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60 dark:hover:border-zinc-700">
      {/* Left Thumbnail + Center Content */}
      <div className="flex flex-1 min-w-0 items-start sm:items-center gap-3.5 sm:gap-4">
        {/* Thumbnail */}
        <button
          type="button"
          onClick={onOpen}
          aria-label={title}
          className="relative aspect-[16/10] w-24 sm:w-36 md:w-40 lg:w-44 shrink-0 overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-800 text-left focus:outline-none"
        >
          <Image
            src={bundle.thumbnailUrl || '/images/bundle-fallback.webp'}
            alt={title}
            fill
            className="object-cover transition duration-300 group-hover:scale-105"
            sizes="(max-width: 640px) 96px, 176px"
          />
        </button>

        {/* Content: Badges, Title, Volume, Achievement Chips */}
        <div className="min-w-0 flex-1 flex flex-col justify-between gap-1.5 sm:gap-2">
          <div>
            {/* Badges: Category, CEFR Level (Beginner, A1, A2, etc.), Completed */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="rounded-md bg-zinc-100 px-2 py-0.5 text-[11px] font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                {categoryLabel(bundle, language)}
              </span>
              <span
                className="rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
                title={level.label}
              >
                {level.shortLabel}
              </span>
              {!isCompleted && (bundle.sentenceCompleted || bundle.wordCompleted) && (
                <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
                  {bundle.sentenceCompleted ? t.sentenceCompleted : t.wordCompleted} ✓
                </span>
              )}
              {isCompleted && (
                <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-[#2f7d4a] dark:bg-emerald-950/50 dark:text-emerald-300">
                  {t.completedBadge} ✓
                </span>
              )}
            </div>

            {/* Title */}
            <button
              type="button"
              onClick={onOpen}
              className="mt-1 block w-full text-left focus:outline-none"
            >
              <h3 className="truncate text-sm sm:text-base md:text-lg font-bold text-zinc-900 transition group-hover:text-[#2f7d4a] dark:text-zinc-100 dark:group-hover:text-emerald-400">
                {title}
              </h3>
            </button>

            {/* Sentences & Words */}
            <p className="mt-0.5 text-xs font-medium text-zinc-500 dark:text-zinc-400">
              <span>{t.sentenceCount(bundle.totalItems)}</span>
              {bundle.studyWordsCount > 0 && (
                <span> · {t.wordCount(bundle.studyWordsCount)}</span>
              )}
            </p>
          </div>

          {bundle.knownWordsCount > 0 && <p className="text-xs text-zinc-500">{t.knownWords(bundle.knownWordsCount)}</p>}
          {/* Achievement Micro-Chips */}
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            {/* ⭐ Stars */}
            <span
              className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-amber-700 shadow-xs dark:bg-amber-950/40 dark:text-amber-300"
              title={t.stars(bundle.earnedStars, bundle.maxStars)}
            >
              <span>⭐</span>
              <span className="tabular-nums">
                {bundle.earnedStars}/{bundle.maxStars}
              </span>
            </span>

            {/* 🎧 Listening Plays */}
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold shadow-xs ${
                bundle.totalPlays > 0
                  ? 'bg-emerald-50 text-[#2f7d4a] dark:bg-emerald-950/40 dark:text-emerald-300'
                  : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400'
              }`}
              title={t.plays(bundle.totalPlays)}
            >
              <span>🎧</span>
              <span className="tabular-nums">{t.plays(bundle.totalPlays)}</span>
            </span>

            {/* 📚 Words Learned */}
            {bundle.studyWordsCount > 0 && (
              <span
                className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2.5 py-0.5 text-xs font-bold text-violet-700 shadow-xs dark:bg-violet-950/40 dark:text-violet-300"
                title={t.wordsLearned(bundle.learnedWordsCount, bundle.studyWordsCount)}
              >
                <span>📚</span>
                <span className="tabular-nums">
                  {bundle.learnedWordsCount}/{bundle.studyWordsCount}
                </span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Right Column: Last studied + Direct Play Action Button */}
      <div className="flex shrink-0 items-center justify-between border-t border-zinc-100 pt-2.5 dark:border-zinc-800 sm:flex-col sm:items-end sm:justify-center sm:self-stretch sm:border-t-0 sm:pt-0 sm:pl-2 gap-2 sm:gap-3">
        <div className="flex items-center gap-1 text-xs text-zinc-400 dark:text-zinc-500 tabular-nums">
          <Clock3 className="h-3 w-3 shrink-0" />
          <span>{formatDate(bundle.lastStudiedAt, language, t.never)}</span>
        </div>
        <Link
          href={learnHref(bundle)}
          className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-[#3f9657] px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-[#2f7d4a] active:scale-95 whitespace-nowrap"
        >
          <Play className="h-3.5 w-3.5 fill-current" />
          <span>{hasStarted ? t.continue : t.start}</span>
        </Link>
      </div>
    </article>
  );
}

function BundleSheet({ bundle, language, t, onClose }: { bundle: UserBundleRecord; language: Language; t: typeof copy.ko; onClose: () => void }) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const attempts = bundle.correctCount + bundle.incorrectCount;
  const accuracy = attempts ? Math.round(bundle.correctCount / attempts * 100) : null;
  const modes = [
    { key: 'learn', label: t.basicLearning, href: learnHref(bundle) },
    { key: 'flashcards', label: t.flashcards, href: `/bundles/${bundle.bundleId}/flashcards` },
    { key: 'quiz', label: t.quiz, href: `/bundles/${bundle.bundleId}/quiz` },
    { key: 'scramble', label: t.scramble, href: `/bundles/${bundle.bundleId}/scramble` },
    { key: 'wordfill', label: t.wordfill, href: `/bundles/${bundle.bundleId}/wordfill` },
    { key: 'spelling', label: t.spelling, href: `/bundles/${bundle.bundleId}/spelling` },
  ];

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
      <button type="button" onClick={onClose} aria-label={t.close} className="absolute inset-0 h-full w-full bg-black/40 backdrop-blur-[2px]" />
      <aside className="absolute inset-x-0 bottom-0 max-h-[88vh] overflow-y-auto rounded-t-xl bg-white shadow-2xl dark:bg-zinc-950 md:inset-x-auto md:bottom-auto md:right-0 md:top-0 md:h-full md:w-[440px] md:rounded-none md:border-l md:border-zinc-200 md:dark:border-zinc-800">
        <div className="relative aspect-[16/8] w-full">
          <Image src={bundle.thumbnailUrl || '/images/bundle-fallback.webp'} alt={bundleTitle(bundle, language)} fill className="object-cover" sizes="440px" />
          <button type="button" onClick={onClose} aria-label={t.close} className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-md bg-white/90 text-zinc-800 shadow-sm transition hover:bg-white dark:bg-zinc-900/90 dark:text-zinc-200 dark:hover:bg-zinc-800">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="px-5 py-5">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="rounded-md bg-zinc-100 px-2 py-0.5 text-[11px] font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
              {categoryLabel(bundle, language)}
            </span>
            <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
              {getBundleLevelDisplay(bundle.level, language).shortLabel}
            </span>
            {!bundle.isCompleted && (bundle.sentenceCompleted || bundle.wordCompleted) && (
              <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
                {bundle.sentenceCompleted ? t.sentenceCompleted : t.wordCompleted} ✓
              </span>
            )}
            {bundle.isCompleted && (
              <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-[#2f7d4a] dark:bg-emerald-950/50 dark:text-emerald-300">
                {t.completedBadge} ✓
              </span>
            )}
          </div>
          <h2 className="mt-2 text-2xl font-bold">{bundleTitle(bundle, language)}</h2>
          <p className="mt-2 text-sm leading-6 text-zinc-500">{bundleDescription(bundle, language)}</p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700 shadow-sm dark:bg-amber-950/40 dark:text-amber-300">
              <span>⭐</span>
              <span className="tabular-nums">{t.stars(bundle.earnedStars, bundle.maxStars)}</span>
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-[#2f7d4a] shadow-sm dark:bg-emerald-950/40 dark:text-emerald-300">
              <span>🎧</span>
              <span className="tabular-nums">{t.plays(bundle.totalPlays)}</span>
            </span>
            {bundle.studyWordsCount > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-3 py-1 text-xs font-bold text-violet-700 shadow-sm dark:bg-violet-950/40 dark:text-violet-300">
                <span>📚</span>
                <span className="tabular-nums">{t.wordsLearned(bundle.learnedWordsCount, bundle.studyWordsCount)}</span>
              </span>
            )}
          </div>
          <dl className="mt-5 grid grid-cols-2 gap-4 border-y border-zinc-200 py-5 dark:border-zinc-800">
            <Detail label={t.level} value={getBundleLevelDisplay(bundle.level, language).label} />
            <Detail label={t.starsLabel} value={`${bundle.earnedStars} / ${bundle.maxStars}`} />
            <Detail label={t.totalPlaysLabel} value={bundle.totalPlays > 0 ? t.plays(bundle.totalPlays) : t.never} />
            <Detail label={t.wordsLabel} value={bundle.studyWordsCount > 0 ? t.completedItems(bundle.learnedWordsCount, bundle.studyWordsCount) : '-'} />
            <Detail label={t.accuracy} value={accuracy === null ? t.noAttempts : `${accuracy}%`} />
            <Detail label={t.lastStudied} value={formatDate(bundle.lastStudiedAt, language, t.never)} />
          </dl>
          {bundle.knownWordsCount > 0 && <p className="mt-2 text-xs text-zinc-500">{t.knownWords(bundle.knownWordsCount)}</p>}
          <p className="mt-2 text-xs text-zinc-400">{t.correctIncorrect(bundle.correctCount, bundle.incorrectCount)}</p>
          <h3 className="mt-6 text-sm font-bold">{t.practiceModes}</h3>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {modes.map(mode => (
              <Link key={mode.key} href={mode.href} className="inline-flex min-h-10 items-center justify-between rounded-md border border-zinc-200 px-3 text-sm font-semibold hover:border-[#8bbf87] hover:text-[#2f7d4a] dark:border-zinc-700">
                {mode.label}
                <ArrowRight className="h-4 w-4" />
              </Link>
            ))}
          </div>
          <Link href={`/bundles/${bundle.bundleId}`} className="mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-md bg-[#3f9657] text-sm font-bold text-white transition hover:bg-[#2f7d4a]">
            {t.details}
          </Link>
        </div>
      </aside>
    </div>
  );
}

function ProgressBar({ value }: { value: number }) { return <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800"><div className="h-full rounded-full bg-[#3f9657]" style={{ width: `${Math.min(100, Math.max(0, value))}%` }} /></div>; }
function Detail({ label, value }: { label: string; value: string }) { return <div><dt className="text-xs font-bold text-zinc-400">{label}</dt><dd className="mt-1 text-sm font-semibold">{value}</dd></div>; }
function SummaryItem({ icon: Icon, label, value, tone, description }: { description?: string; icon: React.ElementType; label: string; value: number | string; tone: 'green' | 'coral' | 'blue' | 'amber' }) { const colors = { green: 'text-[#3f9657] bg-[#e7f4e8]', coral: 'text-[#e95c3e] bg-[#fff0ec]', blue: 'text-[#4676cc] bg-[#edf3ff]', amber: 'text-[#a66d13] bg-[#fff5d9]' }; return <div title={description} className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800"><div className={`flex h-9 w-9 items-center justify-center rounded-md ${colors[tone]}`}><Icon className="h-5 w-5" /></div><p className="mt-4 text-sm font-semibold text-zinc-500">{label}</p><p className="mt-1 text-2xl font-bold">{value}</p></div>; }
function Select({ value, onChange, label, options }: { value: string; onChange: (value: string) => void; label: string; options: Array<{ value: string; label: string }> }) { return <label className="relative"><Filter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" /><span className="sr-only">{label}</span><select value={value} onChange={event => onChange(event.target.value)} className="h-11 w-full appearance-none rounded-md border border-zinc-200 bg-white pl-10 pr-8 text-sm outline-none focus:border-[#3f9657] dark:border-zinc-700 dark:bg-zinc-900">{options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select><ChevronRight className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 rotate-90 text-zinc-400" /></label>; }
function EmptyState({ hasAny, t, onReset }: { hasAny: boolean; t: typeof copy.ko; onReset?: () => void }) {
  return (
    <div className="mt-5 border border-dashed border-zinc-300 px-5 py-12 text-center dark:border-zinc-700">
      <BookOpen className="mx-auto h-7 w-7 text-zinc-400" />
      <h3 className="mt-3 font-bold">{hasAny ? t.emptyTitle : t.emptyAllTitle}</h3>
      <p className="mt-2 text-sm text-zinc-500">{hasAny ? t.emptyBody : t.emptyAllBody}</p>
      {hasAny && onReset ? (
        <button
          type="button"
          onClick={onReset}
          className="mt-5 inline-flex items-center gap-2 rounded-md border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          <RotateCcw className="h-4 w-4" />
          {t.resetFilters}
        </button>
      ) : !hasAny ? (
        <Link href="/bundles" className="mt-5 inline-flex rounded-md bg-[#3f9657] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#2f7d4a]">
          {t.explore}
        </Link>
      ) : null}
    </div>
  );
}
function PageButton({ children, label, disabled, onClick }: { children: React.ReactNode; label: string; disabled: boolean; onClick: () => void }) { return <button type="button" aria-label={label} disabled={disabled} onClick={onClick} className="flex h-10 w-10 items-center justify-center rounded-md border border-zinc-200 disabled:opacity-30 dark:border-zinc-700">{children}</button>; }
function bundleTitle(bundle: UserBundleRecord, language: Language) { return (language === 'en' ? bundle.titleEn : bundle.title) || bundle.title || bundle.titleEn || 'Untitled Bundle'; }
function bundleDescription(bundle: UserBundleRecord, language: Language) { return (language === 'en' ? bundle.descriptionEn : bundle.description) || bundle.description || bundle.descriptionEn || ''; }
function categoryLabel(bundle: UserBundleRecord, language: Language) { return (language === 'en' ? bundle.categoryNameEn : bundle.categoryName) || bundle.categoryName || bundle.categoryNameEn || 'General'; }
function statusLabel(status: UserBundleStatus, t: typeof copy.ko) { return status === 'saved' ? t.saved : status === 'sentence-completed' ? t.sentenceCompleted : status === 'word-completed' ? t.wordCompleted : status === 'completed' ? t.completedStatus : t.inProgress; }
function learnHref(bundle: UserBundleRecord) { return bundle.currentBundleItemId ? `/bundles/${bundle.bundleId}/learn?item=${bundle.currentBundleItemId}` : `/bundles/${bundle.bundleId}/learn`; }
function formatDate(value: string | null, language: Language, fallback: string) { if (!value) return fallback; return new Intl.DateTimeFormat(language === 'ko' ? 'ko-KR' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric' }).format(new Date(value)); }
function statusOptions(t: typeof copy.ko) { return [{ value: 'all', label: t.all }, { value: 'in-progress', label: t.inProgress }, { value: 'sentence-completed', label: t.sentenceCompleted }, { value: 'word-completed', label: t.wordCompleted }, { value: 'completed', label: t.completedStatus }, { value: 'saved', label: t.saved }]; }
function matchesBundleStatus(bundle: UserBundleRecord, status: StatusFilter) { if (status === 'all') return true; if (status === 'pinned') return bundle.isPinned; if (status === 'sentence-completed') return bundle.sentenceCompleted; if (status === 'word-completed') return bundle.wordCompleted; if (status === 'in-progress') return bundle.isStarted && !bundle.isCompleted; return bundle.status === status; }
