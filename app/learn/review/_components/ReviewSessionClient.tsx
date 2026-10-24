'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { PracticeCountSelector, type PracticeCountValue } from '@/components/practice/PracticeCountSelector';
import WordPracticeClient from '@/components/practice/WordPracticeClient';
import SentencesReviewClient from '../sentences/SentencesReviewClient';
import type { ReviewNeededSummary, ReviewSentenceItem, ReviewWordItem } from '@/lib/supabase/services/learning-review';
import type { WordUsageDetail } from '@/lib/supabase/services/word-sentence-map';
import { defaultSentenceReviewMode, selectReviewItems, sentenceReviewItems, type SentenceReviewMode } from '@/lib/learning/review-session';
import type { ReviewResult } from '@/lib/learning/review-result';
import type { PracticeMode } from '@/lib/practice/registry';
import { NextReviewTime } from './NextReviewTime';

type Item = ReviewSentenceItem | ReviewWordItem;
type Attempt = { payload: ReviewResult; state: 'pending' | 'saved' | 'failed'; retryable: boolean };
const button = 'inline-flex min-h-11 items-center justify-center rounded-lg border border-zinc-300 px-4 py-2 text-sm font-bold disabled:opacity-50 dark:border-zinc-700';
const primary = `${button} border-transparent bg-[#3f9657] text-white hover:bg-[#2f7d4a]`;

