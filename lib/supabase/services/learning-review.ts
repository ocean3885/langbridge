'use server';

import { cache } from 'react';
import { buildSentenceReviewSession, compareReviewPriority, reviewPriority, REVIEW_DEFAULT_COUNT, type ReviewPriority } from '@/lib/learning/review-session';
import { getBundleAccess } from '@/lib/bundle-access';
import { formatWordMeaning } from '@/lib/word-meaning';
import { createAdminClient } from '@/lib/supabase/admin';
import { getReviewDueAt, isReviewDue } from '@/lib/learning/review-schedule';
import { getCompletedBundleWordIds } from '@/lib/practice/bundle-word-progress';

export interface ReviewNeededSummary {
  sentences: number;
  words: number;
  total: number;
  limit: number;
  availableSentences: number;
  availableWords: number;
  availableTotal: number;
  lowestSentenceLevel: number | null;
  lowestWordLevel: number | null;
  nextReviewAt: string | null;
  firstSentence?: ReviewPriority | null;
  firstWord?: ReviewPriority | null;
}

export interface ReviewSentenceWordMap {
  id: number;
  used_as: string | null;
  word_id: number;
  words: {
    id: number;
    word: string;
    meaning_ko: unknown;
    meaning_en: unknown;
    pos?: string[] | null;
    words_distractor?: Array<{ distractor: string; meaning_ko: unknown; meaning_en: unknown }>;
  } | Array<{
    id: number;
    word: string;
    meaning_ko: unknown;
    meaning_en: unknown;
    pos?: string[] | null;
    words_distractor?: Array<{ distractor: string; meaning_ko: unknown; meaning_en: unknown }>;
  }> | null;
}

export interface ReviewSentenceItem {
  id: number;
  sentence: string;
  translation: string;
  translation_en: string | null;
  audio_url: string | null;
  bundle_id: string;
  bundle_item_id: string;
  proficiency_level: number;
  incorrect_count: number;
  streak_count: number;
  word_maps?: ReviewSentenceWordMap[];
}

export interface ReviewWordItem {
  id: number;
  word: string;
  lang_code: string;
  meaning_ko: string | null;
  meaning_en: string | null;
  pos: string[];
  audio_url: string | null;
  proficiency_level: number;
  incorrect_count: number;
  streak_count: number;
  distractors?: Array<{ distractor: string; meaning_ko: string | null; meaning_en: string | null }>;
}

const REVIEW_RECOMMENDATION_LIMIT = REVIEW_DEFAULT_COUNT;
const PAGE_SIZE = 500;
type Scope = 'review' | 'unstarted';
type Interaction = {
  id: string;
  proficiency_level: number;
  incorrect_count: number;
  streak_count: number;
  last_reviewed_at: string | null;
  metadata: Record<string, unknown> | null;
};
type SentenceContent = Pick<ReviewSentenceItem, 'id' | 'sentence' | 'translation' | 'translation_en' | 'audio_url'> & {
  word_sentence_map?: ReviewSentenceWordMap[] | null;
};
const reviewClock = cache(() => new Date());
type Candidate<T> = { item: T; interaction: Interaction };

function single<T>(value: T | T[] | null | undefined): T | null {
  return Array.isArray(value) ? value[0] || null : value || null;
}

// Read through the server row cap. Only an empty page means the query is exhausted.
async function readAll<T>(query: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>): Promise<T[]> {
  const rows: T[] = [];
  for (;;) {
    const { data, error } = await query(rows.length, rows.length + PAGE_SIZE - 1);
    if (error) throw error;
    if (!data?.length) return rows;
    rows.push(...data);
  }
}

function inScope(row: Interaction, scope: Scope, now: Date) {
  if (scope === 'unstarted') {
    return row.proficiency_level === 0 && !row.last_reviewed_at && row.incorrect_count === 0;
  }
  const started = row.proficiency_level > 0 || row.incorrect_count > 0 || row.metadata?.last_practice_is_correct === false;
  return started && row.proficiency_level < 5 && isReviewDue(row, now);
}

function prioritize<T>(candidates: Candidate<T>[]) {
  return candidates.sort((a, b) => compareReviewPriority(reviewPriority(a.interaction), reviewPriority(b.interaction))
    || a.interaction.id.localeCompare(b.interaction.id));
}

