'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { PracticeCountSelector, type PracticeCountValue } from '@/components/practice/PracticeCountSelector';
import type { ReviewSentenceItem } from '@/lib/supabase/services/learning-review';
import { getPublicUrl } from '@/lib/utils';
import { formatWordMeaning } from '@/lib/word-meaning';
import BundleQuizClient, { type QuizItem } from '@/app/bundles/[id]/quiz/BundleQuizClient';
import BundleScrambleClient, { type ScrambleItem } from '@/app/bundles/[id]/scramble/BundleScrambleClient';
import BundleFlashcardsClient, { type FlashcardItem } from '@/app/bundles/[id]/flashcards/BundleFlashcardsClient';
import BundleWordFillClient, { type WordFillItem } from '@/app/bundles/[id]/wordfill/BundleWordFillClient';

interface SentencesReviewClientProps {
  initialItems: ReviewSentenceItem[];
  availableReviewCount: number;
  language: 'ko' | 'en';
  sessionKind?: 'review' | 'learning';
  returnTo?: string;
  nextTo?: string;
}

const copy = {
  ko: {
    title: '문장 복습 세션',
    description: '문장을 더 자신 있게 사용할 수 있도록 복습해보세요.',
    learningTitle: '새 문장 학습',
    learningDescription: '아직 시작하지 않은 문장을 퀴즈와 배열 문제로 익혀보세요.',
    emptyTitle: '지금은 복습할 문장이 없어요!',
    emptyDesc: '새로운 학습 번들을 공부하면 복습할 문장들이 여기에 쌓입니다.',
    learningEmptyTitle: '학습을 시작할 문장이 없어요!',
    learningEmptyDesc: '현재 시작 전 상태인 문장이 없습니다.',
    backToLearn: '학습 현황으로 돌아가기',
    backToReview: '복습 목록으로 돌아가기',
    setupTitle: '복습 설정',
    setupCount: '복습할 문장 수 선택',
    learningSetupTitle: '학습 설정',
    learningSetupCount: '학습할 문장 수 선택',
    allCount: (count: number) => `전체 ${count}`,
    setupMode: '복습 방식 선택',
    modeQuiz: 'Sentence Quiz',
    modeScramble: '스크램블 (단어 배열)',
    modeWordfill: '단어 채우기 (Word Fill)',
    modeFlashcards: '플래시카드',
    startBtn: '시작하기',
    itemsLeft: (count: number) => `전체 복습 후보 문장: ${count}개`,
    learningItemsLeft: (count: number) => `학습을 시작할 문장: ${count}개`,
  },
  en: {
    title: 'Sentence Review Session',
    description: 'Review sentences to feel more confident using them.',
    learningTitle: 'Learn New Sentences',
    learningDescription: 'Practice sentences you have not started yet with quizzes and scrambles.',
    emptyTitle: 'Nothing to review right now!',
    emptyDesc: 'Study new bundles to build your review list.',
    learningEmptyTitle: 'No new sentences to start!',
    learningEmptyDesc: 'There are no sentences in the not-started state right now.',
    backToLearn: 'Back to progress',
    backToReview: 'Back to Review',
    setupTitle: 'Review Settings',
    setupCount: 'Select sentence count',
    learningSetupTitle: 'Learning Settings',
    learningSetupCount: 'Select sentence count to learn',
    allCount: (count: number) => `All ${count}`,
    setupMode: 'Select review mode',
    modeQuiz: 'Sentence Quiz',
    modeScramble: 'Scramble',
    modeWordfill: 'Word Fill',
    modeFlashcards: 'Flashcards',
    startBtn: 'Start Review',
    itemsLeft: (count: number) => `${count} sentence review candidates`,
    learningItemsLeft: (count: number) => `${count} sentences ready to learn`,
  },
};

