import type { SqliteDb } from '../db';

export async function ensureColumnExists(
  db: SqliteDb,
  tableName: string,
  columnName: string,
  columnDefinition: string,
): Promise<void> {
  const columns = await db.all<Array<{ name: string }>>(`PRAGMA table_info(${tableName})`);
  const exists = columns.some((column) => column.name === columnName);
  if (!exists) {
    await db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDefinition}`);
  }
}

export async function renameColumnIfExists(
  db: SqliteDb,
  tableName: string,
  oldColumnName: string,
  newColumnName: string,
): Promise<void> {
  const columns = await db.all<Array<{ name: string }>>(`PRAGMA table_info(${tableName})`);
  const oldExists = columns.some((column) => column.name === oldColumnName);
  const newExists = columns.some((column) => column.name === newColumnName);

  if (oldExists && !newExists) {
    await db.exec(`ALTER TABLE ${tableName} RENAME COLUMN ${oldColumnName} TO ${newColumnName}`);
  }
}

async function ensureUserNotesForeignKeys(db: SqliteDb): Promise<void> {
  const foreignKeys = await db.all<
    Array<{ table: string; from: string; on_delete: string }>
  >(`PRAGMA foreign_key_list(user_notes)`);

  const hasVideoCascade = foreignKeys.some(
    (foreignKey) =>
      foreignKey.table === 'videos' &&
      foreignKey.from === 'video_id' &&
      foreignKey.on_delete.toUpperCase() === 'CASCADE',
  );
  const hasTranscriptCascade = foreignKeys.some(
    (foreignKey) =>
      foreignKey.table === 'transcripts' &&
      foreignKey.from === 'transcript_id' &&
      foreignKey.on_delete.toUpperCase() === 'CASCADE',
  );

  if (hasVideoCascade && hasTranscriptCascade) {
    return;
  }

  await db.exec('BEGIN');

  try {
    await db.exec(`
      DROP TABLE IF EXISTS user_notes__new;

      CREATE TABLE user_notes__new (
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

      INSERT OR IGNORE INTO user_notes__new (
        id, user_id, video_id, transcript_id,
        content, created_at, updated_at
      )
      SELECT
        un.id, un.user_id, un.video_id, un.transcript_id,
        un.content, un.created_at, un.updated_at
      FROM user_notes un
      INNER JOIN videos v ON v.id = un.video_id
      LEFT JOIN transcripts t ON t.id = un.transcript_id
      WHERE un.transcript_id IS NULL OR t.id IS NOT NULL;

      DROP TABLE user_notes;
      ALTER TABLE user_notes__new RENAME TO user_notes;

      CREATE INDEX IF NOT EXISTS idx_user_notes_user_video
        ON user_notes(user_id, video_id);

      CREATE INDEX IF NOT EXISTS idx_user_notes_transcript
        ON user_notes(transcript_id);
    `);

    await db.exec('COMMIT');
  } catch (error) {
    await db.exec('ROLLBACK');
    throw error;
  }
}

async function ensureScriptProgressForeignKeys(db: SqliteDb): Promise<void> {
  const foreignKeys = await db.all<
    Array<{ table: string; from: string; on_delete: string }>
  >(`PRAGMA foreign_key_list(script_progress)`);

  const hasVideoCascade = foreignKeys.some(
    (fk) =>
      fk.table === 'videos' &&
      fk.from === 'video_id' &&
      fk.on_delete.toUpperCase() === 'CASCADE',
  );

  if (hasVideoCascade) {
    return;
  }

  await db.exec('BEGIN');

  try {
    await db.exec(`
      DROP TABLE IF EXISTS script_progress_attempts__bak;
      DROP TABLE IF EXISTS script_progress__new;

      ALTER TABLE script_progress_attempts RENAME TO script_progress_attempts__bak;

      CREATE TABLE script_progress__new (
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

      INSERT INTO script_progress__new (
        id, user_id, video_id, script_id,
        custom_content, custom_translation, status,
        consecutive_correct, best_tpw, is_deleted, order_index,
        total_attempts, correct_count, wrong_count,
        best_consecutive_correct, last_answer_at, last_answer_correct,
        first_mastered_at, mastered_count,
        total_tpw, tpw_sample_count, avg_tpw,
        created_at, updated_at
      )
      SELECT
        sp.id, sp.user_id, sp.video_id, sp.script_id,
        sp.custom_content, sp.custom_translation, sp.status,
        sp.consecutive_correct, sp.best_tpw, sp.is_deleted, sp.order_index,
        COALESCE(sp.total_attempts, 0),
        COALESCE(sp.correct_count, 0),
        COALESCE(sp.wrong_count, 0),
        COALESCE(sp.best_consecutive_correct, 0),
        sp.last_answer_at,
        sp.last_answer_correct,
        sp.first_mastered_at,
        COALESCE(sp.mastered_count, 0),
        COALESCE(sp.total_tpw, 0),
        COALESCE(sp.tpw_sample_count, 0),
        sp.avg_tpw,
        sp.created_at, sp.updated_at
      FROM script_progress sp
      INNER JOIN videos v ON v.id = sp.video_id;

      DROP TABLE script_progress;
      ALTER TABLE script_progress__new RENAME TO script_progress;

      CREATE INDEX IF NOT EXISTS idx_script_progress_user_video
        ON script_progress(user_id, video_id);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_script_progress_user_script
        ON script_progress(user_id, script_id);

      CREATE TABLE script_progress_attempts (
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

      INSERT INTO script_progress_attempts
      SELECT a.*
      FROM script_progress_attempts__bak a
      INNER JOIN script_progress sp ON sp.id = a.progress_id;

      DROP TABLE script_progress_attempts__bak;

      CREATE INDEX IF NOT EXISTS idx_sp_attempts_progress
        ON script_progress_attempts(progress_id, answered_at DESC);
      CREATE INDEX IF NOT EXISTS idx_sp_attempts_user_video
        ON script_progress_attempts(user_id, video_id);
    `);

    await db.exec('COMMIT');
  } catch (error) {
    await db.exec('ROLLBACK');
    throw error;
  }
}

async function migrateEduVideoCategories(db: SqliteDb): Promise<void> {
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
    `,
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
        assignment.source_language_id,
      );

      let targetCategoryId = existingCategory?.id;

      if (typeof targetCategoryId !== 'number') {
        const nextIdRow = await db.get<{ next_id: number }>(
          `
            SELECT COALESCE(MAX(id), 0) + 1 AS next_id
            FROM edu_video_categories
          `,
        );

        targetCategoryId = nextIdRow?.next_id ?? 1;

        await db.run(
          `
            INSERT INTO edu_video_categories (
              id, name, language_id, user_id,
              created_at, updated_at
            )
            VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          `,
          targetCategoryId,
          assignment.source_name,
          assignment.source_language_id,
          assignment.source_user_id,
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
          assignment.video_id,
        );
      }
    }

    await db.exec('COMMIT');
  } catch (error) {
    await db.exec('ROLLBACK');
    throw error;
  }
}