// React cache shares valid candidates and the clock between summary and session queries
// within a server request; it does not retain a user's queue across requests.
const sentenceCatalog = cache(async (userId: string) => {
  const db = createAdminClient();
  const [interactions, allItemHistory, allBundleHistory] = await Promise.all([
    readAll<Interaction & { sentence_id: number; sentences: SentenceContent | SentenceContent[] | null }>((from, to) => db
      .from('user_sentence_interactions')
      .select('id, sentence_id, proficiency_level, incorrect_count, streak_count, last_reviewed_at, metadata, sentences(id, sentence, translation, translation_en, audio_url)')
      .eq('user_id', userId).gte('proficiency_level', 0).lt('proficiency_level', 5).order('id').range(from, to)),
    readAll<{ id: string; bundle_id: string; bundle_item_id: string; last_practiced_at: string | null; last_played_at: string | null }>((from, to) => db
      .from('user_bundle_item_interactions').select('id, bundle_id, bundle_item_id, last_practiced_at, last_played_at')
      .eq('user_id', userId).order('id').range(from, to)),
    readAll<{ id: string; bundle_id: string; last_studied_at: string | null; is_started: boolean; started_at: string | null }>((from, to) => db
      .from('user_bundle_interactions').select('id, bundle_id, last_studied_at, is_started, started_at')
      .eq('user_id', userId).order('id').range(from, to)),
  ]);
  const itemHistory = allItemHistory.filter(row => row.last_practiced_at || row.last_played_at);
  const bundleHistory = allBundleHistory.filter(row => row.is_started || row.started_at || row.last_studied_at);
  const sentenceIds = new Set(interactions.map(row => Number(row.sentence_id)));
  const itemHistoryById = new Map(itemHistory.map(row => [row.bundle_item_id, row]));
  const bundleHistoryById = new Map(bundleHistory.map(row => [row.bundle_id, row]));
  const bundleIds = [...new Set([...itemHistory, ...bundleHistory].map(row => row.bundle_id))].sort();
  type BundleItem = { id: string; bundle_id: string; sentence_id: number; bundle: { is_published: boolean; access_level: string } | { is_published: boolean; access_level: string }[] | null };
  const bundleItems: BundleItem[] = [];
  for (let start = 0; start < bundleIds.length; start += 100) {
    bundleItems.push(...await readAll<BundleItem>((from, to) => db.from('bundle_items')
      .select('id, bundle_id, sentence_id, bundle:bundle(is_published, access_level)')
      .in('bundle_id', bundleIds.slice(start, start + 100)).not('sentence_id', 'is', null)
      .order('id').range(from, to)));
  }
  const accessByLevel = new Map<string, boolean>();
  const validItems: BundleItem[] = [];
  for (const item of bundleItems) {
    if (!sentenceIds.has(Number(item.sentence_id))) continue;
    const bundle = single(item.bundle);
    if (!bundle?.is_published) continue;
    const accessKey = bundle.access_level === 'premium' ? 'premium' : 'free';
    if (!accessByLevel.has(accessKey)) {
      accessByLevel.set(accessKey, (await getBundleAccess(bundle, { id: userId })).canView);
    }
    if (accessByLevel.get(accessKey)) validItems.push(item);
  }
  // Prefer the exact item previously practiced, then the most recently studied bundle.
  validItems.sort((a, b) => {
    const ah = itemHistoryById.get(a.id), bh = itemHistoryById.get(b.id);
    return Number(Boolean(bh)) - Number(Boolean(ah))
      || (bh?.last_practiced_at || '').localeCompare(ah?.last_practiced_at || '')
      || (bundleHistoryById.get(b.bundle_id)?.last_studied_at || '').localeCompare(bundleHistoryById.get(a.bundle_id)?.last_studied_at || '')
      || a.id.localeCompare(b.id);
  });
  const chosen = new Map<number, BundleItem>();
  for (const item of validItems) if (!chosen.has(Number(item.sentence_id))) chosen.set(Number(item.sentence_id), item);
  const candidates: Candidate<ReviewSentenceItem>[] = [];
  for (const row of interactions) {
    const sentence = single(row.sentences), item = chosen.get(Number(row.sentence_id));
    const translation = sentence?.translation?.trim() || sentence?.translation_en?.trim();
    if (!sentence?.sentence?.trim() || !translation || !item) continue;
    candidates.push({ interaction: row, item: {
      id: Number(row.sentence_id), sentence: sentence.sentence, translation,
      translation_en: sentence.translation_en?.trim() || translation,
      audio_url: sentence.audio_url || null, bundle_id: item.bundle_id, bundle_item_id: item.id,
      proficiency_level: row.proficiency_level, incorrect_count: row.incorrect_count, streak_count: row.streak_count,
      word_maps: Array.isArray(sentence.word_sentence_map) ? sentence.word_sentence_map : [],
    } });
  }
  return { candidates: prioritize(candidates), now: reviewClock() };
});

