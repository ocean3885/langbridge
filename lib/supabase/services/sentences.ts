'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { getStorageBucket } from '@/lib/supabase/storage';
import { generateTTS } from '@/lib/tts';
import { deleteFileFromPublicUrl } from './storage';

export type SupabaseSentence = {
  id: number;
  sentence: string;
  translation: string;
  translation_en?: string | null;
  lang_code?: string;
  audio_url: string | null;
  created_at: string;
  updated_at: string;
  word_count?: number;
  bundle_count?: number;
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

  // Fetch bundle counts
  const { data: bundleCounts, error: bundleCountError } = await supabase
    .from('bundle_items')
    .select('sentence_id');

  const bundleCountMap = (bundleCounts || []).reduce((acc, row) => {
    if (row.sentence_id) {
      acc[row.sentence_id] = (acc[row.sentence_id] || 0) + 1;
    }
    return acc;
  }, {} as Record<number, number>);
    
  return sentences.map(row => ({
    ...row,
    word_count: countMap[row.id] || 0,
    bundle_count: bundleCountMap[row.id] || 0
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

export async function getSentenceWithWords(id: number): Promise<SupabaseSentence & { words: any[] } | null> {
  const sentence = await getSentenceById(id);
  if (!sentence) return null;

  const supabase = createAdminClient();
  const { data: mappings, error } = await supabase
    .from('word_sentence_map')
    .select(`
      used_as,
      word_id,
      words:words(*)
    `)
    .eq('sentence_id', id);

  if (error) {
    console.error('Error fetching words for sentence:', error);
    return { ...sentence, words: [] };
  }

  const words = (mappings || []).map(m => ({
    ...m.words,
    used_as: m.used_as
  }));

  return {
    ...sentence,
    words
  };
}

export async function insertSentence(input: {
  sentence: string;
  translation: string;
  translation_en?: string | null;
  audio_url?: string | null;
}): Promise<number> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('sentences')
    .insert({
      sentence: input.sentence,
      translation: input.translation,
      translation_en: input.translation_en ?? null,
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
  translation_en?: string | null;
  audio_url?: string | null;
}): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from('sentences')
    .update({
      ...(input.sentence && { sentence: input.sentence }),
      ...(input.translation && { translation: input.translation }),
      ...(input.translation_en !== undefined && { translation_en: input.translation_en }),
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

export async function regenerateSentenceTTS(id: number, text: string, options?: {
  provider: 'google' | 'elevenlabs';
  model: string;
  voice: string;
  speed: number;
  stability?: number;
  similarityBoost?: number;
  style?: number;
  useSpeakerBoost?: boolean;
}) {
  const supabase = createAdminClient();

  const { data: bundleItem } = await supabase
    .from('bundle_items')
    .select('bundle_id')
    .eq('sentence_id', id)
    .order('order_index', { ascending: true })
    .limit(1)
    .maybeSingle();

  const folder = bundleItem?.bundle_id
    ? `sentences/bundles/${bundleItem.bundle_id}`
    : 'sentences';

  // 1. 새 TTS 생성
  const newAudioUrl = await generateTTS(text, folder, 'es', options?.speed, options);
  if (!newAudioUrl) throw new Error('TTS 생성에 실패했습니다.');
  
  // 2. 기존 오디오 정보 조회 (삭제를 위해)
  const { data: sentence } = await supabase
    .from('sentences')
    .select('audio_url')
    .eq('id', id)
    .single();

  const oldAudioUrl = sentence?.audio_url;

  // 3. DB 업데이트
  const { error: updateError } = await supabase
    .from('sentences')
    .update({ audio_url: newAudioUrl, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (updateError) throw updateError;

  // 4. 기존 파일 삭제 (비동기로 진행해도 무방)
  if (oldAudioUrl) {
    deleteFileFromPublicUrl(oldAudioUrl).catch(err => 
      console.error('Failed to delete old audio file:', err)
    );
  }

  return newAudioUrl;
}

export async function importWordsFromJson(sentenceId: number, json: string, langCode: string = 'es') {
  const supabase = createAdminClient();
  let parsed;
  try {
    parsed = JSON.parse(json);
  } catch (e) {
    throw new Error('JSON 형식이 올바르지 않습니다.');
  }
  
  const words = parsed.words;
  if (!words) throw new Error('올바른 JSON 형식이 아닙니다. "words" 키가 필요합니다.');

  const results = [];

  for (const [originalText, wordInfo] of Object.entries(words) as [string, any]) {
    const normalizedWord =
      wordInfo && typeof wordInfo.word === 'string'
        ? wordInfo.word.toLowerCase().trim()
        : '';

    if (!normalizedWord) {
      console.warn('Skipping invalid word JSON entry:', { originalText, wordInfo });
      continue;
    }

    // 1. 단어 검색 또는 생성
    const { data: existingWord } = await supabase
      .from('words')
      .select('id, audio_url')
      .eq('word', normalizedWord)
      .eq('lang_code', langCode)
      .maybeSingle();

    let wordId: number;
    if (existingWord) {
      wordId = existingWord.id;
    } else {
      // Insert new word
      let wordAudioUrl = null;
      try {
        wordAudioUrl = await generateTTS(normalizedWord, 'words', langCode);
      } catch (e) {
        console.error('Error generating TTS for word:', normalizedWord, e);
      }

      // Convert single string meanings to arrays if they are strings
      const mKo = { ...wordInfo.meaning_ko };
      for (const k in mKo) {
        if (typeof mKo[k] === 'string') mKo[k] = [mKo[k]];
      }
      const mEn = { ...wordInfo.meaning_en };
      for (const k in mEn) {
        if (typeof mEn[k] === 'string') mEn[k] = [mEn[k]];
      }

      const { data: newWord, error: wError } = await supabase
        .from('words')
        .insert({
          word: normalizedWord,
          lang_code: langCode,
          pos: wordInfo.pos || [],
          meaning_ko: mKo,
          meaning_en: mEn,
          gender: wordInfo.gender === 'null' ? null : (wordInfo.gender || null),
          conjugations: wordInfo.conjugations || {},
          declensions: wordInfo.declensions || {},
          audio_url: wordAudioUrl
        })
        .select('id')
        .single();
      
      if (wError) {
        console.error('Error creating word:', wError, wordInfo);
        continue;
      }
      wordId = newWord.id;
    }

    // 2. 단어-문장 매핑 (중복 확인 후 생성)
    const { data: existingMap } = await supabase
      .from('word_sentence_map')
      .select('id')
      .eq('word_id', wordId)
      .eq('sentence_id', sentenceId)
      .maybeSingle();

    if (!existingMap) {
      const { error: mapError } = await supabase
        .from('word_sentence_map')
        .insert({
          word_id: wordId,
          sentence_id: sentenceId,
          used_as: originalText
        });
      if (mapError) console.error('Error mapping word to sentence:', mapError);
    }
    
    results.push({ wordId, originalText });
  }
  
  return results;
}
