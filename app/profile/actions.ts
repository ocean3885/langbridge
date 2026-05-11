'use server';

import { cookies } from 'next/headers';
import { getAppUserFromServer } from '@/lib/auth/app-user';
import { revalidatePath } from 'next/cache';

const LANG_COOKIE = 'lb_display_language';

export async function setLanguageAction(language: 'ko' | 'en') {
  const user = await getAppUserFromServer();
  if (!user) {
    throw new Error('인증이 필요합니다.');
  }

  const cookieStore = await cookies();
  cookieStore.set(LANG_COOKIE, language, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365, // 1 year
  });
  
  revalidatePath('/profile');
}
