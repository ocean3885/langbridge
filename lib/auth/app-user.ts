import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';
import { getUserProfileById } from '@/lib/supabase/services/user-profiles';
import { createClient } from '@/lib/supabase/server';

export type AppUser = {
  id: string;
  email: string | null;
  createdAt: string | null;
  source: 'supabase';
};

const LANG_COOKIE = 'lb_display_language';

export async function getAppUserFromServer(): Promise<AppUser | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    const profile = await getUserProfileById(user.id);
    return {
      id: user.id,
      email: profile?.email || user.email || null,
      createdAt: profile?.created_at || user.created_at || null,
      source: 'supabase',
    };
  }

  return null;
}

export async function getDisplayLanguage(): Promise<'ko' | 'en'> {
  const cookieStore = await cookies();
  const lang = cookieStore.get(LANG_COOKIE)?.value;
  return (lang === 'ko' ? 'ko' : 'en');
}

export async function getAppUserFromRequest(
  request: NextRequest
): Promise<AppUser | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    const profile = await getUserProfileById(user.id);
    return {
      id: user.id,
      email: profile?.email || user.email || null,
      createdAt: profile?.created_at || user.created_at || null,
      source: 'supabase',
    };
  }

  return null;
}
