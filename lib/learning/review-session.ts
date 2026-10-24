import { formatWordMeaning } from '@/lib/word-meaning';
import { getReviewDueAt, type ReviewDueInteraction } from './review-schedule';
import { getWordFillMapCandidates, type PracticeLanguage } from '@/lib/practice/registry';
import type { ReviewSentenceItem } from '@/lib/supabase/services/learning-review';

export const REVIEW_DEFAULT_COUNT = 10;
export const REVIEW_MAX_COUNT = 40;
export const REVIEW_COUNTS = [5, 10, 20];
export type SentenceReviewMode = 'quiz' | 'scramble' | 'wordfill' | 'flashcards';
export type ReviewPriority = { dueAt: string | null; incorrect: boolean; level: number };

export function reviewPriority(row: ReviewDueInteraction): ReviewPriority {
  return { dueAt: row.last_reviewed_at ? getReviewDueAt(row)?.toISOString() || null : null,
    incorrect: row.metadata?.last_practice_is_correct === false, level: Number(row.proficiency_level || 0) };
}

// Scheduled items are served oldest first. First reviews are a distinct group,
// never interpreted as decades overdue because they have no previous date.
export function compareReviewPriority(a: ReviewPriority, b: ReviewPriority) {
  return Number(!a.dueAt) - Number(!b.dueAt)
    || (a.dueAt || '').localeCompare(b.dueAt || '')
    || Number(b.incorrect) - Number(a.incorrect) || a.level - b.level;
}

export function selectReviewItems<T>(items: T[], count: number | 'all', random = Math.random): T[] {
  const selected = items.slice(0, count === 'all' ? REVIEW_MAX_COUNT : Math.min(REVIEW_MAX_COUNT, Math.max(0, count)));
  for (let i = selected.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [selected[i], selected[j]] = [selected[j], selected[i]];
  }
  return selected;
}

export function reviewWordFillMaps(item: ReviewSentenceItem) {
  const maps = (item.word_maps || []).map(map => {
    const word = Array.isArray(map.words) ? map.words[0] || null : map.words;
    return { ...map, words: word ? { ...word, words_distractor: word.words_distractor?.map(d => ({
      distractor: d.distractor, meaning_ko: formatWordMeaning(d.meaning_ko) || '', meaning_en: formatWordMeaning(d.meaning_en) || '',
    })) } : null };
  });
  return getWordFillMapCandidates(item.sentence, maps).filter(map => Number.isSafeInteger(map.word_id) && map.word_id > 0);
}

export function sentenceReviewItems(items: ReviewSentenceItem[], mode: SentenceReviewMode, language: PracticeLanguage, optionPool?: ReviewSentenceItem[]) {
  if (mode === 'wordfill') return items.filter(item => reviewWordFillMaps(item).length > 0);
  if (mode === 'quiz') {
    const pool = optionPool && optionPool.length > 0 ? optionPool : items;
    const translation = (item: ReviewSentenceItem) => (language === 'en' ? item.translation_en : item.translation) || item.translation;
    return items.filter(item => pool.some(other => other.id !== item.id && translation(other) !== translation(item)));
  }
  return items;
}

export function defaultSentenceReviewMode(items: ReviewSentenceItem[], language: PracticeLanguage, optionPool?: ReviewSentenceItem[]): SentenceReviewMode {
  return sentenceReviewItems(items, 'quiz', language, optionPool).length === items.length && items.length > 0 ? 'quiz' : 'scramble';
}

export function parseReviewSettings(params: { mode?: string; count?: string; start?: string }, type: 'words' | 'sentences') {
  const modes = type === 'words' ? ['quiz', 'spelling', 'flashcard'] : ['quiz', 'scramble', 'wordfill', 'flashcards'];
  return { mode: modes.includes(params.mode || '') ? params.mode! : 'quiz',
    count: REVIEW_COUNTS.includes(Number(params.count)) ? Number(params.count) : REVIEW_DEFAULT_COUNT,
    autoStart: params.start === '1' };
}
