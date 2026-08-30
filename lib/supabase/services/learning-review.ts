'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { getReviewDueAt, isReviewDue } from '@/lib/learning/review-schedule';

export interface ReviewNeededSummary {
  sentences: number;
  words: number;
  total: number;
  limit: number;
  availableSentences: number;
  availableWords: number;
  availableTotal: number;
  lowestSentenceLevel: number | null;
  lowestWordLevel: number | null;
  nextReviewAt: string | null;
}

export interface ReviewSentenceItem {
  id: number;
  sentence: string;
  translation: string;
  translation_en: string | null;
  audio_url: string | null;
  bundle_id: string;
  bundle_item_id: string;
  proficiency_level: number;
  incorrect_count: number;
  streak_count: number;
}

export interface ReviewWordItem {
  id: number;
  word: string;
  lang_code: string;
  meaning_ko: string | null;
  meaning_en: string | null;
  pos: string[];
  audio_url: string | null;
  proficiency_level: number;
  incorrect_count: number;
  streak_count: number;
  distractors?: Array<{ distractor: string; meaning_ko: string | null; meaning_en: string | null }>;
}

const REVIEW_RECOMMENDATION_LIMIT = 20;
function normalizeSingleRelation<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) {
    return value[0] || null;
  }

  return value || null;
}

export async function getReviewNeededSummary(userId: string): Promise<ReviewNeededSummary> {
  const supabase = createAdminClient();

  const [
    { data: sentenceInteractions, error: sentenceCountError },
    { data: wordInteractions, error: wordCountError },
    sentenceItems,
    wordItems,
  ] = await Promise.all([
    supabase
      .from('user_sentence_interactions')
      .select('proficiency_level, last_reviewed_at, metadata')
      .eq('user_id', userId)
      .gt('proficiency_level', 0)
      .lt('proficiency_level', 5),
    supabase
      .from('user_word_interactions')
      .select('proficiency_level, last_reviewed_at, metadata')
      .eq('user_id', userId)
      .gt('proficiency_level', 0)
      .lt('proficiency_level', 5),
    getReviewSentences(userId, REVIEW_RECOMMENDATION_LIMIT),
    getReviewWords(userId, REVIEW_RECOMMENDATION_LIMIT),
  ]);

  if (sentenceCountError) {
    console.error('Error counting available sentences needing review:', sentenceCountError);
  }

  if (wordCountError) {
    console.error('Error counting available words needing review:', wordCountError);
  }

  const now = new Date();
  const dueSentenceInteractions = (sentenceInteractions || []).filter(interaction => isReviewDue(interaction, now));
  const dueWordInteractions = (wordInteractions || []).filter(interaction => isReviewDue(interaction, now));
  const availableSentences = dueSentenceInteractions.length;
  const availableWords = dueWordInteractions.length;
  const sentences = sentenceItems.length;
  const words = wordItems.length;
  const reviewableSentences = Math.max(availableSentences, sentences);
  const reviewableWords = Math.max(availableWords, words);
  const futureDueDates = [...(sentenceInteractions || []), ...(wordInteractions || [])]
    .map(interaction => getReviewDueAt(interaction))
    .filter((date): date is Date => Boolean(date && date.getTime() > now.getTime()))
    .sort((a, b) => a.getTime() - b.getTime());

  return {
    sentences,
    words,
    total: sentences + words,
    limit: REVIEW_RECOMMENDATION_LIMIT,
    availableSentences: reviewableSentences,
    availableWords: reviewableWords,
    availableTotal: reviewableSentences + reviewableWords,
    lowestSentenceLevel: minProficiencyLevel(dueSentenceInteractions),
    lowestWordLevel: minProficiencyLevel(dueWordInteractions),
    nextReviewAt: futureDueDates[0]?.toISOString() || null,
  };
}

function minProficiencyLevel(interactions: Array<{ proficiency_level: number | null }>) {
  if (!interactions.length) return null;
  return Math.min(...interactions.map(interaction => Number(interaction.proficiency_level || 0)));
}

