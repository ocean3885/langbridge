import { getCompletedBundleWordIds } from './bundle-word-progress';
import { calculateBundleWordProgress, getBundleStarProgress, type PracticeInteraction } from './progress';
import { getPracticeWordTargets, type PracticeBundleItem, type PracticeLanguage } from './registry';

export function calculateBundleCompletion(
  items: PracticeBundleItem[],
  interactions: (PracticeInteraction & { bundle_item_id: string })[],
  words: { word_id: number | string; correct_count?: number | null; proficiency_level?: number | null }[],
  selectedWordIds: number[] = [],
  language: PracticeLanguage = 'ko',
  bundleMetadata: unknown = null,
) {
  const stars = getBundleStarProgress(items, interactions, language);
  const targets = getPracticeWordTargets(items, 'spelling', language, selectedWordIds);
  const completedWordIds = getCompletedBundleWordIds(bundleMetadata);
  const wordProgress = calculateBundleWordProgress(targets, completedWordIds.map(word_id => ({ word_id, correct_count: 1 })));
  const knownWordsCount = calculateBundleWordProgress(targets, words).completed;
  const hasSentences = stars.max > 0;
  const hasWords = wordProgress.total > 0;
  const sentenceCompleted = hasSentences && stars.earned >= stars.max;
  const wordCompleted = hasWords && wordProgress.completed >= wordProgress.total;
  const isCompleted = (hasSentences || hasWords) && (!hasSentences || sentenceCompleted) && (!hasWords || wordCompleted);
  const tracks = Number(hasSentences) + Number(hasWords);
  const progressRatio = tracks ? ((hasSentences ? stars.earned / stars.max : 0) + (hasWords ? wordProgress.completed / wordProgress.total : 0)) / tracks : 0;
  return { stars, wordProgress, knownWordsCount, completedWordIds, sentenceCompleted, wordCompleted, isCompleted, progressRatio };
}
export type BundleCompletion = ReturnType<typeof calculateBundleCompletion>;
