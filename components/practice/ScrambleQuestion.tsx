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

      <div className={`mt-8 min-h-24 rounded-2xl border-2 border-dashed p-4 transition ${answerStateClass}`}>
        <div className="flex flex-wrap gap-2">
          {answerSlots.map((slot) => {
            if (slot.type === 'empty') {
              return <span key={slot.key} className="h-9 min-w-12 rounded-lg border border-dashed border-zinc-200 dark:border-zinc-700" />;
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
        <div className="mt-6 flex min-h-20 flex-wrap justify-center gap-2 rounded-2xl bg-zinc-100 p-4 dark:bg-zinc-950/50">
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
      className={`rounded-lg px-3 py-2 text-sm font-black shadow-sm transition disabled:cursor-default ${
        selected
          ? 'bg-[#3f8d54] text-white dark:bg-emerald-600'
          : 'border border-zinc-200 bg-white text-zinc-900 hover:border-[#9ccfac] dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:border-emerald-700'
      }`}
    >
      {label}
    </motion.button>
  );
}

function Token({ label, muted = false }: { label: string; muted?: boolean }) {
  return (
    <span className={`rounded-lg border border-dashed px-3 py-2 text-sm font-black ${muted ? 'border-zinc-200 bg-zinc-50 text-zinc-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-500' : 'border-zinc-200 text-zinc-700 dark:border-zinc-700 dark:text-zinc-300'}`}>
      {label}
    </span>
  );
}
