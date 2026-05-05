'use server';

import { getAppUserFromServer } from '@/lib/auth/app-user';
import { updateUserLanguage } from '@/lib/supabase/services/user-profiles';
import { revalidatePath } from 'next/cache';

export async function setLanguageAction(language: 'ko' | 'en') {
  const user = await getAppUserFromServer();
  if (!user) {
    throw new Error('인증이 필요합니다.');
  }

  await updateUserLanguage(user.id, language);
  revalidatePath('/profile');
}
