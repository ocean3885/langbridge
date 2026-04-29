import { getSqliteDb } from '@/lib/sqlite/db';

export type SqliteSentence = {
  id: number;
  sentence: string;
  translation: string;
  audio_url: string | null;
  created_at: string;
  updated_at: string;
};

export async function listSentencesSqlite(): Promise<SqliteSentence[]> {
  const db = await getSqliteDb();
  return db.all<SqliteSentence[]>(
    `
      SELECT id, sentence, translation, audio_url, created_at, updated_at
      FROM sentences
      ORDER BY id DESC
    `
  );
}

export async function createSentenceSqlite(input: {
  sentence: string;
  translation: string;
  audioUrl?: string | null;
}): Promise<SqliteSentence> {
  const db = await getSqliteDb();
  const result = await db.run(
    `
      INSERT INTO sentences (sentence, translation, audio_url)
      VALUES (?, ?, ?)
    `,
    input.sentence.trim(),
    input.translation.trim(),
    input.audioUrl ?? null
  );

  const row = await db.get<SqliteSentence>(
    `
      SELECT id, sentence, translation, audio_url, created_at, updated_at
      FROM sentences
      WHERE id = ?
      LIMIT 1
    `,
    result.lastID
  );

  if (!row) throw new Error('문장 생성 후 조회에 실패했습니다.');
  return row;
}

export async function findSentenceByIdSqlite(id: number): Promise<SqliteSentence | null> {
  const db = await getSqliteDb();
  const row = await db.get<SqliteSentence>(
    `
      SELECT id, sentence, translation, audio_url, created_at, updated_at
      FROM sentences
      WHERE id = ?
      LIMIT 1
    `,
    id
  );

  return row ?? null;
}

export async function updateSentenceSqlite(input: {
  id: number;
  sentence: string;
  translation: string;
  audioUrl?: string | null;
}): Promise<SqliteSentence | null> {
  const db = await getSqliteDb();
  await db.run(
    `
      UPDATE sentences
      SET sentence = ?,
          translation = ?,
          audio_url = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `,
    input.sentence.trim(),
    input.translation.trim(),
    input.audioUrl ?? null,
    input.id
  );

  return findSentenceByIdSqlite(input.id);
}

export async function hasSentenceMappingSqlite(sentenceId: number): Promise<boolean> {
  const db = await getSqliteDb();
  const row = await db.get<{ id: number }>(
    `SELECT id FROM word_sentence_map WHERE sentence_id = ? LIMIT 1`,
    sentenceId
  );
  return Boolean(row);
}

export async function deleteSentenceSqlite(sentenceId: number): Promise<void> {
  const db = await getSqliteDb();
  await db.run(`DELETE FROM sentences WHERE id = ?`, sentenceId);
}
