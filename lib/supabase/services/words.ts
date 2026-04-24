import { createAdminClient } from '@/lib/supabase/admin';

export type SupabaseWord = {
  id: number;
  word: string;
  lang_code: string;
  pos: string[];
  meaning: Record<string, string[]>;
  gender: string | null;
  declensions: Record<string, string>;
  conjugations: Record<string, any>;
  audio_url: string | null;
  created_at: string;
  updated_at: string;
};

export async function listWords(langCode?: string): Promise<SupabaseWord[]> {
  const supabase = createAdminClient();
  let query = supabase.from('words').select('*');
  
  if (langCode) {
    query = query.eq('lang_code', langCode);
  }
  
  const { data, error } = await query.order('word', { ascending: true });
  
  if (error || !data) return [];
  return data as SupabaseWord[];
}

export async function getWordById(id: number): Promise<SupabaseWord | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('words')
    .select('*')
    .eq('id', id)
    .maybeSingle();
    
  if (error || !data) return null;
  return data as SupabaseWord;
}

export async function insertWord(input: {
  word: string;
  langCode: string;
  pos?: string[];
  meaning: Record<string, string[]>;
  gender?: string | null;
  declensions?: Record<string, string>;
  conjugations?: Record<string, any>;
  audioUrl?: string | null;
}): Promise<number> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('words')
    .insert({
      word: input.word,
      lang_code: input.langCode,
      pos: input.pos ?? [],
      meaning: input.meaning,
      gender: input.gender ?? null,
      declensions: input.declensions ?? {},
      conjugations: input.conjugations ?? {},
      audio_url: input.audioUrl ?? null
    })
    .select('id')
    .single();
    
  if (error) throw new Error(`단어 생성 실패: ${error.message}`);
  return data.id;
}

export async function updateWord(id: number, input: {
  word?: string;
  langCode?: string;
  pos?: string[];
  meaning?: Record<string, string[]>;
  gender?: string | null;
  declensions?: Record<string, string>;
  conjugations?: Record<string, any>;
  audioUrl?: string | null;
}): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from('words')
    .update({
      ...(input.word && { word: input.word }),
      ...(input.langCode && { lang_code: input.langCode }),
      ...(input.pos && { pos: input.pos }),
      ...(input.meaning && { meaning: input.meaning }),
      ...(input.gender !== undefined && { gender: input.gender }),
      ...(input.declensions && { declensions: input.declensions }),
      ...(input.conjugations && { conjugations: input.conjugations }),
      ...(input.audioUrl !== undefined && { audio_url: input.audioUrl }),
      updated_at: new Date().toISOString()
    })
    .eq('id', id);
    
  if (error) throw new Error(`단어 수정 실패: ${error.message}`);
}

export async function deleteWord(id: number): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase.from('words').delete().eq('id', id);
  if (error) throw new Error(`단어 삭제 실패: ${error.message}`);
}