async function restructureWordsTable(db: SqliteDb): Promise<void> {
  const columns = await db.all<Array<{ name: string }>>(`PRAGMA table_info(words)`);
  const hasLangCode = columns.some((c) => c.name === 'lang_code');
  if (hasLangCode) return;

  await db.exec('BEGIN');
  try {
    await db.exec(`DROP TABLE IF EXISTS words__new;`);
    await db.exec(`
      CREATE TABLE words__new (
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

      INSERT INTO words__new (id, word, lang_code, created_at, updated_at)
      SELECT 
        w.id, 
        w.word, 
        COALESCE(l.code, 'unknown'),
        w.created_at,
        w.updated_at
      FROM words w
      LEFT JOIN languages l ON l.id = w.language_id;

      DROP TABLE words;
      ALTER TABLE words__new RENAME TO words;
      CREATE INDEX IF NOT EXISTS idx_words_word ON words(word);
      CREATE INDEX IF NOT EXISTS idx_words_lang_code ON words(lang_code);
    `);
    await db.exec('COMMIT');
  } catch (error) {
    await db.exec('ROLLBACK');
    throw error;
  }
}

async function restructureSentencesTable(db: SqliteDb): Promise<void> {
  const columns = await db.all<Array<{ name: string }>>(`PRAGMA table_info(sentences)`);
  const hasTranslation = columns.some((c) => c.name === 'translation');
  if (hasTranslation) return;

  await db.exec('BEGIN');
  try {
    await db.exec(`DROP TABLE IF EXISTS sentences__new;`);
    await db.exec(`
      CREATE TABLE sentences__new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sentence TEXT NOT NULL,
        translation TEXT NOT NULL,
        audio_url TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      INSERT INTO sentences__new (id, sentence, translation, audio_url, created_at, updated_at)
      SELECT id, sentence, translation, audio_url, created_at, updated_at
      FROM sentences;

      DROP TABLE sentences;
      ALTER TABLE sentences__new RENAME TO sentences;
    `);
    await db.exec('COMMIT');
  } catch (error) {
    await db.exec('ROLLBACK');
    throw error;
  }
}

