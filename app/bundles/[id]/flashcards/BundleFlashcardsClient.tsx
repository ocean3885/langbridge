'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ChevronLeft, ChevronRight, RotateCcw, Volume2 } from 'lucide-react';

interface FlashcardItem {
  id: string;
  sentence: string;
  translation: string;
  audioUrl?: string | null;
}

interface BundleFlashcardsClientProps {
  bundleId: string;
  title: string;
  items: FlashcardItem[];
  language: 'ko' | 'en';
  initialItemId?: string | null;
  isLoggedIn: boolean;
}

const copy = {
  ko: {
    back: '상세로 돌아가기',
    mode: 'Flashcards',
    empty: '플래시카드로 학습할 문장이 없습니다.',
    tap: '카드를 눌러 뒤집기',
    front: '문장',
    backSide: '뜻',
    reset: '다시 보기',
  },
  en: {
    back: 'Back to detail',
    mode: 'Flashcards',
    empty: 'No sentences for flashcards.',
    tap: 'Tap card to flip',
    front: 'Sentence',
    backSide: 'Meaning',
    reset: 'Reset',
  },
};

export default function BundleFlashcardsClient({ bundleId, title, items, language, initialItemId = null, isLoggedIn }: BundleFlashcardsClientProps) {
  const t = copy[language];
  const initialIndex = initialItemId ? Math.max(0, items.findIndex((item) => item.id === initialItemId)) : 0;
  const [index, setIndex] = useState(initialIndex);
  const [flipped, setFlipped] = useState(false);
  const current = items[index];
  const progress = useMemo(() => (items.length > 0 ? Math.round(((index + 1) / items.length) * 100) : 0), [index, items.length]);

  useEffect(() => {
    if (!isLoggedIn) return;
    if (!current) return;
    recordCurrentPracticeItem(bundleId, 'flashcards', current.id);
  }, [bundleId, current, isLoggedIn]);

  const goNext = () => {
    setFlipped(false);
    setIndex((value) => Math.min(items.length - 1, value + 1));
  };

  const goPrev = () => {
    setFlipped(false);
    setIndex((value) => Math.max(0, value - 1));
  };

  const playAudio = () => {
    if (!current?.audioUrl) return;
    new Audio(current.audioUrl).play().catch((error) => console.error('Audio play error:', error));
  };

  if (!current) {
    return <EmptyMode bundleId={bundleId} title={title} text={t.empty} back={t.back} />;
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-2xl flex-col gap-5 px-2 pb-10">
      <header className="flex items-center gap-3">
        <Link href={`/bundles/${bundleId}`} className="rounded-full p-2 text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase text-[#2f7d4a] dark:text-emerald-400">{t.mode}</p>
          <h1 className="truncate text-lg font-bold text-zinc-950 dark:text-zinc-50">{title}</h1>
        </div>
      </header>

      <div className="h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
        <div className="h-full rounded-full bg-[#3f8d54] transition-all dark:bg-emerald-500" style={{ width: `${progress}%` }} />
      </div>

      <button
        onClick={() => setFlipped((value) => !value)}
        className="flex min-h-[320px] flex-col items-center justify-center rounded-2xl border border-zinc-100 bg-white p-8 text-center shadow-sm transition hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-black/20 dark:hover:border-zinc-700 dark:hover:shadow-black/30"
      >
        <p className="mb-3 text-xs font-bold uppercase text-zinc-400 dark:text-zinc-500">{index + 1} / {items.length}</p>
        <span className="mb-5 rounded-full bg-[#dff1e5] px-3 py-1 text-xs font-bold text-[#2f7d4a] dark:bg-emerald-950/80 dark:text-emerald-300">
          {flipped ? t.backSide : t.front}
        </span>
        <p className="text-2xl font-bold leading-relaxed text-zinc-950 dark:text-zinc-50">{flipped ? current.translation : current.sentence}</p>
        <span className="mt-8 text-xs font-bold text-zinc-400 dark:text-zinc-500">{t.tap}</span>
      </button>

      <div className="flex items-center justify-between gap-2">
        <button onClick={goPrev} disabled={index === 0} className="rounded-lg px-4 py-3 text-sm font-bold text-zinc-600 transition hover:bg-zinc-100 disabled:opacity-40 dark:text-zinc-300 dark:hover:bg-zinc-800">
          <ChevronLeft className="inline h-4 w-4" /> Prev
        </button>
        <button onClick={playAudio} disabled={!current.audioUrl} className="rounded-full bg-zinc-950 p-4 text-white shadow-sm transition hover:bg-zinc-800 disabled:opacity-40 dark:bg-emerald-600 dark:hover:bg-emerald-500">
          <Volume2 className="h-5 w-5" />
        </button>
        <button onClick={goNext} disabled={index === items.length - 1} className="rounded-lg px-4 py-3 text-sm font-bold text-zinc-600 transition hover:bg-zinc-100 disabled:opacity-40 dark:text-zinc-300 dark:hover:bg-zinc-800">
          Next <ChevronRight className="inline h-4 w-4" />
        </button>
      </div>

      <button onClick={() => { setIndex(0); setFlipped(false); }} className="mx-auto inline-flex items-center gap-2 text-sm font-bold text-zinc-500 transition hover:text-[#2f7d4a] dark:text-zinc-400 dark:hover:text-emerald-400">
        <RotateCcw className="h-4 w-4" />
        {t.reset}
      </button>
    </div>
  );
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

function EmptyMode({ bundleId, title, text, back }: { bundleId: string; title: string; text: string; back: string }) {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center gap-4 text-center">
      <p className="text-xs font-bold uppercase text-[#2f7d4a] dark:text-emerald-400">Flashcards</p>
      <h1 className="text-2xl font-bold text-zinc-950 dark:text-zinc-50">{title}</h1>
      <p className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">{text}</p>
      <Link href={`/bundles/${bundleId}`} className="text-sm font-bold text-[#2f7d4a] dark:text-emerald-400">
        {back}
      </Link>
    </div>
  );
}
