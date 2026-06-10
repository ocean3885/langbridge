'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import {
  recordLearningDailyActivity,
  type LearningActivityType,
} from '@/lib/supabase/services/learning-daily-activity';

export interface UserBundleInteraction {
  id: string;
  user_id: string;
  bundle_id: string;
  is_pinned: boolean;
  is_started: boolean;
  is_completed: boolean;
  progress_ratio: number;
  current_bundle_item_id: string | null;
  current_practice_item_ids: Record<string, string> | null;
  started_at: string | null;
  completed_at: string | null;
  last_studied_at: string | null;
  memo: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface UserBundleItemInteraction {
  id: string;
  user_id: string;
  bundle_id: string;
  bundle_item_id: string;
  is_completed: boolean;
  play_count: number;
  repeat_count: number;
  correct_count: number;
  incorrect_count: number;
  last_played_at: string | null;
  last_practiced_at: string | null;
  completed_at: string | null;
  memo: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface BundleProgressSummary {
  bundleInteraction: UserBundleInteraction | null;
  itemInteractions: UserBundleItemInteraction[];
  totalItems: number;
  completedItems: number;
  progressRatio: number;
  progressPercent: number;
  currentBundleItemId: string | null;
  currentPracticeItemIds: Record<string, string>;
}

export type BundlePracticeMode = 'flashcards' | 'quiz' | 'scramble' | (string & {});

export interface RecentStudiedBundle {
  interaction: UserBundleInteraction;
  bundle: {
    id: string;
    title: string;
    title_en: string | null;
    description: string | null;
    description_en: string | null;
    level: number | null;
    thumbnail_url: string | null;
    bundle_category?: {
      id: string;
      name: string | null;
      name_en: string | null;
    } | null;
    bundle_type?: {
      id: string;
      name: string | null;
      code: string | null;
    } | null;
  };
  currentItem: {
    id: string;
    order_index: number | null;
    sentence?: {
      sentence: string | null;
      translation: string | null;
      translation_en: string | null;
    } | null;
  } | null;
  totalItems: number;
  completedItems: number;
  progressPercent: number;
}

export interface RecentLearningActivity {
  interaction: UserBundleInteraction;
  bundle: {
    id: string;
    title: string;
    title_en: string | null;
    thumbnail_url: string | null;
    bundle_category?: {
      id: string;
      name: string | null;
      name_en: string | null;
    } | null;
    bundle_type?: {
      id: string;
      name: string | null;
      code: string | null;
    } | null;
  };
  totalItems: number;
  completedItems: number;
  progressPercent: number;
}

export interface LearningProgressSummary {
  completedSentences: number;
  earnedStars: number;
  practicedWords: number;
  practiceAccuracyPercent: number;
  completedBundles: number;
  activeBundles: number;
}

interface LearningStatsValues {
  completed_sentences: number;
  earned_stars: number;
  practiced_words: number;
  total_correct_count: number;
  total_incorrect_count: number;
}

interface LearningStatsDelta {
  completedSentences: number;
  earnedStars: number;
  practicedWords: number;
  totalCorrect: number;
  totalIncorrect: number;
}

const LEARNING_PROGRESS_STARS = {
  quiz: 1,
  scramble: 2,
  wordfill: 1,
} satisfies Record<string, number>;

export async function getLearningProgressSummary(userId: string): Promise<LearningProgressSummary> {
  const supabase = createAdminClient();
  const bundleCounts = await getLearningProgressBundleCounts(supabase, userId);

  const { data: stats, error: statsError } = await supabase
    .from('user_learning_stats')
    .select('completed_sentences, earned_stars, practiced_words, total_correct_count, total_incorrect_count')
    .eq('user_id', userId)
    .maybeSingle();

  if (statsError) {
    console.error('Error fetching learning stats:', statsError);
    return calculateLearningProgressSummaryFromInteractions(supabase, userId, bundleCounts);
  }

  if (stats) {
    return toLearningProgressSummary(stats as LearningStatsValues, bundleCounts);
  }

  try {
    const seededStats = await seedLearningStatsFromInteractions(supabase, userId);
    return toLearningProgressSummary(seededStats, bundleCounts);
  } catch {
    return calculateLearningProgressSummaryFromInteractions(supabase, userId, bundleCounts);
  }
}

async function calculateLearningProgressSummaryFromInteractions(
  supabase: ReturnType<typeof createAdminClient>,
  userId: string,
  bundleCounts: Pick<LearningProgressSummary, 'completedBundles' | 'activeBundles'>,
): Promise<LearningProgressSummary> {
  return toLearningProgressSummary(await calculateLearningStatsFromInteractions(supabase, userId), bundleCounts);
}

async function calculateLearningStatsFromInteractions(
  supabase: ReturnType<typeof createAdminClient>,
  userId: string,
): Promise<LearningStatsValues> {
  const [
    { data: itemInteractions, error: itemInteractionsError },
    { count: practicedWords, error: practicedWordsError },
  ] = await Promise.all([
    supabase
      .from('user_bundle_item_interactions')
      .select('is_completed, correct_count, incorrect_count, metadata')
      .eq('user_id', userId),
    supabase
      .from('user_word_interactions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId),
  ]);

  if (itemInteractionsError) {
    console.error('Error fetching learning progress item interactions:', itemInteractionsError);
    return {
      completed_sentences: 0,
      earned_stars: 0,
      practiced_words: 0,
      total_correct_count: 0,
      total_incorrect_count: 0,
    };
  }

  if (practicedWordsError) {
    console.error('Error counting practiced words:', practicedWordsError);
  }

  const rows = (itemInteractions || []) as Array<{
    is_completed: boolean | null;
    correct_count: number | null;
    incorrect_count: number | null;
    metadata: Record<string, unknown> | null;
  }>;
  const completedSentences = rows.filter((row) => row.is_completed).length;
  const totalCorrect = rows.reduce((total, row) => total + Number(row.correct_count || 0), 0);
  const totalIncorrect = rows.reduce((total, row) => total + Number(row.incorrect_count || 0), 0);
  const earnedStars = rows.reduce((total, row) => total + calculateEarnedStarsFromMetadata(row.metadata), 0);

  return {
    completed_sentences: completedSentences,
    earned_stars: earnedStars,
    practiced_words: practicedWords || 0,
    total_correct_count: totalCorrect,
    total_incorrect_count: totalIncorrect,
  };
}

async function seedLearningStatsFromInteractions(
  supabase: ReturnType<typeof createAdminClient>,
  userId: string,
): Promise<LearningStatsValues> {
  const calculatedStats = await calculateLearningStatsFromInteractions(supabase, userId);
  const { error: insertError } = await supabase
    .from('user_learning_stats')
    .insert({
      user_id: userId,
      ...calculatedStats,
      metadata: {
        seeded_from_interactions_at: new Date().toISOString(),
      },
    });

  if (insertError && insertError.code !== '23505') {
    console.error('Error seeding learning stats:', insertError);
    throw insertError;
  }

  if (insertError?.code === '23505') {
    const { data: existingStats, error: existingError } = await supabase
      .from('user_learning_stats')
      .select('completed_sentences, earned_stars, practiced_words, total_correct_count, total_incorrect_count')
      .eq('user_id', userId)
      .maybeSingle();

    if (existingError) {
      console.error('Error fetching concurrently seeded learning stats:', existingError);
      return calculatedStats;
    }

    if (existingStats) return existingStats as LearningStatsValues;
  }

  return calculatedStats;
}

async function ensureLearningStatsBaseline(
  supabase: ReturnType<typeof createAdminClient>,
  userId: string,
) {
  const { data: existingStats, error: existingError } = await supabase
    .from('user_learning_stats')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle();

  if (existingError) {
    console.error('Error checking learning stats baseline:', existingError);
    return false;
  }

  if (existingStats) return true;

  try {
    await seedLearningStatsFromInteractions(supabase, userId);
    return true;
  } catch {
    return false;
  }
}

async function safeIncrementLearningStats(
  supabase: ReturnType<typeof createAdminClient>,
  userId: string,
  delta: LearningStatsDelta,
) {
  if (!hasLearningStatsDelta(delta)) return;

  try {
    const { error } = await supabase.rpc('increment_user_learning_stats', {
      p_user_id: userId,
      p_completed_sentences_delta: delta.completedSentences,
      p_earned_stars_delta: delta.earnedStars,
      p_practiced_words_delta: delta.practicedWords,
      p_total_correct_delta: delta.totalCorrect,
      p_total_incorrect_delta: delta.totalIncorrect,
    });

    if (error) {
      console.error('Error incrementing learning stats:', error);
    }
  } catch (error) {
    console.error('Error incrementing learning stats:', error);
  }
}

function hasLearningStatsDelta(delta: LearningStatsDelta) {
  return (
    delta.completedSentences > 0 ||
    delta.earnedStars > 0 ||
    delta.practicedWords > 0 ||
    delta.totalCorrect > 0 ||
    delta.totalIncorrect > 0
  );
}

async function getLearningProgressBundleCounts(
  supabase: ReturnType<typeof createAdminClient>,
  userId: string,
): Promise<Pick<LearningProgressSummary, 'completedBundles' | 'activeBundles'>> {
  const [
    { count: completedBundles, error: completedError },
    { count: activeBundles, error: activeError },
  ] = await Promise.all([
    supabase
      .from('user_bundle_interactions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_completed', true),
    supabase
      .from('user_bundle_interactions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_started', true)
      .eq('is_completed', false),
  ]);

  if (completedError) {
    console.error('Error counting completed bundles:', completedError);
  }

  if (activeError) {
    console.error('Error counting active bundles:', activeError);
  }

  return {
    completedBundles: completedBundles || 0,
    activeBundles: activeBundles || 0,
  };
}

function toLearningProgressSummary(
  stats: LearningStatsValues,
  bundleCounts: Pick<LearningProgressSummary, 'completedBundles' | 'activeBundles'>,
): LearningProgressSummary {
  const totalAttempts = stats.total_correct_count + stats.total_incorrect_count;

  return {
    completedSentences: stats.completed_sentences,
    earnedStars: stats.earned_stars,
    practicedWords: stats.practiced_words,
    practiceAccuracyPercent: totalAttempts > 0 ? Math.round((stats.total_correct_count / totalAttempts) * 100) : 0,
    completedBundles: bundleCounts.completedBundles,
    activeBundles: bundleCounts.activeBundles,
  };
}

export async function getRecentStudiedBundle(userId: string): Promise<RecentStudiedBundle | null> {
  const supabase = createAdminClient();

  const { data: interaction, error: interactionError } = await supabase
    .from('user_bundle_interactions')
    .select('*')
    .eq('user_id', userId)
    .not('last_studied_at', 'is', null)
    .order('last_studied_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (interactionError) {
    console.error('Error fetching recent bundle interaction:', interactionError);
    return null;
  }

  if (!interaction?.bundle_id) {
    return null;
  }

  const [
    { data: bundle, error: bundleError },
    { data: currentItem, error: currentItemError },
    { count: totalItems, error: totalError },
    { count: completedItems, error: completedError },
  ] = await Promise.all([
    supabase
      .from('bundle')
      .select(`
        id,
        title,
        title_en,
        description,
        description_en,
        level,
        thumbnail_url,
        bundle_category(id, name, name_en),
        bundle_type(id, name, code)
      `)
      .eq('id', interaction.bundle_id)
      .maybeSingle(),
    interaction.current_bundle_item_id
      ? supabase
          .from('bundle_items')
          .select('id, order_index, sentences(sentence, translation, translation_en)')
          .eq('id', interaction.current_bundle_item_id)
          .eq('bundle_id', interaction.bundle_id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    supabase
      .from('bundle_items')
      .select('id', { count: 'exact', head: true })
      .eq('bundle_id', interaction.bundle_id),
    supabase
      .from('user_bundle_item_interactions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('bundle_id', interaction.bundle_id)
      .eq('is_completed', true),
  ]);

  if (bundleError || !bundle) {
    console.error('Error fetching recent bundle:', bundleError);
    return null;
  }

  if (currentItemError) {
    console.error('Error fetching current bundle item:', currentItemError);
  }

  if (totalError) {
    console.error('Error counting recent bundle items:', totalError);
  }

  if (completedError) {
    console.error('Error counting completed recent bundle items:', completedError);
  }

  const total = totalItems || 0;
  const completed = completedItems || 0;
  const storedRatio = Number(interaction.progress_ratio);
  const calculatedRatio = total > 0 ? completed / total : 0;
  const progressRatio = Number.isFinite(storedRatio) && storedRatio > calculatedRatio ? storedRatio : calculatedRatio;

  const normalizedBundle = {
    ...bundle,
    bundle_category: normalizeSingleRelation(bundle.bundle_category),
    bundle_type: normalizeSingleRelation(bundle.bundle_type),
  } as unknown as RecentStudiedBundle['bundle'];

  return {
    interaction: interaction as UserBundleInteraction,
    bundle: normalizedBundle,
    currentItem: currentItem
      ? {
          id: currentItem.id,
          order_index: currentItem.order_index,
          sentence: normalizeSingleRelation(currentItem.sentences),
        }
      : null,
    totalItems: total,
    completedItems: completed,
    progressPercent: Math.round(progressRatio * 100),
  };
}

export async function getRecentLearningActivities(
  userId: string,
  options: { excludeBundleId?: string | null; limit?: number } = {},
): Promise<RecentLearningActivity[]> {
  const supabase = createAdminClient();
  const limit = Math.max(1, Math.min(options.limit || 4, 12));
  const interactionLimit = Math.min(limit * 3, 24);

  let query = supabase
    .from('user_bundle_interactions')
    .select('*')
    .eq('user_id', userId)
    .not('last_studied_at', 'is', null)
    .order('last_studied_at', { ascending: false })
    .limit(interactionLimit);

  if (options.excludeBundleId) {
    query = query.neq('bundle_id', options.excludeBundleId);
  }

  const { data: interactions, error: interactionError } = await query;

  if (interactionError) {
    console.error('Error fetching recent learning activities:', interactionError);
    return [];
  }

  const bundleInteractions = (interactions || []) as UserBundleInteraction[];
  const bundleIds = bundleInteractions.map((interaction) => interaction.bundle_id).filter(Boolean);

  if (bundleIds.length === 0) {
    return [];
  }

  const [
    { data: bundles, error: bundleError },
    { data: itemRows, error: itemError },
    { data: completedRows, error: completedError },
  ] = await Promise.all([
    supabase
      .from('bundle')
      .select(`
        id,
        title,
        title_en,
        thumbnail_url,
        bundle_category(id, name, name_en),
        bundle_type(id, name, code)
      `)
      .in('id', bundleIds)
      .eq('is_published', true),
    supabase
      .from('bundle_items')
      .select('bundle_id')
      .in('bundle_id', bundleIds),
    supabase
      .from('user_bundle_item_interactions')
      .select('bundle_id')
      .eq('user_id', userId)
      .eq('is_completed', true)
      .in('bundle_id', bundleIds),
  ]);

  if (bundleError) {
    console.error('Error fetching recent learning activity bundles:', bundleError);
    return [];
  }

  if (itemError) {
    console.error('Error counting recent learning activity items:', itemError);
  }

  if (completedError) {
    console.error('Error counting completed recent learning activity items:', completedError);
  }

  const bundleById = new Map(
    (bundles || []).map((bundle) => [
      String(bundle.id),
      {
        ...bundle,
        bundle_category: normalizeSingleRelation(bundle.bundle_category),
        bundle_type: normalizeSingleRelation(bundle.bundle_type),
      } as unknown as RecentLearningActivity['bundle'],
    ]),
  );
  const totalByBundleId = countRowsByBundleId(itemRows || []);
  const completedByBundleId = countRowsByBundleId(completedRows || []);

  return bundleInteractions.flatMap((interaction) => {
    const bundle = bundleById.get(interaction.bundle_id);
    if (!bundle) return [];

    const totalItems = totalByBundleId.get(interaction.bundle_id) || 0;
    const completedItems = completedByBundleId.get(interaction.bundle_id) || 0;
    const storedRatio = Number(interaction.progress_ratio);
    const calculatedRatio = totalItems > 0 ? completedItems / totalItems : 0;
    const progressRatio = Number.isFinite(storedRatio) && storedRatio > calculatedRatio ? storedRatio : calculatedRatio;

    return [{
      interaction,
      bundle,
      totalItems,
      completedItems,
      progressPercent: Math.round(progressRatio * 100),
    }];
  }).slice(0, limit);
}

export async function getBundleProgressSummary(
  userId: string | null | undefined,
  bundleId: string,
  totalItems: number,
): Promise<BundleProgressSummary> {
  if (!userId) {
    return createEmptyBundleProgress(totalItems);
  }

  const supabase = createAdminClient();
  const [{ data: bundleInteraction, error: bundleError }, { data: itemInteractions, error: itemError }] =
    await Promise.all([
      supabase
        .from('user_bundle_interactions')
        .select('*')
        .eq('user_id', userId)
        .eq('bundle_id', bundleId)
        .maybeSingle(),
      supabase
        .from('user_bundle_item_interactions')
        .select('*')
        .eq('user_id', userId)
        .eq('bundle_id', bundleId),
    ]);

  if (bundleError) {
    console.error('Error fetching user bundle interaction:', bundleError);
  }

  if (itemError) {
    console.error('Error fetching user bundle item interactions:', itemError);
  }

  const interactions = (itemInteractions || []) as UserBundleItemInteraction[];
  const completedItems = interactions.filter((item) => item.is_completed).length;
  const storedRatio = Number(bundleInteraction?.progress_ratio);
  const calculatedRatio = totalItems > 0 ? completedItems / totalItems : 0;
  const progressRatio = Number.isFinite(storedRatio) && storedRatio > calculatedRatio ? storedRatio : calculatedRatio;

  return {
    bundleInteraction: (bundleInteraction as UserBundleInteraction | null) || null,
    itemInteractions: interactions,
    totalItems,
    completedItems,
    progressRatio,
    progressPercent: Math.round(progressRatio * 100),
    currentBundleItemId: bundleInteraction?.current_bundle_item_id || null,
    currentPracticeItemIds: normalizePracticeItemIds(bundleInteraction?.current_practice_item_ids),
  };
}

export async function listUserBundleInteractionsForBundles(
  userId: string | null | undefined,
  bundleIds: string[],
): Promise<UserBundleInteraction[]> {
  if (!userId || bundleIds.length === 0) {
    return [];
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('user_bundle_interactions')
    .select('*')
    .eq('user_id', userId)
    .in('bundle_id', bundleIds);

  if (error) {
    console.error('Error fetching user bundle interactions for bundles:', error);
    return [];
  }

  return (data || []) as UserBundleInteraction[];
}

export async function recordBundleStudyAccess(
  userId: string,
  bundleId: string,
  currentBundleItemId: string | null,
) {
  const supabase = createAdminClient();
  const now = new Date().toISOString();

  if (currentBundleItemId) {
    const { data: bundleItem, error: bundleItemError } = await supabase
      .from('bundle_items')
      .select('id')
      .eq('id', currentBundleItemId)
      .eq('bundle_id', bundleId)
      .maybeSingle();

    if (bundleItemError || !bundleItem) {
      throw new Error('Bundle item does not belong to the requested bundle.');
    }
  }

  const { data: existingInteraction, error: existingError } = await supabase
    .from('user_bundle_interactions')
    .select('started_at')
    .eq('user_id', userId)
    .eq('bundle_id', bundleId)
    .maybeSingle();

  if (existingError) {
    console.error('Error fetching user bundle interaction:', existingError);
    throw existingError;
  }

  const { error } = await supabase
    .from('user_bundle_interactions')
    .upsert(
      {
        user_id: userId,
        bundle_id: bundleId,
        is_started: true,
        current_bundle_item_id: currentBundleItemId,
        started_at: existingInteraction?.started_at || now,
        last_studied_at: now,
        updated_at: now,
      },
      {
        onConflict: 'user_id,bundle_id',
      },
    );

  if (error) {
    console.error('Error recording bundle study access:', error);
    throw error;
  }

  await safeRecordLearningDailyActivity({
    userId,
    activityType: 'bundle_study',
    bundleId,
    bundleItemId: currentBundleItemId,
  });
}

export async function updateBundlePinnedState(
  userId: string,
  bundleId: string,
  isPinned: boolean,
) {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('user_bundle_interactions')
    .upsert(
      {
        user_id: userId,
        bundle_id: bundleId,
        is_pinned: isPinned,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'user_id,bundle_id',
      },
    )
    .select()
    .single();

  if (error) {
    console.error('Error updating bundle pinned state:', error);
    throw error;
  }

  return data as UserBundleInteraction;
}

export async function recordBundlePracticeAccess(
  userId: string,
  bundleId: string,
  practiceMode: BundlePracticeMode,
  currentBundleItemId: string,
) {
  const supabase = createAdminClient();
  const now = new Date().toISOString();

  const { data: bundleItem, error: bundleItemError } = await supabase
    .from('bundle_items')
    .select('id')
    .eq('id', currentBundleItemId)
    .eq('bundle_id', bundleId)
    .maybeSingle();

  if (bundleItemError || !bundleItem) {
    throw new Error('Bundle item does not belong to the requested bundle.');
  }

  const { data: existingInteraction, error: existingError } = await supabase
    .from('user_bundle_interactions')
    .select('started_at, current_practice_item_ids')
    .eq('user_id', userId)
    .eq('bundle_id', bundleId)
    .maybeSingle();

  if (existingError) {
    console.error('Error fetching user bundle interaction:', existingError);
    throw existingError;
  }

  const currentPracticeItemIds = {
    ...normalizePracticeItemIds(existingInteraction?.current_practice_item_ids),
    [practiceMode]: currentBundleItemId,
  };

  const { error } = await supabase
    .from('user_bundle_interactions')
    .upsert(
      {
        user_id: userId,
        bundle_id: bundleId,
        is_started: true,
        current_practice_item_ids: currentPracticeItemIds,
        started_at: existingInteraction?.started_at || now,
        last_studied_at: now,
        updated_at: now,
      },
      {
        onConflict: 'user_id,bundle_id',
      },
    );

  if (error) {
    console.error('Error recording bundle practice access:', error);
    throw error;
  }

  await safeRecordLearningDailyActivity({
    userId,
    activityType: 'practice_access',
    bundleId,
    bundleItemId: currentBundleItemId,
    practiceMode,
  });
}

export async function recordBundleItemPractice(
  userId: string,
  bundleId: string,
  bundleItemId: string,
  mode: 'quiz' | 'scramble' | 'wordfill',
  isCorrect: boolean,
  wordId?: number | null,
) {
  const supabase = createAdminClient();
  const now = new Date().toISOString();

  const { data: bundleItem, error: bundleItemError } = await supabase
    .from('bundle_items')
    .select('id, sentence_id')
    .eq('id', bundleItemId)
    .eq('bundle_id', bundleId)
    .maybeSingle();

  if (bundleItemError || !bundleItem) {
    throw new Error('Bundle item does not belong to the requested bundle.');
  }

  const { data: existingItemInteraction, error: existingItemError } = await supabase
    .from('user_bundle_item_interactions')
    .select('*')
    .eq('user_id', userId)
    .eq('bundle_item_id', bundleItemId)
    .maybeSingle();

  if (existingItemError) {
    console.error('Error fetching bundle item interaction:', existingItemError);
    throw existingItemError;
  }

  const wasCompleted = Boolean(existingItemInteraction?.is_completed);
  const isCompleted = wasCompleted || isCorrect;
  const existingMetadata = existingItemInteraction?.metadata || {};
  const statsBaselineReady = await ensureLearningStatsBaseline(supabase, userId);
  const statsDelta: LearningStatsDelta = {
    completedSentences: !wasCompleted && isCorrect ? 1 : 0,
    earnedStars: isCorrect && !hasEarnedPracticeStar(existingMetadata, mode) ? LEARNING_PROGRESS_STARS[mode] : 0,
    practicedWords: 0,
    totalCorrect: isCorrect ? 1 : 0,
    totalIncorrect: isCorrect ? 0 : 1,
  };
  const metadata = {
    ...existingMetadata,
    last_practice_mode: mode,
    last_practice_is_correct: isCorrect,
    practice_modes: updatePracticeModeMetadata(existingMetadata.practice_modes, mode, isCorrect, now),
  };

  const { error: itemError } = await supabase
    .from('user_bundle_item_interactions')
    .upsert(
      {
        user_id: userId,
        bundle_id: bundleId,
        bundle_item_id: bundleItemId,
        is_completed: isCompleted,
        correct_count: Number(existingItemInteraction?.correct_count || 0) + (isCorrect ? 1 : 0),
        incorrect_count: Number(existingItemInteraction?.incorrect_count || 0) + (isCorrect ? 0 : 1),
        last_practiced_at: now,
        completed_at: isCompleted ? existingItemInteraction?.completed_at || now : null,
        metadata,
        updated_at: now,
      },
      {
        onConflict: 'user_id,bundle_item_id',
      },
    );

  if (itemError) {
    console.error('Error marking bundle item completed:', itemError);
    throw itemError;
  }

  // user_sentence_interactions 테이블 업데이트 추가 (문장 학습 숙련도/스트릭 반영)
  if (bundleItem.sentence_id) {
    const { data: existingSentenceInteraction, error: sentenceFetchError } = await supabase
      .from('user_sentence_interactions')
      .select('*')
      .eq('user_id', userId)
      .eq('sentence_id', bundleItem.sentence_id)
      .maybeSingle();

    if (sentenceFetchError) {
      console.error('Error fetching sentence interaction:', sentenceFetchError);
    } else {
      const currentLevel = Number(existingSentenceInteraction?.proficiency_level || 0);
      const newStreakCount = isCorrect ? Number(existingSentenceInteraction?.streak_count || 0) + 1 : 0;
      
      let calculatedLevel = 0;
      if (newStreakCount >= 15) calculatedLevel = 5;
      else if (newStreakCount >= 10) calculatedLevel = 4;
      else if (newStreakCount >= 6) calculatedLevel = 3;
      else if (newStreakCount >= 3) calculatedLevel = 2;
      else if (newStreakCount >= 1) calculatedLevel = 1;

      const newProficiencyLevel = isCorrect 
        ? Math.max(currentLevel, calculatedLevel)
        : Math.max(0, currentLevel - 1);

      const existingSentenceMetadata = existingSentenceInteraction?.metadata || {};
      const sentenceMetadata = {
        ...existingSentenceMetadata,
        last_practice_mode: mode,
        last_practice_is_correct: isCorrect,
        practice_modes: updatePracticeModeMetadata(
          (existingSentenceMetadata as any).practice_modes,
          mode,
          isCorrect,
          now
        ),
      };

      const { error: sentenceUpsertError } = await supabase
        .from('user_sentence_interactions')
        .upsert(
          {
            user_id: userId,
            sentence_id: bundleItem.sentence_id,
            correct_count: Number(existingSentenceInteraction?.correct_count || 0) + (isCorrect ? 1 : 0),
            incorrect_count: Number(existingSentenceInteraction?.incorrect_count || 0) + (isCorrect ? 0 : 1),
            streak_count: newStreakCount,
            proficiency_level: newProficiencyLevel,
            last_reviewed_at: now,
            metadata: sentenceMetadata,
            updated_at: now,
          },
          {
            onConflict: 'user_id,sentence_id',
          }
        );

      if (sentenceUpsertError) {
        console.error('Error upserting user sentence interaction:', sentenceUpsertError);
      }
    }
  }

  // user_word_interactions 테이블 업데이트 추가 (단어 학습 숙련도/스트릭 반영)
  const targetWordId = wordId || (bundleItem.sentence_id ? await getFirstMappedWordId(supabase, Number(bundleItem.sentence_id)) : null);
  if (targetWordId) {
    const { data: existingWordInteraction, error: wordFetchError } = await supabase
      .from('user_word_interactions')
      .select('*')
      .eq('user_id', userId)
      .eq('word_id', targetWordId)
      .maybeSingle();

    if (wordFetchError) {
      console.error('Error fetching word interaction:', wordFetchError);
    } else {
      const currentLevel = Number(existingWordInteraction?.proficiency_level || 0);
      const newStreakCount = isCorrect ? Number(existingWordInteraction?.streak_count || 0) + 1 : 0;

      let calculatedLevel = 0;
      if (newStreakCount >= 15) calculatedLevel = 5;
      else if (newStreakCount >= 10) calculatedLevel = 4;
      else if (newStreakCount >= 6) calculatedLevel = 3;
      else if (newStreakCount >= 3) calculatedLevel = 2;
      else if (newStreakCount >= 1) calculatedLevel = 1;

      const newProficiencyLevel = isCorrect
        ? Math.max(currentLevel, calculatedLevel)
        : Math.max(0, currentLevel - 1);

      const existingWordMetadata = existingWordInteraction?.metadata || {};
      const wordMetadata = {
        ...existingWordMetadata,
        last_practice_mode: mode,
        last_practice_is_correct: isCorrect,
        practice_modes: updatePracticeModeMetadata(
          (existingWordMetadata as any).practice_modes,
          mode,
          isCorrect,
          now
        ),
      };

      const { error: wordUpsertError } = await supabase
        .from('user_word_interactions')
        .upsert(
          {
            user_id: userId,
            word_id: targetWordId,
            correct_count: Number(existingWordInteraction?.correct_count || 0) + (isCorrect ? 1 : 0),
            incorrect_count: Number(existingWordInteraction?.incorrect_count || 0) + (isCorrect ? 0 : 1),
            streak_count: newStreakCount,
            proficiency_level: newProficiencyLevel,
            last_reviewed_at: now,
            metadata: wordMetadata,
            updated_at: now,
          },
          {
            onConflict: 'user_id,word_id',
          }
        );

      if (wordUpsertError) {
        console.error('Error upserting user word interaction:', wordUpsertError);
      }
    }
  }

  if (statsBaselineReady) {
    await safeIncrementLearningStats(supabase, userId, statsDelta);
  }

  const [
    { count: totalItems, error: totalError },
    { count: completedItems, error: completedError },
    { data: existingBundleInteraction, error: existingError },
  ] = await Promise.all([
    supabase
      .from('bundle_items')
      .select('id', { count: 'exact', head: true })
      .eq('bundle_id', bundleId),
    supabase
      .from('user_bundle_item_interactions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('bundle_id', bundleId)
      .eq('is_completed', true),
    supabase
      .from('user_bundle_interactions')
      .select('*')
      .eq('user_id', userId)
      .eq('bundle_id', bundleId)
      .maybeSingle(),
  ]);

  if (totalError) {
    console.error('Error counting bundle items:', totalError);
    throw totalError;
  }

  if (completedError) {
    console.error('Error counting completed bundle items:', completedError);
    throw completedError;
  }

  if (existingError) {
    console.error('Error fetching user bundle interaction:', existingError);
  }

  const total = totalItems || 0;
  const completed = completedItems || 0;
  const progressRatio = total > 0 ? Math.min(1, completed / total) : 0;
  const isBundleCompleted = total > 0 && completed >= total;
  const currentPracticeItemIds = {
    ...normalizePracticeItemIds(existingBundleInteraction?.current_practice_item_ids),
    [mode]: bundleItemId,
  };

  const { error: bundleError } = await supabase
    .from('user_bundle_interactions')
    .upsert(
      {
        user_id: userId,
        bundle_id: bundleId,
        is_started: true,
        is_completed: isBundleCompleted,
        progress_ratio: progressRatio,
        current_practice_item_ids: currentPracticeItemIds,
        started_at: existingBundleInteraction?.started_at || now,
        completed_at: isBundleCompleted ? existingBundleInteraction?.completed_at || now : existingBundleInteraction?.completed_at || null,
        last_studied_at: now,
        updated_at: now,
      },
      {
        onConflict: 'user_id,bundle_id',
      },
    );

  if (bundleError) {
    console.error('Error updating bundle progress:', bundleError);
    throw bundleError;
  }

  await safeRecordLearningDailyActivity({
    userId,
    activityType: 'practice_result',
    bundleId,
    bundleItemId,
    practiceMode: mode,
    isCorrect,
  });

  return getBundleProgressSummary(userId, bundleId, total);
}

function createEmptyBundleProgress(totalItems: number): BundleProgressSummary {
  return {
    bundleInteraction: null,
    itemInteractions: [],
    totalItems,
    completedItems: 0,
    progressRatio: 0,
    progressPercent: 0,
    currentBundleItemId: null,
    currentPracticeItemIds: {},
  };
}

function normalizePracticeItemIds(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter((entry): entry is [string, string] => typeof entry[1] === 'string'),
  );
}

async function safeRecordLearningDailyActivity(input: {
  userId: string;
  activityType: LearningActivityType;
  bundleId: string;
  bundleItemId?: string | null;
  practiceMode?: string | null;
  isCorrect?: boolean | null;
}) {
  try {
    await recordLearningDailyActivity(input);
  } catch (error) {
    console.error('Error recording daily learning activity:', error);
  }
}

function normalizeSingleRelation<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) {
    return value[0] || null;
  }

  return value || null;
}

function countRowsByBundleId(rows: Array<{ bundle_id?: string | null }>) {
  return rows.reduce<Map<string, number>>((counts, row) => {
    if (!row.bundle_id) return counts;
    counts.set(row.bundle_id, (counts.get(row.bundle_id) || 0) + 1);
    return counts;
  }, new Map());
}

function updatePracticeModeMetadata(
  value: unknown,
  mode: 'quiz' | 'scramble' | 'wordfill',
  isCorrect: boolean,
  practicedAt: string,
) {
  const practiceModes = normalizePracticeModes(value);
  const currentMode = practiceModes[mode];

  return {
    ...practiceModes,
    [mode]: {
      correct_count: Number(currentMode?.correct_count || 0) + (isCorrect ? 1 : 0),
      incorrect_count: Number(currentMode?.incorrect_count || 0) + (isCorrect ? 0 : 1),
      last_is_correct: isCorrect,
      last_practiced_at: practicedAt,
      first_correct_at: isCorrect ? currentMode?.first_correct_at || practicedAt : currentMode?.first_correct_at || null,
      last_correct_at: isCorrect ? practicedAt : currentMode?.last_correct_at || null,
    },
  };
}

function normalizePracticeModes(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter((entry): entry is [string, Record<string, unknown>] => {
        const [, modeMetadata] = entry;
        return Boolean(modeMetadata) && typeof modeMetadata === 'object' && !Array.isArray(modeMetadata);
      }),
  );
}

function calculateEarnedStarsFromMetadata(metadata: Record<string, unknown> | null) {
  return Object.entries(LEARNING_PROGRESS_STARS).reduce((total, [mode, stars]) => {
    return hasEarnedPracticeStar(metadata, mode)
      ? total + stars
      : total;
  }, 0);
}

function hasEarnedPracticeStar(metadata: Record<string, unknown> | null, mode: string) {
  const practiceModes = normalizePracticeModes(metadata?.practice_modes);
  const modeMetadata = practiceModes[mode];

  if (!modeMetadata) {
    return metadata?.last_practice_mode === mode && metadata?.last_practice_is_correct === true;
  }

  const correctCount = Number(modeMetadata.correct_count || 0);
  return correctCount > 0 || Boolean(modeMetadata.first_correct_at);
}

async function getFirstMappedWordId(supabase: any, sentenceId: number): Promise<number | null> {
  const { data, error } = await supabase
    .from('word_sentence_map')
    .select('word_id')
    .eq('sentence_id', sentenceId)
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return Number(data.word_id);
}
