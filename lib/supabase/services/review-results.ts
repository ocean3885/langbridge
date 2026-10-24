import { createAdminClient } from '@/lib/supabase/admin';
import { getBundleAccess } from '@/lib/bundle-access';
import { calculateBundleCompletion } from '@/lib/practice/bundle-completion';
import { getCompletedBundleWordIds } from '@/lib/practice/bundle-word-progress';
import { hasEarnedPracticeStar } from '@/lib/practice/progress';
import { getEligiblePracticeItems, getWordFillMapCandidates } from '@/lib/practice/registry';
import { isReviewDue } from '@/lib/learning/review-schedule';
import { nextReviewMetadata, nextReviewProficiency, type ReviewResult } from '@/lib/learning/review-result';
import { loadBundleCompletion } from './bundle-completion';

export class ReviewWriteError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

export async function saveReviewResult(user: { id: string; email?: string | null }, payload: ReviewResult) {
  const db = createAdminClient();
  const { data: previous, error: previousError } = await db.from('user_review_attempts').select('payload')
    .eq('user_id', user.id).eq('attempt_id', payload.attemptId).maybeSingle();
  if (previousError) throw new ReviewWriteError('Review storage is unavailable. Please try again later.', 503);
  if (previous) {
    // Let the RPC compare jsonb equality rather than JS object key order.
    const { data, error } = await db.rpc('commit_review_attempt', { p_user_id: user.id, p_payload: payload, p_changes: [], p_deltas: {} });
    if (error) throw new ReviewWriteError('This attempt has already been submitted with different data.', 409);
    return data;
  }
  const read = async (table: string, key: string, id: string | number) => {
    const { data, error } = await db.from(table).select('*').eq('user_id', user.id).eq(key, id).maybeSingle();
    if (error) throw error;
    return data;
  };

  for (let retry = 0; retry < 4; retry++) {
    const now = new Date().toISOString();
    const changes: Array<{ table: string; key: string; before: any; values: any }> = [];
    const add = (table: string, key: string | number, before: any, values: any) => changes.push({ table, key: String(key), before: before || null, values });
    const deltas = { stars: 0, sentences: 0, words: 0, dailyWords: 0, masteredWords: 0, masteredSentences: 0 };
    const primaryTable = payload.type === 'words' ? 'user_word_interactions' : 'user_sentence_interactions';
    const primary = await read(primaryTable, payload.type === 'words' ? 'word_id' : 'sentence_id', payload.targetId);
    // A different tab may already have reviewed this target. Do not silently
    // turn a stale review session into another proficiency increment.
    if (!primary || primary.proficiency_level >= 5 || !isReviewDue(primary)
      || !(primary.proficiency_level > 0 || primary.incorrect_count > 0 || primary.metadata?.last_practice_is_correct === false)) {
      // A simultaneous duplicate may have committed since our first lookup.
      const { data, error } = await db.rpc('commit_review_attempt', { p_user_id: user.id, p_payload: payload, p_changes: [], p_deltas: {} });
      if (!error) return data;
      throw new ReviewWriteError('This item has changed. Return to review to load the latest items.', 409);
    }
    const correct = payload.correct;
    const result = nextReviewProficiency(primary, payload.mode, correct, now);
    add(primaryTable, payload.targetId, primary, result);
    if (payload.type === 'words') {
      result.metadata = { ...result.metadata,
        standalone_correct_count: Number(primary.metadata?.standalone_correct_count || 0) + Number(correct),
        standalone_incorrect_count: Number(primary.metadata?.standalone_incorrect_count || 0) + Number(!correct) };
      deltas.words = Number(!primary.last_reviewed_at);
      const localDay = (date: string) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date(date));
      deltas.dailyWords = Number(!primary.last_reviewed_at || localDay(primary.last_reviewed_at) !== localDay(now));
      deltas.masteredWords = Number(primary.proficiency_level < 5 && result.proficiency_level >= 5);
    } else {
      const { data: bundle, error } = await db.from('bundle').select('id, is_published, access_level').eq('id', payload.bundleId!).maybeSingle();
      if (error) throw error;
      if (!bundle || !(await getBundleAccess(bundle, user)).canView) throw new ReviewWriteError('This bundle is no longer accessible.', 403);
      const bundleBefore = await read('user_bundle_interactions', 'bundle_id', payload.bundleId!);
      const state = (await loadBundleCompletion(user.id, [payload.bundleId!])).get(payload.bundleId!)!;
      const item = state.items.find((row: any) => row.id === payload.bundleItemId);
      if (!item || String(item.sentence_id) !== payload.targetId || !getEligiblePracticeItems([item], payload.mode, 'ko').length) {
        throw new ReviewWriteError('This question is no longer available.', 409);
      }
      const itemBefore = state.interactions.find((row: any) => row.bundle_item_id === payload.bundleItemId) || null;
      if (!bundleBefore?.is_started && !bundleBefore?.last_studied_at && !itemBefore?.last_practiced_at && !itemBefore?.last_played_at) throw new ReviewWriteError('Study this bundle before reviewing it.', 403);
      const itemResult = { bundle_id: payload.bundleId, is_completed: Boolean(itemBefore?.is_completed || correct),
        completed_at: itemBefore?.completed_at || (correct ? now : null), correct_count: Number(itemBefore?.correct_count || 0) + Number(correct),
        incorrect_count: Number(itemBefore?.incorrect_count || 0) + Number(!correct), last_practiced_at: now, updated_at: now,
        metadata: nextReviewMetadata(itemBefore?.metadata, payload.mode, correct, now) };
      add('user_bundle_item_interactions', payload.bundleItemId!, itemBefore, itemResult);
      // Completion depends on the other items as well: check their snapshots.
      for (const row of state.interactions) if (row.bundle_item_id !== payload.bundleItemId) add('user_bundle_item_interactions', row.bundle_item_id, row, {});
      let metadata = bundleBefore?.metadata || {};
      if (payload.mode === 'wordfill') {
        const maps = getWordFillMapCandidates(item.sentences.sentence, item.sentences.word_sentence_map || []);
        if (!maps.some(map => Number(map.words.id) === payload.wordId)) throw new ReviewWriteError('Invalid word for this question.', 400);
        const wordBefore = await read('user_word_interactions', 'word_id', payload.wordId!);
        const wordResult = nextReviewProficiency(wordBefore, payload.mode, correct, now);
        // Secondary effects must not increment standalone answer statistics.
        add('user_word_interactions', payload.wordId!, wordBefore, wordResult);
        if (correct) metadata = { ...metadata, completed_word_ids: [...new Set([...getCompletedBundleWordIds(metadata), payload.wordId!])] };
      }
      const interactions = [...state.interactions.filter((row: any) => row.bundle_item_id !== payload.bundleItemId), { ...itemBefore, ...itemResult, bundle_item_id: payload.bundleItemId! }];
      const completion = calculateBundleCompletion(state.items, interactions, [], state.selectedWordIds, 'ko', metadata);
      add('user_bundle_interactions', payload.bundleId!, bundleBefore, { metadata, is_started: true,
        started_at: bundleBefore?.started_at || now, last_studied_at: now, updated_at: now,
        current_practice_item_ids: { ...bundleBefore?.current_practice_item_ids, [payload.mode]: payload.bundleItemId },
        is_completed: completion.isCompleted, progress_ratio: completion.progressRatio,
        completed_at: completion.isCompleted ? bundleBefore?.completed_at || now : null });
      deltas.sentences = Number(!itemBefore?.is_completed && correct);
      deltas.stars = Number(correct && !hasEarnedPracticeStar(itemBefore?.metadata, payload.mode));
      deltas.masteredSentences = Number(primary.proficiency_level < 5 && result.proficiency_level >= 5);
    }
    const { data, error } = await db.rpc('commit_review_attempt', { p_user_id: user.id, p_payload: payload, p_changes: changes, p_deltas: deltas });
    if (!error) return data;
    if (error.code === '40001') continue;
    if (error.code === '23505') throw new ReviewWriteError('This question was already submitted.', 409);
    console.error('Atomic review write failed:', error.code);
    throw new ReviewWriteError('The answer could not be saved. Please retry.', 503);
  }
  throw new ReviewWriteError('Your progress changed during saving. Please retry.', 503);
}
