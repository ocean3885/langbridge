'use server';

import { createAdminClient } from '@/lib/supabase/admin';

export type UserBundleStatus = 'saved' | 'in-progress' | 'almost-complete' | 'completed';

export interface UserBundleRecord {
  bundleId: string;
  title: string;
  titleEn: string | null;
  description: string | null;
  descriptionEn: string | null;
  thumbnailUrl: string | null;
  level: number | null;
  isPremium: boolean;
  categoryId: string | null;
  categoryName: string | null;
  categoryNameEn: string | null;
  isPinned: boolean;
  isStarted: boolean;
  isCompleted: boolean;
  status: UserBundleStatus;
  progressPercent: number;
  totalItems: number;
  completedItems: number;
  correctCount: number;
  incorrectCount: number;
  currentBundleItemId: string | null;
  currentPracticeItemIds: Record<string, string>;
  startedAt: string | null;
  completedAt: string | null;
  lastStudiedAt: string | null;
}

export interface UserBundlesSummary {
  total: number;
  active: number;
  completed: number;
  pinned: number;
  averageProgress: number;
}

export async function getUserBundles(userId: string): Promise<{ bundles: UserBundleRecord[]; summary: UserBundlesSummary }> {
  const supabase = createAdminClient();
  const { data: interactions, error: interactionError } = await supabase
    .from('user_bundle_interactions')
    .select('*')
    .eq('user_id', userId)
    .order('last_studied_at', { ascending: false, nullsFirst: false });

  if (interactionError) {
    console.error('Error fetching user bundle interactions:', interactionError);
    return { bundles: [], summary: emptySummary() };
  }

  const bundleIds = Array.from(new Set((interactions || []).map(row => String(row.bundle_id)).filter(Boolean)));
  if (!bundleIds.length) return { bundles: [], summary: emptySummary() };

  const [{ data: bundles, error: bundleError }, { data: bundleItems, error: itemError }, { data: itemInteractions, error: progressError }] = await Promise.all([
    supabase.from('bundle').select(`id, title, title_en, description, description_en, thumbnail_url, level, access_level, bundle_category (id, name, name_en)`).in('id', bundleIds),
    supabase.from('bundle_items').select('id, bundle_id').in('bundle_id', bundleIds),
    supabase.from('user_bundle_item_interactions').select('bundle_id, bundle_item_id, is_completed, correct_count, incorrect_count').eq('user_id', userId).in('bundle_id', bundleIds),
  ]);

  if (bundleError) console.error('Error fetching bundles for progress:', bundleError);
  if (itemError) console.error('Error fetching bundle item counts:', itemError);
  if (progressError) console.error('Error fetching bundle item progress:', progressError);

  const bundleById = new Map((bundles || []).map((bundle: any) => [String(bundle.id), bundle]));
  const totalByBundle = new Map<string, number>();
  for (const item of bundleItems || []) totalByBundle.set(String(item.bundle_id), (totalByBundle.get(String(item.bundle_id)) || 0) + 1);
  const statsByBundle = new Map<string, { completed: number; correct: number; incorrect: number }>();
  for (const item of itemInteractions || []) {
    const bundleId = String(item.bundle_id);
    const stats = statsByBundle.get(bundleId) || { completed: 0, correct: 0, incorrect: 0 };
    if (item.is_completed) stats.completed += 1;
    stats.correct += Number(item.correct_count || 0);
    stats.incorrect += Number(item.incorrect_count || 0);
    statsByBundle.set(bundleId, stats);
  }

  const records = (interactions || []).flatMap((interaction: any): UserBundleRecord[] => {
    const bundle = bundleById.get(String(interaction.bundle_id));
    if (!bundle) return [];
    const category = Array.isArray(bundle.bundle_category) ? bundle.bundle_category[0] : bundle.bundle_category;
    const stats = statsByBundle.get(String(bundle.id)) || { completed: 0, correct: 0, incorrect: 0 };
    const totalItems = totalByBundle.get(String(bundle.id)) || 0;
    const calculatedProgress = totalItems ? Math.round(stats.completed / totalItems * 100) : 0;
    const storedProgress = Math.round(Number(interaction.progress_ratio || 0) * 100);
    const progressPercent = interaction.is_completed ? 100 : Math.max(calculatedProgress, storedProgress);
    const status: UserBundleStatus = interaction.is_completed || progressPercent >= 100
      ? 'completed'
      : !interaction.is_started
        ? 'saved'
        : progressPercent >= 80
          ? 'almost-complete'
          : 'in-progress';

    return [{
      bundleId: String(bundle.id), title: bundle.title, titleEn: bundle.title_en || null,
      description: bundle.description || null, descriptionEn: bundle.description_en || null,
      thumbnailUrl: bundle.thumbnail_url || null, level: typeof bundle.level === 'number' ? bundle.level : null,
      isPremium: bundle.access_level === 'premium', categoryId: category?.id ? String(category.id) : null,
      categoryName: category?.name || null, categoryNameEn: category?.name_en || null,
      isPinned: Boolean(interaction.is_pinned), isStarted: Boolean(interaction.is_started),
      isCompleted: status === 'completed', status, progressPercent, totalItems, completedItems: stats.completed,
      correctCount: stats.correct, incorrectCount: stats.incorrect,
      currentBundleItemId: interaction.current_bundle_item_id || null,
      currentPracticeItemIds: normalizeItemIds(interaction.current_practice_item_ids),
      startedAt: interaction.started_at || null, completedAt: interaction.completed_at || null,
      lastStudiedAt: interaction.last_studied_at || null,
    }];
  });

  return {
    bundles: records,
    summary: {
      total: records.length,
      active: records.filter(bundle => bundle.isStarted && !bundle.isCompleted).length,
      completed: records.filter(bundle => bundle.isCompleted).length,
      pinned: records.filter(bundle => bundle.isPinned).length,
      averageProgress: records.length ? Math.round(records.reduce((sum, bundle) => sum + bundle.progressPercent, 0) / records.length) : 0,
    },
  };
}

function normalizeItemIds(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value).filter((entry): entry is [string, string] => typeof entry[1] === 'string'));
}

function emptySummary(): UserBundlesSummary {
  return { total: 0, active: 0, completed: 0, pinned: 0, averageProgress: 0 };
}
