'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Star } from 'lucide-react';
import { PracticeCountSelector, type PracticeCountValue } from '@/components/practice/PracticeCountSelector';
import { PracticeSessionScopeSelector } from '@/components/practice/PracticeSessionScopeSelector';
import type { PracticeSessionMode } from '../practice-session';

interface PracticeSessionSelectorProps {
  bundleId: string;
  title: string;
  modeName: string;
  basePath: string;
  language: 'ko' | 'en';
  counts: Record<PracticeSessionMode, number>;
  starProgress: {
    earned: number;
    max: number;
  };
}

const copy = {
  ko: {
    back: '상세로 돌아가기',
    scopeLabel: '풀 문제 선택',
    countLabel: '문제 수',
    start: '시작하기',
    items: (count: number) => `${count}문장`,
    allItems: (count: number) => `전체 ${count}`,
    empty: '문장 없음',
    starsEarned: 'Stars earned',
    modes: {
      all: '전체',
      incorrect: '틀린 항목',
      correct: '맞힌 항목',
      incomplete: '아직 안 푼 항목',
    },
  },
  en: {
    back: 'Back to detail',
    scopeLabel: 'Choose practice set',
    countLabel: 'Question count',
    start: 'Start',
    items: (count: number) => `${count} sentences`,
    allItems: (count: number) => `All ${count}`,
    empty: 'No sentences',
    starsEarned: 'Stars earned',
    modes: {
      all: 'All',
      incorrect: 'Missed',
      correct: 'Correct',
      incomplete: 'Incomplete',
    },
  },
};

export default function PracticeSessionSelector({
  bundleId,
  title,
  modeName,
  basePath,
  language,
  counts,
  starProgress,
}: PracticeSessionSelectorProps) {
  const t = copy[language];
  const scopeCounts = {
    all: counts.all,
    incorrect: counts.incorrect,
    correct: counts.correct,
    incomplete: counts.incomplete,
  };
  const initialScope = scopeCounts.incomplete > 0 ? 'incomplete' : 'all';
  const [selectedScope, setSelectedScope] = useState<Exclude<PracticeSessionMode, 'resume'>>(initialScope);
  const [selectedCount, setSelectedCount] = useState<PracticeCountValue>(() => getDefaultCount(counts[initialScope]));
  const availableCount = scopeCounts[selectedScope];
  const startHref = useMemo(() => {
    const params = new URLSearchParams({ mode: selectedScope });
    if (selectedCount !== 'all') params.set('count', String(selectedCount));
    return `${basePath}?${params.toString()}`;
  }, [basePath, selectedCount, selectedScope]);

  useEffect(() => {
    setSelectedCount((current) => {
      if (current === 'all') return current;
      return current > availableCount ? 'all' : current;
    });
  }, [availableCount]);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5 px-2 pb-10">
      <header className="flex items-center gap-3">
        <Link href={`/bundles/${bundleId}`} className="rounded-full p-2 text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase text-[#2f7d4a] dark:text-emerald-400">{modeName}</p>
          <h1 className="truncate text-lg font-black text-zinc-950 dark:text-zinc-50">{title}</h1>
        </div>
      </header>

      <div className="flex items-center justify-between rounded-xl border border-amber-100 bg-amber-50/70 px-3 py-2.5 text-amber-800 dark:border-amber-900/70 dark:bg-amber-950/30 dark:text-amber-200">
        <span className="inline-flex items-center gap-2 text-sm font-bold">
          <Star className="h-4 w-4 fill-current" />
          {t.starsEarned}
        </span>
        <span className="text-base font-extrabold tabular-nums">{starProgress.earned} / {starProgress.max}</span>
      </div>

      <div className="space-y-5 rounded-2xl border border-zinc-100 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-black/20">
        <PracticeSessionScopeSelector
          label={t.scopeLabel}
          selectedScope={selectedScope}
          onSelect={setSelectedScope}
          counts={scopeCounts}
          labels={t.modes}
          emptyLabel={t.empty}
          itemLabel={t.items}
        />
        <PracticeCountSelector
          label={t.countLabel}
          totalCount={availableCount}
          selectedCount={selectedCount}
          onSelect={setSelectedCount}
          allLabel={t.allItems}
        />
        <Link
          href={startHref}
          aria-disabled={availableCount === 0}
          className={`flex w-full items-center justify-center rounded-xl py-3 text-sm font-black text-white transition ${
            availableCount === 0
              ? 'pointer-events-none bg-zinc-300 dark:bg-zinc-800'
              : 'bg-[#3f8d54] hover:bg-[#347946] dark:bg-emerald-600 dark:hover:bg-emerald-500'
          }`}
        >
          {t.start}
        </Link>
      </div>
    </div>
  );
}

function getDefaultCount(count: number): PracticeCountValue {
  if (count >= 10) return 10;
  if (count >= 5) return 5;
  return 'all';
}
