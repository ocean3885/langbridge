import type { SqliteDb } from '../db';

export async function createEduVideosTables(db: SqliteDb): Promise<void> {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS edu_videos (
      id TEXT PRIMARY KEY,
      youtube_url TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      thumbnail_url TEXT,
      duration_seconds INTEGER,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      language_id INTEGER,
      category_id TEXT,
      channel_id TEXT,
      view_count INTEGER NOT NULL DEFAULT 0,
      uploader_id TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_edu_videos_created_at
      ON edu_videos(created_at DESC);

    CREATE TABLE IF NOT EXISTS video_learning_progress (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      video_id TEXT NOT NULL,
      last_studied_at TEXT,
      total_study_seconds INTEGER NOT NULL DEFAULT 0,
      study_session_count INTEGER NOT NULL DEFAULT 0,
      last_position_seconds REAL,
      summary_memo TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, video_id)
    );

    CREATE INDEX IF NOT EXISTS idx_video_learning_progress_user_last_studied
      ON video_learning_progress(user_id, last_studied_at DESC);

    CREATE INDEX IF NOT EXISTS idx_video_learning_progress_video
      ON video_learning_progress(video_id);
  `);
}
