'use server';

import { createAdminClient } from '../admin';
import { generateTTS } from '@/lib/tts';

export async function listBundles() {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('bundle')
    .select(`
      *,
      bundle_category(id, name, name_en),
      bundle_type(id, name, code)
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching bundles:', error);
    return [];
  }

  return data;
}

export async function listBundleItems(bundleId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('bundle_items')
    .select(`
      *,
      words(*),
      sentences(*)
    `)
    .eq('bundle_id', bundleId)
    .order('order_index', { ascending: true });

  if (error) {
    console.error('Error fetching bundle items:', error);
    return [];
  }

  return data;
}

export async function getBundleWords(bundleId: string) {
  const supabase = createAdminClient();
  
  // 1. 번들에 포함된 모든 문장 ID 가져오기
  const { data: items, error: itemsError } = await supabase
    .from('bundle_items')
    .select('sentence_id')
    .eq('bundle_id', bundleId)
    .not('sentence_id', 'is', null);

  if (itemsError || !items || items.length === 0) return [];

  const sentenceIds = items.map(item => item.sentence_id);

  // 2. 문장에 연결된 단어들 가져오기 (word_sentence_map 조인)
  const { data: words, error: wordsError } = await supabase
    .from('word_sentence_map')
    .select(`
      word_id,
      words:words(*)
    `)
    .in('sentence_id', sentenceIds);

  if (wordsError || !words) return [];

  // 3. 중복 단어 제거 및 가공
  const uniqueWordsMap = new Map();
  words.forEach((item: any) => {
    if (item.words && !uniqueWordsMap.has(item.words.id)) {
      uniqueWordsMap.set(item.words.id, item.words);
    }
  });

  return Array.from(uniqueWordsMap.values());
}

export async function getBundle(bundleId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('bundle')
    .select(`
      *,
      bundle_category(id, name, name_en),
      bundle_type(id, name, code)
    `)
    .eq('id', bundleId)
    .single();

  if (error) {
    console.error('Error fetching bundle:', error);
    return null;
  }

  return data;
}

export async function listCategories() {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('bundle_category')
    .select('*')
    .order('order_index', { ascending: true });

  if (error) {
    console.error('Error fetching categories:', error);
    return [];
  }

  return data;
}

export async function listBundleTypes() {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('bundle_type')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching bundle types:', error);
    return [];
  }

  return data;
}

export async function createBundleType(type: { 
  name: string; 
  code: string;
  description?: string | null; 
}) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('bundle_type')
    .insert([type])
    .select()
    .single();

  if (error) {
    console.error('Error creating bundle type:', error);
    throw error;
  }

  return data;
}

export async function updateBundleType(id: string, updates: { 
  name?: string; 
  code?: string;
  description?: string | null; 
}) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('bundle_type')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating bundle type:', error);
    throw error;
  }

  return data;
}

export async function deleteBundleType(id: string) {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from('bundle_type')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting bundle type:', error);
    throw error;
  }

  return true;
}

export async function createCategory(category: { 
  name: string; 
  name_en?: string | null; 
  description?: string | null; 
  description_en?: string | null; 
  order_index?: number 
}) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('bundle_category')
    .insert([category])
    .select()
    .single();

  if (error) {
    console.error('Error creating category:', error);
    throw error;
  }

  return data;
}

export async function updateCategory(id: string, updates: { 
  name?: string; 
  name_en?: string | null; 
  description?: string | null; 
  description_en?: string | null; 
  order_index?: number 
}) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('bundle_category')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating category:', error);
    throw error;
  }

  return data;
}

export async function deleteCategory(id: string) {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from('bundle_category')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting category:', error);
    throw error;
  }

  return true;
}

export async function createBundleWithItems(
  bundleMeta: {
    title: string;
    title_en?: string | null;
    description: string;
    description_en?: string | null;
    level: number;
    category_id: string | null;
    type_id: string | null;
    thumbnail_url?: string | null;
    is_published: boolean;
  },
  items: {
    sentence: string;
    translation: string;
    translation_en: string;
    wordJson: string;
    imageUrl: string | null;
  }[]
) {
  const supabase = createAdminClient();

  // 1. 번들 생성
  const { data: bundle, error: bundleError } = await supabase
    .from('bundle')
    .insert([{
      title: bundleMeta.title,
      title_en: bundleMeta.title_en || null,
      description: bundleMeta.description,
      description_en: bundleMeta.description_en || null,
      level: bundleMeta.level,
      category_id: bundleMeta.category_id || null,
      type_id: bundleMeta.type_id || null,
      is_published: bundleMeta.is_published,
      thumbnail_url: bundleMeta.thumbnail_url || items[0]?.imageUrl || null
    }])
    .select()
    .single();

  if (bundleError) {
    console.error('Error creating bundle:', bundleError);
    throw new Error('번들 생성에 실패했습니다.');
  }

  // 2. 각 아이템 처리
  for (let i = 0; i < items.length; i++) {
    const item = items[i];

    try {
      // a. 문장 생성 (또는 검색) & TTS 생성
      const { data: existingSentence } = await supabase
        .from('sentences')
        .select('*')
        .eq('sentence', item.sentence.trim())
        .maybeSingle();

      let sentenceId: number;
      let audioUrl = existingSentence?.audio_url;

      // 오디오가 없는 경우 TTS 생성
      if (!audioUrl) {
        audioUrl = await generateTTS(item.sentence);
      }

      if (existingSentence) {
        sentenceId = existingSentence.id;
        // 기존 문장에 오디오가 없었다면 업데이트
        if (!existingSentence.audio_url && audioUrl) {
          await supabase
            .from('sentences')
            .update({ audio_url: audioUrl })
            .eq('id', sentenceId);
        }
      } else {
        const { data: newSentence, error: sError } = await supabase
          .from('sentences')
          .insert({
            sentence: item.sentence,
            translation: item.translation,
            translation_en: item.translation_en,
            audio_url: audioUrl
          })
          .select()
          .single();

        if (sError) throw sError;
        sentenceId = newSentence.id;
      }

      // b. 단어 정보 처리 (있는 경우)
      if (item.wordJson) {
        try {
          const parsed = JSON.parse(item.wordJson);
          const words = parsed.words;
          
          if (words) {
            for (const [originalText, wordInfo] of Object.entries(words) as [string, any]) {
              // 단어 검색 또는 생성 & TTS 생성
              const { data: existingWord } = await supabase
                .from('words')
                .select('*')
                .eq('word', wordInfo.word.toLowerCase().trim())
                .eq('lang_code', 'es')
                .maybeSingle();

              let wordId: number;
              let wordAudioUrl = existingWord?.audio_url;

              // 단어 오디오가 없는 경우 TTS 생성
              if (!wordAudioUrl) {
                wordAudioUrl = await generateTTS(wordInfo.word, 'words');
              }

              if (existingWord) {
                wordId = existingWord.id;
                // 기존 단어에 오디오가 없었다면 업데이트
                if (!existingWord.audio_url && wordAudioUrl) {
                  await supabase
                    .from('words')
                    .update({ audio_url: wordAudioUrl })
                    .eq('id', wordId);
                }
              } else {
                const { data: newWord, error: wError } = await supabase
                  .from('words')
                  .insert({
                    word: wordInfo.word,
                    lang_code: 'es',
                    pos: wordInfo.pos || [],
                    meaning_ko: wordInfo.meaning_ko || {},
                    meaning_en: wordInfo.meaning_en || {},
                    gender: wordInfo.gender || null,
                    conjugations: wordInfo.conjugations || {},
                    declensions: wordInfo.declensions || {},
                    audio_url: wordAudioUrl
                  })
                  .select()
                  .single();
                
                if (wError) {
                  console.error('Error creating word:', wError);
                  continue;
                }
                wordId = newWord.id;
              }

              // 단어-문장 매핑 (중복 확인 후 생성)
              const { data: existingMap } = await supabase
                .from('word_sentence_map')
                .select('id')
                .eq('word_id', wordId)
                .eq('sentence_id', sentenceId)
                .maybeSingle();

              if (!existingMap) {
                await supabase
                  .from('word_sentence_map')
                  .insert({
                    word_id: wordId,
                    sentence_id: sentenceId,
                    used_as: originalText
                  });
              }
            }
          }
        } catch (err) {
          console.error('Error processing word JSON:', err);
        }
      }

      // c. 번들 아이템 생성 (이미지 포함)
      const { error: biError } = await supabase
        .from('bundle_items')
        .insert({
          bundle_id: bundle.id,
          sentence_id: sentenceId,
          order_index: i,
          image_url: item.imageUrl
        });

      if (biError) throw biError;

    } catch (err) {
      console.error(`Error processing bundle item ${i}:`, err);
    }
  }

  return bundle;
}

export async function listBundlesForSentence(sentenceId: number) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('bundle_items')
    .select(`
      bundle_id,
      bundle (
        id,
        title,
        title_en,
        description,
        description_en,
        level,
        thumbnail_url,
        is_published,
        created_at,
        bundle_category (
          id,
          name,
          name_en
        ),
        bundle_type (
          id,
          name,
          code
        )
      )
    `)
    .eq('sentence_id', sentenceId);

  if (error) {
    console.error('Error fetching bundles for sentence:', error);
    return [];
  }

  // 중복 제거 및 번들 정보 추출
  const bundles = data
    .map((item: any) => item.bundle)
    .filter((bundle: any, index: number, self: any[]) => 
      bundle && self.findIndex(b => b.id === bundle.id) === index
    );

  return bundles;
}

export async function updateBundle(id: string, updates: any) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('bundle')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating bundle:', error);
    throw error;
  }

  return data;
}

export async function deleteBundle(id: string) {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from('bundle')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting bundle:', error);
    throw error;
  }

  return true;
}

export async function updateBundleItemImage(itemId: string, imageUrl: string | null) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('bundle_items')
    .update({ image_url: imageUrl })
    .eq('id', itemId)
    .select()
    .single();

  if (error) {
    console.error('Error updating bundle item image:', error);
    throw error;
  }

  return data;
}

export async function deleteBundleItemsBulk(bundleId: string, itemIds: string[]) {
  const supabase = createAdminClient();

  // 1. Delete items
  const { error: deleteError } = await supabase
    .from('bundle_items')
    .delete()
    .in('id', itemIds);

  if (deleteError) throw deleteError;

  // 2. Get remaining items to re-order
  const { data: remainingItems, error: fetchError } = await supabase
    .from('bundle_items')
    .select('id')
    .eq('bundle_id', bundleId)
    .order('order_index', { ascending: true });

  if (fetchError) throw fetchError;

  // 3. Update order_index sequentially
  const updatePromises = remainingItems.map((item, index) => 
    supabase
      .from('bundle_items')
      .update({ order_index: index })
      .eq('id', item.id)
  );

  await Promise.all(updatePromises);
  return true;
}
