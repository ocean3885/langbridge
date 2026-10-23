import type { BundleCompletion } from './bundle-completion';
import { getBundleListeningState } from './bundle-listening';
import { getTotalPlayCount } from './progress';
import { getEligiblePracticeItems, PRACTICE_MODES, PRACTICE_REGISTRY, type PracticeBundleItem, type PracticeLanguage } from './registry';

type HomeBundleAction = 'words' | 'continue-listening' | 'start-listening' | 'details';

type Item = PracticeBundleItem & { order_index?: number | null };
type Interaction = { bundle_item_id: string; play_count?: number | null; last_played_at?: string | null };
export function getHomeBundleLearning(bundleId: string, completion: BundleCompletion & { items: Item[]; interactions: Interaction[] }, currentItemId: string | null, language: PracticeLanguage = 'ko') {
  const sentences = completion.items.filter(item => item.sentences?.sentence)
    .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0) || a.id.localeCompare(b.id));
  const listening = getBundleListeningState(sentences, completion.interactions, currentItemId);
  const resumeId = listening.currentStep ? sentences[listening.currentStep - 1]?.id : null;
  const modes = PRACTICE_MODES.filter(mode => PRACTICE_REGISTRY[mode].target === 'word'
    ? completion.wordProgress.total > 0
    : getEligiblePracticeItems(completion.items, mode, language).length > 0)
    .map(mode => {
      const definition = PRACTICE_REGISTRY[mode];
      const stars = completion.stars.modes.find(entry => entry.mode === mode);
      return { mode, href: `/bundles/${bundleId}/${definition.path}`, completed: definition.target === 'word'
        ? completion.wordCompleted : stars ? stars.earned >= stars.max : completion.sentenceCompleted };
    }).sort((a, b) => Number(a.completed) - Number(b.completed) || Number(a.mode === 'flashcards') - Number(b.mode === 'flashcards'));
  const wordsRemain = completion.wordProgress.total > 0 && !completion.wordCompleted;
  const wordAction = wordsRemain && (completion.sentenceCompleted || completion.stars.max === 0);
  const action: HomeBundleAction = wordAction ? 'words' : sentences.length > 0 ? listening.hasListened ? 'continue-listening' : 'start-listening' : completion.wordProgress.total > 0 ? 'words' : 'details';
  const href = action === 'words' ? `/bundles/${bundleId}/spelling`
    : action === 'details' ? `/bundles/${bundleId}`
    : `/bundles/${bundleId}/learn${listening.hasListened && resumeId ? `?item=${resumeId}` : ''}`;
  return {
    sentenceCount: sentences.length, earnedStars: completion.stars.earned, maxStars: completion.stars.max,
    completedWords: completion.wordProgress.completed, totalWords: completion.wordProgress.total,
    knownWords: completion.knownWordsCount, sentenceCompleted: completion.sentenceCompleted,
    wordCompleted: completion.wordCompleted, isCompleted: completion.isCompleted,
    progressPercent: Math.round(completion.progressRatio * 100),
    totalPlays: getTotalPlayCount(completion.interactions), hasListened: listening.hasListened,
    currentStep: listening.currentStep, action, href, modes,
  };
}
export type HomeBundleLearning = ReturnType<typeof getHomeBundleLearning>;
