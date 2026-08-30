const REVIEW_INTERVAL_BY_LEVEL_DAYS: Record<number, number> = {
  1: 1,
  2: 7,
  3: 15,
  4: 30,
};
const INCORRECT_REVIEW_INTERVAL_DAYS = 1;

export type ReviewDueInteraction = {
  proficiency_level: number | null;
  last_reviewed_at?: string | null;
  metadata?: Record<string, unknown> | null;
};

export function getReviewIntervalDays(interaction: ReviewDueInteraction) {
  const metadata = interaction.metadata || {};
  if (metadata.last_practice_is_correct === false) return INCORRECT_REVIEW_INTERVAL_DAYS;
  return REVIEW_INTERVAL_BY_LEVEL_DAYS[Number(interaction.proficiency_level || 0)] ?? Number.POSITIVE_INFINITY;
}

export function getReviewDueAt(interaction: ReviewDueInteraction): Date | null {
  if (!interaction.last_reviewed_at) return new Date(0);
  const intervalDays = getReviewIntervalDays(interaction);
  if (!Number.isFinite(intervalDays)) return null;
  const reviewedAt = new Date(interaction.last_reviewed_at).getTime();
  if (!Number.isFinite(reviewedAt)) return new Date(0);
  return new Date(reviewedAt + intervalDays * 24 * 60 * 60 * 1000);
}

export function isReviewDue(interaction: ReviewDueInteraction, now = new Date()) {
  if (!interaction.last_reviewed_at) return true;
  const dueAt = getReviewDueAt(interaction);
  return dueAt ? dueAt.getTime() <= now.getTime() : false;
}
