'use client';

import { useEffect, useMemo, useState, useRef } from 'react';
import Link from 'next/link';
import { ArrowLeft, ChevronRight, Volume2, RotateCcw } from 'lucide-react';
import { CharacterAsset } from '@/components/assets/CharacterAsset';
import { MultipleChoiceQuestion } from '@/components/practice/MultipleChoiceQuestion';
import { PracticeCountSelector, type PracticeCountValue } from '@/components/practice/PracticeCountSelector';
import { PracticeScorePills } from '@/components/practice/PracticeScorePills';
import { ScrambleQuestion, type ScrambleToken } from '@/components/practice/ScrambleQuestion';
import type { ReviewSentenceItem } from '@/lib/supabase/services/learning-review';
import { getPublicUrl } from '@/lib/utils';

interface SentencesReviewClientProps {
  initialItems: ReviewSentenceItem[];
  availableReviewCount: number;
  language: 'ko' | 'en';
}

const copy = {
  ko: {
    title: '문장 복습 세션',
    description: '숙련도 레벨 1~4의 문장들을 복습하여 완벽히 마스터해 보세요.',
    emptyTitle: '지금은 복습할 문장이 없어요!',
    emptyDesc: '새로운 학습 번들을 공부하면 복습할 문장들이 여기에 쌓입니다.',
    backToLearn: '대시보드로 돌아가기',
    setupTitle: '복습 설정',
    setupCount: '복습할 문장 수 선택',
    allCount: (count: number) => `전체 ${count}`,
    setupMode: '복습 방식 선택',
    modeQuiz: '객관식 선택',
    modeScramble: '스크램블 (단어 배열)',
    modeMixed: '두 방식 섞어서',
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
    itemsLeft: (count: number) => `전체 복습 후보 문장: ${count}개`,
  },
  en: {
    title: 'Sentence Review Session',
    description: 'Review sentences with proficiency level 1–4 to master them.',
    emptyTitle: 'Nothing to review right now!',
    emptyDesc: 'Study new bundles to build your review list.',
    backToLearn: 'Back to Dashboard',
    setupTitle: 'Review Settings',
    setupCount: 'Select sentence count',
    allCount: (count: number) => `All ${count}`,
    setupMode: 'Select review mode',
    modeQuiz: 'Multiple Choice',
    modeScramble: 'Scramble',
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
    itemsLeft: (count: number) => `${count} sentence review candidates`,
  },
};

