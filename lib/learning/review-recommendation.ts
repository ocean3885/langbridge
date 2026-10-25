import { compareReviewPriority, REVIEW_DEFAULT_COUNT, type ReviewPriority } from './review-session';
export type ReviewType = 'words' | 'sentences';

export interface ReviewRecommendationSummary {
  availableTotal: number;
  availableWords: number;
  availableSentences: number;
  firstWord?: ReviewPriority | null;
  firstSentence?: ReviewPriority | null;
  lowestWordLevel: number | null;
  lowestSentenceLevel: number | null;
}

export function getReviewRecommendation(summary: ReviewRecommendationSummary): ReviewType | null {
  if (!summary.availableTotal) return null;
  if (!summary.availableWords) return 'sentences';
  if (!summary.availableSentences) return 'words';
  if (summary.firstWord && summary.firstSentence) {
    const priority = compareReviewPriority(summary.firstWord, summary.firstSentence);
    if (priority) return priority < 0 ? 'words' : 'sentences';
  }
  if (summary.availableWords !== summary.availableSentences) {
    return summary.availableWords > summary.availableSentences ? 'words' : 'sentences';
  }

  const wordLevel = summary.lowestWordLevel ?? Number.POSITIVE_INFINITY;
  const sentenceLevel = summary.lowestSentenceLevel ?? Number.POSITIVE_INFINITY;
  return wordLevel < sentenceLevel ? 'words' : 'sentences';
}

export function getReviewHref(type: ReviewType, otherCount: number, returnTo?: string) {
  const base = `/learn/review/${type}`;
  const other = type === 'words' ? 'sentences' : 'words';
  const href = otherCount > 0 ? `${base}?nextTo=/learn/review/${other}` : base;
  return returnTo ? `${href}${href.includes('?') ? '&' : '?'}returnTo=${encodeURIComponent(returnTo)}` : href;
}

export function getReviewPlan(summary: ReviewRecommendationSummary) {
  const type = getReviewRecommendation(summary);
  if (!type) return null;
  const first = type === 'words' ? summary.firstWord : summary.firstSentence;
  return { type, count: Math.min(REVIEW_DEFAULT_COUNT, type === 'words' ? summary.availableWords : summary.availableSentences),
    reason: !first?.dueAt ? 'first' as const : first.incorrect ? 'incorrect' as const : 'scheduled' as const };
}
