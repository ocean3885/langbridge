import { createAdminClient } from '@/lib/supabase/admin';

export type SupabaseSentence = {
  id: number;
  text: string;
  translation: string;
  audio_url: string | null;
  created_at: string;
  updated_at: string;
};

export async function listSentences(): Promise<SupabaseSentence[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('sentences')
    .select('*')
    .order('created_at', { ascending: false });
    
  if (error || !data) return [];
  return data as SupabaseSentence[];
}

export async function getSentenceById(id: number): Promise<SupabaseSentence | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('sentences')
    .select('*')
    .eq('id', id)
    .maybeSingle();
    
  if (error || !data) return null;
  return data as SupabaseSentence;
}

export async function insertSentence(input: {
  text: string;
  translation: string;
  audio_url?: string | null;
}): Promise<number> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('sentences')
    .insert({
      text: input.text,
      translation: input.translation,
      audio_url: input.audio_url ?? null
    })
    .select('id')
    .single();
    
  if (error) throw new Error(`문장 생성 실패: ${error.message}`);
  return data.id;
}

export async function updateSentence(id: number, input: {
  text?: string;
  translation?: string;
  audio_url?: string | null;
}): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from('sentences')
    .update({
      ...(input.text && { text: input.text }),
      ...(input.translation && { translation: input.translation }),
      ...(input.audio_url !== undefined && { audio_url: input.audio_url }),
      updated_at: new Date().toISOString()
    })
    .eq('id', id);
    
  if (error) throw new Error(`문장 수정 실패: ${error.message}`);
}

export async function deleteSentence(id: number): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase.from('sentences').delete().eq('id', id);
  if (error) throw new Error(`문장 삭제 실패: ${error.message}`);
}
