import { redirect } from 'next/navigation';
import { getAppUserFromServer, getDisplayLanguage } from '@/lib/auth/app-user';
import { isSuperAdmin } from '@/lib/auth/super-admin';
import { getStorageBucket } from '@/lib/supabase/storage';
import AdminSidebar from '../AdminSidebar';
import AssetManager from './AssetManager';

export default async function AdminAssetsPage() {
  const user = await getAppUserFromServer();
  const lang = await getDisplayLanguage();

  if (!user) {
    redirect('/auth/login?redirectTo=/admin/assets');
  }

  const isAdminUser = await isSuperAdmin({ userId: user.id, email: user.email ?? null });

  if (!isAdminUser) {
    redirect('/');
  }

  const bucket = getStorageBucket();

  return (
    <>
      <AdminSidebar userEmail={user.email ?? ''} language={lang} />
      <AssetManager bucket={bucket} />
    </>
  );
}