async function restructureWordSentenceMapTable(db: SqliteDb): Promise<void> {
  const columns = await db.all<Array<{ name: string }>>(`PRAGMA table_info(word_sentence_map)`);
  const hasUsedAs = columns.some((c) => c.name === 'used_as');
  if (hasUsedAs) return;

  await db.exec('BEGIN');
  try {
    await db.exec(`DROP TABLE IF EXISTS word_sentence_map__new;`);
    await db.exec(`
      CREATE TABLE word_sentence_map__new (
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

      INSERT INTO word_sentence_map__new (id, word_id, sentence_id, created_at)
      SELECT id, word_id, sentence_id, created_at
      FROM word_sentence_map;

      DROP TABLE word_sentence_map;
      ALTER TABLE word_sentence_map__new RENAME TO word_sentence_map;
      CREATE INDEX IF NOT EXISTS idx_wsm_word_id ON word_sentence_map(word_id);
      CREATE INDEX IF NOT EXISTS idx_wsm_sentence_id ON word_sentence_map(sentence_id);
    `);
    await db.exec('COMMIT');
  } catch (error) {
    await db.exec('ROLLBACK');
    throw error;
  }
}

export async function runMigrations(db: SqliteDb): Promise<void> {
  // videos
  await ensureColumnExists(db, 'videos', 'visibility', "TEXT NOT NULL DEFAULT 'private'");
  await db.run(
    `UPDATE videos SET visibility = 'private' WHERE visibility IS NULL OR TRIM(visibility) = ''`,
  );

  // edu_videos
  await ensureColumnExists(db, 'edu_videos', 'duration_seconds', 'INTEGER');

  // 1. Ensure basic column names are consistent
  await renameColumnIfExists(db, 'words', 'text', 'word');
  await renameColumnIfExists(db, 'sentences', 'text', 'sentence');
  await renameColumnIfExists(db, 'sentences', 'translation_ko', 'translation');
  await renameColumnIfExists(db, 'sentences', 'audio_path', 'audio_url');

  // 2. Supabase 구조에 맞춘 테이블 재구성
  await restructureWordsTable(db);
  await restructureSentencesTable(db);
  await restructureWordSentenceMapTable(db);

  // script_progress 집계 컬럼
  await ensureColumnExists(db, 'script_progress', 'total_attempts', 'INTEGER NOT NULL DEFAULT 0');
  await ensureColumnExists(db, 'script_progress', 'correct_count', 'INTEGER NOT NULL DEFAULT 0');
  await ensureColumnExists(db, 'script_progress', 'wrong_count', 'INTEGER NOT NULL DEFAULT 0');
  await ensureColumnExists(db, 'script_progress', 'best_consecutive_correct', 'INTEGER NOT NULL DEFAULT 0');
  await ensureColumnExists(db, 'script_progress', 'last_answer_at', 'TEXT');
  await ensureColumnExists(db, 'script_progress', 'last_answer_correct', 'INTEGER');
  await ensureColumnExists(db, 'script_progress', 'first_mastered_at', 'TEXT');
  await ensureColumnExists(db, 'script_progress', 'mastered_count', 'INTEGER NOT NULL DEFAULT 0');
  await ensureColumnExists(db, 'script_progress', 'total_tpw', 'REAL NOT NULL DEFAULT 0');
  await ensureColumnExists(db, 'script_progress', 'tpw_sample_count', 'INTEGER NOT NULL DEFAULT 0');
  await ensureColumnExists(db, 'script_progress', 'avg_tpw', 'REAL');

  // FK 마이그레이션
  await ensureUserNotesForeignKeys(db);
  await ensureScriptProgressForeignKeys(db);

  // 레거시 카테고리 마이그레이션
  await migrateEduVideoCategories(db);

  // 최종 인덱스 생성 (모든 컬럼이 존재함을 보장한 후 실행)
  await db.exec(`
    CREATE INDEX IF NOT EXISTS idx_languages_name_ko ON languages(name_ko);
    CREATE INDEX IF NOT EXISTS idx_words_word ON words(word);
    CREATE INDEX IF NOT EXISTS idx_words_lang_code ON words(lang_code);
    CREATE INDEX IF NOT EXISTS idx_sentences_sentence ON sentences(sentence);
    CREATE INDEX IF NOT EXISTS idx_wsm_word_id ON word_sentence_map(word_id);
    CREATE INDEX IF NOT EXISTS idx_wsm_sentence_id ON word_sentence_map(sentence_id);
  `);
}
