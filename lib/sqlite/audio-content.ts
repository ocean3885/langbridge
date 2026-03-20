import { getSqliteDb } from '@/lib/sqlite/db';

export type SqliteAudioContent = {
  id: string;
  user_id: string;
  title: string | null;
  category_id: number | null;
  original_text: string | null;
  translated_text: string | null;
  sync_data: string | null;
  audio_file_path: string | null;
  study_count: number | null;
  last_studied_at: string | null;
  created_at: string;
  updated_at: string;
};

export async function listAudioContentByUserSqlite(userId: string, limit = 100): Promise<SqliteAudioContent[]> {
  const db = await getSqliteDb();
  return db.all<SqliteAudioContent[]>(
    `
      SELECT
        id,
        user_id,
        title,
        category_id,
        original_text,
        translated_text,
        sync_data,
        audio_file_path,
        study_count,
        last_studied_at,
        created_at,
        updated_at
      FROM lang_audio_content
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `,
    userId,
    limit
  );
}

export async function findAudioContentByIdSqlite(id: string): Promise<SqliteAudioContent | null> {
  const db = await getSqliteDb();
  const row = await db.get<SqliteAudioContent>(
    `
      SELECT
        id,
        user_id,
        title,
        category_id,
        original_text,
        translated_text,
        sync_data,
        audio_file_path,
        study_count,
        last_studied_at,
        created_at,
        updated_at
      FROM lang_audio_content
      WHERE id = ?
      LIMIT 1
    `,
    id
  );

  return row ?? null;
}

export async function upsertAudioContentSqlite(input: {
  id: string;
  userId: string;
  title: string | null;
  categoryId: number | null;
  originalText: string | null;
  translatedText: string | null;
  syncData: unknown;
  audioFilePath: string | null;
  studyCount?: number | null;
  lastStudiedAt?: string | null;
  createdAt?: string;
}): Promise<void> {
  const db = await getSqliteDb();

  await db.run(
    `
      INSERT INTO lang_audio_content (
        id,
        user_id,
        title,
        category_id,
        original_text,
        translated_text,
        sync_data,
        audio_file_path,
        study_count,
        last_studied_at,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE(?, CURRENT_TIMESTAMP), CURRENT_TIMESTAMP)
      ON CONFLICT(id) DO UPDATE SET
        user_id = excluded.user_id,
        title = excluded.title,
        category_id = excluded.category_id,
        original_text = excluded.original_text,
        translated_text = excluded.translated_text,
        sync_data = excluded.sync_data,
        audio_file_path = excluded.audio_file_path,
        study_count = excluded.study_count,
        last_studied_at = excluded.last_studied_at,
        updated_at = CURRENT_TIMESTAMP
    `,
    input.id,
    input.userId,
    input.title,
    input.categoryId,
    input.originalText,
    input.translatedText,
    JSON.stringify(input.syncData ?? null),
    input.audioFilePath,
    input.studyCount ?? 0,
    input.lastStudiedAt ?? null,
    input.createdAt ?? null
  );
}

export async function deleteAudioContentByIdForUserSqlite(id: string, userId: string): Promise<void> {
  const db = await getSqliteDb();
  await db.run(
    `
      DELETE FROM lang_audio_content
      WHERE id = ? AND user_id = ?
    `,
    id,
    userId
  );
}

export async function updateAudioCategoryForIdsSqlite(input: {
  ids: string[];
  userId: string;
  categoryId: number | null;
}): Promise<void> {
  if (input.ids.length === 0) return;

  const db = await getSqliteDb();
  const placeholders = input.ids.map(() => '?').join(', ');

  await db.run(
    `
      UPDATE lang_audio_content
      SET category_id = ?, updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ?
        AND id IN (${placeholders})
    `,
    input.categoryId,
    input.userId,
    ...input.ids
  );
}

export async function recordAudioStudySqlite(input: {
  id: string;
  userId: string;
  nowIso: string;
}): Promise<void> {
  const db = await getSqliteDb();
  await db.run(
    `
      UPDATE lang_audio_content
      SET
        study_count = COALESCE(study_count, 0) + 1,
        last_studied_at = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_id = ?
    `,
    input.nowIso,
    input.id,
    input.userId
  );
}

export async function listAudioContentByCategorySqlite(input: {
  categoryId: number;
  excludeId?: string;
  limit?: number;
}): Promise<Array<{ id: string; title: string | null }>> {
  const db = await getSqliteDb();
  const limit = input.limit ?? 20;

  if (input.excludeId) {
    return db.all<Array<{ id: string; title: string | null }>>(
      `
        SELECT id, title
        FROM lang_audio_content
        WHERE category_id = ?
          AND id != ?
        ORDER BY created_at DESC
        LIMIT ?
      `,
      input.categoryId,
      input.excludeId,
      limit
    );
  }

  return db.all<Array<{ id: string; title: string | null }>>(
    `
      SELECT id, title
      FROM lang_audio_content
      WHERE category_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `,
    input.categoryId,
    limit
  );
}

export async function updateAudioTitleForUserSqlite(input: {
  id: string;
  userId: string;
  title: string;
}): Promise<boolean> {
  const db = await getSqliteDb();
  const result = await db.run(
    `
      UPDATE lang_audio_content
      SET title = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_id = ?
    `,
    input.title.trim(),
    input.id,
    input.userId
  );

  return (result.changes ?? 0) > 0;
}

export async function countAudioContentByCategoryForUserSqlite(input: {
  userId: string;
  categoryId: number;
}): Promise<number> {
  const db = await getSqliteDb();
  const row = await db.get<{ count: number }>(
    `
      SELECT COUNT(*) as count
      FROM lang_audio_content
      WHERE user_id = ? AND category_id = ?
    `,
    input.userId,
    input.categoryId
  );

  return row?.count ?? 0;
}

export async function hasAudioContentForCategoryByUserSqlite(input: {
  userId: string;
  categoryId: number;
}): Promise<boolean> {
  const db = await getSqliteDb();
  const row = await db.get<{ id: string }>(
    `
      SELECT id
      FROM lang_audio_content
      WHERE user_id = ? AND category_id = ?
      LIMIT 1
    `,
    input.userId,
    input.categoryId
  );

  return Boolean(row);
}
