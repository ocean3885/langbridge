import { randomUUID } from 'crypto';
import { getSqliteDb } from '@/lib/sqlite/db';

export type SqliteVideoLearningProgress = {
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

export async function getVideoLearningProgressSqlite(
  userId: string,
  videoId: string
): Promise<SqliteVideoLearningProgress | null> {
  const db = await getSqliteDb();
  const row = await db.get<SqliteVideoLearningProgress>(
    `
      SELECT
        id,
        user_id,
        video_id,
        last_studied_at,
        total_study_seconds,
        study_session_count,
        last_position_seconds,
        summary_memo,
        created_at,
        updated_at
      FROM video_learning_progress
      WHERE user_id = ? AND video_id = ?
      LIMIT 1
    `,
    userId,
    videoId
  );

  return row ?? null;
}

export async function listVideoLearningProgressByUserSqlite(
  userId: string,
  limit = 100
): Promise<SqliteVideoLearningProgress[]> {
  const db = await getSqliteDb();
  return db.all<SqliteVideoLearningProgress[]>(
    `
      SELECT
        id,
        user_id,
        video_id,
        last_studied_at,
        total_study_seconds,
        study_session_count,
        last_position_seconds,
        summary_memo,
        created_at,
        updated_at
      FROM video_learning_progress
      WHERE user_id = ?
      ORDER BY COALESCE(last_studied_at, created_at) DESC
      LIMIT ?
    `,
    userId,
    limit
  );
}

export async function listVideoLearningProgressForVideosSqlite(
  userId: string,
  videoIds: string[]
): Promise<SqliteVideoLearningProgress[]> {
  if (videoIds.length === 0) return [];

  const db = await getSqliteDb();
  const placeholders = videoIds.map(() => '?').join(', ');

  return db.all<SqliteVideoLearningProgress[]>(
    `
      SELECT
        id,
        user_id,
        video_id,
        last_studied_at,
        total_study_seconds,
        study_session_count,
        last_position_seconds,
        summary_memo,
        created_at,
        updated_at
      FROM video_learning_progress
      WHERE user_id = ?
        AND video_id IN (${placeholders})
    `,
    userId,
    ...videoIds
  );
}

export async function recordVideoStudySqlite(input: {
  userId: string;
  videoId: string;
  playedSeconds: number;
  lastPositionSeconds: number | null;
  incrementSession: boolean;
  nowIso: string;
}): Promise<SqliteVideoLearningProgress> {
  const db = await getSqliteDb();
  const rowId = randomUUID();
  const playedSeconds = Math.max(0, Math.floor(input.playedSeconds));
  const sessionIncrement = input.incrementSession ? 1 : 0;

  await db.run(
    `
      INSERT INTO video_learning_progress (
        id,
        user_id,
        video_id,
        last_studied_at,
        total_study_seconds,
        study_session_count,
        last_position_seconds,
        summary_memo,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT(user_id, video_id) DO UPDATE SET
        last_studied_at = excluded.last_studied_at,
        total_study_seconds = COALESCE(video_learning_progress.total_study_seconds, 0) + excluded.total_study_seconds,
        study_session_count = COALESCE(video_learning_progress.study_session_count, 0) + excluded.study_session_count,
        last_position_seconds = excluded.last_position_seconds,
        updated_at = CURRENT_TIMESTAMP
    `,
    rowId,
    input.userId,
    input.videoId,
    input.nowIso,
    playedSeconds,
    sessionIncrement,
    input.lastPositionSeconds
  );

  const updated = await getVideoLearningProgressSqlite(input.userId, input.videoId);
  if (!updated) {
    throw new Error('학습 기록 저장 후 조회에 실패했습니다.');
  }

  return updated;
}

export async function updateVideoSummaryMemoSqlite(input: {
  userId: string;
  videoId: string;
  summaryMemo: string | null;
}): Promise<SqliteVideoLearningProgress> {
  const db = await getSqliteDb();
  const rowId = randomUUID();

  await db.run(
    `
      INSERT INTO video_learning_progress (
        id,
        user_id,
        video_id,
        summary_memo,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT(user_id, video_id) DO UPDATE SET
        summary_memo = excluded.summary_memo,
        updated_at = CURRENT_TIMESTAMP
    `,
    rowId,
    input.userId,
    input.videoId,
    input.summaryMemo
  );

  const updated = await getVideoLearningProgressSqlite(input.userId, input.videoId);
  if (!updated) {
    throw new Error('메모 저장 후 조회에 실패했습니다.');
  }

  return updated;
}