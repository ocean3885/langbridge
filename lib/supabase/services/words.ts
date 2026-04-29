import { createAdminClient } from '@/lib/supabase/admin';
import { getStorageBucket } from '@/lib/supabase/storage';

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
  sentence_count?: number;
};

export async function listWords(langCode?: string): Promise<SupabaseWord[]> {
  const supabase = createAdminClient();
  let query = supabase.from('words').select('*, word_sentence_map(id)');
  
  if (langCode) {
    query = query.eq('lang_code', langCode);
  }
  
  const { data, error } = await query.order('word', { ascending: true });
  
  if (error || !data) return [];
  
  return data.map(row => ({
    ...row,
    sentence_count: Array.isArray(row.word_sentence_map) ? row.word_sentence_map.length : 0
  })) as SupabaseWord[];
}

export async function getWordById(id: number): Promise<SupabaseWord | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('words')
    .select('*, word_sentence_map(id)')
    .eq('id', id)
    .maybeSingle();
    
  if (error || !data) return null;
  
  return {
    ...data,
    sentence_count: Array.isArray(data.word_sentence_map) ? data.word_sentence_map.length : 0
  } as SupabaseWord;
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
  
  const word = await getWordById(id);
  
  const { error } = await supabase.from('words').delete().eq('id', id);
  if (error) throw new Error(`단어 삭제 실패: ${error.message}`);
  
  if (word?.audio_url) {
    try {
      const bucket = getStorageBucket();
      let storagePath = word.audio_url;
      
      if (storagePath.startsWith('http')) {
        const urlObj = new URL(storagePath);
        const pathParts = urlObj.pathname.split('/');
        const bucketIndex = pathParts.findIndex(p => p === bucket);
        if (bucketIndex !== -1 && bucketIndex + 1 < pathParts.length) {
          storagePath = decodeURIComponent(pathParts.slice(bucketIndex + 1).join('/'));
        }
      }
      
      const { error: storageError } = await supabase.storage.from(bucket).remove([storagePath]);
      if (storageError) {
        console.error(`Storage 오디오 삭제 실패 (word id: ${id}):`, storageError);
      }
    } catch (err) {
      console.error(`Storage 삭제 처리 중 오류 (word id: ${id}):`, err);
    }
  }
}
