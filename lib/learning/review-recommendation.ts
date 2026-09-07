export type ReviewType = 'words' | 'sentences';

export interface ReviewRecommendationSummary {
  availableTotal: number;
  availableWords: number;
  availableSentences: number;
  lowestWordLevel: number | null;
  lowestSentenceLevel: number | null;
}

export function getReviewRecommendation(summary: ReviewRecommendationSummary): ReviewType | null {
  if (!summary.availableTotal) return null;
  if (summary.availableWords !== summary.availableSentences) {
    return summary.availableWords > summary.availableSentences ? 'words' : 'sentences';
  }

  const wordLevel = summary.lowestWordLevel ?? Number.POSITIVE_INFINITY;
  const sentenceLevel = summary.lowestSentenceLevel ?? Number.POSITIVE_INFINITY;
  return wordLevel < sentenceLevel ? 'words' : 'sentences';
}

export function getReviewHref(type: ReviewType, otherCount: number) {
  const base = `/learn/review/${type}`;
  const other = type === 'words' ? 'sentences' : 'words';
  return otherCount > 0 ? `${base}?nextTo=/learn/review/${other}` : base;
}
