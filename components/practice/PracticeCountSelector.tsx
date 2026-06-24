'use client';

export type PracticeCountValue = number | 'all';

interface PracticeCountSelectorProps {
  label: string;
  totalCount: number;
  selectedCount: PracticeCountValue;
  onSelect: (count: PracticeCountValue) => void;
  options?: number[];
  allLabel: (count: number) => string;
}

export function PracticeCountSelector({
  label,
  totalCount,
  selectedCount,
  onSelect,
  options = [5, 10, 20],
  allLabel,
}: PracticeCountSelectorProps) {
  const visibleOptions = options.filter((option) => option <= totalCount);

  return (
    <div className="space-y-2">
      <label className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">{label}</label>
      <div className="flex flex-wrap gap-2">
        {visibleOptions.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => onSelect(option)}
            className={`rounded-xl border px-4 py-2.5 text-sm font-bold transition ${
              selectedCount === option
                ? 'border-[#3f8d54] bg-[#f4fbf6] text-[#2f7d4a] dark:border-emerald-500 dark:bg-emerald-950/30 dark:text-emerald-300'
                : 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800'
            }`}
          >
            {option}
          </button>
        ))}
        {totalCount > 0 && (
          <button
            type="button"
            onClick={() => onSelect('all')}
            className={`rounded-xl border px-4 py-2.5 text-sm font-bold transition ${
              selectedCount === 'all'
                ? 'border-[#3f8d54] bg-[#f4fbf6] text-[#2f7d4a] dark:border-emerald-500 dark:bg-emerald-950/30 dark:text-emerald-300'
                : 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800'
            }`}
          >
            {allLabel(totalCount)}
          </button>
        )}
      </div>
    </div>
  );
}
