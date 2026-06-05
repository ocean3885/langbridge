import Link from 'next/link';
import { ArrowLeft, CheckCircle2, CircleDashed, History, RotateCcw, Star, XCircle } from 'lucide-react';
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
    items: (count: number) => `${count}문장`,
    empty: '문장 없음',
    starsEarned: 'Stars earned',
    modes: {
      resume: { label: '이어하기', description: '마지막으로 풀던 문제부터' },
      all: { label: '처음부터 전체 학습', description: '전체 문장' },
      incorrect: { label: '틀린 문제 다시 풀기', description: '오답 기록이 있는 문장' },
      correct: { label: '맞은 문제 복습하기', description: '정답 기록이 있는 문장' },
      incomplete: { label: '미완료 문제만', description: '아직 완료하지 않은 문장' },
    },
  },
  en: {
    back: 'Back to detail',
    items: (count: number) => `${count} sentences`,
    empty: 'No sentences',
    starsEarned: 'Stars earned',
    modes: {
      resume: { label: 'Continue', description: 'Pick up where you left off' },
      all: { label: 'Start from beginning', description: 'All sentences' },
      incorrect: { label: 'Retry missed', description: 'Sentences with misses' },
      correct: { label: 'Review correct', description: 'Sentences answered correctly' },
      incomplete: { label: 'Incomplete only', description: 'Sentences not completed yet' },
    },
  },
};

const sessionOptions: Array<{ mode: PracticeSessionMode; icon: typeof History }> = [
  { mode: 'resume', icon: History },
  { mode: 'all', icon: RotateCcw },
  { mode: 'incorrect', icon: XCircle },
  { mode: 'correct', icon: CheckCircle2 },
  { mode: 'incomplete', icon: CircleDashed },
];

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

      <div className="grid gap-3">
        {sessionOptions.map(({ mode, icon: Icon }) => {
          const count = counts[mode];
          const modeCopy = t.modes[mode];
          const content = (
            <>
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#dff1e5] text-[#2f7d4a] dark:bg-emerald-950/80 dark:text-emerald-300">
                <Icon className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-base font-black leading-snug text-zinc-950 dark:text-zinc-50">{modeCopy.label}</span>
                <span className="mt-1 block text-sm font-semibold leading-snug text-zinc-500 dark:text-zinc-400">{modeCopy.description}</span>
              </span>
              <span className="shrink-0 rounded-full bg-zinc-100 px-3 py-1 text-xs font-black text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                {count > 0 ? t.items(count) : t.empty}
              </span>
            </>
          );

          if (count === 0) {
            return (
              <div key={mode} className="flex min-h-24 items-center gap-4 rounded-2xl border border-zinc-100 bg-white p-4 opacity-55 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-black/20">
                {content}
              </div>
            );
          }

          return (
            <Link
              key={mode}
              href={`${basePath}?mode=${mode}`}
              className="flex min-h-24 items-center gap-4 rounded-2xl border border-zinc-100 bg-white p-4 shadow-sm transition hover:border-[#9ccfac] hover:bg-[#f4fbf6] dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-black/20 dark:hover:border-emerald-700 dark:hover:bg-emerald-950/30"
            >
              {content}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
