'use client';

import { useEffect, useMemo, useState, useRef } from 'react';
import Link from 'next/link';
import { ArrowLeft, Check, ChevronRight, Volume2, X, RotateCcw } from 'lucide-react';
import { CharacterAsset } from '@/components/assets/CharacterAsset';
import type { ReviewWordItem } from '@/lib/supabase/services/bundle-progress';
import { getPublicUrl } from '@/lib/utils';

interface WordsReviewClientProps {
  initialItems: ReviewWordItem[];
  language: 'ko' | 'en';
}

interface PoolChunk {
  id: number;
  chunk: string;
  selected: boolean;
}

const copy = {
  ko: {
    title: '단어 복습 세션',
    description: '숙련도 레벨 1~4의 단어들을 복습하여 완벽히 마스터해 보세요.',
    emptyTitle: '지금은 복습할 단어가 없어요!',
    emptyDesc: '새로운 학습 번들을 공부하면 복습할 단어들이 여기에 쌓입니다.',
    backToLearn: '대시보드로 돌아가기',
    setupTitle: '복습 설정',
    setupCount: '복습할 단어 수 선택',
    setupMode: '복습 방식 선택',
    modeQuiz: '뜻 맞추기 (객관식)',
    modeSpelling: '스펠링 완성 (조합)',
    modeFlashcard: '플래시카드',
    modeMixed: '방식 섞어서',
    startBtn: '시작하기',
    checkBtn: '확인',
    nextBtn: '다음 문제',
    finishBtn: '완료',
    correct: '정답입니다!',
    wrong: '다시 확인해보세요.',
    correctAnswer: '정답:',
    doneTitle: '복습을 완료했습니다!',
    doneScore: (score: number, total: number) => `총 ${total}문제 중 ${score}문제를 맞혔습니다!`,
    restartBtn: '다시 복습하기',
    itemsLeft: (count: number) => `남은 복습 대상 단어: ${count}개`,
    knowBtn: '알고 있어요',
    dontKnowBtn: '아직 잘 몰라요',
    flipCardPrompt: '카드를 탭해서 뜻을 확인하세요.',
    spellingPrompt: '뜻과 품사를 보고 스펠링을 완성해 보세요:',
    posLabels: {
      noun: '명사',
      verb: '동사',
      adjective: '형용사',
      adverb: '부사',
      pronoun: '대명사',
      preposition: '전치사',
      conjunction: '접속사',
      interjection: '감탄사',
      article: '관사',
    } as Record<string, string>,
  },
  en: {
    title: 'Word Review Session',
    description: 'Review words with proficiency level 1–4 to master them.',
    emptyTitle: 'Nothing to review right now!',
    emptyDesc: 'Study new bundles to build your review list.',
    backToLearn: 'Back to Dashboard',
    setupTitle: 'Review Settings',
    setupCount: 'Select word count',
    setupMode: 'Select review mode',
    modeQuiz: 'Multiple Choice',
    modeSpelling: 'Spelling Scramble',
    modeFlashcard: 'Flashcards',
    modeMixed: 'Mixed Modes',
    startBtn: 'Start Review',
    checkBtn: 'Check',
    nextBtn: 'Next',
    finishBtn: 'Finish',
    correct: 'Correct!',
    wrong: 'Try again.',
    correctAnswer: 'Correct answer:',
    doneTitle: 'Review Complete!',
    doneScore: (score: number, total: number) => `You answered ${score} of ${total} correctly!`,
    restartBtn: 'Review Again',
    itemsLeft: (count: number) => `${count} words remaining in your pool`,
    knowBtn: 'I know it',
    dontKnowBtn: "I'm not sure yet",
    flipCardPrompt: 'Tap the card to reveal the meaning.',
    spellingPrompt: 'Complete the spelling based on the meaning and POS:',
    posLabels: {
      noun: 'Noun',
      verb: 'Verb',
      adjective: 'Adjective',
      adverb: 'Adverb',
      pronoun: 'Pronoun',
      preposition: 'Preposition',
      conjunction: 'Conjunction',
      interjection: 'Interjection',
      article: 'Article',
    } as Record<string, string>,
  },
};

