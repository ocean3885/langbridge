import { createAdminClient } from '@/lib/supabase/admin';
import { randomUUID } from 'crypto';
import { refreshVideoProgress } from './video-progress';
import { resolveLearningCategoryId } from './categories';
import { DEFAULT_LEARNING_CATEGORY_NAME } from '@/lib/learning-category';

export type SupabaseScriptProgress = {
  id: string;
  user_id: string;
  video_id: string;
  script_id: string | null;
  custom_content: string;
  custom_translation: string;
  status: 'learning' | 'mastered';
  consecutive_correct: number;
  best_tpw: number | null;
  is_deleted: number;
  order_index: number;
  total_attempts: number;
  correct_count: number;
  wrong_count: number;
  best_consecutive_correct: number;
  last_answer_at: string | null;
  last_answer_correct: number | null;
  first_mastered_at: string | null;
  mastered_count: number;
  total_tpw: number;
  tpw_sample_count: number;
  avg_tpw: number | null;
  created_at: string;
  updated_at: string;
};

export async function getScriptProgressList(
  userId: string,
  videoId: string,
  mode: 'all' | 'learning' | 'mastered' = 'all'
): Promise<SupabaseScriptProgress[]> {
  const supabase = createAdminClient();
  let query = supabase
    .from('script_progress')
    .select('*')
    .eq('user_id', userId)
    .eq('video_id', videoId)
    .eq('is_deleted', 0);

  if (mode === 'learning') query = query.eq('status', 'learning');
  if (mode === 'mastered') query = query.eq('status', 'mastered');

  const { data, error } = await query.order('order_index', { ascending: true });

  if (error || !data) return [];
  return data as SupabaseScriptProgress[];
}

export async function initScriptProgress(
  userId: string,
  videoId: string
): Promise<SupabaseScriptProgress[]> {
  const supabase = createAdminClient();

  // 1. Check existing
  const { count, error: countError } = await supabase
    .from('script_progress')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('video_id', videoId);

  if (countError) throw new Error(`기존 데이터 확인 실패: ${countError.message}`);

  // 이미 학습 데이터가 있는 경우 - 카테고리 체크 생략하고 목록 반환
  if (count && count > 0) {
    return getScriptProgressList(userId, videoId);
  }

  // 2. 신규 학습 시작 시 - 카테고리 자동 담기 체크
  // 어떤 카테고리에도 속하지 않은 경우 '학습일반'에 자동 추가
  const { count: mappingCount } = await supabase
    .from('user_category_videos')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('video_id', videoId);

  if (!mappingCount || mappingCount === 0) {
    try {
      const categoryId = await resolveLearningCategoryId({
        userId,
        rawCategoryId: null,
        defaultCategoryName: DEFAULT_LEARNING_CATEGORY_NAME
      });

      await supabase.from('user_category_videos').insert({
        id: randomUUID(),
        user_id: userId,
        category_id: categoryId,
        video_id: videoId
      });
    } catch (err) {
      console.error('Auto-categorization failed:', err);
      // 카테고리 자동 담기 실패해도 학습 진행에는 지장 없게 함
    }
  }

  // 3. Fetch transcripts
  const { data: transcripts, error: tError } = await supabase
    .from('transcripts')
    .select('id, text_original, order_index')
    .eq('video_id', videoId)
    .order('order_index', { ascending: true });

  if (tError || !transcripts || transcripts.length === 0) {
    throw new Error('자막 데이터가 없거나 조회에 실패했습니다.');
  }

  // 4. Fetch translations (prefer 'ko')
  const transcriptIds = transcripts.map(t => t.id);
  const { data: translations, error: trError } = await supabase
    .from('translations')
    .select('transcript_id, text_translated, lang')
    .in('transcript_id', transcriptIds);

  const translationMap = new Map<string, string>();
  if (translations) {
    // Sort to prefer 'ko'
    const sorted = [...translations].sort((a, b) => (a.lang === 'ko' ? -1 : 1));
    for (const tr of sorted) {
      if (!translationMap.has(tr.transcript_id)) {
        translationMap.set(tr.transcript_id, tr.text_translated);
      }
    }
  }

  // 5. Bulk insert
  const insertData = transcripts.map(t => ({
    id: randomUUID(),
    user_id: userId,
    video_id: videoId,
    script_id: t.id,
    custom_content: t.text_original,
    custom_translation: translationMap.get(t.id) || '',
    status: 'learning',
    consecutive_correct: 0,
    is_deleted: 0,
    order_index: t.order_index,
    total_attempts: 0,
    correct_count: 0,
    wrong_count: 0,
    best_consecutive_correct: 0,
    mastered_count: 0,
    total_tpw: 0,
    tpw_sample_count: 0
  }));

  const { error: insertError } = await supabase
    .from('script_progress')
    .insert(insertData);

  if (insertError) throw new Error(`학습 데이터 초기화 실패: ${insertError.message}`);

  return getScriptProgressList(userId, videoId);
}

