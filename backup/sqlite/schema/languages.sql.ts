import type { SqliteDb } from '../db';

export async function createLanguagesTables(db: SqliteDb): Promise<void> {
  // 1. Create tables first
  await db.exec(`
    CREATE TABLE IF NOT EXISTS languages (
      id INTEGER PRIMARY KEY,
      name_en TEXT,
      name_ko TEXT NOT NULL,
      code TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS words (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      word TEXT NOT NULL,
      lang_code TEXT NOT NULL,
      pos TEXT NOT NULL DEFAULT '[]',
      meaning TEXT NOT NULL DEFAULT '{}',
      gender TEXT,
      declensions TEXT NOT NULL DEFAULT '{}',
      conjugations TEXT NOT NULL DEFAULT '{}',
      audio_url TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS sentences (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sentence TEXT NOT NULL,
      translation TEXT NOT NULL,
      audio_url TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS word_sentence_map (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      word_id INTEGER NOT NULL,
      sentence_id INTEGER NOT NULL,
      used_as TEXT,
      pos_key TEXT,
      grammar_info TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (word_id) REFERENCES words(id) ON DELETE CASCADE,
      FOREIGN KEY (sentence_id) REFERENCES sentences(id) ON DELETE CASCADE
    );
  `);
}
