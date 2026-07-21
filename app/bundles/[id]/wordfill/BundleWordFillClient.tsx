'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Check, ChevronRight, Volume2, X } from 'lucide-react';
import { CharacterAsset } from '@/components/assets/CharacterAsset';
import { WordInfoSheet } from '@/components/words/WordInfoSheet';
import type { WordUsageDetail } from '@/lib/supabase/services/word-sentence-map';
import { getPublicUrl } from '@/lib/utils';

interface OptionData {
  word: string;
  meaning: string;
}

interface WordFillItem {
  id: string; // bundle_item_id
  sentence: string;
  translation: string;
  audioUrl: string | null;
  targetWord: string; // Dictionary form (e.g., hablar)
  targetMeaning: string;
  usedAs: string; // Exact word in sentence (e.g., hablo)
  wordId: number;
  distractors: OptionData[]; // Incorrect words from words_distractor
}

interface BundleWordFillClientProps {
  bundleId: string;
  title: string;
  items: WordFillItem[];
  optionItems: WordFillItem[];
  wordUsageDetails: WordUsageDetail[];
  language: 'ko' | 'en';
  initialItemId?: string | null;
  isLoggedIn: boolean;
}

const copy = {
  ko: {
    back: '상세로 돌아가기',
    mode: 'Word Fill',
    prompt: '빈칸에 들어갈 올바른 단어를 고르세요',
    empty: '빈칸 채우기로 학습할 문장이 없습니다.',
    correct: '정답입니다!',
    wrong: '다시 확인해보세요.',
    next: '다음 문제',
    finish: '완료',
    done: '학습 완료',
    score: (score: number, total: number) => `${score} / ${total} 정답`,
    retry: '다시 풀기',
    chooseSet: '문제 다시 선택',
    dictionaryFormLabel: '기본형',
    wordInfo: '단어 정보',
    usedForm: '사용 형태',
    meaning: '뜻',
    examples: '사용된 문장',
    noExamples: '아직 연결된 문장이 없습니다.',
    close: '닫기',
    pos: '품사',
  },
  en: {
    back: 'Back to detail',
    mode: 'Word Fill',
    prompt: 'Choose the correct word for the blank',
    empty: 'No sentences for word fill.',
    correct: 'Correct!',
    wrong: 'Try again.',
    next: 'Next',
    finish: 'Finish',
    done: 'Word Fill complete',
    score: (score: number, total: number) => `${score} / ${total} correct`,
    retry: 'Retry',
    chooseSet: 'Change Set',
    dictionaryFormLabel: 'Dictionary form',
    wordInfo: 'Word info',
    usedForm: 'Used form',
    meaning: 'Meaning',
    examples: 'Example sentences',
    noExamples: 'No linked sentences yet.',
    close: 'Close',
    pos: 'POS',
  },
};

