import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';
import { getUserProfileById } from '@/lib/supabase/services/user-profiles';

const SESSION_COOKIE = 'lb_user_id';

export type AppUser = {
  id: string;
  email: string | null;
  createdAt: string | null;
  displayLanguage: 'ko' | 'en';
  source: 'supabase';
};

const LANG_COOKIE = 'lb_display_language';

export async function getAppUserFromServer(): Promise<AppUser | null> {
  const cookieStore = await cookies();
  const userId = cookieStore.get(SESSION_COOKIE)?.value;
  if (!userId) return null;

  const profile = await getUserProfileById(userId);
  if (!profile) return null;

  const displayLanguage = (cookieStore.get(LANG_COOKIE)?.value as 'ko' | 'en') || 'ko';

  return {
    id: userId,
    email: profile.email,
    createdAt: profile.created_at,
    displayLanguage,
    source: 'supabase',
  };
}

export async function getAppUserFromRequest(
  request: NextRequest
): Promise<AppUser | null> {
  const userId = request.cookies.get(SESSION_COOKIE)?.value;
  if (!userId) return null;

  const profile = await getUserProfileById(userId);
  if (!profile) return null;

  const displayLanguage = (request.cookies.get(LANG_COOKIE)?.value as 'ko' | 'en') || 'ko';

  return {
    id: userId,
    email: profile.email,
    createdAt: profile.created_at,
    displayLanguage,
    source: 'supabase',
  };
}
