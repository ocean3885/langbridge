'use client';

import { CheckCircle2, CircleDashed, RotateCcw, XCircle } from 'lucide-react';

export type PracticeSessionScope = 'all' | 'incorrect' | 'correct' | 'incomplete';

interface PracticeSessionScopeSelectorProps {
  label: string;
  selectedScope: PracticeSessionScope;
  onSelect: (scope: PracticeSessionScope) => void;
  counts: Record<PracticeSessionScope, number>;
  labels: Record<PracticeSessionScope, string>;
  emptyLabel: string;
  itemLabel: (count: number) => string;
}

const scopeOptions: Array<{ scope: PracticeSessionScope; icon: typeof RotateCcw }> = [
  { scope: 'incomplete', icon: CircleDashed },
  { scope: 'incorrect', icon: XCircle },
  { scope: 'all', icon: RotateCcw },
  { scope: 'correct', icon: CheckCircle2 },
];

export function PracticeSessionScopeSelector({
  label,
  selectedScope,
  onSelect,
  counts,
  labels,
  emptyLabel,
  itemLabel,
}: PracticeSessionScopeSelectorProps) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">{label}</label>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {scopeOptions.map(({ scope, icon: Icon }) => {
          const count = counts[scope];
          const active = selectedScope === scope;

          return (
            <button
              key={scope}
              type="button"
              disabled={count === 0}
              onClick={() => onSelect(scope)}
              className={`flex items-center gap-3 rounded-xl border px-3 py-3 text-left transition disabled:cursor-not-allowed disabled:opacity-45 ${
                active
                  ? 'border-[#3f8d54] bg-[#f4fbf6] text-[#2f7d4a] dark:border-emerald-500 dark:bg-emerald-950/30 dark:text-emerald-300'
                  : 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800'
              }`}
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-300">
                <Icon className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-black leading-tight">{labels[scope]}</span>
                <span className="mt-1 block text-xs font-semibold text-zinc-400 dark:text-zinc-500">
                  {count > 0 ? itemLabel(count) : emptyLabel}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
