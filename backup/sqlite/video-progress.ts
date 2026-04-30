import { randomUUID } from 'crypto';
import { getSqliteDb } from '@/lib/sqlite/db';

export type SqliteVideoProgress = {
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
  videoId: string,
): Promise<SqliteVideoProgress | null> {
  const db = await getSqliteDb();
  const row = await db.get<SqliteVideoProgress>(
    `SELECT * FROM video_progress WHERE user_id = ? AND video_id = ? LIMIT 1`,
    userId,
    videoId,
  );
  return row ?? null;
}

export async function listVideoProgressByUser(
  userId: string,
  limit = 100,
): Promise<SqliteVideoProgress[]> {
  const db = await getSqliteDb();
  return db.all<SqliteVideoProgress[]>(
    `SELECT * FROM video_progress
     WHERE user_id = ?
     ORDER BY COALESCE(last_studied_at, created_at) DESC
     LIMIT ?`,
    userId,
    limit,
  );
}

export async function listVideoProgressForVideos(
  userId: string,
  videoIds: string[],
): Promise<SqliteVideoProgress[]> {
  if (videoIds.length === 0) return [];
  const db = await getSqliteDb();
  const placeholders = videoIds.map(() => '?').join(', ');
  return db.all<SqliteVideoProgress[]>(
    `SELECT * FROM video_progress
     WHERE user_id = ? AND video_id IN (${placeholders})`,
    userId,
    ...videoIds,
  );
}

/**
 * script_progress를 집계하여 video_progress를 갱신 (UPSERT).
 * recordCorrectAnswer / recordWrongAnswer에서 호출.
 */
export async function refreshVideoProgress(
  userId: string,
  videoId: string,
  lastProgressId: string,
): Promise<void> {
  const db = await getSqliteDb();

  const stats = await db.get<{
    total_scripts: number;
    mastered_scripts: number;
    learning_scripts: number;
    total_attempts: number;
    total_correct: number;
    total_wrong: number;
  }>(
    `SELECT
       COUNT(*)                                                    AS total_scripts,
       SUM(CASE WHEN status = 'mastered' THEN 1 ELSE 0 END)       AS mastered_scripts,
       SUM(CASE WHEN status = 'learning' THEN 1 ELSE 0 END)       AS learning_scripts,
       SUM(total_attempts)                                         AS total_attempts,
       SUM(correct_count)                                          AS total_correct,
       SUM(wrong_count)                                            AS total_wrong
     FROM script_progress
     WHERE user_id = ? AND video_id = ? AND is_deleted = 0`,
    userId,
    videoId,
  );

  if (!stats) return;

  const masteryPct =
    stats.total_scripts > 0
      ? Math.round((1000 * stats.mastered_scripts) / stats.total_scripts) / 10
      : 0;

  await db.run(
    `INSERT INTO video_progress (
       id, user_id, video_id,
       last_studied_at, last_progress_id,
       total_scripts, mastered_scripts, learning_scripts, mastery_pct,
       total_attempts, total_correct, total_wrong
     ) VALUES (?, ?, ?, CURRENT_TIMESTAMP, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(user_id, video_id) DO UPDATE SET
       last_studied_at = CURRENT_TIMESTAMP,
       last_progress_id = excluded.last_progress_id,
       total_scripts = excluded.total_scripts,
       mastered_scripts = excluded.mastered_scripts,
       learning_scripts = excluded.learning_scripts,
       mastery_pct = excluded.mastery_pct,
       total_attempts = excluded.total_attempts,
       total_correct = excluded.total_correct,
       total_wrong = excluded.total_wrong,
       updated_at = CURRENT_TIMESTAMP`,
    randomUUID(),
    userId,
    videoId,
    lastProgressId,
    stats.total_scripts,
    stats.mastered_scripts,
    stats.learning_scripts,
    masteryPct,
    stats.total_attempts,
    stats.total_correct,
    stats.total_wrong,
  );
}