const wordCatalog = cache(async (userId: string) => {
  const db = createAdminClient();
  type Word = Pick<ReviewWordItem, 'id' | 'word' | 'lang_code' | 'pos' | 'audio_url'> & { meaning_ko: unknown; meaning_en: unknown; words_distractor?: ReviewWordItem['distractors'] };
  const rows = await readAll<Interaction & { word_id: number; words: Word | Word[] | null }>((from, to) => db
    .from('user_word_interactions')
    .select('id, word_id, proficiency_level, incorrect_count, streak_count, last_reviewed_at, metadata, words(id, word, lang_code, meaning_ko, meaning_en, pos, audio_url)')
    .eq('user_id', userId).gte('proficiency_level', 0).lt('proficiency_level', 5).order('id').range(from, to));
  const candidates: Candidate<ReviewWordItem>[] = [];
  for (const row of rows) {
    const word = single(row.words);
    if (!word?.word?.trim()) continue;
    const ko = formatWordMeaning(word.meaning_ko), en = formatWordMeaning(word.meaning_en);
    if (!ko && !en) continue;
    candidates.push({ interaction: row, item: {
      id: Number(row.word_id), word: word.word, lang_code: word.lang_code,
      meaning_ko: ko || en, meaning_en: en || ko,
      pos: Array.isArray(word.pos) ? word.pos : [], audio_url: word.audio_url || null,
      proficiency_level: row.proficiency_level, incorrect_count: row.incorrect_count, streak_count: row.streak_count,
      distractors: Array.isArray(word.words_distractor) ? word.words_distractor : [],
    } });
  }
  return { candidates: prioritize(candidates), now: reviewClock() };
});

export async function getReviewNeededSummary(userId: string): Promise<ReviewNeededSummary> {
  const [sentences, words] = await Promise.all([sentenceCatalog(userId), wordCatalog(userId)]);
  const dueSentences = sentences.candidates.filter(row => inScope(row.interaction, 'review', sentences.now));
  const dueWords = words.candidates.filter(row => inScope(row.interaction, 'review', words.now));
  const future = [...sentences.candidates, ...words.candidates]
    .filter(row => row.interaction.proficiency_level > 0 || row.interaction.incorrect_count > 0)
    .map(row => getReviewDueAt(row.interaction))
    .filter((date): date is Date => Boolean(date && date.getTime() > Math.max(sentences.now.getTime(), words.now.getTime())))
    .sort((a, b) => a.getTime() - b.getTime());
  const lowest = (rows: Candidate<unknown>[]) => rows.length ? Math.min(...rows.map(row => row.interaction.proficiency_level)) : null;
  return {
    sentences: Math.min(REVIEW_RECOMMENDATION_LIMIT, dueSentences.length),
    words: Math.min(REVIEW_RECOMMENDATION_LIMIT, dueWords.length),
    total: Math.min(REVIEW_RECOMMENDATION_LIMIT, dueSentences.length) + Math.min(REVIEW_RECOMMENDATION_LIMIT, dueWords.length),
    limit: REVIEW_RECOMMENDATION_LIMIT,
    availableSentences: dueSentences.length, availableWords: dueWords.length,
    availableTotal: dueSentences.length + dueWords.length,
    lowestSentenceLevel: lowest(dueSentences), lowestWordLevel: lowest(dueWords),
    nextReviewAt: future[0]?.toISOString() || null,
    firstSentence: dueSentences[0] ? reviewPriority(dueSentences[0].interaction) : null,
    firstWord: dueWords[0] ? reviewPriority(dueWords[0].interaction) : null,
  };
}

