import type { SqliteDb } from '../db';

export async function createLearningTables(db: SqliteDb): Promise<void> {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS script_progress (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      video_id TEXT NOT NULL,
      script_id TEXT,
      custom_content TEXT NOT NULL,
      custom_translation TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'learning',
      consecutive_correct INTEGER NOT NULL DEFAULT 0,
      best_tpw REAL,
      is_deleted INTEGER NOT NULL DEFAULT 0,
      order_index INTEGER NOT NULL DEFAULT 0,
      total_attempts INTEGER NOT NULL DEFAULT 0,
      correct_count INTEGER NOT NULL DEFAULT 0,
      wrong_count INTEGER NOT NULL DEFAULT 0,
      best_consecutive_correct INTEGER NOT NULL DEFAULT 0,
      last_answer_at TEXT,
      last_answer_correct INTEGER,
      first_mastered_at TEXT,
      mastered_count INTEGER NOT NULL DEFAULT 0,
      total_tpw REAL NOT NULL DEFAULT 0,
      tpw_sample_count INTEGER NOT NULL DEFAULT 0,
      avg_tpw REAL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_script_progress_user_video
      ON script_progress(user_id, video_id);

    CREATE UNIQUE INDEX IF NOT EXISTS idx_script_progress_user_script
      ON script_progress(user_id, script_id);

    CREATE TABLE IF NOT EXISTS script_progress_attempts (
      id TEXT PRIMARY KEY,
      progress_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      video_id TEXT NOT NULL,
      script_id TEXT,
      attempt_no INTEGER NOT NULL,
      is_correct INTEGER NOT NULL,
      tpw REAL,
      answered_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (progress_id) REFERENCES script_progress(id) ON DELETE CASCADE,
      FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_sp_attempts_progress
      ON script_progress_attempts(progress_id, answered_at DESC);

    CREATE INDEX IF NOT EXISTS idx_sp_attempts_user_video
      ON script_progress_attempts(user_id, video_id);

    CREATE TABLE IF NOT EXISTS video_progress (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      video_id TEXT NOT NULL,
      last_studied_at TEXT,
      last_progress_id TEXT,
      total_scripts INTEGER NOT NULL DEFAULT 0,
      mastered_scripts INTEGER NOT NULL DEFAULT 0,
      learning_scripts INTEGER NOT NULL DEFAULT 0,
      mastery_pct REAL NOT NULL DEFAULT 0,
      total_attempts INTEGER NOT NULL DEFAULT 0,
      total_correct INTEGER NOT NULL DEFAULT 0,
      total_wrong INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, video_id),
      FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_video_progress_user
      ON video_progress(user_id, last_studied_at DESC);

    CREATE INDEX IF NOT EXISTS idx_video_progress_video
      ON video_progress(video_id);
  `);
}
