'use server';

import { randomUUID } from 'crypto';
import { getAppUserFromServer } from '@/lib/auth/app-user';
import { getSqliteDb } from '@/lib/sqlite/db';
import { refreshVideoProgress } from '@/lib/sqlite/video-progress';

// ─── Types ───────────────────────────────────────────────────────────

export type ScriptProgressRow = {
  id: string;
  user_id: string;
  video_id: string;
  script_id: string | null;
  custom_content: string;
  custom_translation: string;
  status: 'learning' | 'mastered';
  consecutive_correct: number;
  best_tpw: number | null;
  is_deleted: number; // 0 or 1
  order_index: number;
  total_attempts: number;
  correct_count: number;
  wrong_count: number;
  best_consecutive_correct: number;
  last_answer_at: string | null;
  last_answer_correct: number | null; // 0 or 1
  first_mastered_at: string | null;
  mastered_count: number;
  total_tpw: number;
  tpw_sample_count: number;
  avg_tpw: number | null;
  created_at: string;
  updated_at: string;
};

type ActionResult<T = void> = { success: true; data: T } | { success: false; error: string };

// ─── 1. Initial Setup (학습 시작) ────────────────────────────────────

/**
 * 유저가 영상의 '학습'을 시작할 때 호출.
 * transcripts + translations 데이터를 script_progress로 일괄 복사.
 * 이미 데이터가 있으면 중복 생성하지 않음.
 */
export async function initScriptProgress(videoId: string): Promise<ActionResult<ScriptProgressRow[]>> {
  const user = await getAppUserFromServer();
  if (!user) return { success: false, error: '로그인이 필요합니다.' };

  const db = await getSqliteDb();

  // 기존 데이터 확인
  const existing = await db.get<{ cnt: number }>(
    `SELECT COUNT(*) as cnt FROM script_progress WHERE user_id = ? AND video_id = ?`,
    user.id,
    videoId,
  );

  if (existing && existing.cnt > 0) {
    // 이미 학습 데이터 존재 → 기존 데이터 반환
    const rows = await db.all<ScriptProgressRow[]>(
      `SELECT * FROM script_progress
       WHERE user_id = ? AND video_id = ? AND is_deleted = 0
       ORDER BY order_index ASC`,
      user.id,
      videoId,
    );
    return { success: true, data: rows };
  }

  // transcripts 조회
  const transcripts = await db.all<
    Array<{ id: string; video_id: string; text_original: string; order_index: number }>
  >(
    `SELECT id, video_id, text_original, order_index
     FROM transcripts
     WHERE video_id = ?
     ORDER BY order_index ASC`,
    videoId,
  );

  if (transcripts.length === 0) {
    return { success: false, error: '이 영상에 자막 데이터가 없습니다.' };
  }

  // translations 조회 (한국어 우선)
  const transcriptIds = transcripts.map((t) => t.id);
  const placeholders = transcriptIds.map(() => '?').join(',');
  const translations = await db.all<Array<{ transcript_id: string; text_translated: string }>>(
    `SELECT transcript_id, text_translated
     FROM translations
     WHERE transcript_id IN (${placeholders})
     ORDER BY
       CASE WHEN lang = 'ko' THEN 0 ELSE 1 END`,
    ...transcriptIds,
  );

  const translationMap = new Map<string, string>();
  for (const tr of translations) {
    // 첫 번째(한국어 우선)만 사용
    if (!translationMap.has(tr.transcript_id)) {
      translationMap.set(tr.transcript_id, tr.text_translated);
    }
  }

  // Bulk Insert
  const insertStmt = `
    INSERT INTO script_progress (id, user_id, video_id, script_id, custom_content, custom_translation, status, consecutive_correct, best_tpw, is_deleted, order_index)
    VALUES (?, ?, ?, ?, ?, ?, 'learning', 0, NULL, 0, ?)
  `;
  for (const t of transcripts) {
    await db.run(
      insertStmt,
      randomUUID(),
      user.id,
      videoId,
      t.id,
      t.text_original,
      translationMap.get(t.id) ?? '',
      t.order_index,
    );
  }

  const rows = await db.all<ScriptProgressRow[]>(
    `SELECT * FROM script_progress
     WHERE user_id = ? AND video_id = ? AND is_deleted = 0
     ORDER BY order_index ASC`,
    user.id,
    videoId,
  );
  return { success: true, data: rows };
}

