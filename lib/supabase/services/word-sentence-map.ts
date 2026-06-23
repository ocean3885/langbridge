import { createAdminClient } from '@/lib/supabase/admin';
import { formatWordMeaning } from '@/lib/word-meaning';

export type SupabaseWordSentenceMap = {
  id: number;
  word_id: number;
  sentence_id: number;
  used_as: string | null;
  created_at: string;
};

export type SentenceMappedWord = {
  sentence_id: number;
  word_id: number;
  used_as: string | null;
  word: string;
  meaning_ko: string | null;
  meaning_en: string | null;
};

export type WordUsageSentence = {
  sentence_id: number;
  used_as: string | null;
  sentence: string;
  translation: string | null;
  translation_en: string | null;
};

export type WordUsageDetail = {
  word_id: number;
  word: string;
  meaning_ko: string | null;
  meaning_en: string | null;
  pos: string[];
  gender: string | null;
  difficulty: number | null;
  sentences: WordUsageSentence[];
};

export async function listWordsForSentences(sentenceIds: number[]): Promise<SentenceMappedWord[]> {
  if (sentenceIds.length === 0) return [];

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('word_sentence_map')
    .select(`
      sentence_id,
      word_id,
      used_as,
      words:words(word, meaning_ko, meaning_en)
    `)
    .in('sentence_id', sentenceIds)
    .order('id', { ascending: true });

  if (error) {
    console.error('Error listing words for sentences:', error);
    return [];
  }

  return (data || []).flatMap((mapping) => {
    const word = Array.isArray(mapping.words) ? mapping.words[0] : mapping.words;
    if (!word?.word) return [];

    return [{
      sentence_id: mapping.sentence_id,
      word_id: mapping.word_id,
      used_as: mapping.used_as,
      word: word.word,
      meaning_ko: formatWordMeaning(word.meaning_ko),
      meaning_en: formatWordMeaning(word.meaning_en),
    }];
  });
}

export async function listWordUsageDetails(wordIds: number[]): Promise<WordUsageDetail[]> {
  const uniqueWordIds = Array.from(new Set(wordIds));
  if (uniqueWordIds.length === 0) return [];

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('words')
    .select(`
      id,
      word,
      meaning_ko,
      meaning_en,
      pos,
      gender,
      difficulty,
      word_sentence_map (
        sentence_id,
        used_as,
        sentences (
          id,
          sentence,
          translation,
          translation_en
        )
      )
    `)
    .in('id', uniqueWordIds)
    .order('word', { ascending: true });

  if (error) {
    console.error('Error listing word usage details:', error);
    return [];
  }

  return (data || []).map((word) => ({
    word_id: word.id,
    word: word.word,
    meaning_ko: formatWordMeaning(word.meaning_ko),
    meaning_en: formatWordMeaning(word.meaning_en),
    pos: Array.isArray(word.pos) ? word.pos : [],
    gender: word.gender ?? null,
    difficulty: typeof word.difficulty === 'number' ? word.difficulty : null,
    sentences: (word.word_sentence_map || []).flatMap((mapping: any) => {
      const sentence = Array.isArray(mapping.sentences) ? mapping.sentences[0] : mapping.sentences;
      if (!sentence?.sentence) return [];

      return [{
        sentence_id: mapping.sentence_id,
        used_as: mapping.used_as,
        sentence: sentence.sentence,
        translation: sentence.translation ?? null,
        translation_en: sentence.translation_en ?? null,
      }];
    }),
  }));
}

export async function listMappingsForSentence(sentenceId: number): Promise<SupabaseWordSentenceMap[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('word_sentence_map')
    .select('*')
    .eq('sentence_id', sentenceId);
    
  if (error || !data) return [];
  return data as SupabaseWordSentenceMap[];
}

export async function listMappingsForWord(wordId: number): Promise<SupabaseWordSentenceMap[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('word_sentence_map')
    .select('*')
    .eq('word_id', wordId);
    
  if (error || !data) return [];
  return data as SupabaseWordSentenceMap[];
}

export async function insertMapping(input: {
  wordId: number;
  sentenceId: number;
  usedAs?: string | null;
}): Promise<{ id: number; created: boolean }> {
  const supabase = createAdminClient();

  const { data: existingMappings, error: lookupError } = await supabase
    .from('word_sentence_map')
    .select('id')
    .eq('word_id', input.wordId)
    .eq('sentence_id', input.sentenceId)
    .limit(1);

  if (lookupError) throw new Error(`매핑 조회 실패: ${lookupError.message}`);
  if (existingMappings?.[0]) {
    return { id: existingMappings[0].id, created: false };
  }

  const { data, error } = await supabase
    .from('word_sentence_map')
    .insert({
      word_id: input.wordId,
      sentence_id: input.sentenceId,
      used_as: input.usedAs ?? null
    })
    .select('id')
    .single();

  if (error?.code === '23505') {
    const { data: concurrentMappings, error: concurrentLookupError } = await supabase
      .from('word_sentence_map')
      .select('id')
      .eq('word_id', input.wordId)
      .eq('sentence_id', input.sentenceId)
      .limit(1);

    if (concurrentLookupError || !concurrentMappings?.[0]) {
      throw new Error(`매핑 생성 실패: ${error.message}`);
    }

    return { id: concurrentMappings[0].id, created: false };
  }

  if (error) throw new Error(`매핑 생성 실패: ${error.message}`);
  return { id: data.id, created: true };
}

export async function deleteMapping(id: number): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase.from('word_sentence_map').delete().eq('id', id);
  if (error) throw new Error(`매핑 삭제 실패: ${error.message}`);
}
