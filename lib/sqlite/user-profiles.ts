import { getSqliteDb } from '@/lib/sqlite/db';

export type SqliteUserProfile = {
  id: string;
  email: string | null;
  created_at: string | null;
  updated_at: string;
};

export async function upsertUserProfileSqlite(input: {
  id: string;
  email?: string | null;
  createdAt?: string | null;
}): Promise<void> {
  const db = await getSqliteDb();
  await db.run(
    `
      INSERT INTO user_profiles (id, email, created_at, updated_at)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(id) DO UPDATE SET
        email = COALESCE(excluded.email, user_profiles.email),
        created_at = COALESCE(excluded.created_at, user_profiles.created_at),
        updated_at = CURRENT_TIMESTAMP
    `,
    input.id,
    input.email ?? null,
    input.createdAt ?? null
  );
}

export async function getUserProfileByIdSqlite(userId: string): Promise<SqliteUserProfile | null> {
  const db = await getSqliteDb();
  const row = await db.get<SqliteUserProfile>(
    `
      SELECT id, email, created_at, updated_at
      FROM user_profiles
      WHERE id = ?
      LIMIT 1
    `,
    userId
  );
  return row ?? null;
}
