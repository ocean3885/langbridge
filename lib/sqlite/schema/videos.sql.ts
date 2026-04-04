import type { SqliteDb } from '../db';

export async function createVideosTables(db: SqliteDb): Promise<void> {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS videos (
      id TEXT PRIMARY KEY,
      youtube_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      visibility TEXT NOT NULL DEFAULT 'private',
      duration INTEGER,
      thumbnail_url TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      language_id INTEGER,
      category_id TEXT,
      channel_id TEXT,
      view_count INTEGER NOT NULL DEFAULT 0,
      uploader_id TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_videos_created_at
      ON videos(created_at DESC);

    CREATE TABLE IF NOT EXISTS video_channels (
      id TEXT PRIMARY KEY,
      channel_name TEXT NOT NULL,
      channel_url TEXT,
      channel_description TEXT,
      thumbnail_url TEXT,
      language_id INTEGER,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_video_channels_name
      ON video_channels(channel_name);

    CREATE INDEX IF NOT EXISTS idx_video_channels_language
      ON video_channels(language_id);

    CREATE TABLE IF NOT EXISTS transcripts (
      id TEXT PRIMARY KEY,
      video_id TEXT NOT NULL,
      start REAL NOT NULL,
      duration REAL NOT NULL,
      text_original TEXT NOT NULL,
      order_index INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_transcripts_video
      ON transcripts(video_id, order_index);

    CREATE TABLE IF NOT EXISTS translations (
      id TEXT PRIMARY KEY,
      transcript_id TEXT NOT NULL,
      lang TEXT NOT NULL,
      text_translated TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_translations_transcript
      ON translations(transcript_id);

    CREATE TABLE IF NOT EXISTS user_notes (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      video_id TEXT NOT NULL,
      transcript_id TEXT,
      content TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, video_id, transcript_id),
      FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE,
      FOREIGN KEY (transcript_id) REFERENCES transcripts(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_user_notes_user_video
      ON user_notes(user_id, video_id);

    CREATE INDEX IF NOT EXISTS idx_user_notes_transcript
      ON user_notes(transcript_id);
  `);
}
