import { randomUUID } from 'crypto';
import { createAdminClient } from '@/lib/supabase/admin';

export type SupabaseVideoLearningProgress = {
  id: string;
  user_id: string;
  video_id: string;
  last_studied_at: string | null;
  total_study_seconds: number;
  study_session_count: number;
  last_position_seconds: number | null;
  summary_memo: string | null;
  created_at: string;
  updated_at: string;
};

export async function getVideoLearningProgress(
  userId: string,
  videoId: string
): Promise<SupabaseVideoLearningProgress | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('video_learning_progress')
    .select('*')
    .eq('user_id', userId)
    .eq('video_id', videoId)
    .maybeSingle();

  if (error || !data) return null;
  return data as SupabaseVideoLearningProgress;
}

export async function listVideoLearningProgressByUser(
  userId: string,
  limit = 100
): Promise<SupabaseVideoLearningProgress[]> {
  const supabase = createAdminClient();
  // Supabase doesn't easily order by COALESCE in the JS client without RPC.
  // We'll order by last_studied_at with nulls last, then by created_at.
  const { data, error } = await supabase
    .from('video_learning_progress')
    .select('*')
    .eq('user_id', userId)
    .order('last_studied_at', { ascending: false, nullsFirst: false })
    .limit(limit);

  if (error || !data) return [];
  return data as SupabaseVideoLearningProgress[];
}

export async function listVideoLearningProgressForVideos(
  userId: string,
  videoIds: string[]
): Promise<SupabaseVideoLearningProgress[]> {
  if (videoIds.length === 0) return [];

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('video_learning_progress')
    .select('*')
    .eq('user_id', userId)
    .in('video_id', videoIds);

  if (error || !data) return [];
  return data as SupabaseVideoLearningProgress[];
}

export async function recordVideoStudy(input: {
  userId: string;
  videoId: string;
  playedSeconds: number;
  lastPositionSeconds: number | null;
  incrementSession: boolean;
  nowIso: string;
}): Promise<SupabaseVideoLearningProgress> {
  const supabase = createAdminClient();
  const playedSeconds = Math.max(0, Math.floor(input.playedSeconds));
  const sessionIncrement = input.incrementSession ? 1 : 0;

  // We need to fetch existing to update counts correctly, or use RPC.
  // Doing it with fetch + upsert for simplicity since we don't have RPC.
  const existing = await getVideoLearningProgress(input.userId, input.videoId);

  let newTotalSeconds = playedSeconds;
  let newSessionCount = sessionIncrement;

  if (existing) {
    newTotalSeconds = existing.total_study_seconds + playedSeconds;
    newSessionCount = existing.study_session_count + sessionIncrement;
  }

  const { data, error } = await supabase
    .from('video_learning_progress')
    .upsert({
      id: existing ? existing.id : randomUUID(),
      user_id: input.userId,
      video_id: input.videoId,
      last_studied_at: input.nowIso,
      total_study_seconds: newTotalSeconds,
      study_session_count: newSessionCount,
      last_position_seconds: input.lastPositionSeconds,
      summary_memo: existing ? existing.summary_memo : null,
      updated_at: new Date().toISOString(),
      ...(existing ? {} : { created_at: new Date().toISOString() })
    }, { onConflict: 'user_id, video_id' })
    .select('*')
    .single();

  if (error) {
    throw new Error(`학습 기록 저장 실패: ${error.message}`);
  }

  return data as SupabaseVideoLearningProgress;
}

export async function updateVideoSummaryMemo(input: {
  userId: string;
  videoId: string;
  summaryMemo: string | null;
}): Promise<SupabaseVideoLearningProgress> {
  const supabase = createAdminClient();
  const existing = await getVideoLearningProgress(input.userId, input.videoId);

  const { data, error } = await supabase
    .from('video_learning_progress')
    .upsert({
      id: existing ? existing.id : randomUUID(),
      user_id: input.userId,
      video_id: input.videoId,
      summary_memo: input.summaryMemo,
      updated_at: new Date().toISOString(),
      ...(existing ? {} : { 
        created_at: new Date().toISOString(),
        total_study_seconds: 0,
        study_session_count: 0
      })
    }, { onConflict: 'user_id, video_id' })
    .select('*')
    .single();

  if (error) {
    throw new Error(`메모 저장 실패: ${error.message}`);
  }

  return data as SupabaseVideoLearningProgress;
}
