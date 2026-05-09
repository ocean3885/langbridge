import HeaderClient from '@/components/layout/HeaderClient';
import { getAppUserFromServer } from '@/lib/auth/app-user';
import { isSuperAdmin } from '@/lib/auth/super-admin';
import { cookies } from 'next/headers';

export default async function Header() {
  const cookieStore = await cookies();
  const lang = (cookieStore.get('lb_display_language')?.value === 'en' ? 'en' : 'ko') as 'ko' | 'en';

  const user = await getAppUserFromServer();

  const isLoggedIn = !!user;
  const userEmail = user?.email ?? null;

  const isAdminUser = user
    ? await isSuperAdmin({ userId: user.id, email: user.email ?? null })
    : false;

  return (
    <HeaderClient
      isLoggedIn={isLoggedIn}
      userEmail={userEmail}
      isAdmin={isAdminUser}
      language={lang}
    />
  );
}