export async function getReviewSentences(
  userId: string,
  limit: number = 20,
  scope: 'review' | 'unstarted' = 'review',
): Promise<ReviewSentenceItem[]> {
  const supabase = createAdminClient();
  if (limit <= 0) return [];
  const normalizedLimit = Math.max(1, limit);

  let interactionQuery = supabase
    .from('user_sentence_interactions')
    .select(`
      sentence_id,
      proficiency_level,
      incorrect_count,
      streak_count,
      last_reviewed_at,
      metadata,
      sentences (
        id,
        sentence,
        translation,
        translation_en,
        audio_url
      )
    `)
    .eq('user_id', userId);

  interactionQuery = scope === 'unstarted'
    ? interactionQuery.eq('proficiency_level', 0)
    : interactionQuery.gt('proficiency_level', 0).lt('proficiency_level', 5);

  const { data: interactions, error: interactionError } = await interactionQuery
    .order('proficiency_level', { ascending: true })
    .order('incorrect_count', { ascending: false })
    .order('last_reviewed_at', { ascending: true, nullsFirst: true });

  if (interactionError) {
    console.error('Error fetching review sentences interactions:', interactionError);
    return [];
  }

  const now = new Date();
  const primaryInteractions = (interactions || [])
    .filter(interaction => scope === 'unstarted' || isReviewDue(interaction, now))
    .slice(0, normalizedLimit);
  const sentenceIds = primaryInteractions.map((row) => row.sentence_id);
  let primaryItems: ReviewSentenceItem[] = [];

  if (sentenceIds.length > 0) {
    const { data: bundleItems, error: itemsError } = await supabase
      .from('bundle_items')
      .select('id, bundle_id, sentence_id')
      .in('sentence_id', sentenceIds);

    if (itemsError) {
      console.error('Error fetching bundle items for review sentences:', itemsError);
    } else {
      const itemMap = new Map<number, { id: string; bundle_id: string }>();
      for (const item of bundleItems || []) {
        itemMap.set(Number(item.sentence_id), {
          id: item.id,
          bundle_id: item.bundle_id,
        });
      }

      primaryItems = primaryInteractions.flatMap((row) => {
        const s = normalizeSingleRelation(row.sentences);
        if (!s) return [];

        const itemInfo = itemMap.get(Number(row.sentence_id));
        if (!itemInfo) return [];

        return [{
          id: Number(s.id),
          sentence: s.sentence,
          translation: s.translation,
          translation_en: s.translation_en || null,
          audio_url: s.audio_url || null,
          bundle_id: itemInfo.bundle_id,
          bundle_item_id: itemInfo.id,
          proficiency_level: row.proficiency_level,
          incorrect_count: row.incorrect_count,
          streak_count: row.streak_count,
        }];
      });
    }
  }

  return primaryItems.slice(0, normalizedLimit);
}

export async function getReviewWords(
  userId: string,
  limit: number = 20,
  scope: 'review' | 'unstarted' = 'review',
): Promise<ReviewWordItem[]> {
  const supabase = createAdminClient();
  if (limit <= 0) return [];
  const normalizedLimit = Math.max(1, limit);

  let interactionQuery = supabase
    .from('user_word_interactions')
    .select(`
      word_id,
      proficiency_level,
      incorrect_count,
      streak_count,
      last_reviewed_at,
      metadata,
      words (
        id,
        word,
        lang_code,
        meaning_ko,
        meaning_en,
        pos,
        audio_url,
        words_distractor (
          distractor,
          meaning_ko,
          meaning_en
        )
      )
    `)
    .eq('user_id', userId);

  interactionQuery = scope === 'unstarted'
    ? interactionQuery.eq('proficiency_level', 0)
    : interactionQuery.gt('proficiency_level', 0).lt('proficiency_level', 5);

  const { data: interactions, error: interactionError } = await interactionQuery
    .order('proficiency_level', { ascending: true })
    .order('incorrect_count', { ascending: false })
    .order('last_reviewed_at', { ascending: true, nullsFirst: true });

  if (interactionError) {
    console.error('Error fetching review words interactions:', interactionError);
    return [];
  }

  const { formatWordMeaning } = await import('@/lib/word-meaning');

  const now = new Date();
  const dueInteractions = (interactions || [])
    .filter(interaction => scope === 'unstarted' || isReviewDue(interaction, now))
    .slice(0, normalizedLimit);

  const primaryItems = dueInteractions.flatMap((row) => {
    const w = normalizeSingleRelation(row.words);
    if (!w) return [];

    const rawDistractors = Array.isArray(w.words_distractor) ? w.words_distractor : [];

    return [{
      id: Number(w.id),
      word: w.word,
      lang_code: w.lang_code,
      meaning_ko: formatWordMeaning(w.meaning_ko),
      meaning_en: formatWordMeaning(w.meaning_en),
      pos: w.pos || [],
      audio_url: w.audio_url || null,
      proficiency_level: row.proficiency_level,
      incorrect_count: row.incorrect_count,
      streak_count: row.streak_count,
      distractors: rawDistractors.map((d: any) => ({
        distractor: d.distractor,
        meaning_ko: d.meaning_ko,
        meaning_en: d.meaning_en,
      })),
    }];
  });

  return primaryItems.slice(0, normalizedLimit);
}
