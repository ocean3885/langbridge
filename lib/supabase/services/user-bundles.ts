'use server';

import { getTotalPlayCount } from '@/lib/practice/progress';
import type { PracticeLanguage } from '@/lib/practice/registry';
import { loadBundleCompletion } from './bundle-completion';
import { createAdminClient } from '@/lib/supabase/admin';

export type UserBundleStatus = 'saved' | 'in-progress' | 'sentence-completed' | 'word-completed' | 'completed';

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
  sentenceCompleted: boolean;
  wordCompleted: boolean;
  status: UserBundleStatus;
  progressPercent: number;
  totalItems: number;
  completedItems: number;
  correctCount: number;
  incorrectCount: number;
  totalPlays: number;
  studyWordsCount: number;
  learnedWordsCount: number;
  knownWordsCount: number;
  earnedStars: number;
  maxStars: number;
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
  averageStarAchievement: number;
}

export async function getUserBundles(userId: string, language: PracticeLanguage = 'ko'): Promise<{ bundles: UserBundleRecord[]; summary: UserBundlesSummary }> {
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

  const [bundleRes, completionById] = await Promise.all([
    supabase.from('bundle').select('id, title, title_en, description, description_en, thumbnail_url, level, access_level, bundle_category(id, name, name_en)').in('id', bundleIds),
    loadBundleCompletion(userId, bundleIds, language),
  ]);
  if (bundleRes.error) throw bundleRes.error;
  const bundleById = new Map<string, any>((bundleRes.data || []).map(bundle => [String(bundle.id), bundle]));
  const records = (interactions || []).flatMap((interaction: any): UserBundleRecord[] => {
    const bundle = bundleById.get(String(interaction.bundle_id));
    if (!bundle) return [];
    const category = Array.isArray(bundle.bundle_category) ? bundle.bundle_category[0] : bundle.bundle_category;
    const completion = completionById.get(String(bundle.id))!;
    const bundleInteractions = completion.interactions;
    const stats = bundleInteractions.reduce((sum, item) => ({
      completed: sum.completed + Number(Boolean(item.is_completed)),
      correct: sum.correct + Number(item.correct_count || 0),
      incorrect: sum.incorrect + Number(item.incorrect_count || 0),
    }), { completed: 0, correct: 0, incorrect: 0 });
    const totalItems = completion.items.filter(item => item.sentence_id != null || item.sentences?.sentence).length;
    const { earned: earnedStars, max: maxStars } = completion.stars;
    const { total: studyWordsCount, completed: learnedWordsCount } = completion.wordProgress;
    const { isCompleted, sentenceCompleted, wordCompleted } = completion;
    const progressPercent = Math.round(completion.progressRatio * 100);
    const totalPlays = getTotalPlayCount(bundleInteractions);
    const hasStarted = earnedStars > 0 || learnedWordsCount > 0 || stats.completed > 0 || Boolean(interaction.is_started);
    const status: UserBundleStatus = isCompleted ? 'completed' : sentenceCompleted ? 'sentence-completed'
      : wordCompleted ? 'word-completed' : hasStarted ? 'in-progress' : 'saved';

    return [{
      bundleId: String(bundle.id), title: bundle.title, titleEn: bundle.title_en || null,
      description: bundle.description || null, descriptionEn: bundle.description_en || null,
      thumbnailUrl: bundle.thumbnail_url || null, level: typeof bundle.level === 'number' ? bundle.level : null,
      isPremium: bundle.access_level === 'premium', categoryId: category?.id ? String(category.id) : null,
      categoryName: category?.name || null, categoryNameEn: category?.name_en || null,
      isPinned: Boolean(interaction.is_pinned), isStarted: hasStarted,
      isCompleted, sentenceCompleted, wordCompleted, status, progressPercent, totalItems, completedItems: stats.completed,
      correctCount: stats.correct, incorrectCount: stats.incorrect,
      totalPlays, studyWordsCount, learnedWordsCount, knownWordsCount: completion.knownWordsCount,
      earnedStars, maxStars,
      currentBundleItemId: interaction.current_bundle_item_id || null,
      currentPracticeItemIds: normalizeItemIds(interaction.current_practice_item_ids),
      startedAt: interaction.started_at || null, completedAt: isCompleted ? interaction.completed_at || null : null,
      lastStudiedAt: interaction.last_studied_at || null,
    }];
  });

  const starBundles = records.filter(bundle => bundle.maxStars > 0);
  return {
    bundles: records,
    summary: {
      total: records.length,
      active: records.filter(bundle => bundle.isStarted && !bundle.isCompleted).length,
      completed: records.filter(bundle => bundle.isCompleted).length,
      pinned: records.filter(bundle => bundle.isPinned).length,
      averageStarAchievement: starBundles.length ? Math.round(starBundles.reduce((sum, bundle) => sum + bundle.earnedStars / bundle.maxStars * 100, 0) / starBundles.length) : 0,
    },
  };
}

function normalizeItemIds(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value).filter((entry): entry is [string, string] => typeof entry[1] === 'string'));
}

function emptySummary(): UserBundlesSummary {
  return { total: 0, active: 0, completed: 0, pinned: 0, averageStarAchievement: 0 };
}
