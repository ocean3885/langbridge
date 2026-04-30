import { getSqliteDb } from '@/lib/sqlite/db';

type CategoryTable = 'lang_categories' | 'user_categories' | 'edu_video_categories';

export type SqliteCategory = {
  id: number;
  name: string;
  language_id: number | null;
  user_id: string;
  created_at: string;
  updated_at: string;
};

function tableName(table: CategoryTable): string {
  return table;
}

export async function listSqliteCategories(table: CategoryTable, userId: string): Promise<SqliteCategory[]> {
  const db = await getSqliteDb();
  return db.all<SqliteCategory[]>(
    `
      SELECT id, name, language_id, user_id, created_at, updated_at
      FROM ${tableName(table)}
      WHERE user_id = ?
      ORDER BY name ASC
    `,
    userId
  );
}

export async function listAllSqliteCategories(table: CategoryTable): Promise<SqliteCategory[]> {
  const db = await getSqliteDb();
  return db.all<SqliteCategory[]>(
    `
      SELECT id, name, language_id, user_id, created_at, updated_at
      FROM ${tableName(table)}
      ORDER BY name ASC
    `
  );
}

export async function findSqliteCategoryByName(input: {
  table: CategoryTable;
  userId: string;
  name: string;
  languageId: number | null;
  excludeId?: number;
}): Promise<SqliteCategory | null> {
  const db = await getSqliteDb();
  const excludeClause = typeof input.excludeId === 'number' ? 'AND id != ?' : '';
  const params: Array<string | number | null> = [input.userId, input.name.trim(), input.languageId];
  if (typeof input.excludeId === 'number') {
    params.push(input.excludeId);
  }

  const row = await db.get<SqliteCategory>(
    `
      SELECT id, name, language_id, user_id, created_at, updated_at
      FROM ${tableName(input.table)}
      WHERE user_id = ?
        AND name = ?
        AND language_id IS ?
        ${excludeClause}
      LIMIT 1
    `,
    ...params
  );

  return row ?? null;
}

export async function upsertSqliteCategory(input: {
  table: CategoryTable;
  id: number;
  name: string;
  languageId: number | null;
  userId: string;
  createdAt?: string;
}): Promise<void> {
  const db = await getSqliteDb();
  await db.run(
    `
      INSERT INTO ${tableName(input.table)}
        (id, name, language_id, user_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, COALESCE(?, CURRENT_TIMESTAMP), CURRENT_TIMESTAMP)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        language_id = excluded.language_id,
        user_id = excluded.user_id,
        updated_at = CURRENT_TIMESTAMP
    `,
    input.id,
    input.name.trim(),
    input.languageId,
    input.userId,
    input.createdAt ?? null
  );
}

export async function createSqliteCategory(input: {
  table: CategoryTable;
  userId: string;
  name: string;
  languageId: number | null;
}): Promise<SqliteCategory> {
  const db = await getSqliteDb();
  const row = await db.get<{ next_id: number }>(
    `
      SELECT COALESCE(MAX(id), 0) + 1 AS next_id
      FROM ${tableName(input.table)}
    `
  );

  const nextId = row?.next_id ?? 1;

  await db.run(
    `
      INSERT INTO ${tableName(input.table)}
        (id, name, language_id, user_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `,
    nextId,
    input.name.trim(),
    input.languageId,
    input.userId
  );

  const created = await db.get<SqliteCategory>(
    `
      SELECT id, name, language_id, user_id, created_at, updated_at
      FROM ${tableName(input.table)}
      WHERE id = ? AND user_id = ?
      LIMIT 1
    `,
    nextId,
    input.userId
  );

  if (!created) {
    throw new Error('카테고리 생성 후 조회에 실패했습니다.');
  }

  return created;
}

export async function updateSqliteCategory(input: {
  table: CategoryTable;
  id: number;
  userId: string;
  name: string;
}): Promise<void> {
  const db = await getSqliteDb();
  await db.run(
    `
      UPDATE ${tableName(input.table)}
      SET name = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_id = ?
    `,
    input.name.trim(),
    input.id,
    input.userId
  );
}

export async function deleteSqliteCategory(input: {
  table: CategoryTable;
  id: number;
  userId: string;
}): Promise<void> {
  const db = await getSqliteDb();
  await db.run(
    `
      DELETE FROM ${tableName(input.table)}
      WHERE id = ? AND user_id = ?
    `,
    input.id,
    input.userId
  );
}