// ─── 2. Fetch (조회) ─────────────────────────────────────────────────

/** 활성 학습 데이터 조회 (is_deleted = 0) */
export async function getScriptProgress(
  videoId: string,
  mode: 'all' | 'learning' | 'mastered' = 'all',
): Promise<ActionResult<ScriptProgressRow[]>> {
  const user = await getAppUserFromServer();
  if (!user) return { success: false, error: '로그인이 필요합니다.' };

  const db = await getSqliteDb();
  let statusFilter = '';
  if (mode === 'learning') statusFilter = `AND status = 'learning'`;
  if (mode === 'mastered') statusFilter = `AND status = 'mastered'`;

  const rows = await db.all<ScriptProgressRow[]>(
    `SELECT * FROM script_progress
     WHERE user_id = ? AND video_id = ? AND is_deleted = 0 ${statusFilter}
     ORDER BY order_index ASC`,
    user.id,
    videoId,
  );
  return { success: true, data: rows };
}

// ─── 3. Update / Delete (편집) ───────────────────────────────────────

/** 유저가 문장을 수정 */
export async function updateScriptContent(
  progressId: string,
  customContent: string,
  customTranslation: string,
): Promise<ActionResult> {
  const user = await getAppUserFromServer();
  if (!user) return { success: false, error: '로그인이 필요합니다.' };

  const db = await getSqliteDb();
  const { changes } = await db.run(
    `UPDATE script_progress
     SET custom_content = ?, custom_translation = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ? AND user_id = ?`,
    customContent,
    customTranslation,
    progressId,
    user.id,
  );
  if (changes === 0) return { success: false, error: '수정할 데이터를 찾을 수 없습니다.' };
  return { success: true, data: undefined };
}