export async function updateScriptContent(input: {
  userId: string;
  progressId: string;
  customContent: string;
  customTranslation: string;
}): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from('script_progress')
    .update({
      custom_content: input.customContent,
      custom_translation: input.customTranslation,
      updated_at: new Date().toISOString()
    })
    .eq('id', input.progressId)
    .eq('user_id', input.userId);

  if (error) throw new Error(`문장 수정 실패: ${error.message}`);
}

export async function deleteScriptProgress(userId: string, progressId: string): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from('script_progress')
    .update({
      is_deleted: 1,
      updated_at: new Date().toISOString()
    })
    .eq('id', progressId)
    .eq('user_id', userId);

  if (error) throw new Error(`문장 삭제 실패: ${error.message}`);
}

export async function recordCorrectAnswer(input: {
  userId: string;
  progressId: string;
  tpw: number | null;
}): Promise<{ status: string; consecutive_correct: number }> {
  const supabase = createAdminClient();

  const { data: row, error: fetchError } = await supabase
    .from('script_progress')
    .select('*')
    .eq('id', input.progressId)
    .eq('user_id', input.userId)
    .single();

  if (fetchError || !row) throw new Error('데이터를 찾을 수 없습니다.');

  const current = row as SupabaseScriptProgress;
  const newConsecutive = current.consecutive_correct + 1;
  const newStatus = newConsecutive >= 3 ? 'mastered' : current.status;
  const newBestTpw =
    input.tpw !== null && (current.best_tpw === null || input.tpw < current.best_tpw) ? input.tpw : current.best_tpw;
  const newBestConsecutive = Math.max(current.best_consecutive_correct, newConsecutive);
  const newTotalAttempts = current.total_attempts + 1;
  const newCorrectCount = current.correct_count + 1;
  const newTotalTpw = input.tpw !== null ? current.total_tpw + input.tpw : current.total_tpw;
  const newTpwSampleCount = input.tpw !== null ? current.tpw_sample_count + 1 : current.tpw_sample_count;
  const newAvgTpw = newTpwSampleCount > 0 ? newTotalTpw / newTpwSampleCount : null;
  const isFirstMastered = newStatus === 'mastered' && current.status !== 'mastered';
  const newFirstMasteredAt = isFirstMastered && !current.first_mastered_at
    ? new Date().toISOString()
    : current.first_mastered_at;
  const newMasteredCount = isFirstMastered ? current.mastered_count + 1 : current.mastered_count;

  const { error: updateError } = await supabase
    .from('script_progress')
    .update({
      consecutive_correct: newConsecutive,
      status: newStatus,
      best_tpw: newBestTpw,
      total_attempts: newTotalAttempts,
      correct_count: newCorrectCount,
      best_consecutive_correct: newBestConsecutive,
      last_answer_at: new Date().toISOString(),
      last_answer_correct: 1,
      first_mastered_at: newFirstMasteredAt,
      mastered_count: newMasteredCount,
      total_tpw: newTotalTpw,
      tpw_sample_count: newTpwSampleCount,
      avg_tpw: newAvgTpw,
      updated_at: new Date().toISOString()
    })
    .eq('id', input.progressId);

  if (updateError) throw new Error(`학습 결과 저장 실패: ${updateError.message}`);

  // Async refresh
  void refreshVideoProgress(input.userId, current.video_id, input.progressId);

  return { status: newStatus, consecutive_correct: newConsecutive };
}

export async function recordWrongAnswer(input: {
  userId: string;
  progressId: string;
}): Promise<{ status: string; consecutive_correct: number }> {
  const supabase = createAdminClient();

  const { data: row, error: fetchError } = await supabase
    .from('script_progress')
    .select('*')
    .eq('id', input.progressId)
    .eq('user_id', input.userId)
    .single();

  if (fetchError || !row) throw new Error('데이터를 찾을 수 없습니다.');

  const current = row as SupabaseScriptProgress;
  const newTotalAttempts = current.total_attempts + 1;
  const newWrongCount = current.wrong_count + 1;

  const { error: updateError } = await supabase
    .from('script_progress')
    .update({
      consecutive_correct: 0,
      status: 'learning',
      total_attempts: newTotalAttempts,
      wrong_count: newWrongCount,
      last_answer_at: new Date().toISOString(),
      last_answer_correct: 0,
      updated_at: new Date().toISOString()
    })
    .eq('id', input.progressId);

  if (updateError) throw new Error(`학습 결과 저장 실패: ${updateError.message}`);

  // Async refresh
  void refreshVideoProgress(input.userId, current.video_id, input.progressId);

  return { status: 'learning', consecutive_correct: 0 };
}
