import type { PracticeMode } from '@/lib/practice/registry';

export interface ReviewResult {
  sessionId: string;
  attemptId: string;
  type: 'words' | 'sentences';
  targetId: string;
  mode: PracticeMode;
  correct: boolean;
  bundleId?: string;
  bundleItemId?: string;
  wordId?: number;
}

export function validReviewResult(value: unknown): value is ReviewResult {
  if (!value || typeof value !== 'object') return false;
  const v = value as ReviewResult;
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const positive = (n: unknown) => Number.isSafeInteger(n) && Number(n) > 0;
  if (!uuid.test(v.sessionId || '') || !uuid.test(v.attemptId || '') || typeof v.correct !== 'boolean'
    || typeof v.targetId !== 'string' || !/^[1-9][0-9]*$/.test(v.targetId) || !positive(Number(v.targetId))) return false;
  if (v.type === 'words') return ['word_quiz', 'word_flashcards', 'spelling'].includes(v.mode) && !v.bundleId && !v.bundleItemId && !v.wordId;
  return v.type === 'sentences' && ['quiz', 'scramble', 'wordfill'].includes(v.mode)
    && uuid.test(v.bundleId || '') && uuid.test(v.bundleItemId || '') && (v.mode === 'wordfill' ? positive(v.wordId) : !v.wordId);
}

export function nextReviewMetadata(metadata: any, mode: string, correct: boolean, now: string) {
  const old = metadata?.practice_modes?.[mode] || {};
  return { ...metadata, last_practice_mode: mode, last_practice_is_correct: correct,
    practice_modes: { ...metadata?.practice_modes, [mode]: {
      correct_count: Number(old.correct_count || 0) + Number(correct),
      incorrect_count: Number(old.incorrect_count || 0) + Number(!correct),
      last_is_correct: correct, last_practiced_at: now,
      first_correct_at: old.first_correct_at || (correct ? now : null), last_correct_at: correct ? now : old.last_correct_at || null,
    } } };
}

export function nextReviewProficiency(before: any, mode: string, correct: boolean, now: string) {
  const level = Number(before?.proficiency_level || 0);
  const streak = correct ? Number(before?.streak_count || 0) + 1 : 0;
  const calculated = streak >= 15 ? 5 : streak >= 10 ? 4 : streak >= 6 ? 3 : streak >= 3 ? 2 : streak >= 1 ? 1 : 0;
  return { correct_count: Number(before?.correct_count || 0) + Number(correct), incorrect_count: Number(before?.incorrect_count || 0) + Number(!correct),
    streak_count: streak, proficiency_level: correct ? Math.max(level, calculated) : level > 0 ? Math.max(1, level - 1) : 0,
    last_reviewed_at: now, updated_at: now, metadata: nextReviewMetadata(before?.metadata, mode, correct, now) };
}
