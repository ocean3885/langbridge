import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';
import { getUserProfileByIdSqlite } from '@/lib/sqlite/user-profiles';

const SESSION_COOKIE = 'lb_user_id';

type SupabaseUserLike = {
  id: string;
  email?: string | null;
  created_at?: string | null;
};

type SupabaseClientLike = {
  auth: {
    getUser: () => Promise<{ data: { user: SupabaseUserLike | null } }>;
  };
};

export type AppUser = {
  id: string;
  email: string | null;
  createdAt: string | null;
  source: 'supabase' | 'sqlite';
};

async function getSupabaseUser(supabase?: SupabaseClientLike): Promise<SupabaseUserLike | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  return data.user ?? null;
}

export async function getAppUserFromServer(supabase?: SupabaseClientLike): Promise<AppUser | null> {
  const supabaseUser = await getSupabaseUser(supabase);
  if (supabaseUser) {
    return {
      id: supabaseUser.id,
      email: supabaseUser.email ?? null,
      createdAt: supabaseUser.created_at ?? null,
      source: 'supabase',
    };
  }

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
  supabase?: SupabaseClientLike
): Promise<AppUser | null> {
  const supabaseUser = await getSupabaseUser(supabase);
  if (supabaseUser) {
    return {
      id: supabaseUser.id,
      email: supabaseUser.email ?? null,
      createdAt: supabaseUser.created_at ?? null,
      source: 'supabase',
    };
  }

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
