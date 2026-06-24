'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { getStorageBucket } from '@/lib/supabase/storage';

export type SupabaseWord = {
  id: number;
  word: string;
  lang_code: string;
  pos: string[];
  meaning_ko: Record<string, string[]>;
  meaning_en: Record<string, string[]>;
  gender: string | null;
  declensions: Record<string, string>;
  conjugations: Record<string, any>;
  audio_url: string | null;
  created_at: string;
  updated_at: string;
  is_verified?: boolean;
  difficulty?: number;
  sentence_count?: number;
  distractor_count?: number;
  distractors?: any[];
};

export async function listWords(langCode?: string): Promise<SupabaseWord[]> {
  const supabase = createAdminClient();
  let query = supabase.from('words').select('*, word_sentence_map(id), words_distractor(id)');
  
  if (langCode) {
    query = query.eq('lang_code', langCode);
  }
  
  const { data, error } = await query.order('word', { ascending: true });
  
  if (error || !data) return [];
  
  return data.map(row => ({
    ...row,
    sentence_count: Array.isArray(row.word_sentence_map) ? row.word_sentence_map.length : 0,
    distractor_count: Array.isArray(row.words_distractor) ? row.words_distractor.length : 0
  })) as SupabaseWord[];
}

export async function countWords(): Promise<number> {
  const supabase = createAdminClient();
  const { count, error } = await supabase
    .from('words')
    .select('id', { count: 'exact', head: true });

  if (error) {
    console.error('Error counting words:', error);
    return 0;
  }

  return count ?? 0;
}

export async function getWordById(id: number): Promise<SupabaseWord | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('words')
    .select('*, word_sentence_map(id), words_distractor(id)')
    .eq('id', id)
    .maybeSingle();

  if (error || !data) return null;

  return {
    ...data,
    sentence_count: Array.isArray(data.word_sentence_map) ? data.word_sentence_map.length : 0,
    distractor_count: Array.isArray(data.words_distractor) ? data.words_distractor.length : 0,
    distractors: data.words_distractor || []
  } as SupabaseWord;
}

export async function getWordWithSentences(id: number) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('words')
    .select('*, word_sentence_map(*, sentences(*)), words_distractor(*)')
    .eq('id', id)
    .maybeSingle();

  if (error || !data) return null;

  return {
    ...data,
    sentences: (data.word_sentence_map || []).map((m: any) => ({
      ...m.sentences,
      used_as: m.used_as
    })),
    distractors: data.words_distractor || []
  };
}

export async function getNextUnverifiedWordId(currentId: number): Promise<number | null> {
  const supabase = createAdminClient();
  const selectNextId = 'id';

  const { data: nextData, error: nextError } = await supabase
    .from('words')
    .select(selectNextId)
    .neq('is_verified', true)
    .gt('id', currentId)
    .order('id', { ascending: true })
    .limit(1);

  if (nextError) {
    throw new Error(`다음 검수 단어 조회 실패: ${nextError.message}`);
  }
  if (nextData?.[0]?.id) {
    return nextData[0].id;
  }

  const { data: firstData, error: firstError } = await supabase
    .from('words')
    .select(selectNextId)
    .neq('is_verified', true)
    .neq('id', currentId)
    .order('id', { ascending: true })
    .limit(1);

  if (firstError) {
    throw new Error(`다음 검수 단어 조회 실패: ${firstError.message}`);
  }

  return firstData?.[0]?.id ?? null;
}

