import { getSqliteDb } from '@/lib/sqlite/db';

export type SqliteWord = {
  id: number;
  language_id: number;
  text: string;
  meaning_ko: string;
  level: string;
  part_of_speech: string | null;
  created_at: string;
  updated_at: string;
};

export async function listWordsSqlite(): Promise<SqliteWord[]> {
  const db = await getSqliteDb();
  return db.all<SqliteWord[]>(
    `
      SELECT id, language_id, text, meaning_ko, level, part_of_speech, created_at, updated_at
      FROM words
      ORDER BY id DESC
    `
  );
}

export async function createWordSqlite(input: {
  languageId: number;
  text: string;
  meaningKo: string;
  level: string;
  partOfSpeech?: string | null;
}): Promise<SqliteWord> {
  const db = await getSqliteDb();
  const result = await db.run(
    `
      INSERT INTO words (language_id, text, meaning_ko, level, part_of_speech)
      VALUES (?, ?, ?, ?, ?)
    `,
    input.languageId,
    input.text.trim(),
    input.meaningKo.trim(),
    input.level,
    input.partOfSpeech ?? null
  );

  const row = await db.get<SqliteWord>(
    `
      SELECT id, language_id, text, meaning_ko, level, part_of_speech, created_at, updated_at
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
  languageId: number;
  text: string;
  meaningKo: string;
  level: string;
  partOfSpeech?: string | null;
}): Promise<SqliteWord | null> {
  const db = await getSqliteDb();
  await db.run(
    `
      UPDATE words
      SET language_id = ?,
          text = ?,
          meaning_ko = ?,
          level = ?,
          part_of_speech = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `,
    input.languageId,
    input.text.trim(),
    input.meaningKo.trim(),
    input.level,
    input.partOfSpeech ?? null,
    input.id
  );

  const row = await db.get<SqliteWord>(
    `
      SELECT id, language_id, text, meaning_ko, level, part_of_speech, created_at, updated_at
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
