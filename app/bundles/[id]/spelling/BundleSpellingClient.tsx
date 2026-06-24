'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Check, ChevronRight, RotateCcw, Volume2, X } from 'lucide-react';
import { CharacterAsset } from '@/components/assets/CharacterAsset';
import { PracticeScorePills } from '@/components/practice/PracticeScorePills';
import {
  buildPrefilledSpellingAnswer,
  getSpellingHint,
  SpellingScrambleQuestion,
  splitWordHybrid,
  type SpellingChunk,
} from '@/components/practice/SpellingScrambleQuestion';

interface BundleSpellingItem {
  id: string;
  bundleItemId: string;
  wordId: number;
  word: string;
  meaning: string;
  langCode: string;
  audioUrl?: string | null;
}

interface BundleSpellingClientProps {
  bundleId: string;
  title: string;
  items: BundleSpellingItem[];
  language: 'ko' | 'en';
  initialItemId?: string | null;
  isLoggedIn: boolean;
}

const copy = {
  ko: {
    back: '상세로 돌아가기',
    mode: 'Spelling Scramble',
    prompt: '뜻을 보고 단어 스펠링을 완성해 보세요:',
    empty: '스펠링 퀴즈로 학습할 단어가 없습니다.',
    check: '정답 확인',
    next: '다음 단어',
    finish: '완료',
    correct: '정답입니다!',
    wrong: '다시 확인해보세요.',
    correctAnswer: '정답:',
    done: '스펠링 퀴즈 완료',
    score: (score: number, total: number) => `${score} / ${total} 정답`,
    retry: '다시 풀기',
    hint: (firstLetter: string, count: number) => `힌트: ${firstLetter} · ${count}글자`,
    listen: '단어 듣기',
  },
  en: {
    back: 'Back to detail',
    mode: 'Spelling Scramble',
    prompt: 'Complete the spelling based on the meaning:',
    empty: 'No words for spelling practice.',
    check: 'Check',
    next: 'Next',
    finish: 'Finish',
    correct: 'Correct!',
    wrong: 'Try again.',
    correctAnswer: 'Correct answer:',
    done: 'Spelling complete',
    score: (score: number, total: number) => `${score} / ${total} correct`,
    retry: 'Retry',
    hint: (firstLetter: string, count: number) => `Hint: ${firstLetter} · ${count} letters`,
    listen: 'Listen',
  },
};