export async function insertWord(input: {
  word: string;
  langCode: string;
  pos?: string[];
  meaning_ko: Record<string, string[]>;
  meaning_en: Record<string, string[]>;
  gender?: string | null;
  declensions?: Record<string, string>;
  conjugations?: Record<string, any>;
  audioUrl?: string | null;
  isVerified?: boolean;
  difficulty?: number;
}): Promise<number> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('words')
    .insert({
      word: input.word,
      lang_code: input.langCode,
      pos: input.pos ?? [],
      meaning_ko: input.meaning_ko,
      meaning_en: input.meaning_en,
      gender: input.gender ?? null,
      declensions: input.declensions ?? {},
      conjugations: input.conjugations ?? {},
      audio_url: input.audioUrl ?? null,
      is_verified: input.isVerified ?? false,
      difficulty: input.difficulty ?? 1
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
  meaning_ko?: Record<string, string[]>;
  meaning_en?: Record<string, string[]>;
  gender?: string | null;
  declensions?: Record<string, string>;
  conjugations?: Record<string, any>;
  audioUrl?: string | null;
  isVerified?: boolean;
  difficulty?: number;
}): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from('words')
    .update({
      ...(input.word && { word: input.word }),
      ...(input.langCode && { lang_code: input.langCode }),
      ...(input.pos && { pos: input.pos }),
      ...(input.meaning_ko && { meaning_ko: input.meaning_ko }),
      ...(input.meaning_en && { meaning_en: input.meaning_en }),
      ...(input.gender !== undefined && { gender: input.gender }),
      ...(input.declensions && { declensions: input.declensions }),
      ...(input.conjugations && { conjugations: input.conjugations }),
      ...(input.audioUrl !== undefined && { audio_url: input.audioUrl }),
      ...(input.isVerified !== undefined && { is_verified: input.isVerified }),
      ...(input.difficulty !== undefined && { difficulty: input.difficulty }),
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

export async function deleteDistractor(id: number): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase.from('words_distractor').delete().eq('id', id);
  if (error) throw new Error(`혼동 어휘 삭제 실패: ${error.message}`);
}

export async function getWordByText(word: string, langCode: string): Promise<SupabaseWord | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('words')
    .select('*')
    .eq('word', word.toLowerCase().trim())
    .eq('lang_code', langCode)
    .order('id', { ascending: true })
    .limit(1);

  if (error || !data?.[0]) return null;
  return data[0] as SupabaseWord;
}

export async function updateDistractor(id: number, input: {
  distractor?: string;
  meaning_ko?: string;
  meaning_en?: string;
}): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from('words_distractor')
    .update(input)
    .eq('id', id);
    
  if (error) throw new Error(`혼동 어휘 수정 실패: ${error.message}`);
}

export async function getWordsWithDistractors(ids: number[]): Promise<any[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('words')
    .select('*, words_distractor(*)')
    .in('id', ids);

  if (error || !data) return [];
  return data.map((word: any) => ({
    ...word,
    words_distractor: Array.isArray(word.words_distractor)
      ? [...word.words_distractor].sort((left: any, right: any) => Number(left.id) - Number(right.id))
      : [],
  }));
}

export async function listWordDistractors(wordId: number): Promise<{
  id: number;
  distractor: string;
  meaning_ko: string | null;
  meaning_en: string | null;
}[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('words_distractor')
    .select('id, distractor, meaning_ko, meaning_en')
    .eq('word_id', wordId)
    .order('id', { ascending: true });

  if (error) {
    throw new Error(`혼동 어휘 조회 실패: ${error.message}`);
  }

  return data || [];
}

export async function updateReviewedWordDistractors(
  wordId: number,
  distractors: { id?: string | number; word: string; meaning_ko?: string; meaning_en?: string }[]
): Promise<void> {
  const supabase = createAdminClient();
  const existingDistractors = await listWordDistractors(wordId);
  const existingById = new Map(existingDistractors.map((distractor) => [Number(distractor.id), distractor]));

  await Promise.all(distractors.map(async (distractor, index) => {
    const row = {
      word_id: wordId,
      distractor: distractor.word.trim(),
      meaning_ko: distractor.meaning_ko?.trim() || null,
      meaning_en: distractor.meaning_en?.trim() || null,
    };
    const id = distractor.id === '' || distractor.id === undefined ? null : Number(distractor.id);
    const existing = id && Number.isInteger(id) ? existingById.get(id) : existingDistractors[index];

    if (existing) {
      const { error } = await supabase
        .from('words_distractor')
        .update(row)
        .eq('id', existing.id);

      if (error) {
        throw new Error(`검수 혼동 어휘 수정 실패: ${error.message}`);
      }
      return;
    }

    const { error } = await supabase
      .from('words_distractor')
      .insert(row);

    if (error) {
      throw new Error(`검수 혼동 어휘 추가 실패: ${error.message}`);
    }
  }));
}

export async function replaceWordDistractors(wordId: number, distractors: { word: string; meaning_ko?: string; meaning_en?: string }[]): Promise<void> {
  const supabase = createAdminClient();

  const { error: deleteError } = await supabase
    .from('words_distractor')
    .delete()
    .eq('word_id', wordId);

  if (deleteError) {
    throw new Error(`기존 혼동 어휘 삭제 실패: ${deleteError.message}`);
  }

  if (distractors.length === 0) return;

  const insertData = distractors.map(d => ({
    word_id: wordId,
    distractor: d.word.trim(),
    meaning_ko: d.meaning_ko?.trim() || null,
    meaning_en: d.meaning_en?.trim() || null,
  }));

  const { error: insertError } = await supabase
    .from('words_distractor')
    .insert(insertData);

  if (insertError) {
    throw new Error(`신규 혼동 어휘 추가 실패: ${insertError.message}`);
  }
}
