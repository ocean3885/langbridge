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
}): Promise<number> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('word_sentence_map')
    .insert({
      word_id: input.wordId,
      sentence_id: input.sentenceId,
      used_as: input.usedAs ?? null
    })
    .select('id')
    .single();
    
  if (error) throw new Error(`매핑 생성 실패: ${error.message}`);
  return data.id;
}

export async function deleteMapping(id: number): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase.from('word_sentence_map').delete().eq('id', id);
  if (error) throw new Error(`매핑 삭제 실패: ${error.message}`);
}
