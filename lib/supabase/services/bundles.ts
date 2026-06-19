'use server';

import { createAdminClient } from '../admin';
import { generateTTS } from '@/lib/tts';
import { deleteFileFromPublicUrl } from './storage';

export async function listBundles(options?: { publishedOnly?: boolean; limit?: number }) {
  const supabase = createAdminClient();
  let query = supabase
    .from('bundle')
    .select(`
      *,
      bundle_category(id, name, name_en, icon_image_url, category_image_url),
      bundle_type(id, name, code),
      bundle_items(count)
    `)
    .order('created_at', { ascending: false });

  if (options?.publishedOnly) {
    query = query.eq('is_published', true);
  }

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching bundles:', error);
    return [];
  }

  return data ?? [];
}

export async function countPublishedBundles(): Promise<number> {
  const supabase = createAdminClient();
  const { count, error } = await supabase
    .from('bundle')
    .select('id', { count: 'exact', head: true })
    .eq('is_published', true);

  if (error) {
    console.error('Error counting published bundles:', error);
    return 0;
  }

  return count ?? 0;
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
      bundle_category(id, name, name_en, icon_image_url, category_image_url),
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
  icon_image_url?: string | null;
  category_image_url?: string | null;
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
  icon_image_url?: string | null;
  category_image_url?: string | null;
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

export async function updateCategoryOrder(updates: { id: string; order_index: number }[]) {
  const supabase = createAdminClient();

  const results = await Promise.all(
    updates.map(({ id, order_index }) =>
      supabase
        .from('bundle_category')
        .update({ order_index })
        .eq('id', id)
    )
  );

  const error = results.find((result) => result.error)?.error;
  if (error) {
    console.error('Error updating category order:', error);
    throw error;
  }

  return true;
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
    id?: string;
    title: string;
    title_en?: string | null;
    description: string;
    description_en?: string | null;
    level: number;
    category_id: string | null;
    type_id: string | null;
    image_url?: string | null;
    thumbnail_url?: string | null;
    is_published: boolean;
    access_level?: 'free' | 'premium';
  },
  items: {
    sentence: string;
    translation: string;
    translation_en: string;
    wordJson: string;
    imageUrl: string | null;
    speakerKey?: string | null;
    speakerName?: string | null;
    speakerRole?: string | null;
    audioUrl?: string | null;
    metadata?: Record<string, any> | null;
    ttsOptions?: {
      provider?: 'google' | 'elevenlabs';
      model?: string;
      voice?: string;
      speed?: number;
      stability?: number;
      similarityBoost?: number;
      style?: number;
      useSpeakerBoost?: boolean;
    } | null;
  }[],
  sentenceTtsOptions: {
    provider: 'google' | 'elevenlabs';
    model: string;
    voice: string;
    speed: number;
    stability?: number;
    similarityBoost?: number;
    style?: number;
    useSpeakerBoost?: boolean;
  } = {
    provider: 'elevenlabs',
    model: 'eleven_multilingual_v2',
    voice: '2Lb1en5ujrODDIqmp7F3',
    speed: 0.8,
    stability: 0.5,
    similarityBoost: 0.75,
    style: 0,
    useSpeakerBoost: true,
  }
) {
  const supabase = createAdminClient();

  // 1. 번들 생성
  const { data: bundle, error: bundleError } = await supabase
    .from('bundle')
    .insert([{
      ...(bundleMeta.id ? { id: bundleMeta.id } : {}),
      title: bundleMeta.title,
      title_en: bundleMeta.title_en || null,
      description: bundleMeta.description,
      description_en: bundleMeta.description_en || null,
      level: bundleMeta.level,
      category_id: bundleMeta.category_id || null,
      type_id: bundleMeta.type_id || null,
      is_published: bundleMeta.is_published,
      access_level: bundleMeta.access_level || 'free',
      image_url: bundleMeta.image_url || null,
      thumbnail_url: bundleMeta.thumbnail_url || items[0]?.imageUrl || null
    }])
    .select()
    .single();

  if (bundleError) {
    console.error('Error creating bundle:', bundleError);
    throw new Error('번들 생성에 실패했습니다.');
  }

  const uniqueSentenceTexts = Array.from(new Set(
    items.map(item => item.sentence.trim()).filter(Boolean)
  ));
  const sentenceByText = new Map<string, any>();

  if (uniqueSentenceTexts.length > 0) {
    const { data: existingSentences, error: existingSentencesError } = await supabase
      .from('sentences')
      .select('*')
      .in('sentence', uniqueSentenceTexts)
      .order('id', { ascending: true });

    if (existingSentencesError) {
      console.error('Error preloading bundle sentences:', existingSentencesError);
      throw new Error('기존 문장 조회에 실패했습니다.');
    }

    for (const sentence of existingSentences || []) {
      if (!sentenceByText.has(sentence.sentence)) {
        sentenceByText.set(sentence.sentence, sentence);
      }
    }
  }

  const missingSentenceItems = uniqueSentenceTexts
    .filter(sentence => !sentenceByText.has(sentence))
    .map(sentence => items.find(item => item.sentence.trim() === sentence)!)
    .filter(Boolean);

  if (missingSentenceItems.length > 0) {
    const { data: newSentences, error: newSentencesError } = await supabase
      .from('sentences')
      .insert(missingSentenceItems.map(item => ({
        sentence: item.sentence.trim(),
        translation: item.translation,
        translation_en: item.translation_en || null,
        audio_url: null,
      })))
      .select();

    if (newSentencesError) {
      console.error('Error creating bundle sentences:', newSentencesError);
      throw new Error('문장 생성에 실패했습니다.');
    }

    for (const sentence of newSentences || []) {
      sentenceByText.set(sentence.sentence, sentence);
    }
  }

  const wordInfoByNormalizedWord = new Map<string, any>();
  for (const item of items) {
    if (!item.wordJson) continue;

    try {
      const parsed = JSON.parse(item.wordJson);
      for (const wordInfo of Object.values(parsed.words || {}) as any[]) {
        const normalizedWord =
          wordInfo && typeof wordInfo.word === 'string'
            ? wordInfo.word.toLowerCase().trim()
            : '';

        if (normalizedWord && !wordInfoByNormalizedWord.has(normalizedWord)) {
          wordInfoByNormalizedWord.set(normalizedWord, wordInfo);
        }
      }
    } catch (error) {
      console.error('Error collecting word JSON before bundle creation:', error);
    }
  }

  const existingWordsByText = new Map<string, any>();
  const normalizedWords = Array.from(wordInfoByNormalizedWord.keys());
  if (normalizedWords.length > 0) {
    const { data: existingWords, error: existingWordsError } = await supabase
      .from('words')
      .select('*')
      .eq('lang_code', 'es')
      .in('word', normalizedWords);

    if (existingWordsError) {
      console.error('Error preloading bundle words:', existingWordsError);
      throw new Error('기존 단어 조회에 실패했습니다.');
    }

    for (const word of existingWords || []) {
      existingWordsByText.set(word.word.toLowerCase().trim(), word);
    }
  }

  const desiredWordMappings: {
    word_id: number;
    sentence_id: number;
    used_as: string;
  }[] = [];
  const usedSentenceIds = new Set<number>();
  const itemErrors: string[] = [];

  // 2. 각 아이템 처리
  for (let i = 0; i < items.length; i++) {
    const item = items[i];

    try {
      // a. 일괄 조회/생성한 문장 재사용 & TTS 생성
      const sentenceText = item.sentence.trim();
      const sentenceRecord = sentenceByText.get(sentenceText);
      if (!sentenceRecord) {
        throw new Error(`문장 정보를 찾을 수 없습니다: ${sentenceText}`);
      }

      const sentenceId = Number(sentenceRecord.id);
      usedSentenceIds.add(sentenceId);
      let audioUrl = sentenceRecord.audio_url;
      const isConversationItem = Boolean(item.speakerKey);

      // 오디오가 없는 경우 TTS 생성
      if (!audioUrl && !isConversationItem) {
        audioUrl = await generateTTS(item.sentence, `sentences/bundles/${bundle.id}`, 'es', 0.8, sentenceTtsOptions);
      }

      const sentenceUpdates: {
        audio_url?: string | null;
        translation?: string;
        translation_en?: string | null;
      } = {};

      if (!sentenceRecord.audio_url && audioUrl) {
        sentenceUpdates.audio_url = audioUrl;
      }
      if (!sentenceRecord.translation && item.translation) {
        sentenceUpdates.translation = item.translation;
      }
      if (!sentenceRecord.translation_en && item.translation_en) {
        sentenceUpdates.translation_en = item.translation_en;
      }

      if (Object.keys(sentenceUpdates).length > 0) {
        const { error: sentenceUpdateError } = await supabase
          .from('sentences')
          .update(sentenceUpdates)
          .eq('id', sentenceId);

        if (sentenceUpdateError) throw sentenceUpdateError;
        sentenceByText.set(sentenceText, {
          ...sentenceRecord,
          ...sentenceUpdates,
        });
      }

      let itemAudioUrl = item.audioUrl || null;
      if (isConversationItem && !itemAudioUrl) {
        itemAudioUrl = await generateTTS(
          item.sentence,
          `sentences/bundles/${bundle.id}/conversation`,
          'es',
          0.8,
          {
            ...sentenceTtsOptions,
            ...(item.ttsOptions || {})
          }
        );
      }

      // b. 단어 정보 처리 (있는 경우)
      if (item.wordJson) {
        try {
          const parsed = JSON.parse(item.wordJson);
          const words = parsed.words;
          
          if (words) {
            for (const [originalText, wordInfo] of Object.entries(words) as [string, any]) {
              const normalizedWord =
                wordInfo && typeof wordInfo.word === 'string'
                  ? wordInfo.word.toLowerCase().trim()
                  : '';

              if (!normalizedWord) {
                console.warn('Skipping invalid word JSON entry:', { originalText, wordInfo });
                continue;
              }

              // 요청 시작 시 일괄 조회한 단어를 재사용
              const existingWord = existingWordsByText.get(normalizedWord);

              let wordId: number;
              let wordAudioUrl = existingWord?.audio_url;

              // 단어 오디오가 없는 경우 TTS 생성
              if (!wordAudioUrl) {
                wordAudioUrl = await generateTTS(normalizedWord, 'words', 'es', 0.8, {
                  provider: 'google',
                  voice: 'es-ES-Standard-A',
                });
              }

              if (existingWord) {
                wordId = existingWord.id;
                // 기존 단어에 오디오가 없었다면 업데이트
                if (!existingWord.audio_url && wordAudioUrl) {
                  await supabase
                    .from('words')
                    .update({ audio_url: wordAudioUrl })
                    .eq('id', wordId);
                  existingWordsByText.set(normalizedWord, {
                    ...existingWord,
                    audio_url: wordAudioUrl,
                  });
                }
              } else {
                const { data: newWord, error: wError } = await supabase
                  .from('words')
                  .insert({
                    word: normalizedWord,
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
                existingWordsByText.set(normalizedWord, newWord);
              }

              desiredWordMappings.push({
                word_id: wordId,
                sentence_id: sentenceId,
                used_as: originalText,
              });
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
          image_url: item.imageUrl,
          speaker_key: item.speakerKey || null,
          speaker_name: item.speakerName || null,
          speaker_role: item.speakerRole || null,
          audio_url: itemAudioUrl,
          metadata: item.metadata || {}
        });

      if (biError) throw biError;

    } catch (err) {
      console.error(`Error processing bundle item ${i}:`, err);
      itemErrors.push(`아이템 ${i + 1}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  if (itemErrors.length > 0) {
    await supabase.from('bundle').delete().eq('id', bundle.id);
    throw new Error(`번들 아이템 처리에 실패했습니다. ${itemErrors.join(' / ')}`);
  }

  if (desiredWordMappings.length > 0) {
    const desiredWordIds = Array.from(new Set(
      desiredWordMappings.map(mapping => mapping.word_id)
    ));
    const { data: existingMappings, error: existingMappingsError } = await supabase
      .from('word_sentence_map')
      .select('word_id, sentence_id')
      .in('sentence_id', Array.from(usedSentenceIds))
      .in('word_id', desiredWordIds);

    if (existingMappingsError) {
      console.error('Error preloading word sentence mappings:', existingMappingsError);
      await supabase.from('bundle').delete().eq('id', bundle.id);
      throw new Error('단어-문장 연결 조회에 실패했습니다.');
    }

    const existingMappingKeys = new Set(
      (existingMappings || []).map(mapping => `${mapping.word_id}:${mapping.sentence_id}`)
    );
    const pendingMappingKeys = new Set<string>();
    const mappingsToInsert = desiredWordMappings.filter(mapping => {
      const key = `${mapping.word_id}:${mapping.sentence_id}`;
      if (existingMappingKeys.has(key) || pendingMappingKeys.has(key)) {
        return false;
      }

      pendingMappingKeys.add(key);
      return true;
    });

    if (mappingsToInsert.length > 0) {
      const { error: mappingInsertError } = await supabase
        .from('word_sentence_map')
        .insert(mappingsToInsert);

      if (mappingInsertError) {
        console.error('Error creating word sentence mappings:', mappingInsertError);
        await supabase.from('bundle').delete().eq('id', bundle.id);
        throw new Error('단어-문장 연결 생성에 실패했습니다.');
      }
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
          name_en,
          icon_image_url,
          category_image_url
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

export async function regenerateBundleItemSentenceTTS(itemId: string, options?: {
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

  const { data: item, error: itemError } = await supabase
    .from('bundle_items')
    .select(`
      id,
      bundle_id,
      sentence_id,
      audio_url,
      sentences(*)
    `)
    .eq('id', itemId)
    .maybeSingle();

  if (itemError) throw itemError;

  const sentence = Array.isArray(item?.sentences) ? item.sentences[0] : item?.sentences;

  if (!item?.sentence_id || !sentence?.sentence) {
    throw new Error('연결된 문장이 없는 번들 아이템입니다.');
  }

  const newAudioUrl = await generateTTS(
    sentence.sentence,
    `sentences/bundles/${item.bundle_id}/items`,
    'es',
    options?.speed,
    options
  );

  if (!newAudioUrl) throw new Error('TTS 생성에 실패했습니다.');

  const oldAudioUrls = Array.from(new Set([
    item.audio_url,
    sentence.audio_url
  ].filter((url): url is string => Boolean(url && url !== newAudioUrl))));

  const { error: itemUpdateError } = await supabase
    .from('bundle_items')
    .update({ audio_url: newAudioUrl })
    .eq('id', itemId);

  if (itemUpdateError) {
    await deleteFileFromPublicUrl(newAudioUrl);
    throw itemUpdateError;
  }

  const { error: sentenceUpdateError } = await supabase
    .from('sentences')
    .update({ audio_url: newAudioUrl, updated_at: new Date().toISOString() })
    .eq('id', item.sentence_id);

  if (sentenceUpdateError) {
    await supabase
      .from('bundle_items')
      .update({ audio_url: item.audio_url || null })
      .eq('id', itemId);
    await deleteFileFromPublicUrl(newAudioUrl);
    throw sentenceUpdateError;
  }

  await Promise.all(
    oldAudioUrls.map(url =>
      deleteFileFromPublicUrl(url).catch(err =>
        console.error('Failed to delete old bundle item audio file:', err)
      )
    )
  );

  return newAudioUrl;
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

export async function updateBundleItemsOrder(bundleId: string, orderedItemIds: string[]) {
  const supabase = createAdminClient();

  const updatePromises = orderedItemIds.map((itemId, index) =>
    supabase
      .from('bundle_items')
      .update({ order_index: index })
      .eq('id', itemId)
      .eq('bundle_id', bundleId)
  );

  const results = await Promise.all(updatePromises);
  const error = results.find(result => result.error)?.error;

  if (error) {
    console.error('Error updating bundle item order:', error);
    throw error;
  }

  return true;
}

export async function getRecommendedUnstudiedBundles(userId: string, limit: number = 3) {
  const supabase = createAdminClient();
  
  // 1. Get bundle IDs where the user has made real progress.
  const [{ data: interactions }, { data: completedItems }] = await Promise.all([
    supabase
      .from('user_bundle_interactions')
      .select('bundle_id, progress_ratio, is_completed')
      .eq('user_id', userId),
    supabase
      .from('user_bundle_item_interactions')
      .select('bundle_id')
      .eq('user_id', userId)
      .eq('is_completed', true),
  ]);
    
  const studiedBundleIds = Array.from(new Set([
    ...(interactions || [])
      .filter((interaction) => interaction.is_completed || Number(interaction.progress_ratio) > 0)
      .map((interaction) => interaction.bundle_id),
    ...(completedItems || []).map((item) => item.bundle_id),
  ]));
  
  // 2. Fetch unstudied bundles
  let query = supabase
    .from('bundle')
    .select(`
      *,
      bundle_category(id, name, name_en, icon_image_url, category_image_url),
      bundle_type(id, name, code),
      bundle_items(count)
    `)
    .eq('is_published', true)
    .order('created_at', { ascending: false });
    
  if (studiedBundleIds.length > 0) {
    query = query.not('id', 'in', `(${studiedBundleIds.join(',')})`);
  }
  
  const { data, error } = await query.limit(limit);
  
  if (error) {
    console.error('Error fetching recommended bundles:', error);
    return [];
  }
  
  return data;
}

export async function listBundleItemsWithDistractors(bundleId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('bundle_items')
    .select(`
      id,
      order_index,
      image_url,
      audio_url,
      sentences (
        id,
        sentence,
        audio_url,
        translation,
        translation_en,
        word_sentence_map (
          id,
          used_as,
          word_id,
          words (
            id,
            word,
            lang_code,
            meaning_ko,
            meaning_en,
            words_distractor (
              id,
              distractor,
              meaning_ko,
              meaning_en
            )
          )
        )
      )
    `)
    .eq('bundle_id', bundleId)
    .order('order_index', { ascending: true });

  if (error) {
    console.error('Error fetching bundle items with distractors:', error);
    return [];
  }

  return data ?? [];
}
