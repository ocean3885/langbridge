import type { SqliteDb } from '../db';

export async function createAudioTables(db: SqliteDb): Promise<void> {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS lang_audio_memos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      content_id TEXT NOT NULL,
      line_number INTEGER NOT NULL,
      user_id TEXT NOT NULL,
      memo_text TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_audio_memos_content_user
      ON lang_audio_memos(content_id, user_id, line_number);

    CREATE TABLE IF NOT EXISTS lang_audio_content (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT,
      category_id INTEGER,
      original_text TEXT,
      translated_text TEXT,
      sync_data TEXT,
      audio_file_path TEXT,
      study_count INTEGER,
      last_studied_at TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_audio_content_user_created
      ON lang_audio_content(user_id, created_at DESC);

    CREATE INDEX IF NOT EXISTS idx_audio_content_category
      ON lang_audio_content(category_id);
  `);
}
