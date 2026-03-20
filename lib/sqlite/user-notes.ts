import { randomUUID } from 'crypto';
import { getSqliteDb } from '@/lib/sqlite/db';

type UserNoteRow = {
  id: string;
  transcript_id: string | null;
  content: string;
};

export async function getUserNoteForTranscriptSqlite(
  userId: string,
  videoId: string,
  transcriptId: string
): Promise<{ id: string; content: string } | null> {
  const db = await getSqliteDb();
  const row = await db.get<UserNoteRow>(
    `
      SELECT id, transcript_id, content
      FROM user_notes
      WHERE user_id = ? AND video_id = ? AND transcript_id = ?
      LIMIT 1
    `,
    userId,
    videoId,
    transcriptId
  );

  if (!row) return null;
  return { id: row.id, content: row.content };
}

export async function getAllUserNotesForVideoSqlite(
  userId: string,
  videoId: string
): Promise<Record<string, { id: string; content: string }>> {
  const db = await getSqliteDb();
  const rows = await db.all<UserNoteRow[]>(
    `
      SELECT id, transcript_id, content
      FROM user_notes
      WHERE user_id = ? AND video_id = ?
    `,
    userId,
    videoId
  );

  const result: Record<string, { id: string; content: string }> = {};
  for (const row of rows) {
    if (row.transcript_id) {
      result[row.transcript_id] = {
        id: row.id,
        content: row.content,
      };
    }
  }

  return result;
}

export async function upsertUserNoteSqlite(input: {
  userId: string;
  videoId: string;
  transcriptId: string;
  content: string;
}): Promise<string> {
  const db = await getSqliteDb();

  const existing = await db.get<{ id: string }>(
    `
      SELECT id
      FROM user_notes
      WHERE user_id = ? AND video_id = ? AND transcript_id = ?
      LIMIT 1
    `,
    input.userId,
    input.videoId,
    input.transcriptId
  );

  if (existing) {
    await db.run(
      `
        UPDATE user_notes
        SET content = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      input.content,
      existing.id
    );
    return existing.id;
  }

  const id = randomUUID();
  await db.run(
    `
      INSERT INTO user_notes (id, user_id, video_id, transcript_id, content)
      VALUES (?, ?, ?, ?, ?)
    `,
    id,
    input.userId,
    input.videoId,
    input.transcriptId,
    input.content
  );

  return id;
}

export async function deleteUserNoteSqlite(noteId: string, userId: string): Promise<void> {
  const db = await getSqliteDb();
  await db.run(
    `
      DELETE FROM user_notes
      WHERE id = ? AND user_id = ?
    `,
    noteId,
    userId
  );
}
