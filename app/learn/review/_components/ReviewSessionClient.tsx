'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { PracticeCountSelector, type PracticeCountValue } from '@/components/practice/PracticeCountSelector';
import WordPracticeClient from '@/components/practice/WordPracticeClient';
import SentencesReviewClient from '../sentences/SentencesReviewClient';
import type { ReviewNeededSummary, ReviewSentenceItem, ReviewWordItem } from '@/lib/supabase/services/learning-review';
import type { WordUsageDetail } from '@/lib/supabase/services/word-sentence-map';
import { selectReviewItems, sentenceReviewItems, type SentenceReviewMode } from '@/lib/learning/review-session';
import type { ReviewResult } from '@/lib/learning/review-result';
import type { PracticeMode } from '@/lib/practice/registry';
import { requestReviewJson } from '@/lib/learning/review-request';
import { NextReviewTime } from './NextReviewTime';

type Item = ReviewSentenceItem | ReviewWordItem;
type Attempt = { payload: ReviewResult; state: 'pending' | 'saved' | 'failed'; retryable: boolean };
const button = 'inline-flex min-h-11 items-center justify-center rounded-lg border border-zinc-300 px-4 py-2 text-sm font-bold disabled:opacity-50 dark:border-zinc-700';
const primary = `${button} border-transparent bg-[#3f9657] text-white hover:bg-[#2f7d4a]`;