export default function SentencesReviewClient({ initialItems, availableReviewCount, language }: SentencesReviewClientProps) {
  const t = copy[language];
  const isEnglish = language === 'en';
  const headingClass = getReviewHeadingClass(language);

  // State
  const [step, setStep] = useState<'setup' | 'practice' | 'finished'>('setup');
  const [selectedCount, setSelectedCount] = useState<PracticeCountValue>(() => initialItems.length >= 10 ? 10 : 'all');
  const [selectedMode, setSelectedMode] = useState<'quiz' | 'scramble' | 'mixed'>('mixed');
  const [activeItems, setActiveItems] = useState<ReviewSentenceItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [selectedWords, setSelectedWords] = useState<string[]>([]);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [isAnswered, setIsAnswered] = useState<boolean>(false);
  const [score, setScore] = useState<number>(0);
  const [scramblePool, setScramblePool] = useState<string[]>([]);
  const [multipleChoiceOptions, setMultipleChoiceOptions] = useState<string[]>([]);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const showAllCountOption = availableReviewCount <= initialItems.length;

  const currentItem = activeItems[currentIndex];
  const progress = activeItems.length > 0 ? Math.round(((currentIndex) / activeItems.length) * 100) : 0;

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
      return currentIndex % 2 === 0 ? 'scramble' : 'quiz';
    }
    return selectedMode;
  }, [selectedMode, currentIndex, currentItem]);

  // Scrambled pool setup
  const cleanWords = (sentence: string) => {
    return sentence.split(/\s+/).filter(Boolean);
  };

  // Setup current item options or scramble pool
  useEffect(() => {
    if (!currentItem) return;

    if (currentItemMode === 'scramble') {
      const words = cleanWords(currentItem.sentence);
      setScramblePool(shuffle(words));
      setSelectedWords([]);
    } else {
      // Multiple Choice options
      const distractors = buildDistractors(currentItem, initialItems, isEnglish);
      setMultipleChoiceOptions(distractors);
      setSelectedOption(null);
    }
    setIsCorrect(null);
    setIsAnswered(false);
  }, [currentItem, currentItemMode, initialItems, isEnglish]);

  // Audio loading when currentItem changes
  const audioSrc = currentItem?.audio_url ? getPublicUrl(currentItem.audio_url) : null;

  // Handle start session
  const startSession = () => {
    const shuffled = shuffle(initialItems);
    const count = selectedCount === 'all' ? shuffled.length : Math.min(selectedCount, shuffled.length);
    setActiveItems(shuffled.slice(0, count));
    setCurrentIndex(0);
    setScore(0);
    setIsCorrect(null);
    setIsAnswered(false);
    setSelectedOption(null);
    setSelectedWords([]);
    setStep('practice');
  };

  // Evaluate Scramble
  const checkScramble = () => {
    if (isAnswered) return;
    const constructed = selectedWords.join(' ');
    const correctClean = currentItem.sentence.trim();
    const answerIsCorrect = constructed.toLowerCase().replace(/[.,?!]/g, '') === correctClean.toLowerCase().replace(/[.,?!]/g, '');

    setIsCorrect(answerIsCorrect);
    setIsAnswered(true);
    if (answerIsCorrect) {
      setScore((s) => s + 1);
    }
    // Record to database
    recordPracticeResult(currentItem.bundle_id, currentItem.bundle_item_id, 'scramble', answerIsCorrect);
    // Play sound automatically on correct/incorrect
    setTimeout(() => {
      playAudio();
    }, 200);
  };

  // Evaluate Multiple Choice
  const selectOption = (option: string) => {
    if (isAnswered) return;
    setSelectedOption(option);
    const correctTrans = (isEnglish ? currentItem.translation_en : currentItem.translation) || currentItem.translation;
    const answerIsCorrect = option === correctTrans;

    setIsCorrect(answerIsCorrect);
    setIsAnswered(true);
    if (answerIsCorrect) {
      setScore((s) => s + 1);
    }
    // Record to database
    recordPracticeResult(currentItem.bundle_id, currentItem.bundle_item_id, 'quiz', answerIsCorrect);
    // Play sound automatically
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
    setSelectedWords([]);
    setCurrentIndex((prev) => prev + 1);
  };

  const restart = () => {
    setIsCorrect(null);
    setIsAnswered(false);
    setSelectedOption(null);
    setSelectedWords([]);
    setCurrentIndex(0);
    setStep('setup');
  };

  // Empty state
  if (initialItems.length === 0) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-xl flex-col items-center justify-center gap-6 text-center px-4">
        <CharacterAsset name="tryagainbadge" size={128} />
        <h1 className={`${headingClass} text-3xl dark:text-zinc-100`}>{t.emptyTitle}</h1>
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
        <h1 className={`${headingClass} text-4xl dark:text-zinc-100`}>{t.doneTitle}</h1>
        
        {/* Only character badge is shown as per user request */}
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
            <h1 className={`${headingClass} text-3xl dark:text-zinc-100`}>{t.title}</h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">{t.description}</p>
          </div>
        </header>

        <div className="space-y-6 rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-xl font-bold dark:text-zinc-100">{t.setupTitle}</h2>
          
          {/* Sentence count */}
          <div className="space-y-2">
            <PracticeCountSelector
              label={t.setupCount}
              totalCount={initialItems.length}
              selectedCount={selectedCount}
              onSelect={setSelectedCount}
              options={[5, 10, 20, 40]}
              showAll={showAllCountOption}
              allLabel={t.allCount}
            />
            <p className="text-xs text-zinc-400 dark:text-zinc-500">{t.itemsLeft(availableReviewCount)}</p>
          </div>

          {/* Mode Selection */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">{t.setupMode}</label>
            <div className="grid gap-2">
              {[
                { id: 'quiz', label: t.modeQuiz },
                { id: 'scramble', label: t.modeScramble },
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
  const correctTranslation = (isEnglish ? currentItem?.translation_en : currentItem?.translation) || currentItem?.translation || '';
  const answeredCount = currentIndex + (isAnswered ? 1 : 0);
  const incorrectCount = Math.max(0, answeredCount - score);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      {/* Audio element */}
      {audioSrc && <audio ref={audioRef} src={audioSrc} />}

      <header className="mb-6 flex items-center justify-between">
        <button onClick={restart} className="rounded-full p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <span className="text-xs font-semibold text-zinc-400 dark:text-zinc-500">{currentIndex + 1} / {activeItems.length}</span>
        <PracticeScorePills correct={score} incorrect={incorrectCount} />
      </header>

      {/* Progress Bar */}
      <div className="mb-6 h-1.5 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
        <div className="h-full bg-[#3f8d54] transition-all dark:bg-emerald-500" style={{ width: `${progress}%` }} />
      </div>

      {/* Quiz Card */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        {currentItemMode === 'quiz' ? (
          <MultipleChoiceQuestion
            eyebrow={t.modeQuiz}
            question={<h2 className="text-2xl font-bold leading-relaxed dark:text-zinc-50">{currentItem.sentence}</h2>}
            options={multipleChoiceOptions}
            selectedOption={selectedOption}
            correctOption={correctTranslation}
            isAnswered={isAnswered}
            onSelect={selectOption}
            audioAction={audioSrc ? (
              <button onClick={playAudio} className="rounded-full p-2 text-zinc-600 hover:bg-[#f4fbf6] dark:text-zinc-300 dark:hover:bg-zinc-800">
                <Volume2 className="h-5 w-5" />
              </button>
            ) : null}
            variant="embedded"
          />
        ) : (
          <>
            <ScrambleQuestion
              eyebrow={t.modeScramble}
              promptLabel={isEnglish ? 'Translate this sentence:' : '이 문장을 완성해 보세요:'}
              prompt={<h2 className="text-2xl font-bold leading-relaxed dark:text-zinc-50">{correctTranslation}</h2>}
              answerSlots={selectedWords.map((word, idx) => ({
                key: `${word}-${idx}`,
                text: word,
                type: 'selected' as const,
                onRemove: () => {
                  setSelectedWords((prev) => prev.filter((_, i) => i !== idx));
                  setScramblePool((prev) => [...prev, word]);
                },
              }))}
              availableTokens={scramblePool.map((word, idx) => ({ id: idx, text: word }))}
              onSelectToken={(token: ScrambleToken) => {
                setSelectedWords((prev) => [...prev, token.text]);
                setScramblePool((prev) => prev.filter((_, i) => i !== Number(token.id)));
              }}
              isAnswered={isAnswered}
              result={isAnswered ? (isCorrect ? 'correct' : 'wrong') : null}
              emptyAnswerText={isEnglish ? 'Build your answer here.' : '여기에 문장을 완성하세요.'}
              chooseText={isEnglish ? 'Choose words below' : '아래에서 단어를 선택하세요'}
              audioAction={isAnswered && audioSrc ? (
                <button onClick={playAudio} className="rounded-full p-2 text-zinc-600 hover:bg-[#f4fbf6] dark:text-zinc-300 dark:hover:bg-zinc-800">
                  <Volume2 className="h-5 w-5" />
                </button>
              ) : null}
              variant="embedded"
            />
            {!isAnswered && (
              <div className="mt-8 flex justify-end">
                <button
                  disabled={selectedWords.length === 0}
                  onClick={checkScramble}
                  className="rounded-xl bg-[#3f8d54] px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#347946] disabled:opacity-40 dark:bg-emerald-600 dark:hover:bg-emerald-500"
                >
                  {t.checkBtn}
                </button>
              </div>
            )}
          </>
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
              <p className="mt-1 text-sm font-bold select-all">
                {isCorrect ? currentItem.sentence : `${t.correctAnswer} ${currentItem.sentence}`}
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

function getReviewHeadingClass(language: 'ko' | 'en') {
  return language === 'ko' ? 'font-sans font-bold' : 'font-serif font-semibold';
}

// Distractor Builder
function buildDistractors(currentItem: ReviewSentenceItem, allItems: ReviewSentenceItem[], isEnglish: boolean): string[] {
  const getTranslation = (item: ReviewSentenceItem) =>
    (isEnglish ? item.translation_en : item.translation) || item.translation || '';
  const currentTrans = getTranslation(currentItem);
  const uniqueTranslations = Array.from(
    new Set(
      allItems
        .filter((item) => item.id !== currentItem.id)
        .map(getTranslation)
        .filter(Boolean)
    )
  );
  
  const shuffled = shuffle(uniqueTranslations).slice(0, 3);
  const fallbacks = isEnglish
    ? ['Good morning!', 'How are you?', 'Where is the library?', 'Nice to meet you.', 'I would like a coffee.']
    : ['좋은 아침입니다!', '어떻게 지내세요?', '도서관이 어디에 있나요?', '만나서 반갑습니다.', '커피 한 잔 주세요.'];

  while (shuffled.length < 3) {
    const fb = fallbacks[Math.floor(Math.random() * fallbacks.length)];
    if (!shuffled.includes(fb) && fb !== currentTrans) {
      shuffled.push(fb);
    }
  }
  return shuffle([currentTrans, ...shuffled]);
}

// Record practice progress via client fetch to bundle-progress API
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
