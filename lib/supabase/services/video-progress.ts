import { createAdminClient } from '@/lib/supabase/admin';
import { randomUUID } from 'crypto';

export type SupabaseVideoProgress = {
  id: string;
  user_id: string;
  video_id: string;
  last_studied_at: string | null;
  last_progress_id: string | null;
  total_scripts: number;
  mastered_scripts: number;
  learning_scripts: number;
  mastery_pct: number;
  total_attempts: number;
  total_correct: number;
  total_wrong: number;
  created_at: string;
  updated_at: string;
};

export async function getVideoProgress(
  userId: string,
  videoId: string
): Promise<SupabaseVideoProgress | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('video_progress')
    .select('*')
    .eq('user_id', userId)
    .eq('video_id', videoId)
    .maybeSingle();

  if (error || !data) return null;
  return data as SupabaseVideoProgress;
}

export async function listVideoProgressForVideos(
  userId: string,
  videoIds: string[]
): Promise<SupabaseVideoProgress[]> {
  if (videoIds.length === 0) return [];

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('video_progress')
    .select('*')
    .eq('user_id', userId)
    .in('video_id', videoIds);

  if (error || !data) return [];
  return data as SupabaseVideoProgress[];
}

export async function listAllVideoProgressForUser(
  userId: string
): Promise<SupabaseVideoProgress[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('video_progress')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });

  if (error || !data) return [];
  return data as SupabaseVideoProgress[];
}

export async function listVideoProgressByUser(
  userId: string,
  limit = 100
): Promise<SupabaseVideoProgress[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('video_progress')
    .select('*')
    .eq('user_id', userId)
    .order('last_studied_at', { ascending: false, nullsFirst: false })
    .limit(limit);

  if (error || !data) return [];
  return data as SupabaseVideoProgress[];
}

export async function refreshVideoProgress(
  userId: string,
  videoId: string,
  lastProgressId: string
): Promise<void> {
  const supabase = createAdminClient();

  // Aggregate stats from script_progress
  const { data: stats, error: statsError } = await supabase
    .from('script_progress')
    .select(`
      status,
      total_attempts,
      correct_count,
      wrong_count
    `)
    .eq('user_id', userId)
    .eq('video_id', videoId)
    .eq('is_deleted', 0);

  if (statsError || !stats) return;

  const total_scripts = stats.length;
  let mastered_scripts = 0;
  let learning_scripts = 0;
  let total_attempts = 0;
  let total_correct = 0;
  let total_wrong = 0;

  for (const row of stats) {
    if (row.status === 'mastered') mastered_scripts++;
    else learning_scripts++;
    
    total_attempts += (row.total_attempts || 0);
    total_correct += (row.correct_count || 0);
    total_wrong += (row.wrong_count || 0);
  }

  const masteryPct = total_scripts > 0
    ? Math.round((100 * mastered_scripts) / total_scripts)
    : 0;

  const { error: upsertError } = await supabase
    .from('video_progress')
    .upsert({
      id: randomUUID(),
      user_id: userId,
      video_id: videoId,
      last_studied_at: new Date().toISOString(),
      last_progress_id: lastProgressId,
      total_scripts,
      mastered_scripts,
      learning_scripts,
      mastery_pct: masteryPct,
      total_attempts,
      total_correct,
      total_wrong,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'user_id, video_id'
    });

  if (upsertError) {
    console.error('Failed to refresh video progress:', upsertError);
  }
}

export async function deleteVideoLearningData(
  userId: string,
  videoId: string
): Promise<void> {
  const supabase = createAdminClient();

  // 1. Delete mapping
  await supabase
    .from('user_category_videos')
    .delete()
    .eq('user_id', userId)
    .eq('video_id', videoId);

  // 2. Delete script progress
  await supabase
    .from('script_progress')
    .delete()
    .eq('user_id', userId)
    .eq('video_id', videoId);

  // 3. Delete video progress
  await supabase
    .from('video_progress')
    .delete()
    .eq('user_id', userId)
    .eq('video_id', videoId);
}
