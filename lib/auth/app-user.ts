import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';
import { getUserProfileByIdSqlite } from '@/lib/sqlite/user-profiles';

const SESSION_COOKIE = 'lb_user_id';

export type AppUser = {
  id: string;
  email: string | null;
  createdAt: string | null;
  source: 'sqlite';
};

export async function getAppUserFromServer(_supabase?: unknown): Promise<AppUser | null> {

  const cookieStore = await cookies();
  const sqliteUserId = cookieStore.get(SESSION_COOKIE)?.value;
  if (!sqliteUserId) return null;

  const profile = await getUserProfileByIdSqlite(sqliteUserId);
  return {
    id: sqliteUserId,
    email: profile?.email ?? null,
    createdAt: profile?.created_at ?? null,
    source: 'sqlite',
  };
}

export async function getAppUserFromRequest(
  request: NextRequest,
  _supabase?: unknown
): Promise<AppUser | null> {
  const sqliteUserId = request.cookies.get(SESSION_COOKIE)?.value;
  if (!sqliteUserId) return null;

  const profile = await getUserProfileByIdSqlite(sqliteUserId);
  return {
    id: sqliteUserId,
    email: profile?.email ?? null,
    createdAt: profile?.created_at ?? null,
    source: 'sqlite',
  };
}
