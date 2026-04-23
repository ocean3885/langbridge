'use server';

import { getAppUserFromServer } from '@/lib/auth/app-user';
import {
  deleteScriptProgress as deleteScriptProgressService,
  getScriptProgressList,
  initScriptProgress as initScriptProgressService,
  recordCorrectAnswer as recordCorrectAnswerService,
  recordWrongAnswer as recordWrongAnswerService,
  updateScriptContent as updateScriptContentService,
  type SupabaseScriptProgress
} from '@/lib/supabase/services/script-progress';

// ─── Types ───────────────────────────────────────────────────────────

export type ScriptProgressRow = SupabaseScriptProgress;

type ActionResult<T = void> = { success: true; data: T } | { success: false; error: string };

// ─── 1. Initial Setup (학습 시작) ────────────────────────────────────

/**
 * 유저가 영상의 '학습'을 시작할 때 호출.
 * transcripts + translations 데이터를 script_progress로 일괄 복사.
 * 이미 데이터가 있으면 중복 생성하지 않음.
 */
export async function initScriptProgress(videoId: string): Promise<ActionResult<ScriptProgressRow[]>> {
  try {
    const user = await getAppUserFromServer();
    if (!user) return { success: false, error: '로그인이 필요합니다.' };

    const rows = await initScriptProgressService(user.id, videoId);
    return { success: true, data: rows };
  } catch (error) {
    console.error('Init script progress error:', error);
    return { success: false, error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.' };
  }
}

// ─── 2. Fetch (조회) ─────────────────────────────────────────────────

/** 활성 학습 데이터 조회 (is_deleted = 0) */
export async function getScriptProgress(
  videoId: string,
  mode: 'all' | 'learning' | 'mastered' = 'all',
): Promise<ActionResult<ScriptProgressRow[]>> {
  try {
    const user = await getAppUserFromServer();
    if (!user) return { success: false, error: '로그인이 필요합니다.' };

    const rows = await getScriptProgressList(user.id, videoId, mode);
    return { success: true, data: rows };
  } catch (error) {
    console.error('Get script progress error:', error);
    return { success: false, error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.' };
  }
}

// ─── 3. Update / Delete (편집) ───────────────────────────────────────

/** 유저가 문장을 수정 */
export async function updateScriptContent(
  progressId: string,
  customContent: string,
  customTranslation: string,
): Promise<ActionResult> {
  try {
    const user = await getAppUserFromServer();
    if (!user) return { success: false, error: '로그인이 필요합니다.' };

    await updateScriptContentService({
      userId: user.id,
      progressId,
      customContent,
      customTranslation
    });
    return { success: true, data: undefined };
  } catch (error) {
    console.error('Update script content error:', error);
    return { success: false, error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.' };
  }
}

/** 유저가 문장을 삭제 (소프트 삭제) */
export async function deleteScriptProgress(progressId: string): Promise<ActionResult> {
  try {
    const user = await getAppUserFromServer();
    if (!user) return { success: false, error: '로그인이 필요합니다.' };

    await deleteScriptProgressService(user.id, progressId);
    return { success: true, data: undefined };
  } catch (error) {
    console.error('Delete script progress error:', error);
    return { success: false, error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.' };
  }
}

// ─── 4. Test Logic (학습 결과 반영) ──────────────────────────────────

/**
 * 정답 시: consecutive_correct +1, 3회 달성 시 status='mastered'
 * best_tpw 갱신 (기존보다 낮을 때만)
 * 집계 컬럼 & attempts 히스토리 동시 기록
 */
export async function recordCorrectAnswer(
  progressId: string,
  tpw: number | null,
): Promise<ActionResult<{ status: string; consecutive_correct: number }>> {
  try {
    const user = await getAppUserFromServer();
    if (!user) return { success: false, error: '로그인이 필요합니다.' };

    const result = await recordCorrectAnswerService({
      userId: user.id,
      progressId,
      tpw
    });
    return { success: true, data: result };
  } catch (error) {
    console.error('Record correct answer error:', error);
    return { success: false, error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.' };
  }
}

/**
 * 오답 시: consecutive_correct=0, status='learning'
 * 집계 컬럼 & attempts 히스토리 동시 기록
 */
export async function recordWrongAnswer(
  progressId: string,
): Promise<ActionResult<{ status: string; consecutive_correct: number }>> {
  try {
    const user = await getAppUserFromServer();
    if (!user) return { success: false, error: '로그인이 필요합니다.' };

    const result = await recordWrongAnswerService({
      userId: user.id,
      progressId
    });
    return { success: true, data: result };
  } catch (error) {
    console.error('Record wrong answer error:', error);
    return { success: false, error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.' };
  }
}

// ─── 5. Review Mode (복습) ──────────────────────────────────────────

/** mastered 문장만 가져오기 (복습 모드용) */
export async function getMasteredScripts(
  videoId: string,
): Promise<ActionResult<ScriptProgressRow[]>> {
  return getScriptProgress(videoId, 'mastered');
}