export default function WordsReviewClient({ initialItems, language }: WordsReviewClientProps) {
  const t = copy[language];
  const isEnglish = language === 'en';

  // State
  const [step, setStep] = useState<'setup' | 'practice' | 'finished'>('setup');
  const [selectedCount, setSelectedCount] = useState<number>(10);
  const [selectedMode, setSelectedMode] = useState<'quiz' | 'spelling' | 'flashcard' | 'mixed'>('mixed');
  const [activeItems, setActiveItems] = useState<ReviewWordItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  
  // Game Practice States
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [poolChunks, setPoolChunks] = useState<PoolChunk[]>([]);
  const [selectedChunks, setSelectedChunks] = useState<PoolChunk[]>([]);
  const [isFlipped, setIsFlipped] = useState<boolean>(false);
  
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [isAnswered, setIsAnswered] = useState<boolean>(false);
  const [score, setScore] = useState<number>(0);
  
  const [multipleChoiceOptions, setMultipleChoiceOptions] = useState<string[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const currentItem = activeItems[currentIndex];
  const progress = activeItems.length > 0 ? Math.round((currentIndex / activeItems.length) * 100) : 0;

  // Sound play helper
  const playAudio = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch((err) => console.error('Audio play error:', err));
    }
  };

  // Determine mode per item for mixed mode
  const currentItemMode = useMemo(() => {
    if (!currentItem) return 'quiz';
    if (selectedMode === 'mixed') {
      const modes: Array<'quiz' | 'spelling' | 'flashcard'> = ['quiz', 'spelling', 'flashcard'];
      return modes[currentIndex % 3];
    }
    return selectedMode;
  }, [selectedMode, currentIndex, currentItem]);

  // Audio source
  const audioSrc = currentItem?.audio_url ? getPublicUrl(currentItem.audio_url) : null;

  // Set up current item layout
  useEffect(() => {
    if (!currentItem) return;

    setIsCorrect(null);
    setIsAnswered(false);
    setIsFlipped(false);
    setSelectedOption(null);
    setSelectedChunks([]);

    if (currentItemMode === 'spelling') {
      const realChunks = splitWordHybrid(currentItem.word);
      const distractorChunks = generateSpellingDistractors(realChunks, currentItem.lang_code);
      const combined = [...realChunks, ...distractorChunks];
      const shuffled = shuffle(combined).map((chunk, index) => ({
        id: index,
        chunk,
        selected: false,
      }));
      setPoolChunks(shuffled);
    } else if (currentItemMode === 'quiz') {
      const distractors = buildWordMeaningDistractors(currentItem, initialItems, isEnglish);
      setMultipleChoiceOptions(distractors);
    }
  }, [currentItem, currentItemMode, initialItems, isEnglish]);

  // Handle start session
  const startSession = () => {
    const shuffled = shuffle(initialItems);
    const count = Math.min(selectedCount, shuffled.length);
    setActiveItems(shuffled.slice(0, count));
    setCurrentIndex(0);
    setScore(0);
    setIsCorrect(null);
    setIsAnswered(false);
    setSelectedOption(null);
    setSelectedChunks([]);
    setStep('practice');
  };

  // Evaluate spelling scramble
  const checkSpelling = () => {
    if (isAnswered) return;
    const constructed = selectedChunks.map(s => s.chunk).join('');
    const answerIsCorrect = constructed.toLowerCase().trim() === currentItem.word.toLowerCase().trim();

    setIsCorrect(answerIsCorrect);
    setIsAnswered(true);
    if (answerIsCorrect) {
      setScore((s) => s + 1);
    }

    recordWordResult(currentItem.id, answerIsCorrect, 'spelling');

    setTimeout(() => {
      playAudio();
    }, 200);
  };

  // Evaluate Multiple Choice
  const selectOption = (option: string) => {
    if (isAnswered) return;
    setSelectedOption(option);
    const correctTrans = (isEnglish ? currentItem.meaning_en : currentItem.meaning_ko) || currentItem.meaning_ko || '';
    const answerIsCorrect = option === correctTrans;

    setIsCorrect(answerIsCorrect);
    setIsAnswered(true);
    if (answerIsCorrect) {
      setScore((s) => s + 1);
    }

    recordWordResult(currentItem.id, answerIsCorrect, 'quiz');

    setTimeout(() => {
      playAudio();
    }, 200);
  };

  // Evaluate Flashcards (I know / I don't know)
  const handleFlashcardEvaluate = (known: boolean) => {
    if (isAnswered) return;
    setIsCorrect(known);
    setIsAnswered(true);
    if (known) {
      setScore((s) => s + 1);
    }

    recordWordResult(currentItem.id, known, 'flashcards');

    // Play pronunciation audio automatically on card evaluation
    setTimeout(() => {
      playAudio();
    }, 200);
  };

  // Next Question
  const goNext = () => {
    if (currentIndex + 1 >= activeItems.length) {
      setStep('finished');
      return;
    }
    setIsCorrect(null);
    setIsAnswered(false);
    setSelectedOption(null);
    setSelectedChunks([]);
    setIsFlipped(false);
    setCurrentIndex((prev) => prev + 1);
  };

  const restart = () => {
    setIsCorrect(null);
    setIsAnswered(false);
    setSelectedOption(null);
    setSelectedChunks([]);
    setIsFlipped(false);
    setCurrentIndex(0);
    setStep('setup');
  };

  // Format Parts of Speech display
  const formatPos = (pos: string[]) => {
    if (!pos || pos.length === 0) return '';
    const labels = pos.map((p) => t.posLabels[p.toLowerCase()] || p);
    return `[${labels.join(', ')}]`;
  };

  // Empty state
  if (initialItems.length === 0) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-xl flex-col items-center justify-center gap-6 text-center px-4">
        <CharacterAsset name="tryagainbadge" size={128} />
        <h1 className="font-serif text-3xl font-semibold dark:text-zinc-100">{t.emptyTitle}</h1>
        <p className="text-zinc-500 dark:text-zinc-400 max-w-md leading-relaxed">{t.emptyDesc}</p>
        <Link href="/learn" className="inline-flex items-center gap-2 rounded-lg bg-[#57985a] px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#477f4a]">
          <ArrowLeft className="h-4 w-4" />
          {t.backToLearn}
        </Link>
      </div>
    );
  }

  // Finished state
  if (step === 'finished') {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-xl flex-col items-center justify-center gap-6 text-center px-4">
        <h1 className="font-serif text-4xl font-semibold dark:text-zinc-100">{t.doneTitle}</h1>
        <div className="my-6">
          <CharacterAsset name="completebadge" size={200} />
        </div>
        <p className="text-lg font-bold text-zinc-700 dark:text-zinc-300">{t.doneScore(score, activeItems.length)}</p>
        <div className="flex flex-wrap justify-center gap-3 mt-4">
          <Link href="/learn" className="rounded-lg border border-zinc-200 bg-white px-6 py-3 text-sm font-bold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800">
            {t.backToLearn}
          </Link>
          <button onClick={restart} className="inline-flex items-center gap-2 rounded-lg bg-[#3f8d54] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#347946] dark:bg-emerald-600 dark:hover:bg-emerald-500">
            <RotateCcw className="h-4 w-4" />
            {t.restartBtn}
          </button>
        </div>
      </div>
    );
  }

  // Setup state
  if (step === 'setup') {
    return (
      <div className="mx-auto max-w-xl px-4 py-8">
        <header className="mb-8 flex items-center gap-4">
          <Link href="/learn" className="rounded-full p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="font-serif text-3xl font-semibold dark:text-zinc-100">{t.title}</h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">{t.description}</p>
          </div>
        </header>

        <div className="space-y-6 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-xl font-bold dark:text-zinc-100">{t.setupTitle}</h2>

          {/* Word count */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">{t.setupCount}</label>
            <div className="grid grid-cols-3 gap-2">
              {[5, 10, 20].map((count) => {
                const active = selectedCount === count;
                return (
                  <button
                    key={count}
                    onClick={() => setSelectedCount(count)}
                    className={`rounded-xl border py-3 text-sm font-bold transition ${
                      active
                        ? 'border-[#3f8d54] bg-[#f4fbf6] text-[#2f7d4a] dark:border-emerald-500 dark:bg-emerald-950/30 dark:text-emerald-300'
                        : 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800'
                    }`}
                  >
                    {count}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-zinc-400 dark:text-zinc-500">{t.itemsLeft(initialItems.length)}</p>
          </div>

          {/* Mode Selection */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">{t.setupMode}</label>
            <div className="grid gap-2">
              {[
                { id: 'quiz', label: t.modeQuiz },
                { id: 'spelling', label: t.modeSpelling },
                { id: 'flashcard', label: t.modeFlashcard },
                { id: 'mixed', label: t.modeMixed },
              ].map((mode) => {
                const active = selectedMode === mode.id;
                return (
                  <button
                    key={mode.id}
                    onClick={() => setSelectedMode(mode.id as any)}
                    className={`w-full rounded-xl border px-4 py-3 text-left text-sm font-bold transition ${
                      active
                        ? 'border-[#3f8d54] bg-[#f4fbf6] text-[#2f7d4a] dark:border-emerald-500 dark:bg-emerald-950/30 dark:text-emerald-300'
                        : 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800'
                    }`}
                  >
                    {mode.label}
                  </button>
                );
              })}
            </div>
          </div>

          <button
            onClick={startSession}
            className="w-full rounded-xl bg-[#3f8d54] py-4 text-sm font-bold text-white shadow-sm transition hover:bg-[#347946] dark:bg-emerald-600 dark:hover:bg-emerald-500"
          >
            {t.startBtn}
          </button>
        </div>
      </div>
    );
  }

  // Active Practice state
  const correctMeaning = (isEnglish ? currentItem?.meaning_en : currentItem?.meaning_ko) || currentItem?.meaning_ko || '';

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      {/* Audio element */}
      {audioSrc && <audio ref={audioRef} src={audioSrc} />}

      <header className="mb-6 flex items-center justify-between">
        <button onClick={restart} className="rounded-full p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <span className="text-xs font-semibold text-zinc-400 dark:text-zinc-500">{currentIndex + 1} / {activeItems.length}</span>
        <span className="text-xs font-semibold text-zinc-400 dark:text-zinc-500">Score: {score}</span>
      </header>

      {/* Progress Bar */}
      <div className="mb-6 h-1.5 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
        <div className="h-full bg-[#3f8d54] transition-all dark:bg-emerald-500" style={{ width: `${progress}%` }} />
      </div>

      {/* Card Section */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        {currentItemMode === 'quiz' && (
          /* Multiple Choice */
          <div>
            <div className="flex items-center justify-between border-b border-zinc-100 pb-4 dark:border-zinc-800">
              <span className="text-xs font-bold uppercase tracking-wider text-[#2f7d4a] dark:text-emerald-400">{t.modeQuiz}</span>
              {audioSrc && (
                <button onClick={playAudio} className="rounded-full p-2 text-zinc-600 hover:bg-[#f4fbf6] dark:text-zinc-300 dark:hover:bg-zinc-800">
                  <Volume2 className="h-5 w-5" />
                </button>
              )}
            </div>
            <div className="mt-6 flex flex-wrap items-baseline gap-2">
              <h2 className="text-3xl font-bold leading-relaxed dark:text-zinc-50">{currentItem.word}</h2>
              <span className="text-xs text-zinc-400 dark:text-zinc-500">{formatPos(currentItem.pos)}</span>
            </div>

            <div className="mt-8 space-y-3">
              {multipleChoiceOptions.map((option) => {
                const isSelected = selectedOption === option;
                const optionIsCorrect = option === correctMeaning;
                const stateClass = isAnswered
                  ? optionIsCorrect
                    ? 'border-emerald-400 bg-emerald-50 text-emerald-800 dark:border-emerald-500 dark:bg-emerald-950/30 dark:text-emerald-300'
                    : isSelected
                      ? 'border-red-300 bg-red-50 text-red-700 dark:border-red-500 dark:bg-red-950/30 dark:text-red-300'
                      : 'border-zinc-100 bg-zinc-50 text-zinc-400 dark:border-zinc-800 dark:bg-zinc-950/30 dark:text-zinc-500'
                  : 'border-zinc-200 bg-white text-zinc-900 hover:border-[#9ccfac] hover:bg-[#f4fbf6] dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-emerald-700 dark:hover:bg-emerald-950/20';

                return (
                  <button
                    key={option}
                    disabled={isAnswered}
                    onClick={() => selectOption(option)}
                    className={`flex min-h-14 w-full items-center justify-between rounded-xl border px-4 py-3 text-left text-base font-bold transition ${stateClass}`}
                  >
                    <span>{option}</span>
                    {isAnswered && optionIsCorrect && <Check className="h-4 w-4" />}
                    {isAnswered && isSelected && !optionIsCorrect && <X className="h-4 w-4" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {currentItemMode === 'spelling' && (
          /* Spelling Scramble */
          <div>
            <div className="flex items-center justify-between border-b border-zinc-100 pb-4 dark:border-zinc-800">
              <span className="text-xs font-bold uppercase tracking-wider text-[#2f7d4a] dark:text-emerald-400">{t.modeSpelling}</span>
              {isAnswered && audioSrc && (
                <button onClick={playAudio} className="rounded-full p-2 text-zinc-600 hover:bg-[#f4fbf6] dark:text-zinc-300 dark:hover:bg-zinc-800">
                  <Volume2 className="h-5 w-5" />
                </button>
              )}
            </div>
            
            <p className="mt-6 text-xs font-bold text-zinc-400 dark:text-zinc-500">{t.spellingPrompt}</p>
            <div className="mt-2 flex flex-wrap items-baseline gap-2">
              <h2 className="text-3xl font-bold leading-relaxed dark:text-zinc-50">{correctMeaning}</h2>
              <span className="text-xs text-zinc-400 dark:text-zinc-500">{formatPos(currentItem.pos)}</span>
            </div>

            {/* Answer assembly zone */}
            <div className="mt-8 min-h-16 flex flex-wrap items-center gap-2 rounded-xl border border-dashed border-zinc-200 bg-zinc-50/50 p-4 dark:border-zinc-800 dark:bg-zinc-950/30">
              {selectedChunks.map((item, idx) => (
                <button
                  key={`${item.chunk}-${item.id}`}
                  disabled={isAnswered}
                  onClick={() => {
                    setSelectedChunks((prev) => prev.filter((_, i) => i !== idx));
                    setPoolChunks((prev) =>
                      prev.map((p) => (p.id === item.id ? { ...p, selected: false } : p))
                    );
                  }}
                  className={`rounded-lg border px-3 py-2 text-sm font-bold shadow-sm transition hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-200 ${
                    item.chunk === ' '
                      ? 'bg-zinc-200/60 dark:bg-zinc-800/60 border-zinc-300 min-w-10 text-center font-mono'
                      : 'bg-white dark:bg-zinc-900 border-zinc-200'
                  }`}
                >
                  {item.chunk === ' ' ? '␣' : item.chunk}
                </button>
              ))}
            </div>

            {/* Word Pool */}
            {!isAnswered && (
              <div className="mt-6 flex flex-wrap gap-2">
                {poolChunks
                  .filter((p) => !p.selected)
                  .map((item) => (
                    <button
                      key={`${item.chunk}-${item.id}`}
                      onClick={() => {
                        setSelectedChunks((prev) => [...prev, item]);
                        setPoolChunks((prev) =>
                          prev.map((p) => (p.id === item.id ? { ...p, selected: true } : p))
                        );
                      }}
                      className={`rounded-lg px-3 py-2 text-sm font-bold transition ${
                        item.chunk === ' '
                          ? 'bg-zinc-200 hover:bg-zinc-300 text-zinc-700 min-w-14 text-center font-mono dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-200'
                          : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-900 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-200'
                      }`}
                    >
                      {item.chunk === ' ' ? '␣ Space' : item.chunk}
                    </button>
                  ))}
              </div>
            )}

            {/* Action check button */}
            {!isAnswered && (
              <div className="mt-8 flex justify-end">
                <button
                  disabled={selectedChunks.length === 0}
                  onClick={checkSpelling}
                  className="rounded-xl bg-[#3f8d54] px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#347946] disabled:opacity-40 dark:bg-emerald-600 dark:hover:bg-emerald-500"
                >
                  {t.checkBtn}
                </button>
              </div>
            )}
          </div>
        )}

        {currentItemMode === 'flashcard' && (
          /* Flashcards Mode */
          <div>
            <div className="flex items-center justify-between border-b border-zinc-100 pb-4 dark:border-zinc-800">
              <span className="text-xs font-bold uppercase tracking-wider text-[#2f7d4a] dark:text-emerald-400">{t.modeFlashcard}</span>
              {audioSrc && (
                <button onClick={playAudio} className="rounded-full p-2 text-zinc-600 hover:bg-[#f4fbf6] dark:text-zinc-300 dark:hover:bg-zinc-800">
                  <Volume2 className="h-5 w-5" />
                </button>
              )}
            </div>

            {/* The Flippable Card */}
            <div className="mt-6 flex flex-col items-center justify-center">
              <button
                type="button"
                onClick={() => setIsFlipped((prev) => !prev)}
                className="w-full min-h-60 rounded-xl border border-zinc-200 bg-[#faf8f5] dark:bg-zinc-950/40 p-8 flex flex-col items-center justify-center text-center shadow-inner select-none transition hover:bg-[#f5f1ea] dark:hover:bg-zinc-950/70"
              >
                {!isFlipped ? (
                  <>
                    <h2 className="text-4xl font-bold dark:text-zinc-50">{currentItem.word}</h2>
                    <p className="mt-4 text-xs font-semibold text-[#3f8d54] dark:text-emerald-400 uppercase tracking-widest">{currentItem.lang_code}</p>
                    <p className="mt-8 text-xs text-zinc-400 dark:text-zinc-500">{t.flipCardPrompt}</p>
                  </>
                ) : (
                  <>
                    <span className="text-xs font-bold text-zinc-400 dark:text-zinc-500 mb-2">{formatPos(currentItem.pos)}</span>
                    <h3 className="text-3xl font-bold text-[#df7c38] dark:text-orange-400">{correctMeaning}</h3>
                    <p className="mt-4 text-lg font-bold text-zinc-500 dark:text-zinc-400 italic">{currentItem.word}</p>
                  </>
                )}
              </button>
            </div>

            {/* Evaluator buttons (Shown after flipping the card) */}
            {!isAnswered && isFlipped && (
              <div className="mt-8 grid grid-cols-2 gap-3">
                <button
                  onClick={() => handleFlashcardEvaluate(false)}
                  className="rounded-xl border border-red-200 bg-red-50 py-4 text-sm font-bold text-red-800 transition hover:bg-red-100 dark:border-red-950/30 dark:bg-red-950/20 dark:text-red-300 dark:hover:bg-red-950/40"
                >
                  {t.dontKnowBtn}
                </button>
                <button
                  onClick={() => handleFlashcardEvaluate(true)}
                  className="rounded-xl bg-[#3f8d54] py-4 text-sm font-bold text-white shadow-sm transition hover:bg-[#347946] dark:bg-emerald-600 dark:hover:bg-emerald-500"
                >
                  {t.knowBtn}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Answer feedback panel */}
      {isAnswered && (
        <div className={`mt-6 flex flex-col gap-4 rounded-2xl p-5 border ${
          isCorrect
            ? 'border-emerald-200 bg-emerald-50/80 text-emerald-800 dark:border-emerald-800/40 dark:bg-emerald-950/20 dark:text-emerald-200'
            : 'border-red-200 bg-red-50/80 text-red-800 dark:border-red-800/40 dark:bg-red-950/20 dark:text-red-200'
        }`}>
          <div className="flex items-center gap-4">
            <CharacterAsset
              name={isCorrect ? 'correctbadge' : 'tryagainbadge'}
              size={72}
            />
            <div>
              <h3 className="text-lg font-bold">{isCorrect ? t.correct : t.wrong}</h3>
              <p className="mt-1 text-base font-bold select-all">{currentItem.word}</p>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                {t.correctAnswer} <span className="font-semibold">{correctMeaning} {formatPos(currentItem.pos)}</span>
              </p>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={goNext}
              className="inline-flex items-center gap-2 rounded-xl bg-[#3f8d54] px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#347946] dark:bg-emerald-600 dark:hover:bg-emerald-500"
            >
              {currentIndex + 1 >= activeItems.length ? t.finishBtn : t.nextBtn}
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Utility Shuffling Function
function shuffle<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Distractor Builder for word meanings
function buildWordMeaningDistractors(currentItem: ReviewWordItem, allItems: ReviewWordItem[], isEnglish: boolean): string[] {
  const getTranslation = (item: ReviewWordItem) =>
    (isEnglish ? item.meaning_en : item.meaning_ko) || item.meaning_ko || '';
  const currentTrans = getTranslation(currentItem);
  const distractorMeanings = new Set<string>();

  // 1. Gather meanings from the words_distractor table
  if (currentItem.distractors && currentItem.distractors.length > 0) {
    for (const d of currentItem.distractors) {
      if (distractorMeanings.size >= 3) break;
      const trans = (isEnglish ? d.meaning_en : d.meaning_ko) || d.meaning_ko;
      if (trans && trans.trim() && trans !== currentTrans) {
        distractorMeanings.add(trans.trim());
      }
    }
  }

  // 2. If we need more distractors, gather from other words in the pool
  if (distractorMeanings.size < 3) {
    const uniqueTranslations = allItems
      .filter((item) => item.id !== currentItem.id)
      .map(getTranslation)
      .filter(Boolean);

    for (const trans of shuffle(uniqueTranslations)) {
      if (distractorMeanings.size >= 3) break;
      if (trans !== currentTrans) {
        distractorMeanings.add(trans);
      }
    }
  }

  // 3. If still not enough, backfill with static fallbacks
  const fallbacks = isEnglish
    ? ['apple', 'book', 'good', 'beautiful', 'coffee', 'thank you']
    : ['사과', '책', '좋은', '아름다운', '커피', '감사합니다'];

  while (distractorMeanings.size < 3) {
    const fb = fallbacks[Math.floor(Math.random() * fallbacks.length)];
    if (fb !== currentTrans) {
      distractorMeanings.add(fb);
    }
  }

  return shuffle([currentTrans, ...Array.from(distractorMeanings)]);
}

// Hybrid spelling splitting function
function splitWordHybrid(word: string): string[] {
  const trimmed = word.trim();
  const subWords = trimmed.split(/\s+/);
  
  const allChunks: string[] = [];
  
  for (let i = 0; i < subWords.length; i++) {
    const subWord = subWords[i];
    let subWordChunks: string[] = [];
    
    if (subWord.length <= 5) {
      subWordChunks = subWord.split('');
    } else {
      subWordChunks = subWord.match(/.{1,2}/g) || [];
    }
    
    allChunks.push(...subWordChunks);
    
    if (i < subWords.length - 1) {
      allChunks.push(' ');
    }
  }
  
  return allChunks;
}

// Distractor spelling chunks generator
function generateSpellingDistractors(realChunks: string[], langCode: string): string[] {
  const distractors = new Set<string>();
  const vowels = ['a', 'e', 'i', 'o', 'u'];
  
  for (const chunk of realChunks) {
    if (chunk === ' ') continue;
    
    if (chunk.length >= 2) {
      for (const vowel of vowels) {
        const swapped = chunk.replace(/[aeiou]/gi, vowel);
        if (swapped !== chunk && !realChunks.includes(swapped)) {
          distractors.add(swapped);
        }
      }
      
      if (langCode === 'es' || langCode === 'sp') {
        let conf = '';
        if (chunk.includes('c')) conf = chunk.replace('c', 's');
        else if (chunk.includes('s')) conf = chunk.replace('s', 'c');
        else if (chunk.includes('b')) conf = chunk.replace('b', 'v');
        else if (chunk.includes('v')) conf = chunk.replace('v', 'b');
        else if (chunk.includes('g')) conf = chunk.replace('g', 'j');
        
        if (conf && conf !== chunk && !realChunks.includes(conf)) {
          distractors.add(conf);
        }
      }
    } else if (chunk.length === 1) {
      for (const vowel of vowels) {
        if (vowel !== chunk && !realChunks.includes(vowel)) {
          distractors.add(vowel);
        }
      }
    }
    if (distractors.size >= 3) break;
  }
  
  const fallbacks = ['te', 'me', 'es', 'un', 'la', 'lo', 'se', 'a', 'e', 'o'];
  for (const fb of fallbacks) {
    if (distractors.size >= 3) break;
    if (!realChunks.includes(fb)) {
      distractors.add(fb);
    }
  }
  
  return Array.from(distractors).slice(0, 3);
}

// Record practice progress via client fetch to word-progress API
function recordWordResult(wordId: number, isCorrect: boolean, mode: 'quiz' | 'spelling' | 'flashcards') {
  void fetch('/api/word-progress', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      word_id: wordId,
      is_correct: isCorrect,
      practice_mode: mode,
    }),
  });
}
