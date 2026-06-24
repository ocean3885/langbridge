'use client';

import { Check, X } from 'lucide-react';
import type { ReactNode } from 'react';

interface MultipleChoiceQuestionProps {
  eyebrow: string;
  prompt?: string;
  question: ReactNode;
  questionMeta?: ReactNode;
  options: string[];
  selectedOption: string | null;
  correctOption: string;
  isAnswered: boolean;
  onSelect: (option: string) => void;
  audioAction?: ReactNode;
  variant?: 'card' | 'embedded';
  className?: string;
}

export function MultipleChoiceQuestion({
  eyebrow,
  prompt,
  question,
  questionMeta,
  options,
  selectedOption,
  correctOption,
  isAnswered,
  onSelect,
  audioAction,
  variant = 'card',
  className = '',
}: MultipleChoiceQuestionProps) {
  const Wrapper = variant === 'card' ? 'section' : 'div';
  const wrapperClassName = variant === 'card'
    ? `rounded-2xl border border-zinc-100 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-black/20 ${className}`
    : className;

  return (
    <Wrapper className={wrapperClassName}>
      <div className="flex items-center justify-between border-b border-zinc-100 pb-4 dark:border-zinc-800">
        <span className="text-xs font-black uppercase tracking-wide text-[#2f7d4a] dark:text-emerald-400">{eyebrow}</span>
        {audioAction}
      </div>

      {prompt && <p className="mt-5 text-sm font-bold text-[#2f7d4a] dark:text-emerald-400">{prompt}</p>}
      <div className="mt-3">
        {question}
        {questionMeta}
      </div>

      <div className="mt-8 space-y-3">
        {options.map((option) => {
          const isSelected = selectedOption === option;
          const optionIsCorrect = option === correctOption;
          const stateClass = isAnswered
            ? optionIsCorrect
              ? 'border-emerald-400 bg-emerald-50 text-emerald-800 dark:border-emerald-500 dark:bg-emerald-950/60 dark:text-emerald-200'
              : isSelected
                ? 'border-red-300 bg-red-50 text-red-700 dark:border-red-500 dark:bg-red-950/60 dark:text-red-200'
                : 'border-zinc-100 bg-zinc-50 text-zinc-400 dark:border-zinc-800 dark:bg-zinc-950/30 dark:text-zinc-500'
            : 'border-zinc-200 bg-white text-zinc-900 hover:border-[#9ccfac] hover:bg-[#f4fbf6] dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:border-emerald-700 dark:hover:bg-emerald-950/30';

          return (
            <button
              key={option}
              type="button"
              disabled={isAnswered}
              onClick={() => onSelect(option)}
              className={`flex min-h-14 w-full items-center justify-between rounded-xl border px-4 py-3 text-left text-sm font-bold transition sm:text-base ${stateClass}`}
            >
              <span>{option}</span>
              {isAnswered && optionIsCorrect && <Check className="h-4 w-4" />}
              {isAnswered && isSelected && !optionIsCorrect && <X className="h-4 w-4" />}
            </button>
          );
        })}
      </div>
    </Wrapper>
  );
}
