import { PRACTICE_REGISTRY, SENTENCE_STAR_MODES, getEligiblePracticeItems, type PracticeBundleItem, type PracticeLanguage, type PracticeMode } from './registry';

export interface PracticeInteraction {
  metadata: Record<string, unknown> | null;
}
export type PracticeStatus = 'correct' | 'incorrect' | 'incomplete';

export function getModeMetadata(metadata: Record<string, unknown> | null | undefined, mode: string): Record<string, unknown> | undefined {
  const modes = metadata?.practice_modes;
  if (!modes || typeof modes !== 'object' || Array.isArray(modes)) return undefined;
  const value = (modes as Record<string, unknown>)[mode];
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : undefined;
}
export function hasEarnedPracticeStar(metadata: Record<string, unknown> | null | undefined, mode: string) {
  const record = getModeMetadata(metadata, mode);
  return Boolean(record && (Number(record.correct_count || 0) > 0 || record.first_correct_at));
}
export function getPracticeStatus(interaction: PracticeInteraction | undefined, mode: string): PracticeStatus {
  const record = getModeMetadata(interaction?.metadata, mode);
  return record?.last_is_correct === true ? 'correct' : record?.last_is_correct === false ? 'incorrect' : 'incomplete';
}
export function calculateSentenceStars(metadata: Record<string, unknown> | null) {
  return SENTENCE_STAR_MODES.reduce((total, mode) => total + (hasEarnedPracticeStar(metadata, mode) ? PRACTICE_REGISTRY[mode].stars : 0), 0);
}
export function getBundleStarProgress(
  items: PracticeBundleItem[],
  interactions: (PracticeInteraction & { bundle_item_id: string })[],
  language: PracticeLanguage,
) {
  const byId = new Map(interactions.map(row => [row.bundle_item_id, row]));
  const modes = SENTENCE_STAR_MODES.map(mode => {
    const eligible = getEligiblePracticeItems(items, mode, language);
    const stars = PRACTICE_REGISTRY[mode].stars;
    return {
      mode, earned: eligible.reduce((sum, item) => sum + (hasEarnedPracticeStar(byId.get(item.id)?.metadata, mode) ? stars : 0), 0),
      max: eligible.length * stars,
    };
  });
  return { earned: modes.reduce((sum, mode) => sum + mode.earned, 0), max: modes.reduce((sum, mode) => sum + mode.max, 0), modes };
}

export function getPracticeInteractionId(interaction: PracticeInteraction & { bundle_item_id?: string; word_id?: number }, mode: PracticeMode) {
  return PRACTICE_REGISTRY[mode].target === 'word' ? String(interaction.word_id) : interaction.bundle_item_id;
}

export interface BundleWordProgress {
  total: number;
  completed: number;
  percent: number;
}

export function calculateBundleWordProgress(
  wordTargets: { word: { id: number | string } }[],
  userWordInteractions: { word_id: number | string; proficiency_level?: number | null; correct_count?: number | null }[],
): BundleWordProgress {
  const total = wordTargets.length;
  if (total === 0) {
    return { total: 0, completed: 0, percent: 0 };
  }

  const interactionByWordId = new Map(
    userWordInteractions.map((item) => [Number(item.word_id), item])
  );

  const completed = wordTargets.filter((target) => {
    const interaction = interactionByWordId.get(Number(target.word.id));
    return Boolean(
      interaction && (Number(interaction.proficiency_level || 0) > 0 || Number(interaction.correct_count || 0) > 0)
    );
  }).length;

  const percent = Math.min(100, Math.round((completed / total) * 100));

  return { total, completed, percent };
}