export default function SentencesReviewClient({
  initialItems,
  availableReviewCount,
  language,
  sessionKind = 'review',
  returnTo,
}: SentencesReviewClientProps) {
  const t = copy[language];
  const isLearning = sessionKind === 'learning';
  const returnHref = isLearning ? '/learn/progress/sentences' : returnTo || '/learn/review';
  const returnLabel = isLearning || returnTo ? t.backToLearn : t.backToReview;
  const isEnglish = language === 'en';
  const headingClass = getReviewHeadingClass(language);

  const [step, setStep] = useState<'setup' | 'practice'>('setup');
  const [selectedCount, setSelectedCount] = useState<PracticeCountValue>(() => (initialItems.length >= 10 ? 10 : 'all'));
  const [selectedMode, setSelectedMode] = useState<'quiz' | 'scramble' | 'flashcards' | 'wordfill'>('quiz');
  const [activeItems, setActiveItems] = useState<ReviewSentenceItem[]>([]);

  const showAllCountOption = availableReviewCount <= initialItems.length;
  const sessionTitle = isLearning ? t.learningTitle : t.title;

  const startSession = () => {
    const shuffled = shuffle(initialItems);
    const count = selectedCount === 'all' ? shuffled.length : Math.min(selectedCount, shuffled.length);
    setActiveItems(shuffled.slice(0, count));
    setStep('practice');
  };

  const restart = () => {
    setStep('setup');
  };

  // 1. Empty State
  if (initialItems.length === 0) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center gap-5 px-4 text-center">
        <h1 className="text-3xl font-black text-zinc-950 dark:text-zinc-50">{isLearning ? t.learningEmptyTitle : t.emptyTitle}</h1>
        <p className="text-base font-semibold text-zinc-600 dark:text-zinc-400">{isLearning ? t.learningEmptyDesc : t.emptyDesc}</p>
        <Link
          href={returnHref}
          className="inline-flex items-center gap-2 rounded-xl bg-[#3f8d54] px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#347946] dark:bg-emerald-600 dark:hover:bg-emerald-500"
        >
          <ArrowLeft className="h-4 w-4" />
          {returnLabel}
        </Link>
      </div>
    );
  }

  // 2. Setup State
  if (step === 'setup') {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <header className="mb-8">
          <Link
            href={returnHref}
            className="mb-4 inline-flex items-center gap-2 text-sm font-bold text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            <ArrowLeft className="h-4 w-4" />
            {returnLabel}
          </Link>
          <h1 className={`text-2xl font-black text-zinc-950 dark:text-zinc-50 sm:text-3xl ${headingClass}`}>
            {sessionTitle}
          </h1>
          <p className="mt-2 text-sm font-semibold text-zinc-600 dark:text-zinc-400">
            {isLearning ? t.learningDescription : t.description}
          </p>
        </header>

        <div className="space-y-6 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-lg font-black text-zinc-950 dark:text-zinc-50">
            {isLearning ? t.learningSetupTitle : t.setupTitle}
          </h2>

          {/* Count Selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#3f8d54] dark:text-emerald-400">
                {isLearning ? t.learningItemsLeft(availableReviewCount) : t.itemsLeft(availableReviewCount)}
              </span>
            </div>
            <PracticeCountSelector
              label={isLearning ? t.learningSetupCount : t.setupCount}
              selectedCount={selectedCount}
              onSelect={setSelectedCount}
              totalCount={initialItems.length}
              showAll={showAllCountOption}
              allLabel={t.allCount}
            />
          </div>

          {/* Mode Selection */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">{t.setupMode}</label>
            <div className="grid gap-2">
              {[
                { id: 'quiz', label: t.modeQuiz },
                { id: 'scramble', label: t.modeScramble },
                { id: 'flashcards', label: t.modeFlashcards },
                { id: 'wordfill', label: t.modeWordfill },
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

  // 3. Practice State: Route to unified bundle practice clients

  // Mode: Sentence Quiz
  if (selectedMode === 'quiz') {
    const quizItems: QuizItem[] = activeItems.map((item) => ({
      id: item.bundle_item_id,
      sentence: item.sentence,
      translation: (isEnglish ? item.translation_en : item.translation) || item.translation,
      audioUrl: item.audio_url ? getPublicUrl(item.audio_url) : null,
    }));

    const allOptionItems: QuizItem[] = initialItems.map((item) => ({
      id: item.bundle_item_id,
      sentence: item.sentence,
      translation: (isEnglish ? item.translation_en : item.translation) || item.translation,
      audioUrl: item.audio_url ? getPublicUrl(item.audio_url) : null,
    }));

    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <BundleQuizClient
          title={sessionTitle}
          headerEyebrow={t.modeQuiz}
          items={quizItems}
          optionItems={allOptionItems}
          language={language}
          isLoggedIn={true}
          onBack={restart}
          onRecordResult={(bundleItemId, isCorrect) => {
            const item = activeItems.find((it) => it.bundle_item_id === bundleItemId) || initialItems.find((it) => it.bundle_item_id === bundleItemId);
            if (item) recordPracticeResult(item.bundle_id, item.bundle_item_id, 'quiz', isCorrect);
          }}
        />
      </div>
    );
  }

  // Mode: Scramble
  if (selectedMode === 'scramble') {
    const scrambleItems: ScrambleItem[] = activeItems.map((item) => ({
      id: item.bundle_item_id,
      sentence: item.sentence,
      translation: (isEnglish ? item.translation_en : item.translation) || item.translation,
      audioUrl: item.audio_url ? getPublicUrl(item.audio_url) : null,
      proficiencyLevel: item.proficiency_level,
    }));

    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <BundleScrambleClient
          title={sessionTitle}
          headerEyebrow={t.modeScramble}
          items={scrambleItems}
          language={language}
          isLoggedIn={true}
          onBack={restart}
          onRecordResult={(bundleItemId, isCorrect) => {
            const item = activeItems.find((it) => it.bundle_item_id === bundleItemId) || initialItems.find((it) => it.bundle_item_id === bundleItemId);
            if (item) recordPracticeResult(item.bundle_id, item.bundle_item_id, 'scramble', isCorrect);
          }}
        />
      </div>
    );
  }

  // Mode: Flashcards
  if (selectedMode === 'flashcards') {
    const flashcardItems: FlashcardItem[] = activeItems.map((item) => ({
      id: item.bundle_item_id,
      sentence: item.sentence,
      translation: (isEnglish ? item.translation_en : item.translation) || item.translation,
      audioUrl: item.audio_url ? getPublicUrl(item.audio_url) : null,
    }));

    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <BundleFlashcardsClient
          title={sessionTitle}
          headerEyebrow={t.modeFlashcards}
          items={flashcardItems}
          language={language}
          isLoggedIn={true}
          onBack={restart}
        />
      </div>
    );
  }

  // Mode: WordFill
  if (selectedMode === 'wordfill') {
    const buildWordFillItem = (item: ReviewSentenceItem): WordFillItem => {
      const maps = item.word_maps || [];
      const candidates = maps
        .map((m) => {
          const word = Array.isArray(m.words) ? m.words[0] : m.words;
          return {
            mapId: m.id,
            used_as: m.used_as,
            word_id: m.word_id,
            words: word,
          };
        })
        .filter((m) => m.words && m.words.word);

      let targetWord = '';
      let targetMeaning = '';
      let usedAs = '';
      let wordId = 0;
      let distractors: Array<{ word: string; meaning: string }> = [];

      if (candidates.length > 0) {
        const chosen = candidates[Math.floor(Math.random() * candidates.length)];
        targetWord = chosen.words!.word;
        targetMeaning =
          formatWordMeaning(isEnglish ? chosen.words!.meaning_en : chosen.words!.meaning_ko)
          || formatWordMeaning(chosen.words!.meaning_ko)
          || formatWordMeaning(chosen.words!.meaning_en)
          || '';
        usedAs = chosen.used_as || targetWord;
        wordId = chosen.word_id;
        distractors = (chosen.words!.words_distractor || [])
          .map((d) => ({
            word: d.distractor,
            meaning:
              formatWordMeaning(isEnglish ? d.meaning_en : d.meaning_ko)
              || formatWordMeaning(d.meaning_ko)
              || formatWordMeaning(d.meaning_en)
              || '',
          }))
          .filter(
            (d) =>
              d.word.toLowerCase().trim() !== targetWord.toLowerCase().trim() &&
              d.word.toLowerCase().trim() !== usedAs.toLowerCase().trim()
          );
      } else {
        const wordsInSentence = item.sentence.replace(/[^\wáéíóúüñÁÉÍÓÚÜÑ\s]/g, '').split(/\s+/).filter((w) => w.length >= 3);
        usedAs = wordsInSentence[0] || item.sentence.split(' ')[0] || '';
        targetWord = usedAs;
        targetMeaning = item.translation;
      }

      return {
        id: item.bundle_item_id,
        sentence: item.sentence,
        translation: (isEnglish ? item.translation_en : item.translation) || item.translation,
        audioUrl: item.audio_url ? getPublicUrl(item.audio_url) : null,
        targetWord,
        targetMeaning,
        usedAs,
        wordId,
        distractors,
      };
    };

    const wordFillItems = activeItems.map(buildWordFillItem);
    const allOptionItems = initialItems.map(buildWordFillItem);

    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <BundleWordFillClient
          title={sessionTitle}
          headerEyebrow={t.modeWordfill}
          items={wordFillItems}
          optionItems={allOptionItems}
          wordUsageDetails={[]}
          language={language}
          isLoggedIn={true}
          onBack={restart}
          onRecordResult={(bundleItemId, isCorrect, wordId) => {
            const item = activeItems.find((it) => it.bundle_item_id === bundleItemId) || initialItems.find((it) => it.bundle_item_id === bundleItemId);
            if (item) {
              void fetch('/api/bundle-progress', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  bundle_id: item.bundle_id,
                  bundle_item_id: item.bundle_item_id,
                  practice_mode: 'wordfill',
                  is_correct: isCorrect,
                  word_id: wordId || undefined,
                }),
              });
            }
          }}
        />
      </div>
    );
  }

  return null;
}

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
