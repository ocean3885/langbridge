import { getSqliteDb } from '@/lib/sqlite/db';

export type SqliteWord = {
  id: number;
  word: string;
  lang_code: string;
  pos: string; // JSON array string
  meaning: string; // JSON object string
  gender: string | null;
  declensions: string; // JSON object string
  conjugations: string; // JSON object string
  audio_url: string | null;
  created_at: string;
  updated_at: string;
};

export async function listWordsSqlite(): Promise<SqliteWord[]> {
  const db = await getSqliteDb();
  return db.all<SqliteWord[]>(
    `
      SELECT *
      FROM words
      ORDER BY id DESC
    `
  );
}

export async function createWordSqlite(input: {
  word: string;
  langCode: string;
  pos?: string[];
  meaning?: Record<string, any>;
  gender?: string | null;
  declensions?: Record<string, any>;
  conjugations?: Record<string, any>;
  audioUrl?: string | null;
}): Promise<SqliteWord> {
  const db = await getSqliteDb();
  const result = await db.run(
    `
      INSERT INTO words (word, lang_code, pos, meaning, gender, declensions, conjugations, audio_url)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
    input.word.trim(),
    input.langCode,
    JSON.stringify(input.pos ?? []),
    JSON.stringify(input.meaning ?? {}),
    input.gender ?? null,
    JSON.stringify(input.declensions ?? {}),
    JSON.stringify(input.conjugations ?? {}),
    input.audioUrl ?? null
  );

  const row = await db.get<SqliteWord>(
    `
      SELECT *
      FROM words
      WHERE id = ?
      LIMIT 1
    `,
    result.lastID
  );

  if (!row) throw new Error('단어 생성 후 조회에 실패했습니다.');
  return row;
}

export async function updateWordSqlite(input: {
  id: number;
  word: string;
  langCode: string;
  pos?: string[];
  meaning?: Record<string, any>;
  gender?: string | null;
  declensions?: Record<string, any>;
  conjugations?: Record<string, any>;
  audioUrl?: string | null;
}): Promise<SqliteWord | null> {
  const db = await getSqliteDb();
  await db.run(
    `
      UPDATE words
      SET word = ?,
          lang_code = ?,
          pos = ?,
          meaning = ?,
          gender = ?,
          declensions = ?,
          conjugations = ?,
          audio_url = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `,
    input.word.trim(),
    input.langCode,
    JSON.stringify(input.pos ?? []),
    JSON.stringify(input.meaning ?? {}),
    input.gender ?? null,
    JSON.stringify(input.declensions ?? {}),
    JSON.stringify(input.conjugations ?? {}),
    input.audioUrl ?? null,
    input.id
  );

  const row = await db.get<SqliteWord>(
    `
      SELECT *
      FROM words
      WHERE id = ?
      LIMIT 1
    `,
    input.id
  );

  return row ?? null;
}

export async function hasWordUsageSqlite(wordId: number): Promise<{ used: boolean; reason: string | null }> {
  const db = await getSqliteDb();

  const hasMapping = await db.get<{ id: number }>(
    `SELECT id FROM word_sentence_map WHERE word_id = ? LIMIT 1`,
    wordId
  );
  if (hasMapping) return { used: true, reason: '이 단어를 사용하는 문장 매핑이 있어' };

  return { used: false, reason: null };
}

export async function deleteWordSqlite(wordId: number): Promise<void> {
  const db = await getSqliteDb();
  await db.run(`DELETE FROM words WHERE id = ?`, wordId);
}
