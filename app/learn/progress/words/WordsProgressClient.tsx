'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Bookmark,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Filter,
  Play,
  Search,
  Target,
  Volume2,
} from 'lucide-react';
import ProgressMobileMenu from '../ProgressMobileMenu';
import ProgressSidebar from '../ProgressSidebar';
import { WordInfoSheet } from '@/components/words/WordInfoSheet';
import type { WordUsageDetail } from '@/lib/supabase/services/word-sentence-map';
import type { UserWordRecord, UserWordsSummary, UserWordStatus } from '@/lib/supabase/services/user-words';
import { getPublicUrl } from '@/lib/utils';

type Language = 'ko' | 'en';
type StatusFilter = 'all' | 'due' | UserWordStatus | 'pinned' | 'memo' | `level-${number}`;
type SortKey = 'priority' | 'recent' | 'mistakes' | 'alphabetical';

const PAGE_SIZE = 20;

const copy = {
  ko: {
    back: 'Overview로 돌아가기', title: 'Words', description: '학습한 단어의 숙련도와 복습 상태를 확인하세요.',
    startReview: '복습하기', startLearning: '새로 익히기', total: '학습한 단어', due: '복습 필요', mastered: '숙달한 단어', accuracy: '전체 정확도',
    noAttempts: '기록 없음', distribution: '숙련도 분포', allWords: '내 단어', result: (n: number) => `${n}개 단어`,
    search: '단어나 뜻 검색', status: '상태', pos: '품사', sort: '정렬', all: '전체', pinned: '핀한 단어', hasMemo: '메모 있음',
    priority: '복습 우선', recent: '최근 학습', mistakes: '오답 많은 순', alphabetical: '가나다순',
    word: '단어', proficiency: '숙련도', score: '정답률', review: '복습 상태', lastStudy: '마지막 학습', actions: '작업',
    now: '지금 복습', today: '오늘 복습', upcoming: '예정', complete: '숙달', notScheduled: '일정 없음', never: '아직 없음',
    details: '단어 상세', usedForm: '사용 형태', meaning: '뜻', examples: '사용된 문장', noExamples: '아직 연결된 문장이 없습니다.', close: '닫기', posLabel: '품사',
    editMemo: '메모', memoPlaceholder: '이 단어에 대한 학습 메모를 남겨보세요.', save: '저장', saving: '저장 중', saved: '저장됨', saveFailed: '저장하지 못했습니다.',
    emptyTitle: '조건에 맞는 단어가 없습니다.', emptyBody: '검색어나 필터를 바꾸어 확인해보세요.', emptyAllTitle: '아직 학습한 단어가 없습니다.', emptyAllBody: '단어 중심 학습이나 복습을 시작하면 여기에 기록됩니다.', browse: '학습 번들 보기',
    previous: '이전', next: '다음', listen: '단어 듣기', level: '레벨', attempts: (c: number, i: number) => `정답 ${c} · 오답 ${i}`,
    levels: ['시작 전', '학습 중', '익숙해지는 중', '익숙함', '거의 숙달', '숙달'],
  },
  en: {
    back: 'Back to Overview', title: 'Words', description: 'See the proficiency and review status of the words you have studied.',
    startReview: 'Review now', startLearning: 'Learn new', total: 'Learned words', due: 'Review due', mastered: 'Mastered', accuracy: 'Overall accuracy',
    noAttempts: 'No attempts', distribution: 'Proficiency distribution', allWords: 'My words', result: (n: number) => `${n} words`,
    search: 'Search words or meanings', status: 'Status', pos: 'Part of speech', sort: 'Sort', all: 'All', pinned: 'Pinned', hasMemo: 'Has memo',
    priority: 'Review priority', recent: 'Recently studied', mistakes: 'Most mistakes', alphabetical: 'Alphabetical',
    word: 'Word', proficiency: 'Proficiency', score: 'Accuracy', review: 'Review status', lastStudy: 'Last studied', actions: 'Actions',
    now: 'Review now', today: 'Due today', upcoming: 'Upcoming', complete: 'Mastered', notScheduled: 'Not scheduled', never: 'Not yet',
    details: 'Word details', usedForm: 'Used form', meaning: 'Meaning', examples: 'Example sentences', noExamples: 'No linked sentences yet.', close: 'Close', posLabel: 'POS',
    editMemo: 'Memo', memoPlaceholder: 'Add a learning note for this word.', save: 'Save', saving: 'Saving', saved: 'Saved', saveFailed: 'Could not save.',
    emptyTitle: 'No words match these filters.', emptyBody: 'Try another search or filter.', emptyAllTitle: 'No learned words yet.', emptyAllBody: 'Words will appear here after word-focused practice or review.', browse: 'Browse bundles',
    previous: 'Previous', next: 'Next', listen: 'Listen to word', level: 'Level', attempts: (c: number, i: number) => `${c} correct · ${i} incorrect`,
    levels: ['Not started', 'Learning', 'Getting familiar', 'Familiar', 'Almost mastered', 'Mastered'],
  },
};