export default function ReviewSessionClient({ type, items, availableCount, language, settings, returnTo, wordUsageDetails = [], bundleId, optionPool = [] }: {
  type: 'words' | 'sentences'; items: Item[]; availableCount: number; language: 'ko' | 'en';
  settings: { mode: string; count: number; autoStart: boolean }; returnTo?: string; wordUsageDetails?: WordUsageDetail[];
  bundleId?: string; optionPool?: Item[];
}) {
  const ko = language === 'ko';
  const returnHref = returnTo || '/learn/review';
  const returnLabel = returnTo?.startsWith('/bundles/')
    ? (ko ? '번들로 돌아가기' : 'Back to bundle')
    : returnTo === '/learn/progress/words' || returnTo === '/learn/progress/sentences'
    ? (ko ? '학습 현황으로' : 'Back to progress')
    : (ko ? '복습 목록으로' : 'Back to review');
  const sentenceOptionPool = type === 'sentences' && optionPool.length > 0 ? (optionPool as ReviewSentenceItem[]) : undefined;
  const poolItems = optionPool.length > 0 ? optionPool : items;
  const resolvedMode = type === 'sentences' && settings.mode === 'quiz' ? defaultSentenceReviewMode(items as ReviewSentenceItem[], language, sentenceOptionPool) : settings.mode;
  const [mode, setMode] = useState(resolvedMode);
  const [count, setCount] = useState<PracticeCountValue>(availableCount <= items.length && items.length <= settings.count ? 'all' : Math.min(items.length, settings.count));
  const [phase, setPhase] = useState<'setup' | 'practice' | 'finished'>('setup');
  const [active, setActive] = useState<Item[]>([]);
  const [sessionId, setSessionId] = useState('');
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const records = useRef(new Map<number, Attempt>());
  const started = useRef(false);
  const tracked = useRef(new Set<string>());
  const [rehearsal, setRehearsal] = useState(false);
  const [practiceKey, setPracticeKey] = useState(0);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState<ReviewNeededSummary | null>(null);
  const [summaryError, setSummaryError] = useState(false);
  const readOnly = type === 'sentences' && mode === 'flashcards';
  const eligible = type === 'sentences' ? sentenceReviewItems(items as ReviewSentenceItem[], mode as SentenceReviewMode, language, sentenceOptionPool) : items;
  const pending = attempts.filter(a => a.state === 'pending').length;
  const failed = attempts.filter(a => a.state === 'failed').length;
  const unsettled = pending + failed > 0;
  const publish = () => setAttempts([...records.current.values()].map(a => ({ ...a })));

  const start = useCallback(() => {
    const pool = type === 'sentences' ? sentenceReviewItems(items as ReviewSentenceItem[], mode as SentenceReviewMode, language, sentenceOptionPool) : items;
    const selected = selectReviewItems<Item>(pool, count);
    if (!selected.length) return;
    records.current.clear(); setAttempts([]); setSummary(null); setSummaryError(false);
    setSessionId(crypto.randomUUID()); setActive(selected); setTotal(selected.length); setRehearsal(false);
    setPracticeKey(key => key + 1); setPhase('practice');
  }, [items, count, mode, type, language, sentenceOptionPool]);

  useEffect(() => {
    if (settings.autoStart && !started.current) { started.current = true; start(); }
  }, [settings.autoStart, start]);

  useEffect(() => {
    if (!unsettled) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [unsettled]);

  const loadSummary = useCallback(async () => {
    setSummaryError(false);
    try {
      const response = await fetch('/api/review/summary', { cache: 'no-store' });
      if (!response.ok) throw new Error();
      setSummary(await response.json());
    } catch { setSummaryError(true); }
  }, []);
  useEffect(() => {
    if (phase === 'finished' && !unsettled) void loadSummary();
  }, [phase, unsettled, loadSummary]);

  useEffect(() => {
    if (!sessionId || rehearsal || phase === 'setup' || (phase === 'finished' && unsettled)) return;
    const ended = phase === 'finished';
    const key = `${sessionId}:${ended}`;
    if (tracked.current.has(key)) return;
    tracked.current.add(key);
    void fetch('/api/review/sessions', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, type, mode, count: total, ended }), keepalive: true,
    }).catch(() => { tracked.current.delete(key); });
  }, [sessionId, phase, unsettled, rehearsal, type, mode, total]);

  const send = async (attempt: Attempt) => {
    attempt.state = 'pending'; publish();
    try {
      const response = await fetch('/api/review/results', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(attempt.payload) });
      if (!response.ok) { attempt.retryable = response.status >= 500 || response.status === 429; throw new Error(); }
      const result = await response.json();
      if (!result.saved) throw new Error();
      attempt.state = 'saved';
    } catch { attempt.state = 'failed'; }
    publish();
  };
  const record = (id: string | number, correct: boolean, wordId?: number) => {
    if (rehearsal || readOnly) return;
    const item = active.find(item => type === 'words' ? item.id === Number(id) : (item as ReviewSentenceItem).bundle_item_id === id);
    if (!item || records.current.has(item.id)) return;
    const practiceMode = type === 'words' ? mode === 'quiz' ? 'word_quiz' : mode === 'flashcard' ? 'word_flashcards' : 'spelling' : mode;
    const payload: ReviewResult = { attemptId: crypto.randomUUID(), sessionId, type, targetId: String(item.id), mode: practiceMode as PracticeMode, correct };
    if (bundleId) payload.bundleId = bundleId;
    if (type === 'sentences') {
      const sentence = item as ReviewSentenceItem;
      payload.bundleId = sentence.bundle_id; payload.bundleItemId = sentence.bundle_item_id;
      if (wordId) payload.wordId = wordId;
    }
    const attempt: Attempt = { payload, state: 'pending', retryable: true };
    records.current.set(item.id, attempt);
    void send(attempt);
  };
  const controls = { mode, onRecord: record, onFinish: () => setPhase('finished') };
  const title = type === 'words' ? ko ? '단어 복습' : 'Word review' : ko ? '문장 복습' : 'Sentence review';
  const modes = type === 'words'
    ? [{ id: 'quiz', label: ko ? '단어 퀴즈' : 'Word quiz' }, { id: 'spelling', label: ko ? '스펠링' : 'Spelling' }, { id: 'flashcard', label: ko ? '플래시카드 · 자기평가' : 'Flashcards · self-assessment' }]
    : [{ id: 'quiz', label: ko ? '문장 퀴즈' : 'Sentence quiz' }, { id: 'scramble', label: ko ? '스크램블' : 'Scramble' }, { id: 'wordfill', label: ko ? '단어 채우기' : 'Word Fill' }, { id: 'flashcards', label: ko ? '플래시카드 · 다시 보기' : 'Flashcards · read again' }];

  const status = <div aria-live="polite" className="text-sm">
    {pending > 0 && <p>{ko ? `답변 ${pending}개 저장 중…` : `Saving ${pending} answers…`}</p>}
    {failed > 0 && <div role="alert" className="space-y-2 rounded-lg border border-amber-300 p-3">
      <p>{ko ? `${failed}개 답변의 저장을 확인하지 못했습니다. 아래에서 다시 저장하거나 복습 목록을 새로 확인하세요.` : `Could not confirm ${failed} saved answers. Retry saving or reload the review list.`}</p>
      {attempts.some(a => a.state === 'failed' && a.retryable) && <button className={button} disabled={pending > 0} onClick={() => { for (const attempt of records.current.values()) if (attempt.state === 'failed' && attempt.retryable) void send(attempt); }}>{ko ? '저장 다시 시도' : 'Retry saving'}</button>}
      <a className="ml-3 underline" href="/learn/review">{ko ? '최신 복습 목록 확인' : 'Reload review list'}</a>
    </div>}
  </div>;

  if (phase === 'practice') return <div className="min-w-0">
    <div className="mx-auto max-w-2xl px-4 pt-4">
      <div className="flex items-center justify-between gap-4">
        <Link
          href={returnHref}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-zinc-600 transition hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>{returnLabel}</span>
        </Link>
        <button className={button} onClick={controls.onFinish}>
          {ko ? '세션 마치기' : 'End session'}
        </button>
      </div>
      {status}
      {rehearsal && <p className="mt-2 text-sm text-zinc-500">{ko ? '다시 보기: 첫 평가와 복습 일정은 바뀌지 않습니다.' : 'Practice again: your first assessment and schedule are unchanged.'}</p>}
      {readOnly && <p className="mt-2 text-sm text-zinc-500">{ko ? '다시 보기는 복습 일정에 반영되지 않습니다.' : 'Reading cards does not change your review schedule.'}</p>}
    </div>
    {type === 'words' ? (
      <WordPracticeClient
        key={practiceKey}
        initialItems={active as ReviewWordItem[]}
        optionItems={poolItems as ReviewWordItem[]}
        availableReviewCount={availableCount}
        language={language}
        wordUsageDetails={wordUsageDetails}
        reviewControls={controls}
        returnTo={returnHref}
      />
    ) : (
      <SentencesReviewClient
        key={practiceKey}
        initialItems={active as ReviewSentenceItem[]}
        optionItems={poolItems as ReviewSentenceItem[]}
        availableReviewCount={availableCount}
        language={language}
        reviewControls={controls}
        returnTo={returnHref}
      />
    )}
  </div>;

  if (phase === 'finished') {
    const correct = attempts.filter(a => a.payload.correct).length;
    const wrongIds = new Set(attempts.filter(a => !a.payload.correct).map(a => Number(a.payload.targetId)));
    const remaining = summary ? type === 'words' ? summary.availableWords : summary.availableSentences : 0;
    const other = summary ? type === 'words' ? summary.availableSentences : summary.availableWords : 0;
    const otherType = type === 'words' ? 'sentences' : 'words';
    return <section className="mx-auto max-w-2xl space-y-5 px-4 py-10">
      <h1 className="text-3xl font-bold">{ko ? '이번 세션 결과' : 'Session results'}</h1>
      {readOnly ? <p>{ko ? '문장을 다시 확인했습니다. 예정된 복습은 그대로 유지됩니다.' : 'Your scheduled reviews remain unchanged after reading.'}</p> : <>
        <p className="text-lg font-bold">{mode === 'flashcard' ? (ko ? `자기평가: ${attempts.length}개 중 ${correct}개 기억함` : `Self-assessment: remembered ${correct} of ${attempts.length}`) : (ko ? `첫 시도: ${attempts.length}개 중 ${correct}개 정답` : `First attempt: ${correct} of ${attempts.length} correct`)}</p>
        <p>{ko ? `선택 ${total}개 · 미제출 ${total - attempts.length}개 · 다시 볼 항목 ${wrongIds.size}개` : `Selected ${total} · Unanswered ${total - attempts.length} · To revisit ${wrongIds.size}`}</p>
      </>}
      {status}
      {!unsettled && summary && <div className="rounded-xl bg-zinc-100 p-4 dark:bg-zinc-900">
        <p>{ko ? `현재 복습 대기 ${summary.availableTotal}개` : `${summary.availableTotal} reviews currently due`}</p>
        <p className="mt-2 text-sm">{ko ? '평가한 항목은 결과에 따라 다음 복습 시점으로 이동합니다.' : 'Assessed items move to their next scheduled review.'}</p>
        <NextReviewTime value={summary.nextReviewAt} language={language} />
      </div>}
      {!unsettled && !summary && !summaryError && <p role="status">{ko ? '최신 복습 목록 확인 중…' : 'Refreshing reviews…'}</p>}
      {summaryError && <button className={button} onClick={() => void loadSummary()}>{ko ? '복습 목록 다시 불러오기' : 'Retry loading reviews'}</button>}
      <div className="flex flex-wrap gap-3">
        {!unsettled && remaining > 0 && <a href={`/learn/review/${type}?start=1&count=10${returnTo ? `&returnTo=${encodeURIComponent(returnTo)}` : ''}${bundleId ? `&bundleId=${encodeURIComponent(bundleId)}` : ''}`} className={primary}>{ko ? `다음 ${Math.min(10, remaining)}개` : `Next ${Math.min(10, remaining)}`}</a>}
        {!unsettled && other > 0 && <a href={`/learn/review/${otherType}?start=1&count=10${returnTo ? `&returnTo=${encodeURIComponent(returnTo)}` : ''}${bundleId ? `&bundleId=${encodeURIComponent(bundleId)}` : ''}`} className={button}>{ko ? `${otherType === 'words' ? '단어' : '문장'} 복습` : `Review ${otherType}`}</a>}
        {wrongIds.size > 0 && <button className={button} disabled={unsettled} onClick={() => { setActive(items.filter(item => wrongIds.has(item.id))); setRehearsal(true); setPracticeKey(key => key + 1); setPhase('practice'); }}>{ko ? '틀린 항목 다시 보기' : 'Revisit incorrect items'}</button>}
        {!unsettled && <a href={returnHref} className={button}>{returnLabel}</a>}
        {!unsettled && returnHref !== '/learn/review' && <a href="/learn/review" className={button}>{ko ? '복습 홈으로' : 'Back to review home'}</a>}
      </div>
    </section>;
  }

  return <section className="mx-auto max-w-2xl space-y-6 px-4 py-8">
    <Link href={returnHref} className="inline-flex items-center gap-1.5 text-sm font-semibold text-zinc-600 underline transition hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100">
      <ArrowLeft className="h-4 w-4" />
      <span>{returnLabel}</span>
    </Link>
    <h1 className="text-3xl font-bold">{title}</h1>
    {!items.length ? <><p>{ko ? '지금 복습할 항목이 없습니다. 최신 복습 목록에서 다음 일정을 확인하세요.' : 'Nothing is due right now. Check review home for your next schedule.'}</p><a href="/learn/review" className={primary}>{ko ? '복습 목록 확인' : 'Check review home'}</a></> : <>
      <p className="text-sm text-zinc-500">{ko ? `전체 대기 ${availableCount}개 · 이번 목록 ${items.length}개` : `${availableCount} due · ${items.length} loaded`}</p>
      {resolvedMode !== settings.mode && <p className="text-sm">{ko ? '퀴즈 선택지가 부족해 스크램블로 안내합니다.' : 'Scramble is available because there are not enough quiz alternatives.'}</p>}
      <fieldset><legend className="mb-3 font-bold">{ko ? '복습 방식' : 'Review mode'}</legend><div className="flex flex-wrap gap-2">{modes.map(option => {
        const disabled = type === 'sentences' && !sentenceReviewItems(items as ReviewSentenceItem[], option.id as SentenceReviewMode, language, sentenceOptionPool).length;
        return <button key={option.id} className={`${button} ${mode === option.id ? 'border-green-600 bg-green-50 text-green-800 dark:bg-green-950 dark:text-green-100' : ''}`} aria-pressed={mode === option.id} disabled={disabled} onClick={() => { setMode(option.id); const size = type === 'sentences' ? sentenceReviewItems(items as ReviewSentenceItem[], option.id as SentenceReviewMode, language, sentenceOptionPool).length : items.length; setCount(availableCount <= items.length && size <= 10 ? 'all' : Math.min(10, size)); }}>{option.label}</button>;
      })}</div></fieldset>
      <PracticeCountSelector label={ko ? `이 방식으로 가능한 항목 ${eligible.length}개` : `${eligible.length} available in this mode`} options={[...new Set([Math.min(5, eligible.length), 10, 20])].filter(n => n > 0)} totalCount={eligible.length} selectedCount={count} onSelect={setCount} showAll={availableCount <= items.length} allLabel={n => ko ? `전체 ${n}개` : `All ${n}`} />
      <button disabled={!eligible.length} onClick={start} className={`${primary} w-full`}>{ko ? `${Math.min(count === 'all' ? 40 : count, eligible.length)}개 ${readOnly ? '다시 보기' : '복습 시작'}` : `Start ${Math.min(count === 'all' ? 40 : count, eligible.length)} items`}</button>
    </>}
  </section>;
}
