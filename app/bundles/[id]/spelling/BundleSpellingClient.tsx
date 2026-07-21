'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, BookOpen, Check, ChevronRight, RotateCcw, Volume2, X } from 'lucide-react';
import { CharacterAsset } from '@/components/assets/CharacterAsset';
import { PracticeScorePills } from '@/components/practice/PracticeScorePills';
import { SpellingScrambleQuestion } from '@/components/practice/SpellingScrambleQuestion';
import { useSpellingScramble } from '@/components/practice/useSpellingScramble';
import { WordInfoSheet } from '@/components/words/WordInfoSheet';
import type { WordUsageDetail } from '@/lib/supabase/services/word-sentence-map';

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
  wordUsageDetails: WordUsageDetail[];
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
    chooseSet: '문제 다시 선택',
    wordInfo: '단어 정보',
    wordInfoShort: '정보',
    usedForm: '사용 형태',
    meaning: '뜻',
    examples: '사용된 문장',
    noExamples: '아직 연결된 문장이 없습니다.',
    close: '닫기',
    pos: '품사',
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
    chooseSet: 'Change Set',
    wordInfo: 'Word info',
    wordInfoShort: 'Info',
    usedForm: 'Used form',
    meaning: 'Meaning',
    examples: 'Example sentences',
    noExamples: 'No linked sentences yet.',
    close: 'Close',
    pos: 'POS',
    hint: (firstLetter: string, count: number) => `Hint: ${firstLetter} · ${count} letters`,
    listen: 'Listen',
  },
};

export default function BundleSpellingClient({ bundleId, title, items, wordUsageDetails, language, initialItemId = null, isLoggedIn }: BundleSpellingClientProps) {
  const t = copy[language];
  const initialIndex = initialItemId ? Math.max(0, items.findIndex((item) => item.bundleItemId === initialItemId)) : 0;
  const [index, setIndex] = useState(initialIndex);
  const [isAnswered, setIsAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [isRetryAttempt, setIsRetryAttempt] = useState(false);
  const [isWordInfoOpen, setIsWordInfoOpen] = useState(false);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const current = items[index];
  const spelling = useSpellingScramble(current?.word || '');
  const currentWordDetail = current ? wordUsageDetails.find((detail) => detail.word_id === current.wordId) : null;
  const progress = items.length > 0 ? Math.round(((index + 1) / items.length) * 100) : 0;
  const answeredCount = index + (isAnswered ? 1 : 0);
  const incorrectCount = Math.max(0, answeredCount - score);

  useEffect(() => {
    if (!current) return;
    setIsAnswered(false);
    setIsCorrect(null);
    setIsRetryAttempt(false);
    setIsWordInfoOpen(false);
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
    const answerIsCorrect = spelling.checkAnswer();

    setIsCorrect(answerIsCorrect);
    setIsAnswered(true);
    if (answerIsCorrect && !isRetryAttempt) {
      setScore((value) => value + 1);
    }
    setTimeout(playAudio, 200);

    if (isLoggedIn && !isRetryAttempt) {
      recordPracticeResult(bundleId, current.bundleItemId, current.wordId, answerIsCorrect);
    }
  };

  const retryCurrent = () => {
    setIsAnswered(false);
    setIsCorrect(null);
    setIsRetryAttempt(true);
    setIsWordInfoOpen(false);
    spelling.reset();
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
    setIsRetryAttempt(false);
    setIsWordInfoOpen(false);
    spelling.reset();
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
          <Link href={`/bundles/${bundleId}/spelling`} className="rounded-lg border border-zinc-200 px-4 py-3 text-sm font-bold text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800">
            {t.chooseSet}
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
        <Link href={`/bundles/${bundleId}/spelling`} className="rounded-full p-2 text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100">
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
        hint={t.hint(spelling.hint.firstLetter, spelling.hint.letterCount)}
        selectedChunks={spelling.selectedChunks}
        poolChunks={spelling.poolChunks}
        isAnswered={isAnswered}
        onSelectChunk={spelling.selectChunk}
        onRemoveChunk={spelling.removeChunk}
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

      <div className="ml-auto flex flex-wrap justify-end gap-2">
        {isAnswered && currentWordDetail && (
          <button
            type="button"
            onClick={() => setIsWordInfoOpen(true)}
            aria-label={t.wordInfo}
            title={t.wordInfo}
            className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-5 py-3 text-sm font-black text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            <BookOpen className="h-4 w-4" />
            <span className="sm:hidden">{t.wordInfoShort}</span>
            <span className="hidden sm:inline">{t.wordInfo}</span>
          </button>
        )}
        {isAnswered && isCorrect === false && (
          <button
            type="button"
            onClick={retryCurrent}
            className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-5 py-3 text-sm font-black text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            <RotateCcw className="h-4 w-4" />
            {t.retry}
          </button>
        )}
        <button
          onClick={isAnswered ? goNext : checkAnswer}
          disabled={!isAnswered && !spelling.hasSelection}
          className="inline-flex items-center gap-2 rounded-lg bg-[#3f8d54] px-5 py-3 text-sm font-black text-white transition hover:bg-[#347946] disabled:opacity-40 dark:bg-emerald-600 dark:hover:bg-emerald-500"
        >
          {isAnswered ? (index + 1 >= items.length ? t.finish : t.next) : t.check}
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {isAnswered && isWordInfoOpen && currentWordDetail && (
        <WordInfoSheet
          selectedWord={currentWordDetail}
          selectedMapping={null}
          language={language}
          copy={{
            words: t.wordInfo,
            sheetTitle: t.wordInfo,
            usedForm: t.usedForm,
            meaning: t.meaning,
            examples: t.examples,
            noExamples: t.noExamples,
            close: t.close,
            pos: t.pos,
          }}
          onClose={() => setIsWordInfoOpen(false)}
        />
      )}
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