/** 유저가 문장을 삭제 (소프트 삭제) */
export async function deleteScriptProgress(progressId: string): Promise<ActionResult> {
  const user = await getAppUserFromServer();
  if (!user) return { success: false, error: '로그인이 필요합니다.' };

  const db = await getSqliteDb();
  const { changes } = await db.run(
    `UPDATE script_progress
     SET is_deleted = 1, updated_at = CURRENT_TIMESTAMP
     WHERE id = ? AND user_id = ?`,
    progressId,
    user.id,
  );
  if (changes === 0) return { success: false, error: '삭제할 데이터를 찾을 수 없습니다.' };
  return { success: true, data: undefined };
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
  const user = await getAppUserFromServer();
  if (!user) return { success: false, error: '로그인이 필요합니다.' };

  const db = await getSqliteDb();

  const row = await db.get<ScriptProgressRow>(
    `SELECT * FROM script_progress WHERE id = ? AND user_id = ?`,
    progressId,
    user.id,
  );
  if (!row) return { success: false, error: '데이터를 찾을 수 없습니다.' };

  const newConsecutive = row.consecutive_correct + 1;
  const newStatus = newConsecutive >= 3 ? 'mastered' : row.status;
  const newBestTpw =
    tpw !== null && (row.best_tpw === null || tpw < row.best_tpw) ? tpw : row.best_tpw;
  const newBestConsecutive = Math.max(row.best_consecutive_correct, newConsecutive);
  const newTotalAttempts = row.total_attempts + 1;
  const newCorrectCount = row.correct_count + 1;
  const newTotalTpw = tpw !== null ? row.total_tpw + tpw : row.total_tpw;
  const newTpwSampleCount = tpw !== null ? row.tpw_sample_count + 1 : row.tpw_sample_count;
  const newAvgTpw = newTpwSampleCount > 0 ? newTotalTpw / newTpwSampleCount : null;
  const isFirstMastered = newStatus === 'mastered' && row.status !== 'mastered';
  const newFirstMasteredAt = isFirstMastered && !row.first_mastered_at
    ? new Date().toISOString()
    : row.first_mastered_at;
  const newMasteredCount = isFirstMastered ? row.mastered_count + 1 : row.mastered_count;

  // attempts 히스토리 기록
  await db.run(
    `INSERT INTO script_progress_attempts (id, progress_id, user_id, video_id, script_id, attempt_no, is_correct, tpw)
     VALUES (?, ?, ?, ?, ?, ?, 1, ?)`,
    randomUUID(),
    progressId,
    user.id,
    row.video_id,
    row.script_id,
    newTotalAttempts,
    tpw,
  );

  await db.run(
    `UPDATE script_progress
     SET consecutive_correct = ?, status = ?, best_tpw = ?,
         total_attempts = ?, correct_count = ?,
         best_consecutive_correct = ?,
         last_answer_at = CURRENT_TIMESTAMP, last_answer_correct = 1,
         first_mastered_at = COALESCE(first_mastered_at, ?),
         mastered_count = ?,
         total_tpw = ?, tpw_sample_count = ?, avg_tpw = ?,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = ? AND user_id = ?`,
    newConsecutive,
    newStatus,
    newBestTpw,
    newTotalAttempts,
    newCorrectCount,
    newBestConsecutive,
    newFirstMasteredAt,
    newMasteredCount,
    newTotalTpw,
    newTpwSampleCount,
    newAvgTpw,
    progressId,
    user.id,
  );

  // video_progress 집계 갱신
  await refreshVideoProgress(user.id, row.video_id, progressId);

  return { success: true, data: { status: newStatus, consecutive_correct: newConsecutive } };
}

/**
 * 오답 시: consecutive_correct=0, status='learning'
 * 집계 컬럼 & attempts 히스토리 동시 기록
 */
export async function recordWrongAnswer(
  progressId: string,
): Promise<ActionResult<{ status: string; consecutive_correct: number }>> {
  const user = await getAppUserFromServer();
  if (!user) return { success: false, error: '로그인이 필요합니다.' };

  const db = await getSqliteDb();

  const row = await db.get<ScriptProgressRow>(
    `SELECT * FROM script_progress WHERE id = ? AND user_id = ?`,
    progressId,
    user.id,
  );
  if (!row) return { success: false, error: '데이터를 찾을 수 없습니다.' };

  const newTotalAttempts = row.total_attempts + 1;
  const newWrongCount = row.wrong_count + 1;

  // attempts 히스토리 기록
  await db.run(
    `INSERT INTO script_progress_attempts (id, progress_id, user_id, video_id, script_id, attempt_no, is_correct, tpw)
     VALUES (?, ?, ?, ?, ?, ?, 0, NULL)`,
    randomUUID(),
    progressId,
    user.id,
    row.video_id,
    row.script_id,
    newTotalAttempts,
  );

  await db.run(
    `UPDATE script_progress
     SET consecutive_correct = 0, status = 'learning',
         total_attempts = ?, wrong_count = ?,
         last_answer_at = CURRENT_TIMESTAMP, last_answer_correct = 0,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = ? AND user_id = ?`,
    newTotalAttempts,
    newWrongCount,
    progressId,
    user.id,
  );

  // video_progress 집계 갱신
  await refreshVideoProgress(user.id, row.video_id, progressId);

  return { success: true, data: { status: 'learning', consecutive_correct: 0 } };
}

// ─── 5. Review Mode (복습) ──────────────────────────────────────────

/** mastered 문장만 가져오기 (복습 모드용) */
export async function getMasteredScripts(
  videoId: string,
): Promise<ActionResult<ScriptProgressRow[]>> {
  return getScriptProgress(videoId, 'mastered');
}
