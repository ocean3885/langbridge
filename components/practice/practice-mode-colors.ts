import type { PracticeMode } from '@/lib/practice/registry';

export const practiceModeColors = {
  quiz: 'bg-violet-50 text-violet-700 dark:bg-violet-950/70 dark:text-violet-300',
  scramble: 'bg-orange-50 text-orange-700 dark:bg-orange-950/70 dark:text-orange-300',
  wordfill: 'bg-teal-50 text-teal-700 dark:bg-teal-950/70 dark:text-teal-300',
  spelling: 'bg-rose-50 text-rose-700 dark:bg-rose-950/70 dark:text-rose-300',
  flashcards: 'bg-sky-50 text-sky-700 dark:bg-sky-950/70 dark:text-sky-300',
  word_quiz: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300',
  word_flashcards: 'bg-amber-50 text-amber-700 dark:bg-amber-950/70 dark:text-amber-300',
} satisfies Record<PracticeMode, string>;