export default function ReviewSessionClient({ type, items, availableCount, language, settings, returnTo, wordUsageDetails = [], bundleId, optionPool = [], modeCounts }: {
  type: 'words' | 'sentences'; items: Item[]; availableCount: number; language: 'ko' | 'en';
  settings: { mode: string; count: number; autoStart: boolean }; returnTo?: string; wordUsageDetails?: WordUsageDetail[];
  bundleId?: string; optionPool?: Item[]; modeCounts?: Record<SentenceReviewMode, number>;
}) {
  const ko = language === 'ko';
  const returnHref = returnTo || '/learn/review';
  const returnLabel = returnTo?.startsWith('/bundles/')
    ? (ko ? '번들로 돌아가기' : 'Back to bundle')
    : returnTo === '/learn/progress' || returnTo === '/learn/progress/words' || returnTo === '/learn/progress/sentences'
    ? (ko ? '학습 현황으로' : 'Back to progress')
    : returnTo === '/learn' ? (ko ? '학습 홈으로' : 'Back to learning')
    : (ko ? '복습 목록으로' : 'Back to review');
  const sentenceOptionPool = type === 'sentences' && optionPool.length > 0 ? (optionPool as ReviewSentenceItem[]) : undefined;
  const poolItems = optionPool.length > 0 ? optionPool : items;
  const resolvedMode = type === 'sentences' && settings.mode === 'quiz' ? (sentenceReviewItems(items as ReviewSentenceItem[], 'quiz', language, sentenceOptionPool).length ? 'quiz' : 'scramble') : settings.mode;
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
  const [rehearsedIds, setRehearsedIds] = useState<Set<string>>(new Set());
  const [practiceKey, setPracticeKey] = useState(0);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState<Pick<ReviewNeededSummary, 'availableWords' | 'availableSentences' | 'availableTotal' | 'nextReviewAt'> & { modeCounts?: Record<SentenceReviewMode, number> } | null>(null);
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
    const guardLink = (event: MouseEvent) => {
      if (!(event.target instanceof Element) || !event.target.closest('a[href]')) return;
      event.preventDefault();
      event.stopPropagation();
    };
    window.addEventListener('beforeunload', warn);
    document.addEventListener('click', guardLink, true);
    return () => {
      window.removeEventListener('beforeunload', warn);
      document.removeEventListener('click', guardLink, true);
    };
  }, [unsettled]);

  const loadSummary = useCallback(async () => {
    setSummaryError(false);
    try {
      const response = await requestReviewJson(`/api/review/summary?type=${type}&language=${language}${bundleId ? `&bundleId=${encodeURIComponent(bundleId)}` : ''}`, { cache: 'no-store' });
      if (!response.ok) throw new Error();
      setSummary(response.body);
    } catch { setSummaryError(true); }
  }, [bundleId, type, language]);
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
      const response = await requestReviewJson('/api/review/results', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(attempt.payload) });
      if (!response.ok) { attempt.retryable = response.status >= 500 || response.status === 429; throw new Error(); }
      const result = response.body;
      if (!result.saved) throw new Error();
      attempt.state = 'saved';
    } catch { attempt.state = 'failed'; }
    publish();
  };
  const record = (id: string | number, correct: boolean, wordId?: number) => {
    if (rehearsal) { setRehearsedIds(previous => new Set(previous).add(String(id))); return; }
    if (readOnly) return;
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
    : [{ id: 'quiz', label: ko ? '문장 퀴즈' : 'Sentence quiz' }, { id: 'scramble', label: ko ? '스크램블' : 'Scramble' }, { id: 'wordfill', label: ko ? '단어 채우기' : 'Word Fill' }, { id: 'flashcards', label: ko ? '가볍게 다시 읽기' : 'Read through sentences' }];

  const status = <div aria-live="polite" className="text-sm">
    {pending > 0 && <p>{ko ? `답변 ${pending}개 저장 중…` : `Saving ${pending} answers…`}</p>}
    {failed > 0 && <div role="alert" className="space-y-2 rounded-lg border border-amber-300 p-3">
      <p>{ko ? `${failed}개 답변의 저장을 확인하지 못했습니다. 아래에서 다시 저장하거나 복습 목록을 새로 확인하세요.` : `Could not confirm ${failed} saved answers. Retry saving or reload the review list.`}</p>
      {attempts.some(a => a.state === 'failed' && a.retryable) && <button className={button} disabled={pending > 0} onClick={() => { for (const attempt of records.current.values()) if (attempt.state === 'failed' && attempt.retryable) void send(attempt); }}>{ko ? '저장 다시 시도' : 'Retry saving'}</button>}
      <button className="ml-3 underline" disabled={pending > 0} onClick={() => {
        if (window.confirm(ko ? '저장하지 못한 답변이 있어요. 그래도 복습 목록으로 돌아갈까요?' : 'Some answers could not be saved. Return to the review list anyway?')) window.location.assign('/learn/review');
      }}>{ko ? '복습 목록으로 돌아가기' : 'Return to review list'}</button>
    </div>}
  </div>;

  if (phase === 'practice') return <div className="min-w-0">
    <div className="mx-auto max-w-2xl px-4 pt-4">
      <div className="flex items-center justify-between gap-4">
        <Link
          href={returnHref}
          aria-disabled={unsettled}
          onClick={event => { if (unsettled) event.preventDefault(); }}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-zinc-600 transition hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>{returnLabel}</span>
        </Link>
        <button className={button} onClick={controls.onFinish}>
          {ko ? '여기까지 하기' : 'Finish for now'}
        </button>
      </div>
      {status}
      {rehearsal && <p className="mt-2 text-sm text-zinc-500">{ko ? '헷갈렸던 표현을 편하게 다시 연습해보세요.' : 'Take another look at the items you found tricky.'}</p>}
      {readOnly && <p className="mt-2 text-sm text-zinc-500">{ko ? '편하게 읽어보세요. 복습을 마치려면 퀴즈로 확인해보세요.' : 'Read at your own pace. Try a quiz to complete your review.'}</p>}
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
    const nextMode = readOnly ? 'quiz' : mode;
    const modeRemaining = type === 'sentences' ? summary?.modeCounts?.[nextMode as SentenceReviewMode] ?? 0 : remaining;
    const nextCount = count === 'all' ? 40 : count;
    return <section className="mx-auto max-w-2xl space-y-5 px-4 py-10">
      <h1 className="text-3xl font-bold">{rehearsal
        ? (ko ? (rehearsedIds.size === active.length ? '헷갈렸던 표현을 모두 다시 연습했어요' : `${active.length}개 중 ${rehearsedIds.size}개를 다시 연습했어요`) : `You revisited ${rehearsedIds.size} of ${active.length} items`)
        : readOnly ? (ko ? '가볍게 읽기를 마쳤어요' : 'You finished reading')
        : ko ? (attempts.length === total ? `${attempts.length}개 복습했어요!` : `여기까지 ${attempts.length}개 복습했어요`)
        : `You reviewed ${attempts.length} items!`}</h1>
      {rehearsal ? <p>{ko ? '수고했어요! 다음 복습을 이어가거나 잠깐 쉬어가세요.' : 'Nice work! Continue reviewing or take a break.'}</p> : readOnly ? <p>{ko ? '읽어본 문장을 퀴즈로도 확인해볼까요?' : 'Ready to check what you remember with a quiz?'}</p> : <>
        <p className="text-lg font-bold">{mode === 'flashcard' ? (ko ? `${attempts.length}개 중 ${correct}개를 기억했어요.` : `Self-assessment: remembered ${correct} of ${attempts.length}`) : (ko ? `${attempts.length}개 중 ${correct}개를 처음에 맞혔어요.` : `First attempt: ${correct} of ${attempts.length} correct`)}</p>
        <p>{ko ? `${wrongIds.size > 0 ? `헷갈렸던 표현 ${wrongIds.size}개를 다시 확인해보세요.` : ''}${total > attempts.length ? ` 아직 풀지 않은 ${total - attempts.length}개는 다음에 이어갈 수 있어요.` : ''}` : `${wrongIds.size > 0 ? `Take another look at ${wrongIds.size} tricky items. ` : ''}${total > attempts.length ? `You can review the remaining ${total - attempts.length} another time.` : ''}`}</p>
      </>}
      {status}
      {!unsettled && summary && <div className="rounded-xl bg-zinc-100 p-4 dark:bg-zinc-900">
        <p>{ko ? summary.availableTotal > 0 ? `${bundleId ? '이 번들에서 ' : ''}${summary.availableTotal}개를 더 복습할 수 있어요.` : '지금 할 복습을 모두 마쳤어요!' : `${summary.availableTotal} reviews currently due`}</p>
        <NextReviewTime value={summary.nextReviewAt} language={language} />
      </div>}
      {!unsettled && !summary && !summaryError && <p role="status">{ko ? '최신 복습 목록 확인 중…' : 'Refreshing reviews…'}</p>}
      {summaryError && <button className={button} onClick={() => void loadSummary()}>{ko ? '복습 목록 다시 불러오기' : 'Retry loading reviews'}</button>}
      <div className="flex flex-wrap gap-3">
        {!unsettled && modeRemaining > 0 && <a href={`/learn/review/${type}?start=1&count=${nextCount}&mode=${nextMode}${returnTo ? `&returnTo=${encodeURIComponent(returnTo)}` : ''}${bundleId ? `&bundleId=${encodeURIComponent(bundleId)}` : ''}`} className={primary}>{ko ? readOnly ? '퀴즈로 복습하기' : `${Math.min(nextCount, modeRemaining)}개 더 복습하기` : readOnly ? 'Review with a quiz' : `Review ${Math.min(nextCount, modeRemaining)} more`}</a>}
        {!unsettled && summary && remaining > 0 && modeRemaining === 0 && <Link className={primary} href={`/learn/review/${type}?count=${nextCount}${returnTo ? `&returnTo=${encodeURIComponent(returnTo)}` : ''}${bundleId ? `&bundleId=${encodeURIComponent(bundleId)}` : ''}`}>
          {ko ? '다른 방식으로 복습하기' : 'Try another review mode'}
        </Link>}
        {!unsettled && other > 0 && <a href={`/learn/review/${otherType}?start=1&count=10${returnTo ? `&returnTo=${encodeURIComponent(returnTo)}` : ''}${bundleId ? `&bundleId=${encodeURIComponent(bundleId)}` : ''}`} className={button}>{ko ? `${otherType === 'words' ? '단어' : '문장'} 복습` : `Review ${otherType}`}</a>}
        {!rehearsal && wrongIds.size > 0 && <button className={button} disabled={unsettled} onClick={() => { setActive(items.filter(item => wrongIds.has(item.id))); setRehearsal(true); setRehearsedIds(new Set()); setPracticeKey(key => key + 1); setPhase('practice'); }}>{ko ? '틀린 표현 다시 보기' : 'Revisit incorrect items'}</button>}
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
      <p className="text-sm text-zinc-500">{ko ? `${availableCount}개 중 오늘 복습할 분량을 골라보세요.` : `Choose how many of the ${availableCount} items to review.`}</p>
      {resolvedMode !== settings.mode && <p className="text-sm">{ko ? '퀴즈 선택지가 부족해 스크램블로 안내합니다.' : 'Scramble is available because there are not enough quiz alternatives.'}</p>}
      <fieldset><legend className="mb-3 font-bold">{ko ? '복습 방식' : 'Review mode'}</legend><div className="flex flex-wrap gap-2">{modes.map(option => {
        const disabled = type === 'sentences' && !sentenceReviewItems(items as ReviewSentenceItem[], option.id as SentenceReviewMode, language, sentenceOptionPool).length;
        return <button key={option.id} className={`${button} ${mode === option.id ? 'border-green-600 bg-green-50 text-green-800 dark:bg-green-950 dark:text-green-100' : ''}`} aria-pressed={mode === option.id} disabled={disabled} onClick={() => { setMode(option.id); const size = type === 'sentences' ? sentenceReviewItems(items as ReviewSentenceItem[], option.id as SentenceReviewMode, language, sentenceOptionPool).length : items.length; setCount(availableCount <= items.length && size <= 10 ? 'all' : Math.min(10, size)); }}>{option.label}</button>;
      })}</div></fieldset>
      {readOnly && <p className="text-sm text-zinc-500">{ko ? '문장을 편하게 읽는 방식이에요. 복습을 마치려면 퀴즈나 스크램블을 선택해주세요.' : 'Read at your own pace. Choose a quiz or scramble to complete your review.'}</p>}
      <PracticeCountSelector label={ko ? `이번에 연습할 분량을 골라주세요 (최대 ${Math.min(40, eligible.length)}개)` : `Choose up to ${Math.min(40, eligible.length)} items`} options={[...new Set([Math.min(5, eligible.length), 10, 20])].filter(n => n > 0)} totalCount={Math.min(40, eligible.length)} selectedCount={count} onSelect={setCount} showAll={(type === 'sentences' ? modeCounts?.[mode as SentenceReviewMode] ?? availableCount : availableCount) <= Math.min(40, eligible.length)} allLabel={n => ko ? `전체 ${n}개` : `All ${n}`} />
      <button disabled={!eligible.length} onClick={start} className={`${primary} w-full`}>{ko ? `${Math.min(count === 'all' ? 40 : count, eligible.length)}개 ${readOnly ? '다시 보기' : '복습 시작'}` : `Start ${Math.min(count === 'all' ? 40 : count, eligible.length)} items`}</button>
    </>}
  </section>;
}
