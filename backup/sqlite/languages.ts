import { getSqliteDb } from '@/lib/sqlite/db';

export type SqliteLanguage = {
  id: number;
  name_en: string | null;
  name_ko: string;
  code: string;
  created_at: string;
  updated_at: string;
};

export async function listSqliteLanguages(): Promise<SqliteLanguage[]> {
  const db = await getSqliteDb();
  return db.all<SqliteLanguage[]>(
    `
      SELECT id, name_en, name_ko, code, created_at, updated_at
      FROM languages
      ORDER BY name_ko ASC
    `
  );
}

export async function listSqliteLanguagesByEnglishName(): Promise<SqliteLanguage[]> {
  const db = await getSqliteDb();
  return db.all<SqliteLanguage[]>(
    `
      SELECT id, name_en, name_ko, code, created_at, updated_at
      FROM languages
      ORDER BY COALESCE(name_en, name_ko) ASC
    `
  );
}

export async function findSqliteLanguageByCode(input: {
  code: string;
  excludeId?: number;
}): Promise<SqliteLanguage | null> {
  const db = await getSqliteDb();
  const normalizedCode = input.code.trim().toLowerCase();
  const excludeClause = typeof input.excludeId === 'number' ? 'AND id != ?' : '';

  const row = await db.get<SqliteLanguage>(
    `
      SELECT id, name_en, name_ko, code, created_at, updated_at
      FROM languages
      WHERE LOWER(code) = ?
      ${excludeClause}
      LIMIT 1
    `,
    ...(typeof input.excludeId === 'number'
      ? [normalizedCode, input.excludeId]
      : [normalizedCode])
  );

  return row ?? null;
}

export async function createSqliteLanguage(input: {
  nameEn: string;
  nameKo: string;
  code: string;
}): Promise<SqliteLanguage> {
  const db = await getSqliteDb();
  const result = await db.run(
    `
      INSERT INTO languages (name_en, name_ko, code)
      VALUES (?, ?, ?)
    `,
    input.nameEn.trim(),
    input.nameKo.trim(),
    input.code.trim().toLowerCase()
  );

  const created = await db.get<SqliteLanguage>(
    `
      SELECT id, name_en, name_ko, code, created_at, updated_at
      FROM languages
      WHERE id = ?
      LIMIT 1
    `,
    result.lastID
  );

  if (!created) {
    throw new Error('언어 생성 후 조회에 실패했습니다.');
  }

  return created;
}

export async function updateSqliteLanguage(input: {
  id: number;
  nameEn: string;
  nameKo: string;
  code: string;
}): Promise<SqliteLanguage | null> {
  const db = await getSqliteDb();
  await db.run(
    `
      UPDATE languages
      SET name_en = ?,
          name_ko = ?,
          code = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `,
    input.nameEn.trim(),
    input.nameKo.trim(),
    input.code.trim().toLowerCase(),
    input.id
  );

  const row = await db.get<SqliteLanguage>(
    `
      SELECT id, name_en, name_ko, code, created_at, updated_at
      FROM languages
      WHERE id = ?
      LIMIT 1
    `,
    input.id
  );

  return row ?? null;
}

export async function hasLanguageUsageSqlite(languageId: number): Promise<{ used: boolean; reason: string | null }> {
  const db = await getSqliteDb();

  const checks: Array<{ table: string; label: string }> = [
    { table: 'videos', label: '영상' },
    { table: 'lang_categories', label: '오디오 카테고리' },
    { table: 'user_categories', label: '비디오 카테고리' },
    { table: 'edu_video_categories', label: '교육 영상 카테고리' },
    { table: 'video_channels', label: '채널' },
  ];

  for (const check of checks) {
    const row = await db.get<{ id: string | number }>(
      `
        SELECT id
        FROM ${check.table}
        WHERE language_id = ?
        LIMIT 1
      `,
      languageId
    );

    if (row) {
      return { used: true, reason: `${check.label}가` };
    }
  }

  return { used: false, reason: null };
}

export async function deleteSqliteLanguage(id: number): Promise<void> {
  const db = await getSqliteDb();
  await db.run(`DELETE FROM languages WHERE id = ?`, id);
}

export async function upsertSqliteLanguage(input: {
  id: number;
  nameEn?: string | null;
  nameKo: string;
  code: string;
  createdAt?: string | null;
}): Promise<void> {
  const db = await getSqliteDb();
  await db.run(
    `
      INSERT INTO languages (id, name_en, name_ko, code, created_at, updated_at)
      VALUES (?, ?, ?, ?, COALESCE(?, CURRENT_TIMESTAMP), CURRENT_TIMESTAMP)
      ON CONFLICT(id) DO UPDATE SET
        name_en = excluded.name_en,
        name_ko = excluded.name_ko,
        code = excluded.code,
        updated_at = CURRENT_TIMESTAMP
    `,
    input.id,
    input.nameEn ?? null,
    input.nameKo,
    input.code,
    input.createdAt ?? null
  );
}