async function getBundleTargetWordIds(bundleId: string): Promise<Set<number>> {
  const db = createAdminClient();
  const { data: selected } = await db.from('bundle_words').select('word_id').eq('bundle_id', bundleId);
  const selectedIds = (selected || []).map(r => Number(r.word_id)).filter(Boolean);
  if (selectedIds.length > 0) {
    return new Set(selectedIds);
  }
  const { data: items } = await db.from('bundle_items')
    .select('word_id, sentences(word_sentence_map(word_id))')
    .eq('bundle_id', bundleId);
  const ids = new Set<number>();
  for (const item of items || []) {
    if (item.word_id) ids.add(Number(item.word_id));
    const sentence: any = Array.isArray(item.sentences) ? item.sentences[0] : item.sentences;
    for (const map of sentence?.word_sentence_map || []) {
      if (map.word_id) ids.add(Number(map.word_id));
    }
  }
  return ids;
}

async function getStudiedWordIdsForBundle(userId: string, bundleId: string): Promise<Set<number>> {
  const db = createAdminClient();
  const [bundleInteractionRes, itemInteractionsRes] = await Promise.all([
    db.from('user_bundle_interactions').select('metadata').eq('user_id', userId).eq('bundle_id', bundleId).maybeSingle(),
    db.from('user_bundle_item_interactions')
      .select('bundle_item_id, last_practiced_at, is_completed, last_played_at')
      .eq('user_id', userId).eq('bundle_id', bundleId),
  ]);

  const studiedWordIds = new Set<number>();
  const completedIds = getCompletedBundleWordIds(bundleInteractionRes.data?.metadata);
  for (const id of completedIds) studiedWordIds.add(id);

  const practicedItemIds = (itemInteractionsRes.data || [])
    .filter(row => row.last_practiced_at || row.is_completed || row.last_played_at)
    .map(row => row.bundle_item_id);

  if (practicedItemIds.length > 0) {
    const { data: bundleItems } = await db.from('bundle_items')
      .select('word_id')
      .in('id', practicedItemIds);

    // Sentence activity does not establish practice of each word in the sentence.
    for (const item of bundleItems || []) {
      if (item.word_id) studiedWordIds.add(Number(item.word_id));
    }
  }

  return studiedWordIds;
}

export async function getReviewSentences(userId: string, limit = 20, scope: Scope = 'review', details = true, bundleId?: string): Promise<ReviewSentenceItem[]> {
  if (!Number.isFinite(limit) || limit <= 0) return [];
  const { candidates, now } = await sentenceCatalog(userId);
  const filtered = bundleId ? candidates.filter(row => row.item.bundle_id === bundleId) : candidates;
  const items = filtered.filter(row => inScope(row.interaction, scope, now)).slice(0, Math.floor(limit)).map(row => row.item);
  if (!details || !items.length) return items;
  const data: { id: number; word_sentence_map: ReviewSentenceWordMap[] }[] = [];
  for (let offset = 0; offset < items.length; offset += 100) {
    data.push(...await readAll<{ id: number; word_sentence_map: ReviewSentenceWordMap[] }>((from, to) => createAdminClient().from('sentences')
      .select('id, word_sentence_map(id, used_as, word_id, words(id, word, meaning_ko, meaning_en, pos, words_distractor(distractor, meaning_ko, meaning_en)))')
      .in('id', items.slice(offset, offset + 100).map(item => item.id)).order('id').range(from, to)));
  }
  const byId = new Map((data || []).map(row => [Number(row.id), row.word_sentence_map]));
  return items.map(item => ({ ...item, word_maps: (byId.get(item.id) || []) as ReviewSentenceWordMap[] }));
}