export default function BundleWordFillClient({
  bundleId,
  title,
  items,
  optionItems,
  wordUsageDetails,
  language,
  initialItemId = null,
  isLoggedIn,
}: BundleWordFillClientProps) {
  const t = copy[language] || copy.ko;
  const initialIndex = initialItemId ? Math.max(0, items.findIndex((item) => item.id === initialItemId)) : 0;
  const [index, setIndex] = useState(initialIndex);
  const [selected, setSelected] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isWordInfoOpen, setIsWordInfoOpen] = useState(false);
  const current = items[index];
  const currentWordDetail = current ? wordUsageDetails.find((detail) => detail.word_id === current.wordId) : null;

  // 문장 내에 usedAs 단어를 찾아 빈칸(_____)으로 치환
  const blankedSentence = useMemo(() => {
    if (!current) return '';
    const { sentence, usedAs } = current;
    // 대소문자 구분 없이 매칭하되, 단어 경계가 포함되도록 정규식 구성
    const escaped = usedAs.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp(`\\b${escaped}\\b`, 'i');
    if (regex.test(sentence)) {
      return sentence.replace(regex, '_____');
    }
    const simpleRegex = new RegExp(escaped, 'i');
    return sentence.replace(simpleRegex, '_____');
  }, [current]);

  const sentenceDisplay = selected ? current?.sentence || '' : blankedSentence;

  // 문제의 4지선다 보기 리스트 생성
  const options = useMemo(() => {
    if (!current) return [];

    const correctAns = { word: current.usedAs, meaning: current.targetMeaning };
    
    // 1. 해당 단어 고유의 오답 후보군 수집
    let finalDistractors = uniqueOptions(
      current.distractors.filter((d) => normalizeOptionWord(d.word) !== normalizeOptionWord(correctAns.word))
    );

    // 2. 만약 오답 후보군이 부족한 경우, 기존처럼 같은 번들 내 다른 단어들의 기본형(targetWord)으로 채움
    if (finalDistractors.length < 3) {
      const bundleLemmas = optionItems
        .filter((item) => item.targetWord && normalizeOptionWord(item.targetWord) !== normalizeOptionWord(correctAns.word))
        .map((item) => ({ word: item.targetWord, meaning: item.targetMeaning }));
      
      const seen = new Set<string>();
      seen.add(normalizeOptionWord(correctAns.word));
      finalDistractors.forEach((d) => seen.add(normalizeOptionWord(d.word)));

      for (const item of shuffle(bundleLemmas)) {
        if (finalDistractors.length >= 3) break;
        const normalized = normalizeOptionWord(item.word);
        if (!seen.has(normalized)) {
          seen.add(normalized);
          finalDistractors.push(item);
        }
      }
    }

    // 3. 3개의 오답을 자르고, 정답 단어와 병합 후 셔플
    const chosenDistractors = shuffle(finalDistractors).slice(0, 3);
    return shuffle([correctAns, ...chosenDistractors]);
  }, [current, optionItems]);

  const progress = items.length > 0 ? Math.round(((index + 1) / items.length) * 100) : 0;
  const isCorrect = selected === current?.usedAs;
  const audioSrc = getPublicUrl(current?.audioUrl || null);
  const shouldShowDictionaryForm = current
    ? current.targetWord.toLowerCase().trim() !== current.usedAs.toLowerCase().trim()
    : false;

  useEffect(() => {
    if (!isLoggedIn) return;
    if (!current) return;
    recordCurrentWordFillItem(bundleId, current.id);
  }, [bundleId, current, isLoggedIn]);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center gap-5 text-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-200 border-t-[#3f8d54] dark:border-zinc-800 dark:border-t-emerald-500" />
      </div>
    );
  }

  const choose = (option: string) => {
    if (selected) return;
    setSelected(option);
    const answerIsCorrect = option.toLowerCase().trim() === current.usedAs.toLowerCase().trim();
    if (answerIsCorrect) {
      setScore((value) => value + 1);
    }
    if (isLoggedIn) {
      recordPracticeResult(bundleId, current.id, 'wordfill', answerIsCorrect, current.wordId);
    }
    playSentenceAudio(current.audioUrl);
  };

  const goNext = () => {
    if (index + 1 >= items.length) {
      setFinished(true);
      return;
    }
    setIndex((value) => value + 1);
    setSelected(null);
    setIsWordInfoOpen(false);
  };

  const retry = () => {
    setIndex(0);
    setSelected(null);
    setScore(0);
    setFinished(false);
    setIsWordInfoOpen(false);
  };

  if (!current) {
    return <Empty bundleId={bundleId} title={title} text={t.empty} back={t.back} />;
  }

  if (finished) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center gap-5 text-center">
        <p className="text-xs font-bold uppercase text-[#2f7d4a] dark:text-emerald-400">{t.mode}</p>
        <h1 className="text-3xl font-bold text-zinc-950 dark:text-zinc-50">{t.done}</h1>
        <p className="text-lg font-bold text-zinc-700 dark:text-zinc-300">{t.score(score, items.length)}</p>
        <div className="flex gap-2">
          <Link
            href={`/bundles/${bundleId}/wordfill`}
            className="rounded-lg border border-zinc-200 px-4 py-3 text-sm font-bold text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            {t.chooseSet}
          </Link>
          <button
            onClick={retry}
            className="rounded-lg bg-[#3f8d54] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#347946] dark:bg-emerald-600 dark:hover:bg-emerald-500"
          >
            {t.retry}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5 px-2 pb-10">
      <header className="flex items-center gap-3">
        <Link
          href={`/bundles/${bundleId}/wordfill`}
          className="rounded-full p-2 text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase text-[#2f7d4a] dark:text-emerald-400">{t.mode}</p>
          <h1 className="truncate text-lg font-bold text-zinc-950 dark:text-zinc-50">{title}</h1>
        </div>
      </header>

      <div className="h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
        <div
          className="h-full rounded-full bg-[#3f8d54] transition-all dark:bg-emerald-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      <section className="rounded-2xl border border-zinc-100 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-black/20">
        <p className="text-xs font-bold uppercase text-zinc-400 dark:text-zinc-500">
          {index + 1} / {items.length}
        </p>
        <p className="mt-4 text-sm font-semibold text-[#2f7d4a] dark:text-emerald-400">{t.prompt}</p>
        <div className="mt-3 flex items-start gap-3">
          <h2 className="min-w-0 flex-1 text-2xl font-bold leading-relaxed text-zinc-950 dark:text-zinc-50">
            {sentenceDisplay}
          </h2>
          {selected && audioSrc && (
            <button
              type="button"
              onClick={() => playSentenceAudio(current.audioUrl)}
              className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-emerald-100 bg-emerald-50 text-emerald-700 transition hover:bg-emerald-100 dark:border-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-200 dark:hover:bg-emerald-900"
              aria-label="Play sentence audio"
              title="Play sentence audio"
            >
              <Volume2 className="h-4 w-4" />
            </button>
          )}
        </div>
        <p className="mt-3 text-sm font-medium leading-6 text-zinc-500 dark:text-zinc-400 md:text-base">
          {current.translation}
        </p>
      </section>

      <div className="space-y-2">
        {options.map((option) => {
          const isSelected = selected === option.word;
          const optionIsCorrect = option.word.toLowerCase().trim() === current.usedAs.toLowerCase().trim();
          const stateClass = selected
            ? optionIsCorrect
              ? 'border-emerald-400 bg-emerald-50 text-emerald-800 dark:border-emerald-500 dark:bg-emerald-950/60 dark:text-emerald-200'
              : isSelected
                ? 'border-red-300 bg-red-50 text-red-700 dark:border-red-500 dark:bg-red-950/60 dark:text-red-200'
                : 'border-zinc-100 bg-white text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-500'
            : 'border-zinc-100 bg-white text-zinc-900 hover:border-[#9ccfac] hover:bg-[#f4fbf6] dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:border-emerald-700 dark:hover:bg-emerald-950/30';

          return (
            <button
              key={option.word}
              onClick={() => choose(option.word)}
              className={`flex min-h-14 w-full items-center justify-between rounded-xl border px-4 py-3 text-left text-base font-semibold transition ${stateClass}`}
            >
              <span>{selected ? `${option.word} (${option.meaning})` : option.word}</span>
              {selected && optionIsCorrect && <Check className="h-4 w-4" />}
              {selected && isSelected && !optionIsCorrect && <X className="h-4 w-4" />}
            </button>
          );
        })}
      </div>

      {selected && (
        <div
          className={`flex items-center justify-center gap-4 rounded-xl px-4 py-3 text-sm font-semibold ${
            isCorrect
              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-200'
              : 'bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-200'
          }`}
        >
          <CharacterAsset
            name={isCorrect ? 'correctbadge' : 'tryagainbadge'}
            alt=""
            size={96}
            className="!h-16 !w-16 sm:!h-20 sm:!w-20"
            unoptimized
          />
          {isCorrect ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
          {isCorrect ? (
            <span>{t.correct}</span>
          ) : (
            <span className="flex flex-col gap-1">
              <span>{t.wrong}</span>
              <button
                type="button"
                onClick={() => setIsWordInfoOpen(true)}
                disabled={!currentWordDetail}
                className="w-fit rounded-md text-left font-bold text-emerald-600 underline-offset-4 transition hover:text-emerald-700 hover:underline disabled:cursor-default disabled:no-underline dark:text-emerald-400 dark:hover:text-emerald-300"
                title={currentWordDetail ? t.wordInfo : undefined}
              >
                {current.usedAs}
                {shouldShowDictionaryForm && ` (${t.dictionaryFormLabel}: ${current.targetWord})`}
              </button>
            </span>
          )}
        </div>
      )}

      {selected && !isCorrect && isWordInfoOpen && currentWordDetail && (
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

      <button
        onClick={goNext}
        disabled={!selected}
        className="ml-auto inline-flex items-center gap-2 rounded-lg bg-[#3f8d54] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#347946] disabled:opacity-40 dark:bg-emerald-600 dark:hover:bg-emerald-500"
      >
        {index + 1 >= items.length ? t.finish : t.next}
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}

function Empty({ bundleId, title, text, back }: { bundleId: string; title: string; text: string; back: string }) {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center gap-4 text-center">
      <p className="text-xs font-bold uppercase text-[#2f7d4a] dark:text-emerald-400">Word Fill</p>
      <h1 className="text-2xl font-bold text-zinc-950 dark:text-zinc-50">{title}</h1>
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

function uniqueOptions(options: OptionData[]) {
  const seen = new Set<string>();
  return options.filter((option) => {
    const normalized = normalizeOptionWord(option.word);
    if (!normalized || seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  });
}

function normalizeOptionWord(value: string) {
  return value.toLowerCase().trim();
}

function playSentenceAudio(audioUrl: string | null) {
  const src = getPublicUrl(audioUrl);
  if (!src) return;

  new Audio(src).play().catch((error) => {
    console.error('Failed to play word fill sentence audio:', error);
  });
}

function recordPracticeResult(
  bundleId: string,
  bundleItemId: string,
  mode: 'wordfill',
  isCorrect: boolean,
  wordId: number
) {
  void fetch('/api/bundle-progress', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      bundle_id: bundleId,
      bundle_item_id: bundleItemId,
      practice_mode: mode,
      is_correct: isCorrect,
      word_id: wordId,
    }),
  });
}

function recordCurrentWordFillItem(bundleId: string, bundleItemId: string) {
  void fetch('/api/bundle-progress', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      bundle_id: bundleId,
      current_bundle_item_id: bundleItemId,
      current_practice_mode: 'wordfill',
    }),
  });
}
