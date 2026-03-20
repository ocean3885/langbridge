import { getSqliteDb } from '@/lib/sqlite/db';

export type AudioMemoRow = {
  id: number;
  content_id: string;
  line_number: number;
  user_id: string;
  memo_text: string;
  created_at: string;
  updated_at: string;
};

export async function listAudioMemosSqlite(contentId: string, userId: string): Promise<AudioMemoRow[]> {
  const db = await getSqliteDb();
  return db.all<AudioMemoRow[]>(
    `
      SELECT id, content_id, line_number, user_id, memo_text, created_at, updated_at
      FROM lang_audio_memos
      WHERE content_id = ? AND user_id = ?
      ORDER BY line_number ASC
    `,
    contentId,
    userId
  );
}

export async function insertAudioMemoSqlite(input: {
  contentId: string;
  lineNumber: number;
  userId: string;
  memoText: string;
}): Promise<AudioMemoRow> {
  const db = await getSqliteDb();
  const result = await db.run(
    `
      INSERT INTO lang_audio_memos (content_id, line_number, user_id, memo_text)
      VALUES (?, ?, ?, ?)
    `,
    input.contentId,
    input.lineNumber,
    input.userId,
    input.memoText.trim()
  );

  return db.get<AudioMemoRow>(
    `
      SELECT id, content_id, line_number, user_id, memo_text, created_at, updated_at
      FROM lang_audio_memos
      WHERE id = ?
    `,
    result.lastID
  ) as Promise<AudioMemoRow>;
}

export async function updateAudioMemoSqlite(input: {
  id: number;
  userId: string;
  memoText: string;
}): Promise<AudioMemoRow | null> {
  const db = await getSqliteDb();
  await db.run(
    `
      UPDATE lang_audio_memos
      SET memo_text = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_id = ?
    `,
    input.memoText.trim(),
    input.id,
    input.userId
  );

  const row = await db.get<AudioMemoRow>(
    `
      SELECT id, content_id, line_number, user_id, memo_text, created_at, updated_at
      FROM lang_audio_memos
      WHERE id = ? AND user_id = ?
      LIMIT 1
    `,
    input.id,
    input.userId
  );

  return row ?? null;
}

export async function deleteAudioMemoSqlite(id: number, userId: string): Promise<void> {
  const db = await getSqliteDb();
  await db.run(`DELETE FROM lang_audio_memos WHERE id = ? AND user_id = ?`, id, userId);
}