export async function getReviewWords(userId: string, limit = 20, scope: Scope = 'review', bundleId?: string): Promise<ReviewWordItem[]> {
  if (!Number.isFinite(limit) || limit <= 0) return [];
  const { candidates, now } = await wordCatalog(userId);
  let pool = candidates;
  if (bundleId) {
    const [bundleWordIds, studiedWordIds] = await Promise.all([
      getBundleTargetWordIds(bundleId),
      getStudiedWordIdsForBundle(userId, bundleId),
    ]);
    pool = candidates.filter(row => bundleWordIds.has(row.item.id) && studiedWordIds.has(row.item.id));
  }
  const items = pool.filter(row => inScope(row.interaction, scope, now)).slice(0, Math.floor(limit)).map(row => row.item);
  if (!items.length) return items;
  const data = await readAll<{ id: number; words_distractor: NonNullable<ReviewWordItem['distractors']> }>((from, to) => createAdminClient().from('words').select('id, words_distractor(distractor, meaning_ko, meaning_en)')
    .in('id', items.map(item => item.id)).order('id').range(from, to));
  const byId = new Map((data || []).map(row => [Number(row.id), row.words_distractor]));
  return items.map(item => ({ ...item, distractors: byId.get(item.id) || [] }));
}

export async function getReviewSentenceOptionPool(userId: string, limit = 40): Promise<ReviewSentenceItem[]> {
  const { candidates } = await sentenceCatalog(userId);
  return candidates.slice(0, limit).map(row => row.item);
}

export async function getReviewWordOptionPool(userId: string, limit = 40): Promise<ReviewWordItem[]> {
  const { candidates } = await wordCatalog(userId);
  const items = candidates.slice(0, limit).map(row => row.item);
  if (!items.length) return items;
  const data = await readAll<{ id: number; words_distractor: NonNullable<ReviewWordItem['distractors']> }>((from, to) => createAdminClient().from('words').select('id, words_distractor(distractor, meaning_ko, meaning_en)')
    .in('id', items.map(item => item.id)).order('id').range(from, to));
  const byId = new Map((data || []).map(row => [Number(row.id), row.words_distractor]));
  return items.map(item => ({ ...item, distractors: byId.get(item.id) || [] }));
}

export async function getBundleReviewSummary(userId: string, bundleId: string): Promise<{
  availableSentences: number;
  availableWords: number;
  availableTotal: number;
  nextReviewAt: string | null;
}> {
  const [sentences, words, bundleWordIds, studiedWordIds] = await Promise.all([
    sentenceCatalog(userId),
    wordCatalog(userId),
    getBundleTargetWordIds(bundleId),
    getStudiedWordIdsForBundle(userId, bundleId),
  ]);
  const dueSentences = sentences.candidates
    .filter(row => row.item.bundle_id === bundleId)
    .filter(row => inScope(row.interaction, 'review', sentences.now));
  const dueWords = words.candidates
    .filter(row => bundleWordIds.has(row.item.id) && studiedWordIds.has(row.item.id))
    .filter(row => inScope(row.interaction, 'review', words.now));

  const future = [
    ...sentences.candidates.filter(row => row.item.bundle_id === bundleId),
    ...words.candidates.filter(row => bundleWordIds.has(row.item.id) && studiedWordIds.has(row.item.id)),
  ]
    .filter(row => row.interaction.proficiency_level > 0 || row.interaction.incorrect_count > 0)
    .map(row => getReviewDueAt(row.interaction))
    .filter((date): date is Date => Boolean(date && date.getTime() > Math.max(sentences.now.getTime(), words.now.getTime())))
    .sort((a, b) => a.getTime() - b.getTime());

  return {
    availableSentences: dueSentences.length,
    availableWords: dueWords.length,
    availableTotal: dueSentences.length + dueWords.length,
    nextReviewAt: future[0]?.toISOString() || null,
  };
}

export interface ReviewDueBundle {
  id: string;
  thumbnail_url: string | null;
  title: string;
  title_en: string | null;
  category_name: string;
  category_name_en: string | null;
  category_icon: string | null;
  availableSentences: number;
  availableWords: number;
  availableTotal: number;
  mostUrgentDueAt: string | null;
  hasIncorrect: boolean;
  lowestLevel: number;
  lastStudiedAt: string | null;
}

