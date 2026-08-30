'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, BookOpen, Bookmark, CheckCircle2, ChevronLeft, ChevronRight, Clock3,
  Filter, MessageSquareText, Play, Search, Target, Volume2, X,
} from 'lucide-react';
import ProgressMobileMenu from '../ProgressMobileMenu';
import ProgressSidebar from '../ProgressSidebar';
import type { UserSentenceRecord, UserSentencesSummary } from '@/lib/supabase/services/user-sentences';
import { getPublicUrl } from '@/lib/utils';

type Language = 'ko' | 'en';
type StatusFilter = 'all' | 'due' | 'pinned' | 'memo' | 'learning' | 'familiar' | 'almost-mastered' | 'mastered' | `level-${number}`;
type SortKey = 'priority' | 'recent' | 'mistakes' | 'alphabetical';
const PAGE_SIZE = 15;

const copy = {
  ko: {
    back: 'Overview로 돌아가기', title: 'Sentences', description: '학습한 문장의 숙련도와 복습 상태를 확인하세요.',
    startLearning: '새로 익히기', startReview: '복습하기', total: '학습한 문장', due: '복습 필요', mastered: '숙달한 문장', accuracy: '전체 정확도', noAttempts: '기록 없음',
    distribution: '숙련도 분포', attempts: (c: number, i: number) => `정답 ${c} · 오답 ${i}`, level: '레벨', levels: ['시작 전', '학습 중', '익숙해지는 중', '익숙함', '거의 숙달', '숙달'],
    mySentences: '내 문장', results: (n: number) => `${n}개 문장`, search: '문장이나 번역 검색', status: '상태', sort: '정렬', all: '전체', pinned: '핀한 문장', hasMemo: '메모 있음',
    priority: '복습 우선', recent: '최근 학습', mistakes: '오답 많은 순', alphabetical: '문장순', now: '지금 복습', upcoming: '예정', complete: '숙달', notScheduled: '일정 없음', never: '아직 없음',
    listen: '문장 듣기', details: '문장 상세', translation: '번역', proficiency: '숙련도', correct: '정답', incorrect: '오답', streak: '연속 정답', lastStudy: '마지막 학습', nextReview: '다음 복습', bundles: '연결된 번들', keyWords: '핵심 단어', noBundles: '연결된 번들이 없습니다.', noWords: '연결된 단어가 없습니다.',
    memo: '학습 메모', memoPlaceholder: '이 문장에 대한 학습 메모를 남겨보세요.', save: '저장', saving: '저장 중', saved: '저장됨', saveFailed: '저장하지 못했습니다.', close: '닫기',
    emptyTitle: '조건에 맞는 문장이 없습니다.', emptyBody: '검색어나 필터를 바꾸어 확인해보세요.', emptyAllTitle: '아직 학습한 문장이 없습니다.', emptyAllBody: '문장 학습이나 문제풀이를 시작하면 여기에 기록됩니다.', browse: '학습 번들 보기', previous: '이전', next: '다음',
  },
  en: {
    back: 'Back to Overview', title: 'Sentences', description: 'See the proficiency and review status of the sentences you have studied.',
    startLearning: 'Learn new', startReview: 'Review now', total: 'Learned sentences', due: 'Review due', mastered: 'Mastered', accuracy: 'Overall accuracy', noAttempts: 'No attempts',
    distribution: 'Proficiency distribution', attempts: (c: number, i: number) => `${c} correct · ${i} incorrect`, level: 'Level', levels: ['Not started', 'Learning', 'Getting familiar', 'Familiar', 'Almost mastered', 'Mastered'],
    mySentences: 'My sentences', results: (n: number) => `${n} sentences`, search: 'Search sentences or translations', status: 'Status', sort: 'Sort', all: 'All', pinned: 'Pinned', hasMemo: 'Has memo',
    priority: 'Review priority', recent: 'Recently studied', mistakes: 'Most mistakes', alphabetical: 'Sentence order', now: 'Review now', upcoming: 'Upcoming', complete: 'Mastered', notScheduled: 'Not scheduled', never: 'Not yet',
    listen: 'Listen to sentence', details: 'Sentence details', translation: 'Translation', proficiency: 'Proficiency', correct: 'Correct', incorrect: 'Incorrect', streak: 'Correct streak', lastStudy: 'Last studied', nextReview: 'Next review', bundles: 'Linked bundles', keyWords: 'Key words', noBundles: 'No linked bundles.', noWords: 'No linked words.',
    memo: 'Learning memo', memoPlaceholder: 'Add a learning note for this sentence.', save: 'Save', saving: 'Saving', saved: 'Saved', saveFailed: 'Could not save.', close: 'Close',
    emptyTitle: 'No sentences match these filters.', emptyBody: 'Try another search or filter.', emptyAllTitle: 'No learned sentences yet.', emptyAllBody: 'Sentences will appear here after study or practice.', browse: 'Browse bundles', previous: 'Previous', next: 'Next',
  },
};

