import type { SqliteDb } from '../db';

export async function createLanguagesTables(db: SqliteDb): Promise<void> {
  await db.exec(`
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
  `);
}