export async function getReviewBundlesSummary(userId: string): Promise<ReviewDueBundle[]> {
  const db = createAdminClient();
  const [sentences, words, userBundleInteractions, practicedItemInteractions] = await Promise.all([
    sentenceCatalog(userId),
    wordCatalog(userId),
    readAll<{ bundle_id: string; last_studied_at: string | null; is_started: boolean; started_at: string | null; metadata: any }>((from, to) =>
      db.from('user_bundle_interactions').select('bundle_id, last_studied_at, is_started, started_at, metadata').eq('user_id', userId).order('id').range(from, to)
    ),
    readAll<{ bundle_id: string; bundle_item_id: string }>((from, to) =>
      db.from('user_bundle_item_interactions')
        .select('bundle_id, bundle_item_id')
        .eq('user_id', userId)
        .or('last_practiced_at.not.is.null,is_completed.eq.true,last_played_at.not.is.null')
        .order('id')
        .range(from, to)
    ),
  ]);

  const dueSentences = sentences.candidates.filter(row => inScope(row.interaction, 'review', sentences.now));
  const dueWords = words.candidates.filter(row => inScope(row.interaction, 'review', words.now));

  if (!dueSentences.length && !dueWords.length) {
    return [];
  }

  const studiedBundleIds = new Set(
    userBundleInteractions
      .filter(row => row.is_started || row.started_at || row.last_studied_at)
      .map(row => row.bundle_id)
  );
  for (const s of dueSentences) {
    if (s.item.bundle_id) studiedBundleIds.add(s.item.bundle_id);
  }

  const bundleIds = [...studiedBundleIds];
  if (!bundleIds.length) return [];

  const bundlesData: any[] = [];
  for (let i = 0; i < bundleIds.length; i += 100) {
    const slice = bundleIds.slice(i, i + 100);
    const { data } = await db
      .from('bundle')
      .select('id, title, title_en, thumbnail_url, is_published, access_level, bundle_category(name, name_en, icon_image_url)')
      .in('id', slice)
      .eq('is_published', true);
    if (data) bundlesData.push(...data);
  }

  const user = { id: userId };
  const accessibleBundles = [];
  for (const bundle of bundlesData) {
    const access = await getBundleAccess(bundle, user);
    if (access.canView) accessibleBundles.push(bundle);
  }

  const accessibleBundleIds = accessibleBundles.map(b => b.id);
  if (!accessibleBundleIds.length) return [];

  // Group practiced bundle item IDs by bundle
  const practicedItemsByBundle = new Map<string, string[]>();
  for (const row of practicedItemInteractions) {
    const bId = String(row.bundle_id);
    const list = practicedItemsByBundle.get(bId) || [];
    list.push(row.bundle_item_id);
    practicedItemsByBundle.set(bId, list);
  }

  const allPracticedItemIds = practicedItemInteractions.map(r => r.bundle_item_id);

  const [selectedWordsRes, bundleItemsRes, practicedBundleItemsRes] = await Promise.all([
    db.from('bundle_words').select('bundle_id, word_id').in('bundle_id', accessibleBundleIds),
    db.from('bundle_items').select('bundle_id, word_id, sentences(word_sentence_map(word_id))').in('bundle_id', accessibleBundleIds),
    allPracticedItemIds.length > 0
      ? db.from('bundle_items').select('id, bundle_id, word_id').in('id', allPracticedItemIds.slice(0, 500))
      : Promise.resolve({ data: [] }),
  ]);

  const selectedWordsByBundle = new Map<string, number[]>();
  for (const row of selectedWordsRes.data || []) {
    const bId = String(row.bundle_id);
    const list = selectedWordsByBundle.get(bId) || [];
    if (row.word_id) list.push(Number(row.word_id));
    selectedWordsByBundle.set(bId, list);
  }

  const itemWordsByBundle = new Map<string, Set<number>>();
  for (const item of bundleItemsRes.data || []) {
    const bId = String(item.bundle_id);
    const set = itemWordsByBundle.get(bId) || new Set<number>();
    if (item.word_id) set.add(Number(item.word_id));
    const sentence: any = Array.isArray(item.sentences) ? item.sentences[0] : item.sentences;
    for (const map of sentence?.word_sentence_map || []) {
      if (map.word_id) set.add(Number(map.word_id));
    }
    itemWordsByBundle.set(bId, set);
  }

  // Only direct word items establish word activity; sentence mappings do not.
  const practicedWordsByBundle = new Map<string, Set<number>>();
  for (const item of (practicedBundleItemsRes.data || []) as any[]) {
    const bId = String(item.bundle_id);
    const set = practicedWordsByBundle.get(bId) || new Set<number>();
    if (item.word_id) set.add(Number(item.word_id));
    practicedWordsByBundle.set(bId, set);
  }

  const lastStudiedByBundle = new Map(userBundleInteractions.map(r => [r.bundle_id, r.last_studied_at]));
  const metadataByBundle = new Map(userBundleInteractions.map(r => [r.bundle_id, r.metadata]));
  const dueWordMap = new Map(dueWords.map(w => [w.item.id, w]));

  const result: ReviewDueBundle[] = [];

  for (const bundle of accessibleBundles) {
    const bId = bundle.id;
    const bDueSentences = dueSentences.filter(s => s.item.bundle_id === bId);

    const selectedWords = selectedWordsByBundle.get(bId) || [];
    const targetWordSet = selectedWords.length > 0 ? new Set(selectedWords) : (itemWordsByBundle.get(bId) || new Set<number>());

    // Only count words that were actually practiced/completed in this bundle!
    const bundleMetadata = metadataByBundle.get(bId);
    const completedWordIds = new Set(getCompletedBundleWordIds(bundleMetadata));
    const practicedWords = practicedWordsByBundle.get(bId) || new Set<number>();

    const bDueWords: typeof dueWords = [];
    for (const wordId of targetWordSet) {
      const match = dueWordMap.get(wordId);
      // Word must be due AND must have been practiced/completed within this bundle
      if (match && (completedWordIds.has(wordId) || practicedWords.has(wordId))) {
        bDueWords.push(match);
      }
    }

    const availableSentences = bDueSentences.length;
    const availableWords = bDueWords.length;
    const availableTotal = availableSentences + availableWords;

    if (availableTotal === 0) continue;

    const allDueRows = [...bDueSentences, ...bDueWords];
    const hasIncorrect = allDueRows.some(r => r.interaction.metadata?.last_practice_is_correct === false);
    const lowestLevel = Math.min(...allDueRows.map(r => r.interaction.proficiency_level));

    const dueDates = allDueRows
      .map(r => getReviewDueAt(r.interaction))
      .filter((d): d is Date => Boolean(d))
      .sort((a, b) => a.getTime() - b.getTime());

    const category = single(bundle.bundle_category);

    result.push({
      id: bId,
      title: bundle.title || '',
      title_en: bundle.title_en || null,
      thumbnail_url: bundle.thumbnail_url || null,
      category_name: category?.name || '',
      category_name_en: category?.name_en || null,
      category_icon: category?.icon_image_url || null,
      availableSentences,
      availableWords,
      availableTotal,
      mostUrgentDueAt: dueDates[0]?.toISOString() || null,
      hasIncorrect,
      lowestLevel,
      lastStudiedAt: lastStudiedByBundle.get(bId) || null,
    });
  }

  return result.sort((a, b) => {
    if (a.mostUrgentDueAt && b.mostUrgentDueAt) {
      const cmp = a.mostUrgentDueAt.localeCompare(b.mostUrgentDueAt);
      if (cmp !== 0) return cmp;
    } else if (a.mostUrgentDueAt || b.mostUrgentDueAt) {
      return a.mostUrgentDueAt ? -1 : 1;
    }
    if (a.hasIncorrect !== b.hasIncorrect) {
      return a.hasIncorrect ? -1 : 1;
    }
    if (a.lowestLevel !== b.lowestLevel) {
      return a.lowestLevel - b.lowestLevel;
    }
    if (a.availableTotal !== b.availableTotal) {
      return b.availableTotal - a.availableTotal;
    }
    return (b.lastStudiedAt || '').localeCompare(a.lastStudiedAt || '');
  });
}

export async function getSentenceReviewSession(userId: string, language: 'ko' | 'en', bundleId?: string, optionPool?: ReviewSentenceItem[]) {
  const items = await getReviewSentences(userId, Number.MAX_SAFE_INTEGER, 'review', true, bundleId);
  return buildSentenceReviewSession(items, language, optionPool);
}
