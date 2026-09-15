'use server';

import { cache } from 'react';
import { getBundleAccess } from '@/lib/bundle-access';
import { formatWordMeaning } from '@/lib/word-meaning';
import { createAdminClient } from '@/lib/supabase/admin';
import { getReviewDueAt, isReviewDue } from '@/lib/learning/review-schedule';

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

const REVIEW_RECOMMENDATION_LIMIT = 20;
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
type SentenceContent = Pick<ReviewSentenceItem, 'id' | 'sentence' | 'translation' | 'translation_en' | 'audio_url'>;
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
  return candidates.sort((a, b) =>
    a.interaction.proficiency_level - b.interaction.proficiency_level
    || b.interaction.incorrect_count - a.interaction.incorrect_count
    || (a.interaction.last_reviewed_at || '').localeCompare(b.interaction.last_reviewed_at || '')
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
    } });
  }
  return { candidates: prioritize(candidates), now: reviewClock() };
});

const wordCatalog = cache(async (userId: string) => {
  const db = createAdminClient();
  type Word = Pick<ReviewWordItem, 'id' | 'word' | 'lang_code' | 'pos' | 'audio_url'> & { meaning_ko: unknown; meaning_en: unknown; words_distractor?: ReviewWordItem['distractors'] };
  const rows = await readAll<Interaction & { word_id: number; words: Word | Word[] | null }>((from, to) => db
    .from('user_word_interactions')
    .select('id, word_id, proficiency_level, incorrect_count, streak_count, last_reviewed_at, metadata, words(id, word, lang_code, meaning_ko, meaning_en, pos, audio_url, words_distractor(distractor, meaning_ko, meaning_en))')
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
  };
}

export async function getReviewSentences(userId: string, limit = 20, scope: Scope = 'review'): Promise<ReviewSentenceItem[]> {
  if (!Number.isFinite(limit) || limit <= 0) return [];
  const { candidates, now } = await sentenceCatalog(userId);
  return candidates.filter(row => inScope(row.interaction, scope, now)).slice(0, Math.floor(limit)).map(row => row.item);
}

export async function getReviewWords(userId: string, limit = 20, scope: Scope = 'review'): Promise<ReviewWordItem[]> {
  if (!Number.isFinite(limit) || limit <= 0) return [];
  const { candidates, now } = await wordCatalog(userId);
  return candidates.filter(row => inScope(row.interaction, scope, now)).slice(0, Math.floor(limit)).map(row => row.item);
}
