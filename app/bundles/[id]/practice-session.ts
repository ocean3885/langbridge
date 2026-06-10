import type { UserBundleItemInteraction } from '@/lib/supabase/services/bundle-progress';

export type PracticeSessionMode = 'resume' | 'all' | 'incorrect' | 'correct' | 'incomplete';
export type PracticeMode = 'quiz' | 'scramble' | 'wordfill';

export const practiceSessionModes: PracticeSessionMode[] = ['resume', 'all', 'incorrect', 'correct', 'incomplete'];
export const PRACTICE_MODE_STARS = {
  quiz: 1,
  scramble: 2,
  wordfill: 1,
} satisfies Record<PracticeMode, number>;

export function isPracticeSessionMode(value: unknown): value is PracticeSessionMode {
  return typeof value === 'string' && practiceSessionModes.includes(value as PracticeSessionMode);
}

export interface PracticeItem {
  id: string;
}

type PracticeStatus = 'correct' | 'incorrect' | 'incomplete';

function getPracticeStatus(interaction: UserBundleItemInteraction | undefined, practiceMode: PracticeMode): PracticeStatus {
  const modeMetadata = getPracticeModeMetadata(interaction?.metadata?.practice_modes, practiceMode);

  if (modeMetadata) {
    const modeValue = modeMetadata.last_is_correct;
    if (typeof modeValue === 'boolean') return modeValue ? 'correct' : 'incorrect';

    const modeCorrectCount = Number(modeMetadata.correct_count || 0);
    const modeIncorrectCount = Number(modeMetadata.incorrect_count || 0);

    if (modeCorrectCount > 0 && modeIncorrectCount === 0) return 'correct';
    if (modeIncorrectCount > 0 && modeCorrectCount === 0) return 'incorrect';
    return 'incomplete';
  }

  const metadata = interaction?.metadata;
  const value = metadata?.last_practice_mode === practiceMode ? metadata.last_practice_is_correct : null;
  if (typeof value === 'boolean') return value ? 'correct' : 'incorrect';

  const correctCount = Number(interaction?.correct_count || 0);
  const incorrectCount = Number(interaction?.incorrect_count || 0);

  if (correctCount > 0 && incorrectCount === 0) return 'correct';
  if (incorrectCount > 0 && correctCount === 0) return 'incorrect';

  return 'incomplete';
}

export function filterPracticeItems<T extends PracticeItem>(
  items: T[],
  interactions: UserBundleItemInteraction[],
  mode: PracticeSessionMode,
  practiceMode: PracticeMode,
) {
  const interactionByItemId = new Map(interactions.map((interaction) => [interaction.bundle_item_id, interaction]));

  if (mode === 'incorrect') {
    return items.filter((item) => {
      const interaction = interactionByItemId.get(item.id);
      return getPracticeStatus(interaction, practiceMode) === 'incorrect';
    });
  }

  if (mode === 'correct') {
    return items.filter((item) => {
      const interaction = interactionByItemId.get(item.id);
      return getPracticeStatus(interaction, practiceMode) === 'correct';
    });
  }

  if (mode === 'incomplete') {
    return items.filter((item) => {
      const interaction = interactionByItemId.get(item.id);
      return getPracticeStatus(interaction, practiceMode) === 'incomplete';
    });
  }

  return items;
}

export function getPracticeSessionCounts<T extends PracticeItem>(
  items: T[],
  interactions: UserBundleItemInteraction[],
  practiceMode: PracticeMode,
) {
  return {
    resume: items.length,
    all: items.length,
    incorrect: filterPracticeItems(items, interactions, 'incorrect', practiceMode).length,
    correct: filterPracticeItems(items, interactions, 'correct', practiceMode).length,
    incomplete: filterPracticeItems(items, interactions, 'incomplete', practiceMode).length,
  } satisfies Record<PracticeSessionMode, number>;
}

export function getPracticeModeStarProgress<T extends PracticeItem>(
  items: T[],
  interactions: UserBundleItemInteraction[],
  practiceMode: PracticeMode,
) {
  const interactionByItemId = new Map(interactions.map((interaction) => [interaction.bundle_item_id, interaction]));
  const starsPerItem = PRACTICE_MODE_STARS[practiceMode];
  const earnedItems = items.filter((item) => {
    const interaction = interactionByItemId.get(item.id);
    return getPracticeStatus(interaction, practiceMode) === 'correct';
  }).length;

  return {
    earned: earnedItems * starsPerItem,
    max: items.length * starsPerItem,
  };
}

function getPracticeModeMetadata(value: unknown, practiceMode: PracticeMode) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const modeMetadata = (value as Record<string, unknown>)[practiceMode];
  return modeMetadata && typeof modeMetadata === 'object' && !Array.isArray(modeMetadata)
    ? modeMetadata as Record<string, unknown>
    : null;
}
