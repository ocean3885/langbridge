import { getSqliteDb } from '@/lib/sqlite/db';

function parseCsvEnv(value: string | undefined): Set<string> {
  if (!value) return new Set();
  return new Set(
    value
      .split(',')
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean)
  );
}

export function getConfiguredSuperAdminUserIds(): string[] {
  return Array.from(parseCsvEnv(process.env.SUPER_ADMIN_USER_IDS));
}

async function upsertSuperAdminUser(input: { userId: string; email: string | null }): Promise<void> {
  const db = await getSqliteDb();
  await db.run(
    `
      INSERT INTO super_admin_users (user_id, email, created_at, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT(user_id) DO UPDATE SET
        email = excluded.email,
        updated_at = CURRENT_TIMESTAMP
    `,
    input.userId,
    input.email
  );
}

export async function isSuperAdminSqlite(input: {
  userId: string;
  email?: string | null;
}): Promise<boolean> {
  const db = await getSqliteDb();
  const email = input.email?.trim().toLowerCase() ?? null;

  const persisted = await db.get<{ user_id: string }>(
    `
      SELECT user_id
      FROM super_admin_users
      WHERE user_id = ?
      LIMIT 1
    `,
    input.userId
  );

  if (persisted) {
    if (email) {
      await upsertSuperAdminUser({ userId: input.userId, email });
    }
    return true;
  }

  const envAdminIds = new Set(getConfiguredSuperAdminUserIds());
  const envAdminEmails = parseCsvEnv(process.env.SUPER_ADMIN_EMAILS);

  const matchedById = envAdminIds.has(input.userId.toLowerCase());
  const matchedByEmail = email ? envAdminEmails.has(email) : false;

  if (matchedById || matchedByEmail) {
    await upsertSuperAdminUser({ userId: input.userId, email });
    return true;
  }

  return false;
}
