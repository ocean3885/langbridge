'use client';

import { AnimatePresence, motion } from 'framer-motion';
import type { ReactNode } from 'react';

export type ScrambleToken = {
  id: string | number;
  text: string;
};

export type ScrambleAnswerSlot = {
  key: string;
  text?: string;
  type: 'selected' | 'hint' | 'empty';
  onRemove?: () => void;
};

interface ScrambleQuestionProps {
  eyebrow: string;
  promptLabel?: string;
  prompt: ReactNode;
  answerSlots: ScrambleAnswerSlot[];
  availableTokens: ScrambleToken[];
  onSelectToken: (token: ScrambleToken) => void;
  isAnswered: boolean;
  result?: 'correct' | 'wrong' | null;
  emptyAnswerText: string;
  chooseText: string;
  audioAction?: ReactNode;
  variant?: 'card' | 'embedded';
  className?: string;
}

export function ScrambleQuestion({
  eyebrow,
  promptLabel,
  prompt,
  answerSlots,
  availableTokens,
  onSelectToken,
  isAnswered,
  result = null,
  emptyAnswerText,
  chooseText,
  audioAction,
  variant = 'card',
  className = '',
}: ScrambleQuestionProps) {
  const answerStateClass = result === 'correct'
    ? 'border-emerald-400 bg-emerald-50 dark:border-emerald-500 dark:bg-emerald-950/60'
    : result === 'wrong'
      ? 'border-red-300 bg-red-50 dark:border-red-500 dark:bg-red-950/60'
      : 'border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900';

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

      {promptLabel && <p className="mt-6 text-xs font-bold text-zinc-400 dark:text-zinc-500">{promptLabel}</p>}
      <div className="mt-2">{prompt}</div>

      <div className={`mt-8 min-h-28 rounded-2xl border-2 border-dashed p-4 sm:p-5 transition ${answerStateClass}`}>
        <div className="flex flex-wrap items-center gap-2.5">
          {answerSlots.map((slot) => {
            if (slot.type === 'empty') {
              return <span key={slot.key} className="h-11 min-w-14 rounded-xl border border-dashed border-zinc-300/80 bg-zinc-50/50 dark:border-zinc-700 dark:bg-zinc-800/30" />;
            }

            if (slot.type === 'hint') {
              return <Token key={slot.key} label={slot.text || ''} muted />;
            }

            return (
              <TokenButton
                key={slot.key}
                label={slot.text || ''}
                onClick={slot.onRemove || (() => {})}
                selected
                disabled={isAnswered}
              />
            );
          })}
          {answerSlots.length === 0 && (
            <p className="w-full py-5 text-center text-sm font-semibold text-zinc-400 dark:text-zinc-500">{emptyAnswerText}</p>
          )}
        </div>
      </div>

      {!isAnswered && (
        <div className="mt-6 flex min-h-24 flex-wrap items-center justify-center gap-2.5 rounded-2xl bg-zinc-100/90 p-4 sm:p-5 dark:bg-zinc-950/60">
          <AnimatePresence>
            {availableTokens.map((token) => (
              <TokenButton key={token.id} label={token.text} onClick={() => onSelectToken(token)} />
            ))}
          </AnimatePresence>
          {availableTokens.length === 0 && (
            <p className="py-3 text-sm font-semibold text-zinc-400 dark:text-zinc-500">{chooseText}</p>
          )}
        </div>
      )}
    </Wrapper>
  );
}

function TokenButton({
  label,
  onClick,
  selected = false,
  disabled = false,
}: {
  label: string;
  onClick: () => void;
  selected?: boolean;
  disabled?: boolean;
}) {
  return (
    <motion.button
      type="button"
      initial={{ scale: 0.85 }}
      animate={{ scale: 1 }}
      exit={{ scale: 0.85, opacity: 0 }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
      onClick={onClick}
      disabled={disabled}
      className={`rounded-xl px-3.5 py-2.5 text-base font-bold leading-snug tracking-[0.01em] shadow-sm transition sm:px-4 sm:text-[17px] disabled:cursor-default ${
        selected
          ? 'bg-[#2f7d4a] text-white ring-1 ring-[#25663b]/20 hover:bg-[#286b3f] dark:bg-emerald-600 dark:hover:bg-emerald-500'
          : 'border border-zinc-200/90 bg-white text-zinc-900 hover:-translate-y-0.5 hover:border-[#7ab88d] hover:bg-[#f7fbf8] hover:shadow dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:hover:border-emerald-600 dark:hover:bg-zinc-700/90'
      }`}
    >
      {label}
    </motion.button>
  );
}

function Token({ label, muted = false }: { label: string; muted?: boolean }) {
  return (
    <span
      className={`inline-flex items-center rounded-xl border px-3.5 py-2.5 text-base font-bold leading-snug tracking-[0.01em] sm:px-4 sm:text-[17px] ${
        muted
          ? 'border-emerald-200 bg-emerald-50/80 text-emerald-950 dark:border-emerald-800/70 dark:bg-emerald-950/50 dark:text-emerald-100'
          : 'border-zinc-200 text-zinc-800 dark:border-zinc-700 dark:text-zinc-200'
      }`}
    >
      {label}
    </span>
  );
}
