export type PracticeSessionMode = 'resume' | 'all' | 'incorrect' | 'correct' | 'incomplete';
export { type PracticeMode } from '@/lib/practice/registry';
import { PRACTICE_REGISTRY, type PracticeMode } from '@/lib/practice/registry';
import { getPracticeStatus, hasEarnedPracticeStar, getPracticeInteractionId, type PracticeInteraction } from '@/lib/practice/progress';

type SessionInteraction = PracticeInteraction & { bundle_item_id?: string; word_id?: number };
export const practiceSessionModes: PracticeSessionMode[] = ['resume', 'all', 'incorrect', 'correct', 'incomplete'];

export function isPracticeSessionMode(value: unknown): value is PracticeSessionMode {
  return typeof value === 'string' && practiceSessionModes.includes(value as PracticeSessionMode);
}

export interface PracticeItem {
  id: string;
  progressId?: string;
}

export function filterPracticeItems<T extends PracticeItem>(
  items: T[],
  interactions: SessionInteraction[],
  mode: PracticeSessionMode,
  practiceMode: PracticeMode,
) {
  const interactionByItemId = new Map(interactions.map((interaction) => [getPracticeInteractionId(interaction, practiceMode), interaction]));

  if (mode === 'incorrect') {
    return items.filter((item) => {
      const interaction = interactionByItemId.get(getPracticeItemProgressId(item));
      return getPracticeStatus(interaction, practiceMode) === 'incorrect';
    });
  }

  if (mode === 'correct') {
    return items.filter((item) => {
      const interaction = interactionByItemId.get(getPracticeItemProgressId(item));
      return getPracticeStatus(interaction, practiceMode) === 'correct';
    });
  }

  if (mode === 'incomplete') {
    return items.filter((item) => {
      const interaction = interactionByItemId.get(getPracticeItemProgressId(item));
      return getPracticeStatus(interaction, practiceMode) === 'incomplete';
    });
  }

  return items;
}

export function getPracticeSessionCounts<T extends PracticeItem>(
  items: T[],
  interactions: SessionInteraction[],
  practiceMode: PracticeMode,
  currentPracticeItemId?: string | null,
) {
  const canResume = Boolean(currentPracticeItemId && items.some((item) => getPracticeItemProgressId(item) === currentPracticeItemId));

  return {
    resume: canResume ? items.length : 0,
    all: items.length,
    incorrect: filterPracticeItems(items, interactions, 'incorrect', practiceMode).length,
    correct: filterPracticeItems(items, interactions, 'correct', practiceMode).length,
    incomplete: filterPracticeItems(items, interactions, 'incomplete', practiceMode).length,
  } satisfies Record<PracticeSessionMode, number>;
}

export function getPracticeModeStarProgress<T extends PracticeItem>(
  items: T[],
  interactions: SessionInteraction[],
  practiceMode: PracticeMode,
) {
  const interactionByItemId = new Map(interactions.map((interaction) => [getPracticeInteractionId(interaction, practiceMode), interaction]));
  const starsPerItem = PRACTICE_REGISTRY[practiceMode].stars;
  const earnedItems = items.filter((item) => {
    const interaction = interactionByItemId.get(getPracticeItemProgressId(item));
    return hasEarnedPracticeStar(interaction?.metadata, practiceMode);
  }).length;

  return {
    earned: earnedItems * starsPerItem,
    max: items.length * starsPerItem,
  };
}

function getPracticeItemProgressId(item: PracticeItem) {
  return item.progressId || item.id;
}
