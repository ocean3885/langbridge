import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'crypto';
import { getSqliteDb } from '@/lib/sqlite/db';

export type SqliteAuthUser = {
  id: string;
  email: string;
  password_hash: string;
  password_salt: string;
  created_at: string;
  updated_at: string;
};

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function hashPassword(password: string, salt: string): string {
  return scryptSync(password, salt, 64).toString('hex');
}

export async function getAuthUserByEmail(email: string): Promise<SqliteAuthUser | null> {
  const db = await getSqliteDb();
  const row = await db.get<SqliteAuthUser>(
    `
      SELECT id, email, password_hash, password_salt, created_at, updated_at
      FROM auth_users
      WHERE email = ?
      LIMIT 1
    `,
    normalizeEmail(email)
  );

  return row ?? null;
}

export async function createAuthUser(input: {
  email: string;
  password: string;
}): Promise<Pick<SqliteAuthUser, 'id' | 'email' | 'created_at'>> {
  const db = await getSqliteDb();
  const email = normalizeEmail(input.email);
  const salt = randomBytes(16).toString('hex');
  const passwordHash = hashPassword(input.password, salt);
  const id = randomUUID();

  await db.run(
    `
      INSERT INTO auth_users (id, email, password_hash, password_salt)
      VALUES (?, ?, ?, ?)
    `,
    id,
    email,
    passwordHash,
    salt
  );

  const created = await db.get<{ id: string; email: string; created_at: string }>(
    `
      SELECT id, email, created_at
      FROM auth_users
      WHERE id = ?
      LIMIT 1
    `,
    id
  );

  if (!created) {
    throw new Error('사용자 생성 후 조회에 실패했습니다.');
  }

  return created;
}

export async function verifyAuthUserPassword(input: {
  email: string;
  password: string;
}): Promise<Pick<SqliteAuthUser, 'id' | 'email' | 'created_at'> | null> {
  const user = await getAuthUserByEmail(input.email);
  if (!user) return null;

  const computedHash = hashPassword(input.password, user.password_salt);
  const stored = Buffer.from(user.password_hash, 'hex');
  const computed = Buffer.from(computedHash, 'hex');

  if (stored.length !== computed.length) return null;
  if (!timingSafeEqual(stored, computed)) return null;

  return {
    id: user.id,
    email: user.email,
    created_at: user.created_at,
  };
}

export async function updateAuthUserPasswordById(input: {
  userId: string;
  newPassword: string;
}): Promise<boolean> {
  const db = await getSqliteDb();
  const salt = randomBytes(16).toString('hex');
  const passwordHash = hashPassword(input.newPassword, salt);

  const result = await db.run(
    `
      UPDATE auth_users
      SET password_hash = ?,
          password_salt = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `,
    passwordHash,
    salt,
    input.userId
  );

  return (result.changes ?? 0) > 0;
}

export async function countAuthUsersSqlite(): Promise<number> {
  const db = await getSqliteDb();
  const row = await db.get<{ count: number }>(
    `
      SELECT COUNT(*) AS count
      FROM auth_users
    `
  );

  return row?.count ?? 0;
}
