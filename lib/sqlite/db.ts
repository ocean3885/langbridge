import path from 'path';
import { mkdir } from 'fs/promises';
import sqlite3 from 'sqlite3';
import { Database, open } from 'sqlite';

let dbPromise: Promise<Database> | null = null;

function getSqliteDbPath(): string {
  return process.env.SQLITE_DB_PATH || path.join(process.cwd(), '.data', 'langbridge.sqlite');
}

async function ensureColumnExists(
  db: Database,
  tableName: string,
  columnName: string,
  columnDefinition: string
): Promise<void> {
  const columns = await db.all<Array<{ name: string }>>(`PRAGMA table_info(${tableName})`);
  const exists = columns.some((column) => column.name === columnName);
  if (!exists) {
    await db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDefinition}`);
  }
}

async function migrateEduVideoCategories(db: Database): Promise<void> {
  const legacyAssignments = await db.all<Array<{
    video_id: string;
    category_id: string;
    source_name: string;
    source_language_id: number | null;
    source_user_id: string;
  }>>(
    `
      SELECT
        ev.id AS video_id,
        ev.category_id AS category_id,
        uc.name AS source_name,
        uc.language_id AS source_language_id,
        uc.user_id AS source_user_id
      FROM edu_videos ev
      INNER JOIN user_categories uc
        ON uc.id = CAST(ev.category_id AS INTEGER)
       AND uc.user_id = ev.uploader_id
      WHERE ev.category_id IS NOT NULL
        AND TRIM(ev.category_id) <> ''
    `
  );

  if (legacyAssignments.length === 0) {
    return;
  }

  await db.exec('BEGIN');

  try {
    for (const assignment of legacyAssignments) {
      const existingCategory = await db.get<{ id: number }>(
        `
          SELECT id
          FROM edu_video_categories
          WHERE user_id = ?
            AND name = ?
            AND language_id IS ?
          LIMIT 1
        `,
        assignment.source_user_id,
        assignment.source_name,
        assignment.source_language_id
      );

      let targetCategoryId = existingCategory?.id;

      if (typeof targetCategoryId !== 'number') {
        const nextIdRow = await db.get<{ next_id: number }>(
          `
            SELECT COALESCE(MAX(id), 0) + 1 AS next_id
            FROM edu_video_categories
          `
        );

        targetCategoryId = nextIdRow?.next_id ?? 1;

        await db.run(
          `
            INSERT INTO edu_video_categories (
              id,
              name,
              language_id,
              user_id,
              created_at,
              updated_at
            )
            VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          `,
          targetCategoryId,
          assignment.source_name,
          assignment.source_language_id,
          assignment.source_user_id
        );
      }

      if (assignment.category_id !== String(targetCategoryId)) {
        await db.run(
          `
            UPDATE edu_videos
            SET category_id = ?
            WHERE id = ?
          `,
          String(targetCategoryId),
          assignment.video_id
        );
      }
    }

    await db.exec('COMMIT');
  } catch (error) {
    await db.exec('ROLLBACK');
    throw error;
  }
}

async function initializeSchema(db: Database): Promise<void> {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS user_notes (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      video_id TEXT NOT NULL,
      transcript_id TEXT,
      content TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, video_id, transcript_id)
    );

    CREATE INDEX IF NOT EXISTS idx_user_notes_user_video
      ON user_notes(user_id, video_id);

    CREATE INDEX IF NOT EXISTS idx_user_notes_transcript
      ON user_notes(transcript_id);

    CREATE TABLE IF NOT EXISTS lang_categories (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      language_id INTEGER,
      user_id TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS user_categories (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      language_id INTEGER,
      user_id TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS edu_video_categories (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      language_id INTEGER,
      user_id TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_lang_categories_user
      ON lang_categories(user_id);

    CREATE INDEX IF NOT EXISTS idx_user_categories_user
      ON user_categories(user_id);

    CREATE INDEX IF NOT EXISTS idx_edu_video_categories_user
      ON edu_video_categories(user_id);

    CREATE TABLE IF NOT EXISTS user_profiles (
      id TEXT PRIMARY KEY,
      email TEXT,
      created_at TEXT,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_user_profiles_email
      ON user_profiles(email);

    CREATE TABLE IF NOT EXISTS auth_users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      password_salt TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_auth_users_email
      ON auth_users(email);

    CREATE TABLE IF NOT EXISTS videos (
      id TEXT PRIMARY KEY,
      youtube_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
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

    CREATE TABLE IF NOT EXISTS languages (
      id INTEGER PRIMARY KEY,
      name_en TEXT,
      name_ko TEXT NOT NULL,
      code TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_languages_name_ko
      ON languages(name_ko);

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

    CREATE TABLE IF NOT EXISTS words (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      language_id INTEGER NOT NULL,
      text TEXT NOT NULL,
      meaning_ko TEXT NOT NULL,
      level TEXT NOT NULL,
      part_of_speech TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_words_language
      ON words(language_id);

    CREATE TABLE IF NOT EXISTS sentences (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      language_id INTEGER NOT NULL,
      text TEXT NOT NULL,
      translation_ko TEXT NOT NULL,
      audio_path TEXT NOT NULL,
      context_category TEXT,
      mapping_details TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_sentences_language
      ON sentences(language_id);

    CREATE TABLE IF NOT EXISTS word_sentence_map (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      word_id INTEGER NOT NULL,
      sentence_id INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_word_sentence_map_word
      ON word_sentence_map(word_id);

    CREATE INDEX IF NOT EXISTS idx_word_sentence_map_sentence
      ON word_sentence_map(sentence_id);

    CREATE TABLE IF NOT EXISTS verb_conjugations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      word_id INTEGER NOT NULL,
      tense TEXT,
      conjugated_text TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_verb_conjugations_word
      ON verb_conjugations(word_id);

    CREATE TABLE IF NOT EXISTS super_admin_users (
      user_id TEXT PRIMARY KEY,
      email TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_super_admin_users_email
      ON super_admin_users(email);
  `);

  await ensureColumnExists(db, 'edu_videos', 'duration_seconds', 'INTEGER');
  await migrateEduVideoCategories(db);
}

export async function getSqliteDb(): Promise<Database> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const dbPath = getSqliteDbPath();
      await mkdir(path.dirname(dbPath), { recursive: true });

      const db = await open({
        filename: dbPath,
        driver: sqlite3.Database,
      });

      await initializeSchema(db);
      return db;
    })();
  }

  return dbPromise;
}