export default function BundleSpellingClient({ bundleId, title, items, language, initialItemId = null, isLoggedIn }: BundleSpellingClientProps) {
  const t = copy[language];
  const initialIndex = initialItemId ? Math.max(0, items.findIndex((item) => item.bundleItemId === initialItemId)) : 0;
  const [index, setIndex] = useState(initialIndex);
  const [poolChunks, setPoolChunks] = useState<SpellingChunk[]>([]);
  const [selectedChunks, setSelectedChunks] = useState<SpellingChunk[]>([]);
  const [isAnswered, setIsAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const current = items[index];
  const progress = items.length > 0 ? Math.round(((index + 1) / items.length) * 100) : 0;
  const spellingHint = useMemo(() => getSpellingHint(current?.word || ''), [current]);
  const answeredCount = index + (isAnswered ? 1 : 0);
  const incorrectCount = Math.max(0, answeredCount - score);

  useEffect(() => {
    if (!current) return;
    const realChunks = splitWordHybrid(current.word, { prefillFirstLetter: true });
    setPoolChunks(shuffle(realChunks).map((chunk, chunkIndex) => ({
      id: chunkIndex,
      chunk,
      selected: false,
    })));
    setSelectedChunks([]);
    setIsAnswered(false);
    setIsCorrect(null);
  }, [current]);

  useEffect(() => {
    if (!isLoggedIn || !current) return;
    recordCurrentPracticeItem(bundleId, 'spelling', current.bundleItemId);
  }, [bundleId, current, isLoggedIn]);

  const playAudio = () => {
    if (!current?.audioUrl) return;
    const audio = audioRef.current ?? new Audio();
    audioRef.current = audio;
    audio.src = current.audioUrl;
    audio.currentTime = 0;
    audio.play().catch((error) => console.error('Word audio playback failed:', error));
  };

  const checkAnswer = () => {
    if (!current || isAnswered) return;
    const constructed = buildPrefilledSpellingAnswer(current.word, selectedChunks.map((chunk) => chunk.chunk));
    const answerIsCorrect = constructed.toLowerCase().trim() === current.word.toLowerCase().trim();

    setIsCorrect(answerIsCorrect);
    setIsAnswered(true);
    if (answerIsCorrect) {
      setScore((value) => value + 1);
      setTimeout(playAudio, 200);
    }

    if (isLoggedIn) {
      recordPracticeResult(bundleId, current.bundleItemId, current.wordId, answerIsCorrect);
    }
  };

  const goNext = () => {
    if (index + 1 >= items.length) {
      setFinished(true);
      return;
    }
    setIndex((value) => value + 1);
  };

  const retry = () => {
    setIndex(0);
    setScore(0);
    setFinished(false);
  };

  if (!current) {
    return <Empty bundleId={bundleId} title={title} text={t.empty} back={t.back} />;
  }

  if (finished) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center gap-5 text-center">
        <CharacterAsset name="completebadge" size={160} />
        <p className="text-xs font-bold uppercase text-[#2f7d4a] dark:text-emerald-400">{t.mode}</p>
        <h1 className="text-3xl font-black text-zinc-950 dark:text-zinc-50">{t.done}</h1>
        <p className="text-lg font-black text-zinc-700 dark:text-zinc-300">{t.score(score, items.length)}</p>
        <div className="flex gap-2">
          <Link href={`/bundles/${bundleId}`} className="rounded-lg border border-zinc-200 px-4 py-3 text-sm font-bold text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800">
            {t.back}
          </Link>
          <button onClick={retry} className="inline-flex items-center gap-2 rounded-lg bg-[#3f8d54] px-4 py-3 text-sm font-black text-white transition hover:bg-[#347946] dark:bg-emerald-600 dark:hover:bg-emerald-500">
            <RotateCcw className="h-4 w-4" />
            {t.retry}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5 px-2 pb-10">
      <header className="flex items-center justify-between gap-3">
        <Link href={`/bundles/${bundleId}`} className="rounded-full p-2 text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase text-[#2f7d4a] dark:text-emerald-400">{t.mode}</p>
          <h1 className="truncate text-lg font-black text-zinc-950 dark:text-zinc-50">{title}</h1>
        </div>
        <PracticeScorePills correct={score} incorrect={incorrectCount} />
      </header>

      <div className="h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
        <div className="h-full rounded-full bg-[#3f8d54] transition-all dark:bg-emerald-500" style={{ width: `${progress}%` }} />
      </div>

      <SpellingScrambleQuestion
        eyebrow={`${index + 1} / ${items.length}`}
        prompt={t.prompt}
        answerPattern={current.word}
        question={<h2 className="text-3xl font-black leading-relaxed text-zinc-950 dark:text-zinc-50">{current.meaning}</h2>}
        hint={t.hint(spellingHint.firstLetter, spellingHint.letterCount)}
        selectedChunks={selectedChunks}
        poolChunks={poolChunks}
        isAnswered={isAnswered}
        onSelectChunk={(chunk) => {
          setSelectedChunks((prev) => [...prev, chunk]);
          setPoolChunks((prev) => prev.map((item) => (item.id === chunk.id ? { ...item, selected: true } : item)));
        }}
        onRemoveChunk={(chunk, chunkIndex) => {
          setSelectedChunks((prev) => prev.filter((_, indexValue) => indexValue !== chunkIndex));
          setPoolChunks((prev) => prev.map((item) => (item.id === chunk.id ? { ...item, selected: false } : item)));
        }}
        audioAction={isAnswered && current.audioUrl ? (
          <button type="button" onClick={playAudio} aria-label={t.listen} title={t.listen} className="rounded-full p-2 text-zinc-600 hover:bg-[#f4fbf6] dark:text-zinc-300 dark:hover:bg-zinc-800">
            <Volume2 className="h-5 w-5" />
          </button>
        ) : null}
      />

      {isAnswered && (
        <div className={`flex flex-wrap items-center justify-center gap-4 rounded-xl px-4 py-3 text-sm font-black ${isCorrect ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-200' : 'bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-200'}`}>
          <CharacterAsset name={isCorrect ? 'correctbadge' : 'tryagainbadge'} alt="" size={96} className="!h-16 !w-16 sm:!h-20 sm:!w-20" unoptimized />
          {isCorrect ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
          {isCorrect ? (
            <span>{t.correct}</span>
          ) : (
            <span className="flex flex-col gap-1">
              <span>{t.wrong}</span>
              <span>{t.correctAnswer} {current.word}</span>
            </span>
          )}
        </div>
      )}

      <button
        onClick={isAnswered ? goNext : checkAnswer}
        disabled={!isAnswered && selectedChunks.length === 0}
        className="ml-auto inline-flex items-center gap-2 rounded-lg bg-[#3f8d54] px-5 py-3 text-sm font-black text-white transition hover:bg-[#347946] disabled:opacity-40 dark:bg-emerald-600 dark:hover:bg-emerald-500"
      >
        {isAnswered ? (index + 1 >= items.length ? t.finish : t.next) : t.check}
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}

function Empty({ bundleId, title, text, back }: { bundleId: string; title: string; text: string; back: string }) {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center gap-4 text-center">
      <p className="text-xs font-bold uppercase text-[#2f7d4a] dark:text-emerald-400">Spelling Scramble</p>
      <h1 className="text-2xl font-black text-zinc-950 dark:text-zinc-50">{title}</h1>
      <p className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">{text}</p>
      <Link href={`/bundles/${bundleId}`} className="text-sm font-bold text-[#2f7d4a] dark:text-emerald-400">
        {back}
      </Link>
    </div>
  );
}

function shuffle<T>(values: T[]) {
  const copy = [...values];
  for (let index = copy.length - 1; index > 0; index--) {
    const target = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[target]] = [copy[target], copy[index]];
  }
  return copy;
}

function recordPracticeResult(bundleId: string, bundleItemId: string, wordId: number, isCorrect: boolean) {
  void fetch('/api/bundle-progress', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      bundle_id: bundleId,
      bundle_item_id: bundleItemId,
      word_id: wordId,
      practice_mode: 'spelling',
      is_correct: isCorrect,
    }),
  });
}

function recordCurrentPracticeItem(bundleId: string, practiceMode: string, bundleItemId: string) {
  void fetch('/api/bundle-progress', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      bundle_id: bundleId,
      current_bundle_item_id: bundleItemId,
      current_practice_mode: practiceMode,
    }),
  });
}
