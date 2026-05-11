import HeaderClient from '@/components/layout/HeaderClient';
import { getAppUserFromServer, getDisplayLanguage } from '@/lib/auth/app-user';
import { isSuperAdmin } from '@/lib/auth/super-admin';
import { cookies } from 'next/headers';

export default async function Header() {
  const lang = await getDisplayLanguage();

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