export default function SentencesProgressClient({ initialData, language }: { initialData: { sentences: UserSentenceRecord[]; summary: UserSentencesSummary }; language: Language }) {
  const t = copy[language];
  const [sentences, setSentences] = useState(initialData.sentences);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [sort, setSort] = useState<SortKey>('priority');
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [memoDraft, setMemoDraft] = useState('');
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const selected = selectedId ? sentences.find(item => item.sentenceId === selectedId) || null : null;

  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    return sentences
      .filter(item => !normalized || [item.sentence, item.translation, item.translationEn].some(value => value?.toLocaleLowerCase().includes(normalized)))
      .filter(item => matchesStatus(item, status))
      .sort((a, b) => compareSentences(a, b, sort));
  }, [sentences, query, status, sort]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const visible = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  function applyFilter(callback: () => void) { callback(); setPage(1); }
  function openSentence(item: UserSentenceRecord) { setSelectedId(item.sentenceId); setMemoDraft(item.memo || ''); setSaveState('idle'); }

  async function updateSentence(sentenceId: number, update: { is_pinned?: boolean; memo?: string | null }) {
    const response = await fetch('/api/user-interactions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sentence_id: sentenceId, ...update }) });
    if (!response.ok) throw new Error('Update failed');
    setSentences(current => current.map(item => item.sentenceId === sentenceId ? { ...item, isPinned: update.is_pinned ?? item.isPinned, memo: update.memo !== undefined ? update.memo : item.memo } : item));
  }
  async function togglePin(item: UserSentenceRecord) {
    const next = !item.isPinned;
    setSentences(current => current.map(row => row.sentenceId === item.sentenceId ? { ...row, isPinned: next } : row));
    try { await updateSentence(item.sentenceId, { is_pinned: next }); }
    catch { setSentences(current => current.map(row => row.sentenceId === item.sentenceId ? { ...row, isPinned: !next } : row)); }
  }
  async function saveMemo() {
    if (!selected) return;
    setSaveState('saving');
    try { await updateSentence(selected.sentenceId, { memo: memoDraft.trim() || null }); setSaveState('saved'); }
    catch { setSaveState('error'); }
  }

  return (
    <main className="mx-auto max-w-7xl px-0 pb-10 text-zinc-950 dark:text-zinc-100 lg:px-2">
      <ProgressMobileMenu language={language} activeIndex={2} />
      <div className="grid min-h-[calc(100vh-140px)] overflow-hidden bg-white dark:bg-zinc-950 lg:grid-cols-[238px_minmax(0,1fr)] lg:rounded-xl lg:border lg:border-zinc-200 lg:dark:border-zinc-800">
        <ProgressSidebar language={language} activeIndex={2} />
        <section className="min-w-0">
          <header className="border-b border-zinc-200 px-4 py-6 dark:border-zinc-800 sm:px-8 lg:px-10">
            <Link href="/learn/progress" className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-500 hover:text-[#2f7d4a] dark:text-zinc-400"><ArrowLeft className="h-4 w-4" />{t.back}</Link>
            <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div><h1 className="text-3xl font-bold sm:text-4xl">{t.title}</h1><p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-300">{t.description}</p></div>
              <div className="grid grid-cols-2 gap-2 sm:flex">
                <ActionLink href="/learn/review/sentences?scope=unstarted" enabled={initialData.summary.levels[0] > 0} secondary icon={BookOpen} label={`${t.startLearning}${initialData.summary.levels[0] ? ` (${initialData.summary.levels[0]})` : ''}`} />
                <ActionLink href="/learn/review/sentences?returnTo=/learn/progress/sentences" enabled={initialData.summary.due > 0} icon={Play} label={`${t.startReview}${initialData.summary.due ? ` (${initialData.summary.due})` : ''}`} />
              </div>
            </div>
          </header>

          <div className="px-4 py-6 sm:px-8 lg:px-10">
            <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
              <SummaryItem icon={MessageSquareText} label={t.total} value={initialData.summary.total} tone="green" />
              <SummaryItem icon={Clock3} label={t.due} value={initialData.summary.due} tone="coral" />
              <SummaryItem icon={CheckCircle2} label={t.mastered} value={initialData.summary.mastered} tone="blue" />
              <SummaryItem icon={Target} label={t.accuracy} value={initialData.summary.accuracy === null ? t.noAttempts : `${initialData.summary.accuracy}%`} tone="amber" />
            </section>

            <section className="mt-6 border-y border-zinc-200 py-5 dark:border-zinc-800">
              <div className="flex items-center justify-between gap-4"><h2 className="font-bold">{t.distribution}</h2><span className="text-sm text-zinc-500">{t.attempts(initialData.summary.correct, initialData.summary.incorrect)}</span></div>
              <div className="mt-4 grid grid-cols-3 gap-2 lg:grid-cols-6">{initialData.summary.levels.map((count, level) => <button key={level} type="button" onClick={() => applyFilter(() => setStatus(`level-${level}`))} className="min-w-0 border-l-2 border-zinc-200 px-3 py-1 text-left hover:border-[#3f9657] dark:border-zinc-700"><span className="block text-xl font-bold tabular-nums">{count}</span><span className="mt-1 block truncate text-xs text-zinc-500">{t.level} {level} · {t.levels[level]}</span></button>)}</div>
            </section>

            <section className="mt-7">
              <div className="flex items-center justify-between"><h2 className="text-xl font-bold">{t.mySentences}</h2><span className="text-sm font-medium text-zinc-500">{t.results(filtered.length)}</span></div>
              <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(260px,1fr)_190px_190px]">
                <label className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" /><input value={query} onChange={event => applyFilter(() => setQuery(event.target.value))} placeholder={t.search} className="h-11 w-full rounded-md border border-zinc-200 bg-white pl-10 pr-3 text-sm outline-none focus:border-[#3f9657] dark:border-zinc-700 dark:bg-zinc-900" /></label>
                <Select value={status} onChange={value => applyFilter(() => setStatus(value as StatusFilter))} label={t.status} options={statusOptions(t)} />
                <Select value={sort} onChange={value => setSort(value as SortKey)} label={t.sort} options={[{ value: 'priority', label: t.priority }, { value: 'recent', label: t.recent }, { value: 'mistakes', label: t.mistakes }, { value: 'alphabetical', label: t.alphabetical }]} />
              </div>

              {visible.length ? <div className="mt-5 border-y border-zinc-200 dark:border-zinc-800">{visible.map(item => <SentenceRow key={item.sentenceId} item={item} language={language} t={t} onOpen={() => openSentence(item)} onTogglePin={() => togglePin(item)} />)}</div> : <EmptyState hasAny={sentences.length > 0} t={t} />}
              {totalPages > 1 && <nav className="mt-6 flex items-center justify-center gap-2" aria-label="Pagination"><PageButton label={t.previous} disabled={safePage === 1} onClick={() => setPage(Math.max(1, safePage - 1))}><ChevronLeft className="h-4 w-4" /></PageButton><span className="min-w-20 text-center text-sm font-bold">{safePage} / {totalPages}</span><PageButton label={t.next} disabled={safePage === totalPages} onClick={() => setPage(Math.min(totalPages, safePage + 1))}><ChevronRight className="h-4 w-4" /></PageButton></nav>}
            </section>
          </div>
        </section>
      </div>
      {selected && <SentenceSheet item={selected} language={language} t={t} memoDraft={memoDraft} setMemoDraft={value => { setMemoDraft(value); setSaveState('idle'); }} saveState={saveState} onSave={saveMemo} onClose={() => setSelectedId(null)} />}
    </main>
  );
}

function ActionLink({ href, enabled, secondary = false, icon: Icon, label }: { href: string; enabled: boolean; secondary?: boolean; icon: React.ElementType; label: string }) { return <Link href={href} aria-disabled={!enabled} className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-4 text-sm font-bold ${enabled ? secondary ? 'border border-[#3f9657] text-[#2f7d4a] hover:bg-[#eef8ef] dark:text-emerald-300' : 'bg-[#3f9657] text-white hover:bg-[#2f7d4a]' : secondary ? 'pointer-events-none border border-zinc-200 text-zinc-400 dark:border-zinc-700' : 'pointer-events-none bg-zinc-300 text-white dark:bg-zinc-700'}`}><Icon className="h-4 w-4" />{label}</Link>; }
function SummaryItem({ icon: Icon, label, value, tone }: { icon: React.ElementType; label: string; value: number | string; tone: 'green' | 'coral' | 'blue' | 'amber' }) { const colors = { green: 'text-[#3f9657] bg-[#e7f4e8]', coral: 'text-[#e95c3e] bg-[#fff0ec]', blue: 'text-[#4676cc] bg-[#edf3ff]', amber: 'text-[#a66d13] bg-[#fff5d9]' }; return <div className="border border-zinc-200 p-4 dark:border-zinc-800"><div className={`flex h-9 w-9 items-center justify-center rounded-md ${colors[tone]}`}><Icon className="h-5 w-5" /></div><p className="mt-4 text-sm font-semibold text-zinc-500">{label}</p><p className="mt-1 text-2xl font-bold tabular-nums">{value}</p></div>; }
function Select({ value, onChange, label, options }: { value: string; onChange: (value: string) => void; label: string; options: Array<{ value: string; label: string }> }) { return <label className="relative"><Filter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" /><span className="sr-only">{label}</span><select value={value} onChange={event => onChange(event.target.value)} className="h-11 w-full appearance-none rounded-md border border-zinc-200 bg-white pl-10 pr-8 text-sm outline-none focus:border-[#3f9657] dark:border-zinc-700 dark:bg-zinc-900">{options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select><ChevronRight className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 rotate-90 text-zinc-400" /></label>; }

function SentenceRow({ item, language, t, onOpen, onTogglePin }: { item: UserSentenceRecord; language: Language; t: typeof copy.ko; onOpen: () => void; onTogglePin: () => void }) {
  const translation = (language === 'en' ? item.translationEn : item.translation) || item.translation || item.translationEn || '—';
  const attempts = item.correctCount + item.incorrectCount;
  const accuracy = attempts ? Math.round(item.correctCount / attempts * 100) : null;
  const bundle = item.bundleTitles[0];
  return <article className="grid grid-cols-[36px_minmax(0,1fr)_36px] gap-3 border-b border-zinc-100 px-2 py-5 last:border-0 dark:border-zinc-800 sm:px-3 lg:grid-cols-[40px_minmax(0,1fr)_150px_130px_40px] lg:items-center">
    <button type="button" onClick={onTogglePin} aria-label={t.pinned} className={`flex h-9 w-9 items-center justify-center rounded-md ${item.isPinned ? 'text-[#2f7d4a]' : 'text-zinc-300 hover:text-zinc-500 dark:text-zinc-700'}`}><Bookmark className={`h-4 w-4 ${item.isPinned ? 'fill-current' : ''}`} /></button>
    <button type="button" onClick={onOpen} className="min-w-0 text-left"><span className="block text-base font-bold leading-7">{item.sentence}</span><span className="mt-1 block text-sm leading-6 text-zinc-500">{translation}</span><span className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-zinc-400"><span>{t.level} {item.proficiencyLevel} · {t.levels[item.proficiencyLevel]}</span>{bundle && <span>{language === 'en' ? bundle.titleEn || bundle.title : bundle.title}</span>}{item.memo && <span className="text-[#2f7d4a]">{item.memo}</span>}</span></button>
    <AudioButton url={item.audioUrl} label={t.listen} className="lg:hidden" />
    <div className="col-start-2 flex items-center gap-3 text-xs text-zinc-500 lg:col-auto lg:block lg:text-sm"><span className={item.isReviewDue ? 'font-bold text-[#d9573b]' : ''}>{reviewLabel(item, language, t)}</span><span className="lg:hidden">{accuracy === null ? '—' : `${accuracy}%`}</span></div>
    <span className="hidden text-sm font-semibold lg:block">{accuracy === null ? '—' : `${accuracy}%`}</span><AudioButton url={item.audioUrl} label={t.listen} className="hidden lg:flex" />
  </article>;
}

function SentenceSheet({ item, language, t, memoDraft, setMemoDraft, saveState, onSave, onClose }: { item: UserSentenceRecord; language: Language; t: typeof copy.ko; memoDraft: string; setMemoDraft: (value: string) => void; saveState: 'idle' | 'saving' | 'saved' | 'error'; onSave: () => void; onClose: () => void }) {
  const translation = (language === 'en' ? item.translationEn : item.translation) || item.translation || item.translationEn;
  return <div className="fixed inset-0 z-50" role="dialog" aria-modal="true"><button type="button" onClick={onClose} aria-label={t.close} className="absolute inset-0 h-full w-full bg-black/35" /><aside className="absolute inset-x-0 bottom-0 flex max-h-[88vh] flex-col rounded-t-lg border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-950 md:inset-x-auto md:bottom-auto md:right-0 md:top-0 md:h-full md:w-[460px] md:rounded-none">
    <header className="flex items-start justify-between gap-3 border-b border-zinc-200 px-5 py-5 dark:border-zinc-800"><div><p className="text-xs font-bold text-[#2f7d4a]">{t.details}</p><h2 className="mt-2 text-xl font-bold leading-8">{item.sentence}</h2>{translation && <p className="mt-2 text-sm leading-6 text-zinc-500">{translation}</p>}</div><button type="button" onClick={onClose} aria-label={t.close} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800"><X className="h-4 w-4" /></button></header>
    <div className="overflow-y-auto px-5 py-5 pb-28"><div className="grid grid-cols-2 gap-x-5 gap-y-4 border-b border-zinc-200 pb-5 text-sm dark:border-zinc-800"><Detail label={t.proficiency} value={`${t.level} ${item.proficiencyLevel} · ${t.levels[item.proficiencyLevel]}`} /><Detail label={t.lastStudy} value={formatDate(item.lastReviewedAt, language, t.never)} /><Detail label={t.correct} value={String(item.correctCount)} /><Detail label={t.incorrect} value={String(item.incorrectCount)} /><Detail label={t.streak} value={String(item.streakCount)} /><Detail label={t.nextReview} value={item.nextReviewAt ? formatDate(item.nextReviewAt, language, t.notScheduled) : t.notScheduled} /></div>
      <DetailSection title={t.bundles}>{item.bundleTitles.length ? <div className="flex flex-wrap gap-2">{item.bundleTitles.map(bundle => <Link key={bundle.id} href={`/bundles/${bundle.id}`} className="rounded-md bg-zinc-100 px-3 py-2 text-sm font-semibold hover:text-[#2f7d4a] dark:bg-zinc-800">{language === 'en' ? bundle.titleEn || bundle.title : bundle.title}</Link>)}</div> : <p className="text-sm text-zinc-500">{t.noBundles}</p>}</DetailSection>
      <DetailSection title={t.keyWords}>{item.words.length ? <div className="flex flex-wrap gap-2">{item.words.map(word => <span key={word.id} className="rounded-md border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700">{word.usedAs || word.word}<span className="ml-1 text-zinc-400">· {(language === 'en' ? word.meaningEn : word.meaningKo) || word.meaningKo || word.meaningEn}</span></span>)}</div> : <p className="text-sm text-zinc-500">{t.noWords}</p>}</DetailSection>
    </div>
    <div className="absolute inset-x-0 bottom-0 border-t border-zinc-200 bg-white px-5 py-4 dark:border-zinc-800 dark:bg-zinc-950"><label className="text-xs font-bold text-zinc-500">{t.memo}</label><div className="mt-2 flex gap-2"><input value={memoDraft} maxLength={1000} onChange={event => setMemoDraft(event.target.value)} placeholder={t.memoPlaceholder} className="min-w-0 flex-1 rounded-md border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-[#3f9657] dark:border-zinc-700 dark:bg-zinc-900" /><button type="button" onClick={onSave} disabled={saveState === 'saving'} className="rounded-md bg-[#3f9657] px-4 text-sm font-bold text-white disabled:opacity-60">{saveState === 'saving' ? t.saving : t.save}</button></div>{saveState === 'saved' && <p className="mt-1 text-xs text-[#2f7d4a]">{t.saved}</p>}{saveState === 'error' && <p className="mt-1 text-xs text-red-600">{t.saveFailed}</p>}</div>
  </aside></div>;
}

function Detail({ label, value }: { label: string; value: string }) { return <div><dt className="text-xs font-bold text-zinc-400">{label}</dt><dd className="mt-1 font-semibold">{value}</dd></div>; }
function DetailSection({ title, children }: { title: string; children: React.ReactNode }) { return <section className="mt-6"><h3 className="mb-3 text-sm font-bold">{title}</h3>{children}</section>; }
function AudioButton({ url, label, className }: { url: string | null; label: string; className: string }) { const publicUrl = getPublicUrl(url); return <button type="button" disabled={!publicUrl} onClick={() => publicUrl && new Audio(publicUrl).play().catch(console.error)} aria-label={label} title={label} className={`${className} h-9 w-9 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-100 disabled:opacity-25 dark:hover:bg-zinc-800`}><Volume2 className="h-4 w-4" /></button>; }
function EmptyState({ hasAny, t }: { hasAny: boolean; t: typeof copy.ko }) { return <div className="mt-5 border border-dashed border-zinc-300 px-5 py-12 text-center dark:border-zinc-700"><MessageSquareText className="mx-auto h-7 w-7 text-zinc-400" /><h3 className="mt-3 font-bold">{hasAny ? t.emptyTitle : t.emptyAllTitle}</h3><p className="mt-2 text-sm text-zinc-500">{hasAny ? t.emptyBody : t.emptyAllBody}</p>{!hasAny && <Link href="/bundles" className="mt-5 inline-flex rounded-md bg-[#3f9657] px-4 py-2.5 text-sm font-bold text-white">{t.browse}</Link>}</div>; }
function PageButton({ children, label, disabled, onClick }: { children: React.ReactNode; label: string; disabled: boolean; onClick: () => void }) { return <button type="button" aria-label={label} disabled={disabled} onClick={onClick} className="flex h-10 w-10 items-center justify-center rounded-md border border-zinc-200 disabled:opacity-30 dark:border-zinc-700">{children}</button>; }
function matchesStatus(item: UserSentenceRecord, status: StatusFilter) { if (status === 'all') return true; if (status === 'due') return item.isReviewDue; if (status === 'pinned') return item.isPinned; if (status === 'memo') return Boolean(item.memo); if (status.startsWith('level-')) return item.proficiencyLevel === Number(status.slice(6)); if (status === 'learning') return item.proficiencyLevel === 1; if (status === 'familiar') return item.proficiencyLevel >= 2 && item.proficiencyLevel <= 3; if (status === 'almost-mastered') return item.proficiencyLevel === 4; return item.proficiencyLevel === 5; }
function compareSentences(a: UserSentenceRecord, b: UserSentenceRecord, sort: SortKey) { if (sort === 'alphabetical') return a.sentence.localeCompare(b.sentence); if (sort === 'mistakes') return b.incorrectCount - a.incorrectCount || a.proficiencyLevel - b.proficiencyLevel; if (sort === 'recent') return dateValue(b.lastReviewedAt) - dateValue(a.lastReviewedAt); return Number(b.isReviewDue) - Number(a.isReviewDue) || a.proficiencyLevel - b.proficiencyLevel || b.incorrectCount - a.incorrectCount || dateValue(a.lastReviewedAt) - dateValue(b.lastReviewedAt); }
function reviewLabel(item: UserSentenceRecord, language: Language, t: typeof copy.ko) { if (item.proficiencyLevel === 5) return t.complete; if (!item.proficiencyLevel) return t.notScheduled; if (item.isReviewDue) return t.now; return item.nextReviewAt ? `${t.upcoming} · ${formatDate(item.nextReviewAt, language, '')}` : t.notScheduled; }
function dateValue(value: string | null) { return value ? new Date(value).getTime() || 0 : 0; }
function formatDate(value: string | null, language: Language, fallback: string) { if (!value) return fallback; return new Intl.DateTimeFormat(language === 'ko' ? 'ko-KR' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric' }).format(new Date(value)); }
function statusOptions(t: typeof copy.ko) { return [{ value: 'all', label: t.all }, { value: 'due', label: t.due }, { value: 'learning', label: t.levels[1] }, { value: 'familiar', label: `${t.levels[2]} / ${t.levels[3]}` }, { value: 'almost-mastered', label: t.levels[4] }, { value: 'mastered', label: t.levels[5] }, { value: 'pinned', label: t.pinned }, { value: 'memo', label: t.hasMemo }]; }
