'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { getReviewDueAt, isReviewDue } from '@/lib/learning/review-schedule';
import { formatWordMeaning } from '@/lib/word-meaning';

export type UserWordStatus = 'unstarted' | 'learning' | 'familiar' | 'almost-mastered' | 'mastered';

export interface UserWordRecord {
  wordId: number;
  word: string;
  langCode: string;
  meaningKo: string | null;
  meaningEn: string | null;
  pos: string[];
  gender: string | null;
  difficulty: number | null;
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
  lastPracticeMode: string | null;
  lastPracticeIsCorrect: boolean | null;
}

export interface UserWordsSummary {
  total: number;
  due: number;
  mastered: number;
  familiar: number;
  accuracy: number | null;
  correct: number;
  incorrect: number;
  levels: number[];
}

export async function getUserWords(userId: string): Promise<{ words: UserWordRecord[]; summary: UserWordsSummary }> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('user_word_interactions')
    .select(`
      word_id,
      is_pinned,
      memo,
      proficiency_level,
      correct_count,
      incorrect_count,
      streak_count,
      last_reviewed_at,
      metadata,
      created_at,
      words (
        id,
        word,
        lang_code,
        meaning_ko,
        meaning_en,
        pos,
        gender,
        difficulty,
        audio_url
      )
    `)
    .eq('user_id', userId)
    .order('last_reviewed_at', { ascending: false, nullsFirst: false });

  if (error) {
    console.error('Error fetching user words:', error);
    return { words: [], summary: emptySummary() };
  }

  const now = new Date();
  const records = (data || []).flatMap((row: any): UserWordRecord[] => {
    const word = Array.isArray(row.words) ? row.words[0] : row.words;
    if (!word?.word) return [];
    const metadata = row.metadata && typeof row.metadata === 'object' ? row.metadata : {};
    const dueAt = getReviewDueAt(row);

    return [{
      wordId: Number(row.word_id),
      word: word.word,
      langCode: word.lang_code,
      meaningKo: formatWordMeaning(word.meaning_ko),
      meaningEn: formatWordMeaning(word.meaning_en),
      pos: Array.isArray(word.pos) ? word.pos : [],
      gender: word.gender || null,
      difficulty: typeof word.difficulty === 'number' ? word.difficulty : null,
      audioUrl: word.audio_url || null,
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
      lastPracticeMode: typeof metadata.last_practice_mode === 'string' ? metadata.last_practice_mode : null,
      lastPracticeIsCorrect: typeof metadata.last_practice_is_correct === 'boolean' ? metadata.last_practice_is_correct : null,
    }];
  });

  const levels = Array.from({ length: 6 }, () => 0);
  let correct = 0;
  let incorrect = 0;
  for (const word of records) {
    levels[word.proficiencyLevel] = (levels[word.proficiencyLevel] || 0) + 1;
    correct += word.correctCount;
    incorrect += word.incorrectCount;
  }
  const attempts = correct + incorrect;

  return {
    words: records,
    summary: {
      total: records.length,
      due: records.filter(word => word.isReviewDue).length,
      mastered: levels[5] || 0,
      familiar: records.filter(word => word.proficiencyLevel >= 2).length,
      accuracy: attempts > 0 ? Math.round((correct / attempts) * 100) : null,
      correct,
      incorrect,
      levels,
    },
  };
}

function emptySummary(): UserWordsSummary {
  return { total: 0, due: 0, mastered: 0, familiar: 0, accuracy: null, correct: 0, incorrect: 0, levels: [0, 0, 0, 0, 0, 0] };
}