export default function WordsProgressClient({
  initialData,
  usageDetails,
  language,
}: {
  initialData: { words: UserWordRecord[]; summary: UserWordsSummary };
  usageDetails: WordUsageDetail[];
  language: Language;
}) {
  const t = copy[language];
  const [words, setWords] = useState(initialData.words);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [pos, setPos] = useState('all');
  const [sort, setSort] = useState<SortKey>('priority');
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [memoDraft, setMemoDraft] = useState('');
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  const detailById = useMemo(() => new Map(usageDetails.map(item => [item.word_id, item])), [usageDetails]);
  const selectedWord = selectedId ? words.find(word => word.wordId === selectedId) || null : null;
  const selectedDetail = selectedId ? detailById.get(selectedId) || null : null;
  const posOptions = useMemo(() => Array.from(new Set(words.flatMap(word => word.pos))).sort(), [words]);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    return words
      .filter(word => !normalized || [word.word, word.meaningKo, word.meaningEn].some(value => value?.toLocaleLowerCase().includes(normalized)))
      .filter(word => pos === 'all' || word.pos.includes(pos))
      .filter(word => matchesStatus(word, status))
      .sort((a, b) => compareWords(a, b, sort));
  }, [words, query, pos, status, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const visible = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  function updateFilter(callback: () => void) {
    callback();
    setPage(1);
  }

  function openWord(word: UserWordRecord) {
    setSelectedId(word.wordId);
    setMemoDraft(word.memo || '');
    setSaveState('idle');
  }

  async function updateWord(wordId: number, update: { is_pinned?: boolean; memo?: string | null }) {
    const response = await fetch('/api/user-word-interactions', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ word_id: wordId, ...update }),
    });
    if (!response.ok) throw new Error('Update failed');
    setWords(current => current.map(word => word.wordId === wordId ? { ...word, isPinned: update.is_pinned ?? word.isPinned, memo: update.memo !== undefined ? update.memo : word.memo } : word));
  }

  async function togglePin(word: UserWordRecord) {
    const next = !word.isPinned;
    setWords(current => current.map(item => item.wordId === word.wordId ? { ...item, isPinned: next } : item));
    try { await updateWord(word.wordId, { is_pinned: next }); }
    catch { setWords(current => current.map(item => item.wordId === word.wordId ? { ...item, isPinned: !next } : item)); }
  }

  async function saveMemo() {
    if (!selectedWord) return;
    setSaveState('saving');
    try {
      await updateWord(selectedWord.wordId, { memo: memoDraft.trim() || null });
      setSaveState('saved');
    } catch { setSaveState('error'); }
  }

  return (
    <main className="mx-auto max-w-7xl px-0 pb-10 text-zinc-950 dark:text-zinc-100 lg:px-2">
      <ProgressMobileMenu language={language} activeIndex={1} />
      <div className="grid min-h-[calc(100vh-140px)] overflow-hidden bg-white dark:bg-zinc-950 lg:grid-cols-[238px_minmax(0,1fr)] lg:rounded-xl lg:border lg:border-zinc-200 lg:dark:border-zinc-800">
        <ProgressSidebar language={language} activeIndex={1} />
        <section className="min-w-0">
        <header className="border-b border-zinc-200 px-4 py-6 dark:border-zinc-800 sm:px-8 lg:px-10">
          <Link href="/learn/progress" className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-500 hover:text-[#2f7d4a] dark:text-zinc-400"><ArrowLeft className="h-4 w-4" />{t.back}</Link>
          <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div><h1 className="text-3xl font-bold sm:text-4xl">{t.title}</h1><p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-300">{t.description}</p></div>
            <div className="grid grid-cols-2 gap-2 sm:flex">
              <Link href="/learn/review/words?scope=unstarted" aria-disabled={initialData.summary.levels[0] === 0} className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-md border px-4 text-sm font-bold ${initialData.summary.levels[0] ? 'border-[#3f9657] text-[#2f7d4a] hover:bg-[#eef8ef] dark:text-emerald-300' : 'pointer-events-none border-zinc-200 text-zinc-400 dark:border-zinc-700'}`}><BookOpen className="h-4 w-4" />{t.startLearning}{initialData.summary.levels[0] > 0 && ` (${initialData.summary.levels[0]})`}</Link>
              <Link href="/learn/review/words?returnTo=/learn/progress/words" aria-disabled={initialData.summary.due === 0} className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-4 text-sm font-bold text-white ${initialData.summary.due ? 'bg-[#3f9657] hover:bg-[#2f7d4a]' : 'pointer-events-none bg-zinc-300 dark:bg-zinc-700'}`}><Play className="h-4 w-4" />{t.startReview}{initialData.summary.due > 0 && ` (${initialData.summary.due})`}</Link>
            </div>
          </div>
        </header>

        <div className="px-4 py-6 sm:px-8 lg:px-10">
          <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            <SummaryItem icon={BookOpen} label={t.total} value={initialData.summary.total} tone="green" />
            <SummaryItem icon={Clock3} label={t.due} value={initialData.summary.due} tone="coral" />
            <SummaryItem icon={CheckCircle2} label={t.mastered} value={initialData.summary.mastered} tone="blue" />
            <SummaryItem icon={Target} label={t.accuracy} value={initialData.summary.accuracy === null ? t.noAttempts : `${initialData.summary.accuracy}%`} tone="amber" />
          </section>

          <section className="mt-6 border-y border-zinc-200 py-5 dark:border-zinc-800">
            <div className="flex items-center justify-between gap-4"><h2 className="text-base font-bold">{t.distribution}</h2><span className="text-sm text-zinc-500">{t.attempts(initialData.summary.correct, initialData.summary.incorrect)}</span></div>
            <div className="mt-4 grid grid-cols-3 gap-2 lg:grid-cols-6">
              {initialData.summary.levels.map((count, level) => (
                <button key={level} type="button" onClick={() => updateFilter(() => setStatus(statusForLevel(level)))} className="min-w-0 border-l-2 border-zinc-200 px-3 py-1 text-left transition hover:border-[#3f9657] dark:border-zinc-700">
                  <span className="block text-xl font-bold tabular-nums">{count}</span><span className="mt-1 block truncate text-xs text-zinc-500">{t.level} {level} · {t.levels[level]}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="mt-7">
            <div className="flex items-center justify-between"><h2 className="text-xl font-bold">{t.allWords}</h2><span className="text-sm font-medium text-zinc-500">{t.result(filtered.length)}</span></div>
            <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(220px,1fr)_180px_160px_180px]">
              <label className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" /><input value={query} onChange={event => updateFilter(() => setQuery(event.target.value))} placeholder={t.search} className="h-11 w-full rounded-md border border-zinc-200 bg-white pl-10 pr-3 text-sm outline-none focus:border-[#3f9657] dark:border-zinc-700 dark:bg-zinc-900" /></label>
              <Select value={status} onChange={value => updateFilter(() => setStatus(value as StatusFilter))} label={t.status} options={statusOptions(t)} />
              <Select value={pos} onChange={value => updateFilter(() => setPos(value))} label={t.pos} options={[{ value: 'all', label: t.all }, ...posOptions.map(value => ({ value, label: value }))]} />
              <Select value={sort} onChange={value => setSort(value as SortKey)} label={t.sort} options={[{ value: 'priority', label: t.priority }, { value: 'recent', label: t.recent }, { value: 'mistakes', label: t.mistakes }, { value: 'alphabetical', label: t.alphabetical }]} />
            </div>

            {visible.length > 0 ? (
              <div className="mt-5 overflow-hidden border-y border-zinc-200 dark:border-zinc-800">
                <div className="hidden grid-cols-[44px_minmax(180px,1.5fr)_150px_110px_140px_130px_44px] gap-3 border-b border-zinc-200 bg-zinc-50 px-3 py-3 text-xs font-bold text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 lg:grid">
                  <span /><span>{t.word}</span><span>{t.proficiency}</span><span>{t.score}</span><span>{t.review}</span><span>{t.lastStudy}</span><span />
                </div>
                {visible.map(word => <WordRow key={word.wordId} word={word} language={language} t={t} onOpen={() => openWord(word)} onTogglePin={() => togglePin(word)} />)}
              </div>
            ) : <EmptyState hasAny={words.length > 0} t={t} />}

            {totalPages > 1 && <nav className="mt-6 flex items-center justify-center gap-2" aria-label="Pagination"><PageButton label={t.previous} disabled={safePage === 1} onClick={() => setPage(Math.max(1, safePage - 1))}><ChevronLeft className="h-4 w-4" /></PageButton><span className="min-w-20 text-center text-sm font-bold tabular-nums">{safePage} / {totalPages}</span><PageButton label={t.next} disabled={safePage === totalPages} onClick={() => setPage(Math.min(totalPages, safePage + 1))}><ChevronRight className="h-4 w-4" /></PageButton></nav>}
          </section>
        </div>
        </section>
      </div>

      {selectedWord && selectedDetail && (
        <>
          <WordInfoSheet selectedWord={selectedDetail} selectedMapping={null} language={language} copy={{ words: t.allWords, sheetTitle: t.details, usedForm: t.usedForm, meaning: t.meaning, examples: t.examples, noExamples: t.noExamples, close: t.close, pos: t.posLabel }} onClose={() => setSelectedId(null)} />
          <div className="fixed bottom-0 right-0 z-[60] w-full border-t border-zinc-200 bg-white px-5 py-4 dark:border-zinc-800 dark:bg-zinc-950 md:w-[420px]">
            <label className="text-xs font-bold text-zinc-500">{t.editMemo}</label>
            <div className="mt-2 flex gap-2"><input value={memoDraft} maxLength={1000} onChange={event => { setMemoDraft(event.target.value); setSaveState('idle'); }} placeholder={t.memoPlaceholder} className="min-w-0 flex-1 rounded-md border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-[#3f9657] dark:border-zinc-700 dark:bg-zinc-900" /><button type="button" disabled={saveState === 'saving'} onClick={saveMemo} className="min-h-10 rounded-md bg-[#3f9657] px-4 text-sm font-bold text-white disabled:opacity-60">{saveState === 'saving' ? t.saving : t.save}</button></div>
            {saveState === 'saved' && <p className="mt-1 text-xs text-[#2f7d4a]">{t.saved}</p>}{saveState === 'error' && <p className="mt-1 text-xs text-red-600">{t.saveFailed}</p>}
          </div>
        </>
      )}
    </main>
  );
}

function SummaryItem({ icon: Icon, label, value, tone }: { icon: React.ElementType; label: string; value: number | string; tone: 'green' | 'coral' | 'blue' | 'amber' }) {
  const colors = { green: 'text-[#3f9657] bg-[#e7f4e8]', coral: 'text-[#e95c3e] bg-[#fff0ec]', blue: 'text-[#4676cc] bg-[#edf3ff]', amber: 'text-[#a66d13] bg-[#fff5d9]' };
  return <div className="border border-zinc-200 p-4 dark:border-zinc-800"><div className={`flex h-9 w-9 items-center justify-center rounded-md ${colors[tone]}`}><Icon className="h-5 w-5" /></div><p className="mt-4 text-sm font-semibold text-zinc-500">{label}</p><p className="mt-1 text-2xl font-bold tabular-nums">{value}</p></div>;
}

function Select({ value, onChange, label, options }: { value: string; onChange: (value: string) => void; label: string; options: Array<{ value: string; label: string }> }) {
  return <label className="relative"><Filter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" /><span className="sr-only">{label}</span><select value={value} onChange={event => onChange(event.target.value)} className="h-11 w-full appearance-none rounded-md border border-zinc-200 bg-white pl-10 pr-8 text-sm outline-none focus:border-[#3f9657] dark:border-zinc-700 dark:bg-zinc-900">{options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select><ChevronRight className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 rotate-90 text-zinc-400" /></label>;
}

function WordRow({ word, language, t, onOpen, onTogglePin }: { word: UserWordRecord; language: Language; t: typeof copy.ko; onOpen: () => void; onTogglePin: () => void }) {
  const attempts = word.correctCount + word.incorrectCount;
  const accuracy = attempts ? Math.round(word.correctCount / attempts * 100) : null;
  const meaning = (language === 'en' ? word.meaningEn : word.meaningKo) || word.meaningKo || word.meaningEn;
  return <div className="grid grid-cols-[36px_1fr_auto] items-center gap-3 border-b border-zinc-100 px-2 py-4 last:border-0 dark:border-zinc-800 lg:grid-cols-[44px_minmax(180px,1.5fr)_150px_110px_140px_130px_44px] lg:px-3">
    <button type="button" onClick={onTogglePin} aria-label={t.pinned} title={t.pinned} className={`flex h-9 w-9 items-center justify-center rounded-md ${word.isPinned ? 'text-[#2f7d4a]' : 'text-zinc-300 hover:text-zinc-500 dark:text-zinc-700'}`}><Bookmark className={`h-4 w-4 ${word.isPinned ? 'fill-current' : ''}`} /></button>
    <button type="button" onClick={onOpen} className="min-w-0 text-left"><span className="block truncate font-bold">{word.word}</span><span className="mt-1 block truncate text-sm text-zinc-500">{meaning || '—'}{word.pos.length ? ` · ${word.pos.join(', ')}` : ''}</span>{word.memo && <span className="mt-1 block truncate text-xs text-[#2f7d4a]">{word.memo}</span>}</button>
    <AudioButton url={word.audioUrl} label={t.listen} className="lg:hidden" />
    <div className="col-start-2 flex flex-wrap items-center gap-2 lg:col-auto lg:block"><LevelBadge level={word.proficiencyLevel} label={t.levels[word.proficiencyLevel]} /><span className="text-xs text-zinc-500 lg:hidden">{accuracy === null ? '—' : `${accuracy}%`} · {reviewLabel(word, language, t)}</span></div>
    <span className="hidden text-sm font-semibold tabular-nums lg:block">{accuracy === null ? '—' : `${accuracy}%`}</span><span className={`hidden text-sm font-semibold lg:block ${word.isReviewDue ? 'text-[#d9573b]' : 'text-zinc-600 dark:text-zinc-300'}`}>{reviewLabel(word, language, t)}</span><span className="hidden text-sm text-zinc-500 lg:block">{formatDate(word.lastReviewedAt, language, t.never)}</span><AudioButton url={word.audioUrl} label={t.listen} className="hidden lg:flex" />
  </div>;
}

function AudioButton({ url, label, className }: { url: string | null; label: string; className: string }) {
  const publicUrl = getPublicUrl(url);
  return <button type="button" disabled={!publicUrl} onClick={() => publicUrl && new Audio(publicUrl).play().catch(console.error)} aria-label={label} title={label} className={`${className} h-9 w-9 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-100 disabled:opacity-25 dark:hover:bg-zinc-800`}><Volume2 className="h-4 w-4" /></button>;
}

function LevelBadge({ level, label }: { level: number; label: string }) { return <span className="inline-flex items-center gap-1.5 text-sm font-semibold"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-100 text-xs tabular-nums dark:bg-zinc-800">{level}</span><span className="hidden xl:inline">{label}</span></span>; }
function EmptyState({ hasAny, t }: { hasAny: boolean; t: typeof copy.ko }) { return <div className="mt-5 border border-dashed border-zinc-300 px-5 py-12 text-center dark:border-zinc-700"><BookOpen className="mx-auto h-7 w-7 text-zinc-400" /><h3 className="mt-3 font-bold">{hasAny ? t.emptyTitle : t.emptyAllTitle}</h3><p className="mt-2 text-sm text-zinc-500">{hasAny ? t.emptyBody : t.emptyAllBody}</p>{!hasAny && <Link href="/bundles" className="mt-5 inline-flex items-center gap-2 rounded-md bg-[#3f9657] px-4 py-2.5 text-sm font-bold text-white">{t.browse}<ArrowRight className="h-4 w-4" /></Link>}</div>; }
function PageButton({ children, label, disabled, onClick }: { children: React.ReactNode; label: string; disabled: boolean; onClick: () => void }) { return <button type="button" aria-label={label} title={label} disabled={disabled} onClick={onClick} className="flex h-10 w-10 items-center justify-center rounded-md border border-zinc-200 disabled:opacity-30 dark:border-zinc-700">{children}</button>; }

function matchesStatus(word: UserWordRecord, status: StatusFilter) { if (status === 'all') return true; if (status === 'due') return word.isReviewDue; if (status === 'pinned') return word.isPinned; if (status === 'memo') return Boolean(word.memo); if (status.startsWith('level-')) return word.proficiencyLevel === Number(status.slice(6)); return getStatus(word.proficiencyLevel) === status; }
function getStatus(level: number): UserWordStatus { if (level <= 0) return 'unstarted'; if (level === 1) return 'learning'; if (level <= 3) return 'familiar'; if (level === 4) return 'almost-mastered'; return 'mastered'; }
function statusForLevel(level: number): StatusFilter { return `level-${level}`; }
function compareWords(a: UserWordRecord, b: UserWordRecord, sort: SortKey) { if (sort === 'alphabetical') return a.word.localeCompare(b.word); if (sort === 'mistakes') return b.incorrectCount - a.incorrectCount || a.proficiencyLevel - b.proficiencyLevel; if (sort === 'recent') return dateValue(b.lastReviewedAt) - dateValue(a.lastReviewedAt); return Number(b.isReviewDue) - Number(a.isReviewDue) || a.proficiencyLevel - b.proficiencyLevel || b.incorrectCount - a.incorrectCount || dateValue(a.lastReviewedAt) - dateValue(b.lastReviewedAt); }
function dateValue(value: string | null) { return value ? new Date(value).getTime() || 0 : 0; }
function reviewLabel(word: UserWordRecord, language: Language, t: typeof copy.ko) { if (word.proficiencyLevel === 5) return t.complete; if (word.proficiencyLevel === 0) return t.notScheduled; if (word.isReviewDue) return t.now; return word.nextReviewAt ? `${t.upcoming} · ${formatDate(word.nextReviewAt, language, '')}` : t.notScheduled; }
function formatDate(value: string | null, language: Language, fallback: string) { if (!value) return fallback; return new Intl.DateTimeFormat(language === 'ko' ? 'ko-KR' : 'en-US', { month: 'short', day: 'numeric' }).format(new Date(value)); }
function statusOptions(t: typeof copy.ko) { return [{ value: 'all', label: t.all }, { value: 'due', label: t.due }, { value: 'learning', label: t.levels[1] }, { value: 'familiar', label: t.levels[2] }, { value: 'almost-mastered', label: t.levels[4] }, { value: 'mastered', label: t.levels[5] }, { value: 'pinned', label: t.pinned }, { value: 'memo', label: t.hasMemo }]; }
