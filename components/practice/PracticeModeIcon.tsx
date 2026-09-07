import { BookOpenCheck, GalleryVerticalEnd, Layers, LetterText, ListChecks, Shuffle, TextCursorInput, type LucideIcon, type LucideProps } from 'lucide-react';
import type { PracticeMode } from '@/lib/practice/registry';

const icons = {
  quiz: ListChecks,
  scramble: Shuffle,
  wordfill: TextCursorInput,
  spelling: LetterText,
  flashcards: Layers,
  word_quiz: BookOpenCheck,
  word_flashcards: GalleryVerticalEnd,
} satisfies Record<PracticeMode, LucideIcon>;

export function PracticeModeIcon({ mode, ...props }: LucideProps & { mode: PracticeMode }) {
  const Icon = icons[mode];
  return <Icon {...props} />;
}
