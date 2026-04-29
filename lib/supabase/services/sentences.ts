import { createAdminClient } from '@/lib/supabase/admin';
import { getStorageBucket } from '@/lib/supabase/storage';

export type SupabaseSentence = {
  id: number;
  sentence: string;
  translation: string;
  audio_url: string | null;
  created_at: string;
  updated_at: string;
  word_count?: number;
};

export async function listSentences(): Promise<SupabaseSentence[]> {
  const supabase = createAdminClient();
  const { data: sentences, error: sentenceError } = await supabase
    .from('sentences')
    .select('*')
    .order('created_at', { ascending: false });
    
  if (sentenceError || !sentences) return [];

  // Fetch counts from word_sentence_map separately for reliability
  const { data: counts, error: countError } = await supabase
    .from('word_sentence_map')
    .select('sentence_id');
    
  const countMap = (counts || []).reduce((acc, row) => {
    acc[row.sentence_id] = (acc[row.sentence_id] || 0) + 1;
    return acc;
  }, {} as Record<number, number>);
    
  return sentences.map(row => ({
    ...row,
    word_count: countMap[row.id] || 0
  })) as SupabaseSentence[];
}

export async function getSentenceById(id: number): Promise<SupabaseSentence | null> {
  const supabase = createAdminClient();
  const { data: sentence, error: sentenceError } = await supabase
    .from('sentences')
    .select('*')
    .eq('id', id)
    .maybeSingle();
    
  if (sentenceError || !sentence) return null;
  
  const { count, error: countError } = await supabase
    .from('word_sentence_map')
    .select('*', { count: 'exact', head: true })
    .eq('sentence_id', id);
  
  return {
    ...sentence,
    word_count: count || 0
  } as SupabaseSentence;
}

export async function insertSentence(input: {
  sentence: string;
  translation: string;
  audio_url?: string | null;
}): Promise<number> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('sentences')
    .insert({
      sentence: input.sentence,
      translation: input.translation,
      audio_url: input.audio_url ?? null
    })
    .select('id')
    .single();
    
  if (error) throw new Error(`문장 생성 실패: ${error.message}`);
  return data.id;
}

export async function updateSentence(id: number, input: {
  sentence?: string;
  translation?: string;
  audio_url?: string | null;
}): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from('sentences')
    .update({
      ...(input.sentence && { sentence: input.sentence }),
      ...(input.translation && { translation: input.translation }),
      ...(input.audio_url !== undefined && { audio_url: input.audio_url }),
      updated_at: new Date().toISOString()
    })
    .eq('id', id);
    
  if (error) throw new Error(`문장 수정 실패: ${error.message}`);
}

export async function deleteSentence(id: number): Promise<void> {
  const supabase = createAdminClient();
  
  const sentence = await getSentenceById(id);
  
  const { error } = await supabase.from('sentences').delete().eq('id', id);
  if (error) throw new Error(`문장 삭제 실패: ${error.message}`);
  
  if (sentence?.audio_url) {
    try {
      const bucket = getStorageBucket();
      let storagePath = sentence.audio_url;
      
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
        console.error(`Storage 오디오 삭제 실패 (sentence id: ${id}):`, storageError);
      }
    } catch (err) {
      console.error(`Storage 삭제 처리 중 오류 (sentence id: ${id}):`, err);
    }
  }
}
