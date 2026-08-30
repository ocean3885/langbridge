'use server';

import { getReviewDueAt, isReviewDue } from '@/lib/learning/review-schedule';
import { createAdminClient } from '@/lib/supabase/admin';
import { formatWordMeaning } from '@/lib/word-meaning';

export interface UserSentenceRecord {
  sentenceId: number;
  sentence: string;
  translation: string | null;
  translationEn: string | null;
  audioUrl: string | null;
  proficiencyLevel: number;
  correctCount: number;
  incorrectCount: number;
  streakCount: number;
  isPinned: boolean;
  memo: string | null;
  lastReviewedAt: string | null;
  nextReviewAt: string | null;
  isReviewDue: boolean;
  createdAt: string;
  bundleTitles: Array<{ id: string; title: string; titleEn: string | null }>;
  words: Array<{ id: number; word: string; usedAs: string | null; meaningKo: string | null; meaningEn: string | null }>;
}

export interface UserSentencesSummary {
  total: number;
  due: number;
  mastered: number;
  accuracy: number | null;
  correct: number;
  incorrect: number;
  levels: number[];
}

export async function getUserSentences(userId: string): Promise<{ sentences: UserSentenceRecord[]; summary: UserSentencesSummary }> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('user_sentence_interactions')
    .select(`
      sentence_id,
      is_pinned,
      memo,
      proficiency_level,
      correct_count,
      incorrect_count,
      streak_count,
      last_reviewed_at,
      created_at,
      metadata,
      sentences (
        id,
        sentence,
        translation,
        translation_en,
        audio_url,
        bundle_items (
          bundle_id,
          bundle (id, title, title_en)
        ),
        word_sentence_map (
          used_as,
          words (id, word, meaning_ko, meaning_en)
        )
      )
    `)
    .eq('user_id', userId)
    .order('last_reviewed_at', { ascending: false, nullsFirst: false });

  if (error) {
    console.error('Error fetching user sentences:', error);
    return { sentences: [], summary: emptySummary() };
  }

  const now = new Date();
  const records = (data || []).flatMap((row: any): UserSentenceRecord[] => {
    const sentence = Array.isArray(row.sentences) ? row.sentences[0] : row.sentences;
    if (!sentence?.sentence) return [];
    const dueAt = getReviewDueAt(row);
    const bundles = new Map<string, { id: string; title: string; titleEn: string | null }>();
    for (const item of sentence.bundle_items || []) {
      const bundle = Array.isArray(item.bundle) ? item.bundle[0] : item.bundle;
      if (bundle?.id) bundles.set(bundle.id, { id: bundle.id, title: bundle.title, titleEn: bundle.title_en || null });
    }

    return [{
      sentenceId: Number(row.sentence_id),
      sentence: sentence.sentence,
      translation: sentence.translation || null,
      translationEn: sentence.translation_en || null,
      audioUrl: sentence.audio_url || null,
      proficiencyLevel: Number(row.proficiency_level || 0),
      correctCount: Number(row.correct_count || 0),
      incorrectCount: Number(row.incorrect_count || 0),
      streakCount: Number(row.streak_count || 0),
      isPinned: Boolean(row.is_pinned),
      memo: row.memo || null,
      lastReviewedAt: row.last_reviewed_at || null,
      nextReviewAt: dueAt && dueAt.getTime() > 0 ? dueAt.toISOString() : null,
      isReviewDue: Number(row.proficiency_level || 0) > 0 && Number(row.proficiency_level || 0) < 5 && isReviewDue(row, now),
      createdAt: row.created_at,
      bundleTitles: Array.from(bundles.values()),
      words: (sentence.word_sentence_map || []).flatMap((mapping: any) => {
        const word = Array.isArray(mapping.words) ? mapping.words[0] : mapping.words;
        if (!word?.word) return [];
        return [{ id: Number(word.id), word: word.word, usedAs: mapping.used_as || null, meaningKo: formatWordMeaning(word.meaning_ko), meaningEn: formatWordMeaning(word.meaning_en) }];
      }),
    }];
  });

  const levels = Array.from({ length: 6 }, () => 0);
  let correct = 0;
  let incorrect = 0;
  for (const sentence of records) {
    levels[sentence.proficiencyLevel] = (levels[sentence.proficiencyLevel] || 0) + 1;
    correct += sentence.correctCount;
    incorrect += sentence.incorrectCount;
  }
  const attempts = correct + incorrect;

  return {
    sentences: records,
    summary: { total: records.length, due: records.filter(item => item.isReviewDue).length, mastered: levels[5] || 0, accuracy: attempts ? Math.round(correct / attempts * 100) : null, correct, incorrect, levels },
  };
}

function emptySummary(): UserSentencesSummary {
  return { total: 0, due: 0, mastered: 0, accuracy: null, correct: 0, incorrect: 0, levels: [0, 0, 0, 0, 0, 0] };
}
