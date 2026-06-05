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
  mode: 'quiz' | 'scramble',
  isCorrect: boolean,
) {
  const supabase = createAdminClient();
  const now = new Date().toISOString();

  const { data: bundleItem, error: bundleItemError } = await supabase
    .from('bundle_items')
    .select('id')
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

function updatePracticeModeMetadata(
  value: unknown,
  mode: 'quiz' | 'scramble',
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
