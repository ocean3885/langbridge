'use server';

import { createAdminClient } from '@/lib/supabase/admin';

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
  const metadata = {
    ...(existingItemInteraction?.metadata || {}),
    last_practice_mode: mode,
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
