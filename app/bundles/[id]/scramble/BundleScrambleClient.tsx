'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Check, ChevronLeft, RotateCcw, Shuffle, SkipForward, Trophy, X } from 'lucide-react';
import { CharacterAsset } from '@/components/assets/CharacterAsset';

interface ScrambleItem {
  id: string;
  sentence: string;
  translation: string;
}

interface WordToken {
  id: number;
  text: string;
}

interface BundleScrambleClientProps {
  bundleId: string;
  title: string;
  items: ScrambleItem[];
  language: 'ko' | 'en';
  initialItemId?: string | null;
  isLoggedIn: boolean;
}

const MAX_SCRAMBLE = 10;
const TOKEN_EDGE_PUNCTUATION = /^[¡¿"'“”‘’()[\]{}.,!?;:]+|[¡¿"'“”‘’()[\]{}.,!?;:]+$/g;

const copy = {
  ko: {
    back: '상세로 돌아가기',
    mode: 'Scramble',
    prompt: '이 문장을 스페인어로 배열하세요',
    empty: '스크램블로 학습할 문장이 없습니다.',
    choose: '아래에서 단어를 선택하세요',
    correct: '정답입니다!',
    wrong: '오답입니다.',
    prev: '이전',
    reset: '초기화',
    check: '정답 확인',
    next: '다음 문장',
    skip: '건너뛰기',
    done: '스크램블 완료',
    doneDesc: (total: number) => `${total}개 문장을 모두 마쳤습니다.`,
    retry: '다시 학습하기',
  },
  en: {
    back: 'Back to detail',
    mode: 'Scramble',
    prompt: 'Arrange this sentence in Spanish',
    empty: 'No sentences for scramble.',
    choose: 'Choose words below',
    correct: 'Correct!',
    wrong: 'Not quite.',
    prev: 'Prev',
    reset: 'Reset',
    check: 'Check',
    next: 'Next',
    skip: 'Skip',
    done: 'Scramble complete',
    doneDesc: (total: number) => `You finished ${total} sentences.`,
    retry: 'Retry',
  },
};

export default function BundleScrambleClient({ bundleId, title, items, language, initialItemId = null, isLoggedIn }: BundleScrambleClientProps) {
  const t = copy[language];
  const initialIndex = initialItemId ? Math.max(0, items.findIndex((item) => item.id === initialItemId)) : 0;
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [selectedWords, setSelectedWords] = useState<WordToken[]>([]);
  const [availableWords, setAvailableWords] = useState<WordToken[]>([]);
  const [hintSlots, setHintSlots] = useState<Map<number, WordToken>>(new Map());
  const [result, setResult] = useState<'correct' | 'wrong' | null>(null);
  const [completedCount, setCompletedCount] = useState(initialIndex);
  const [isFinished, setIsFinished] = useState(false);
  const itemsRef = useRef(items);
  itemsRef.current = items;

  const currentItem = items[currentIndex];
  const correctWords = useMemo(() => tokenize(currentItem?.sentence || ''), [currentItem]);
  const progressPercent = items.length > 0 ? Math.round((completedCount / items.length) * 100) : 0;

  const answerSlots = useMemo(() => {
    if (hintSlots.size === 0) return null;
    let userIndex = 0;
    return correctWords.map((_, slotIndex) => {
      if (hintSlots.has(slotIndex)) {
        return { type: 'hint' as const, word: hintSlots.get(slotIndex)!, slotIndex };
      }
      const word = userIndex < selectedWords.length ? selectedWords[userIndex] : null;
      userIndex++;
      return { type: word ? ('user' as const) : ('empty' as const), word, slotIndex };
    });
  }, [correctWords, hintSlots, selectedWords]);

  const initQuestion = useCallback((index: number) => {
    const item = itemsRef.current[index];
    if (!item) return;
    const tokens = tokenize(item.sentence).map((word, tokenIndex) => ({ id: tokenIndex, text: word }));

    if (tokens.length > MAX_SCRAMBLE) {
      const scrambleIndices = new Set(shuffleArray(tokens.map((_, tokenIndex) => tokenIndex)).slice(0, MAX_SCRAMBLE));
      const hints = new Map<number, WordToken>();
      const scrambleTokens: WordToken[] = [];

      tokens.forEach((token, tokenIndex) => {
        if (scrambleIndices.has(tokenIndex)) {
          scrambleTokens.push(token);
        } else {
          hints.set(tokenIndex, token);
        }
      });

      setHintSlots(hints);
      setAvailableWords(shuffleArray(scrambleTokens));
    } else {
      setHintSlots(new Map());
      setAvailableWords(shuffleArray(tokens));
    }

    setSelectedWords([]);
    setResult(null);
  }, []);

  useEffect(() => {
    initQuestion(currentIndex);
  }, [currentIndex, initQuestion]);

  useEffect(() => {
    if (!isLoggedIn) return;
    if (!currentItem) return;
    recordCurrentPracticeItem(bundleId, 'scramble', currentItem.id);
  }, [bundleId, currentItem, isLoggedIn]);

  const selectWord = (word: WordToken) => {
    if (result) return;
    setAvailableWords((prev) => prev.filter((item) => item.id !== word.id));
    setSelectedWords((prev) => (prev.some((item) => item.id === word.id) ? prev : [...prev, word]));
  };

  const deselectWord = (word: WordToken) => {
    if (result) return;
    setSelectedWords((prev) => prev.filter((item) => item.id !== word.id));
    setAvailableWords((prev) => (prev.some((item) => item.id === word.id) ? prev : [...prev, word]));
  };

  const checkAnswer = () => {
    const answer: string[] = [];
    let userIndex = 0;
    correctWords.forEach((_, slotIndex) => {
      if (hintSlots.has(slotIndex)) {
        answer.push(hintSlots.get(slotIndex)!.text);
      } else if (userIndex < selectedWords.length) {
        answer.push(selectedWords[userIndex].text);
        userIndex++;
      } else {
        answer.push('');
      }
    });

    const isCorrect = answer.join(' ') === correctWords.join(' ');
    setResult(isCorrect ? 'correct' : 'wrong');
    if (isLoggedIn) {
      recordPracticeResult(bundleId, currentItem.id, 'scramble', isCorrect);
    }
  };

  const goPrev = () => {
    if (currentIndex === 0) return;
    setCurrentIndex((value) => value - 1);
    setCompletedCount((value) => Math.max(0, value - 1));
  };

  const goNext = () => {
    if (currentIndex + 1 >= items.length) {
      setCompletedCount(items.length);
      setIsFinished(true);
      return;
    }
    setCompletedCount((value) => Math.min(items.length, value + 1));
    setCurrentIndex((value) => value + 1);
  };

  const resetAll = () => {
    setCurrentIndex(0);
    setCompletedCount(0);
    setIsFinished(false);
    initQuestion(0);
  };

  if (!currentItem) {
    return <Empty bundleId={bundleId} title={title} text={t.empty} back={t.back} />;
  }

  if (isFinished) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center gap-5 text-center">
        <Trophy className="h-16 w-16 text-amber-500" />
        <p className="text-xs font-bold uppercase text-[#2f7d4a] dark:text-emerald-400">{t.mode}</p>
        <h1 className="text-3xl font-black text-zinc-950 dark:text-zinc-50">{t.done}</h1>
        <p className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">{t.doneDesc(items.length)}</p>
        <div className="flex gap-2">
          <Link href={`/bundles/${bundleId}`} className="rounded-lg border border-zinc-200 px-4 py-3 text-sm font-bold text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800">
            {t.back}
          </Link>
          <button onClick={resetAll} className="rounded-lg bg-[#3f8d54] px-4 py-3 text-sm font-black text-white transition hover:bg-[#347946] dark:bg-emerald-600 dark:hover:bg-emerald-500">
            {t.retry}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5 px-2 pb-10">
      <header className="flex items-center gap-3">
        <Link href={`/bundles/${bundleId}`} className="rounded-full p-2 text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase text-[#2f7d4a] dark:text-emerald-400">{t.mode}</p>
          <h1 className="truncate text-lg font-black text-zinc-950 dark:text-zinc-50">{title}</h1>
        </div>
      </header>

      <div className="h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
        <div className="h-full rounded-full bg-[#3f8d54] transition-all dark:bg-emerald-500" style={{ width: `${progressPercent}%` }} />
      </div>

      <section className="rounded-2xl border border-zinc-100 bg-white p-6 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-black/20">
        <p className="text-xs font-black uppercase text-zinc-400 dark:text-zinc-500">{currentIndex + 1} / {items.length}</p>
        <p className="mt-4 text-sm font-bold text-[#2f7d4a] dark:text-emerald-400">{t.prompt}</p>
        <h2 className="mt-3 text-xl font-black leading-relaxed text-zinc-950 dark:text-zinc-50">{currentItem.translation}</h2>
      </section>

      <div className={`min-h-24 rounded-2xl border-2 border-dashed p-4 transition ${result === 'correct' ? 'border-emerald-400 bg-emerald-50 dark:border-emerald-500 dark:bg-emerald-950/60' : result === 'wrong' ? 'border-red-300 bg-red-50 dark:border-red-500 dark:bg-red-950/60' : 'border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900'}`}>
        <div className="flex flex-wrap gap-2">
          {answerSlots ? (
            answerSlots.map((slot) => {
              if (slot.type === 'hint') {
                return <Token key={`hint-${slot.slotIndex}`} label={slot.word.text} muted />;
              }
              if (slot.type === 'user' && slot.word) {
                return <TokenButton key={`user-${slot.word.id}`} label={slot.word.text} onClick={() => deselectWord(slot.word!)} selected />;
              }
              return <span key={`empty-${slot.slotIndex}`} className="h-9 min-w-12 rounded-lg border border-dashed border-zinc-200 dark:border-zinc-700" />;
            })
          ) : (
            <AnimatePresence>
              {selectedWords.map((word) => (
                <TokenButton key={word.id} label={word.text} onClick={() => deselectWord(word)} selected />
              ))}
            </AnimatePresence>
          )}
          {!answerSlots && selectedWords.length === 0 && <p className="w-full py-5 text-center text-sm font-semibold text-zinc-400 dark:text-zinc-500">{t.choose}</p>}
        </div>
      </div>

      {result && (
        <div className={`flex items-center justify-center gap-4 rounded-xl px-4 py-3 text-sm font-black ${result === 'correct' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-200' : 'bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-200'}`}>
          <CharacterAsset name={result === 'correct' ? 'correctbadge' : 'tryagainbadge'} alt="" size={96} className="!h-16 !w-16 sm:!h-20 sm:!w-20" unoptimized />
          {result === 'correct' ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
          {result === 'correct' ? (
            <span>{t.correct}</span>
          ) : (
            <span className="flex flex-col gap-1">
              <span>{t.wrong}</span>
              <span>{currentItem.sentence}</span>
            </span>
          )}
        </div>
      )}

      <div className="flex min-h-20 flex-wrap justify-center gap-2 rounded-2xl bg-zinc-100 p-4 dark:bg-zinc-900">
        <AnimatePresence>
          {availableWords.map((word) => (
            <TokenButton key={word.id} label={word.text} onClick={() => selectWord(word)} />
          ))}
        </AnimatePresence>
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <div className="flex justify-start gap-1">
          <button
            onClick={goPrev}
            disabled={currentIndex === 0}
            aria-label={t.prev}
            title={t.prev}
            className="rounded-lg px-3 py-2 text-sm font-bold text-zinc-500 transition hover:bg-zinc-100 disabled:opacity-40 dark:text-zinc-400 dark:hover:bg-zinc-800"
          >
            <ChevronLeft className="inline h-4 w-4" /> <span className="hidden sm:inline">{t.prev}</span>
          </button>
          <button
            onClick={() => initQuestion(currentIndex)}
            aria-label={t.reset}
            title={t.reset}
            className="rounded-lg px-3 py-2 text-sm font-bold text-zinc-500 transition hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
          >
            <RotateCcw className="inline h-4 w-4" /> <span className="hidden sm:inline">{t.reset}</span>
          </button>
        </div>

        {result ? (
          <button onClick={goNext} className="rounded-lg bg-[#3f8d54] px-4 py-3 text-sm font-black text-white transition hover:bg-[#347946] dark:bg-emerald-600 dark:hover:bg-emerald-500">
            {t.next}
          </button>
        ) : (
          <button onClick={checkAnswer} disabled={selectedWords.length === 0} className="rounded-lg bg-[#3f8d54] px-4 py-3 text-sm font-black text-white transition hover:bg-[#347946] disabled:opacity-40 dark:bg-emerald-600 dark:hover:bg-emerald-500">
            {t.check}
          </button>
        )}

        <button onClick={goNext} className="justify-self-end rounded-lg px-3 py-2 text-sm font-bold text-zinc-500 transition hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800">
          {t.skip} <SkipForward className="inline h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function TokenButton({ label, onClick, selected = false }: { label: string; onClick: () => void; selected?: boolean }) {
  return (
    <motion.button
      initial={{ scale: 0.85 }}
      animate={{ scale: 1 }}
      exit={{ scale: 0.85, opacity: 0 }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
      onClick={onClick}
      className={`rounded-lg px-3 py-2 text-sm font-black shadow-sm transition ${selected ? 'bg-[#3f8d54] text-white dark:bg-emerald-600' : 'border border-zinc-200 bg-white text-zinc-900 hover:border-[#9ccfac] dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:border-emerald-700'}`}
    >
      {label}
    </motion.button>
  );
}

function Token({ label, muted = false }: { label: string; muted?: boolean }) {
  return (
    <span className={`rounded-lg border border-dashed px-3 py-2 text-sm font-black ${muted ? 'border-zinc-200 bg-zinc-50 text-zinc-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-500' : 'border-zinc-200 text-zinc-700 dark:border-zinc-700 dark:text-zinc-300'}`}>
      {label}
    </span>
  );
}

function Empty({ bundleId, title, text, back }: { bundleId: string; title: string; text: string; back: string }) {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center gap-4 text-center">
      <Shuffle className="h-12 w-12 text-[#3f8d54] dark:text-emerald-400" />
      <h1 className="text-2xl font-black text-zinc-950 dark:text-zinc-50">{title}</h1>
      <p className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">{text}</p>
      <Link href={`/bundles/${bundleId}`} className="text-sm font-bold text-[#2f7d4a] dark:text-emerald-400">
        {back}
      </Link>
    </div>
  );
}

function tokenize(sentence: string) {
  return sentence
    .split(/\s+/)
    .map((word) => word.replace(TOKEN_EDGE_PUNCTUATION, '').toLocaleLowerCase())
    .filter(Boolean);
}

function shuffleArray<T>(values: T[]) {
  const copy = [...values];
  for (let index = copy.length - 1; index > 0; index--) {
    const target = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[target]] = [copy[target], copy[index]];
  }
  return copy;
}

function recordPracticeResult(bundleId: string, bundleItemId: string, mode: 'quiz' | 'scramble', isCorrect: boolean) {
  void fetch('/api/bundle-progress', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      bundle_id: bundleId,
      bundle_item_id: bundleItemId,
      practice_mode: mode,
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
