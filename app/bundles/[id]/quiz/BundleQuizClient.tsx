'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Check, ChevronRight, X } from 'lucide-react';

interface QuizItem {
  id: string;
  sentence: string;
  translation: string;
}

interface BundleQuizClientProps {
  bundleId: string;
  title: string;
  items: QuizItem[];
  language: 'ko' | 'en';
  initialItemId?: string | null;
}

const copy = {
  ko: {
    back: '상세로 돌아가기',
    mode: 'Quick Quiz',
    prompt: '문장의 뜻을 고르세요',
    empty: '퀴즈로 학습할 문장이 없습니다.',
    correct: '정답입니다.',
    wrong: '다시 확인해보세요.',
    next: '다음 문제',
    finish: '완료',
    done: '퀴즈 완료',
    score: (score: number, total: number) => `${score} / ${total} 정답`,
    retry: '다시 풀기',
  },
  en: {
    back: 'Back to detail',
    mode: 'Quick Quiz',
    prompt: 'Choose the meaning of the sentence',
    empty: 'No sentences for quiz.',
    correct: 'Correct.',
    wrong: 'Try again.',
    next: 'Next',
    finish: 'Finish',
    done: 'Quiz complete',
    score: (score: number, total: number) => `${score} / ${total} correct`,
    retry: 'Retry',
  },
};

export default function BundleQuizClient({ bundleId, title, items, language, initialItemId = null }: BundleQuizClientProps) {
  const t = copy[language];
  const initialIndex = initialItemId ? Math.max(0, items.findIndex((item) => item.id === initialItemId)) : 0;
  const [index, setIndex] = useState(initialIndex);
  const [selected, setSelected] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const current = items[index];

  const options = useMemo(() => {
    if (!current) return [];
    const distractors = items
      .filter((item) => item.id !== current.id && item.translation)
      .slice(0, 3)
      .map((item) => item.translation);
    return shuffle([current.translation, ...distractors]).slice(0, 4);
  }, [current, items]);

  const progress = items.length > 0 ? Math.round(((index + 1) / items.length) * 100) : 0;
  const isCorrect = selected === current?.translation;

  useEffect(() => {
    if (!current) return;
    recordCurrentQuizItem(bundleId, current.id);
  }, [bundleId, current]);

  const choose = (option: string) => {
    if (selected) return;
    setSelected(option);
    const answerIsCorrect = option === current.translation;
    if (answerIsCorrect) {
      setScore((value) => value + 1);
    }
    recordPracticeResult(bundleId, current.id, 'quiz', answerIsCorrect);
  };

  const goNext = () => {
    if (index + 1 >= items.length) {
      setFinished(true);
      return;
    }
    setIndex((value) => value + 1);
    setSelected(null);
  };

  const retry = () => {
    setIndex(0);
    setSelected(null);
    setScore(0);
    setFinished(false);
  };

  if (!current) {
    return <Empty bundleId={bundleId} title={title} text={t.empty} back={t.back} />;
  }

  if (finished) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center gap-5 text-center">
        <p className="text-xs font-bold uppercase text-[#2f7d4a]">{t.mode}</p>
        <h1 className="text-3xl font-black text-zinc-950">{t.done}</h1>
        <p className="text-lg font-black text-zinc-700">{t.score(score, items.length)}</p>
        <div className="flex gap-2">
          <Link href={`/bundles/${bundleId}`} className="rounded-lg border border-zinc-200 px-4 py-3 text-sm font-bold text-zinc-700">
            {t.back}
          </Link>
          <button onClick={retry} className="rounded-lg bg-[#3f8d54] px-4 py-3 text-sm font-black text-white">
            {t.retry}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5 px-2 pb-10">
      <header className="flex items-center gap-3">
        <Link href={`/bundles/${bundleId}`} className="rounded-full p-2 text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase text-[#2f7d4a]">{t.mode}</p>
          <h1 className="truncate text-lg font-black text-zinc-950">{title}</h1>
        </div>
      </header>

      <div className="h-2 overflow-hidden rounded-full bg-zinc-200">
        <div className="h-full rounded-full bg-[#3f8d54] transition-all" style={{ width: `${progress}%` }} />
      </div>

      <section className="rounded-2xl border border-zinc-100 bg-white p-6 shadow-sm">
        <p className="text-xs font-black uppercase text-zinc-400">{index + 1} / {items.length}</p>
        <p className="mt-4 text-sm font-bold text-[#2f7d4a]">{t.prompt}</p>
        <h2 className="mt-3 text-2xl font-black leading-relaxed text-zinc-950">{current.sentence}</h2>
      </section>

      <div className="space-y-2">
        {options.map((option) => {
          const isSelected = selected === option;
          const optionIsCorrect = option === current.translation;
          const stateClass = selected
            ? optionIsCorrect
              ? 'border-emerald-400 bg-emerald-50 text-emerald-800'
              : isSelected
                ? 'border-red-300 bg-red-50 text-red-700'
                : 'border-zinc-100 bg-white text-zinc-500'
            : 'border-zinc-100 bg-white text-zinc-900 hover:border-[#9ccfac] hover:bg-[#f4fbf6]';

          return (
            <button
              key={option}
              onClick={() => choose(option)}
              className={`flex min-h-14 w-full items-center justify-between rounded-xl border px-4 py-3 text-left text-sm font-bold transition ${stateClass}`}
            >
              <span>{option}</span>
              {selected && optionIsCorrect && <Check className="h-4 w-4" />}
              {selected && isSelected && !optionIsCorrect && <X className="h-4 w-4" />}
            </button>
          );
        })}
      </div>

      {selected && (
        <div className={`rounded-xl p-3 text-center text-sm font-black ${isCorrect ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
          {isCorrect ? t.correct : t.wrong}
        </div>
      )}

      <button
        onClick={goNext}
        disabled={!selected}
        className="ml-auto inline-flex items-center gap-2 rounded-lg bg-[#3f8d54] px-5 py-3 text-sm font-black text-white transition hover:bg-[#347946] disabled:opacity-40"
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
      <p className="text-xs font-bold uppercase text-[#2f7d4a]">Quick Quiz</p>
      <h1 className="text-2xl font-black text-zinc-950">{title}</h1>
      <p className="text-sm font-semibold text-zinc-500">{text}</p>
      <Link href={`/bundles/${bundleId}`} className="text-sm font-bold text-[#2f7d4a]">
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

function recordCurrentQuizItem(bundleId: string, bundleItemId: string) {
  void fetch('/api/bundle-progress', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      bundle_id: bundleId,
      current_bundle_item_id: bundleItemId,
      current_practice_mode: 'quiz',
    }),
  });
}
