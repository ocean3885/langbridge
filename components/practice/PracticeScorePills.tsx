import { Check, X } from 'lucide-react';

interface PracticeScorePillsProps {
  correct: number;
  incorrect: number;
}

export function PracticeScorePills({ correct, incorrect }: PracticeScorePillsProps) {
  return (
    <div className="flex items-center gap-1.5 text-xs font-black">
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-emerald-700 ring-1 ring-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-200 dark:ring-emerald-800/60">
        <Check className="h-3.5 w-3.5" />
        {correct}
      </span>
      <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-1 text-red-700 ring-1 ring-red-100 dark:bg-red-950/60 dark:text-red-200 dark:ring-red-800/60">
        <X className="h-3.5 w-3.5" />
        {incorrect}
      </span>
    </div>
  );
}
