import { getSqliteDb } from '@/lib/sqlite/db';

export type SqliteSentence = {
  id: number;
  language_id: number;
  text: string;
  translation_ko: string;
  audio_path: string;
  context_category: string | null;
  mapping_details: string | null;
  created_at: string;
  updated_at: string;
};

export async function listSentencesSqlite(): Promise<SqliteSentence[]> {
  const db = await getSqliteDb();
  return db.all<SqliteSentence[]>(
    `
      SELECT id, language_id, text, translation_ko, audio_path, context_category, mapping_details, created_at, updated_at
      FROM sentences
      ORDER BY id DESC
    `
  );
}

export async function createSentenceSqlite(input: {
  languageId: number;
  text: string;
  translationKo: string;
  audioPath: string;
  contextCategory?: string | null;
}): Promise<SqliteSentence> {
  const db = await getSqliteDb();
  const result = await db.run(
    `
      INSERT INTO sentences (language_id, text, translation_ko, audio_path, context_category)
      VALUES (?, ?, ?, ?, ?)
    `,
    input.languageId,
    input.text.trim(),
    input.translationKo.trim(),
    input.audioPath,
    input.contextCategory ?? null
  );

  const row = await db.get<SqliteSentence>(
    `
      SELECT id, language_id, text, translation_ko, audio_path, context_category, mapping_details, created_at, updated_at
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
      SELECT id, language_id, text, translation_ko, audio_path, context_category, mapping_details, created_at, updated_at
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
  languageId: number;
  text: string;
  translationKo: string;
  audioPath: string;
  contextCategory?: string | null;
}): Promise<SqliteSentence | null> {
  const db = await getSqliteDb();
  await db.run(
    `
      UPDATE sentences
      SET language_id = ?,
          text = ?,
          translation_ko = ?,
          audio_path = ?,
          context_category = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `,
    input.languageId,
    input.text.trim(),
    input.translationKo.trim(),
    input.audioPath,
    input.contextCategory ?? null,
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
