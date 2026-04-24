import { createAdminClient } from '@/lib/supabase/admin';

export type SupabaseWordSentenceMap = {
  id: number;
  word_id: number;
  sentence_id: number;
  used_as: string | null;
  pos_key: string | null;
  grammar_info: Record<string, any>;
  created_at: string;
};

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
  posKey?: string | null;
  grammarInfo?: Record<string, any>;
}): Promise<number> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('word_sentence_map')
    .insert({
      word_id: input.wordId,
      sentence_id: input.sentenceId,
      used_as: input.usedAs ?? null,
      pos_key: input.posKey ?? null,
      grammar_info: input.grammarInfo ?? {}
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
