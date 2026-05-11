import { redirect } from 'next/navigation';
import { getAppUserFromServer, getDisplayLanguage } from '@/lib/auth/app-user';
import { isSuperAdmin } from '@/lib/auth/super-admin';
import { listBundles } from '@/lib/supabase/services/bundles';
import AdminSidebar from '../AdminSidebar';
import BundlesManager from './BundlesManager';

export default async function BundlesPage() {
  const user = await getAppUserFromServer();
  const lang = await getDisplayLanguage();
  
  if (!user) {
    redirect('/auth/login?redirectTo=/admin/bundles');
  }
  
  const isAdminUser = await isSuperAdmin({ userId: user.id, email: user.email ?? null });
  
  if (!isAdminUser) {
    redirect('/');
  }
  
  const bundles = await listBundles();
  
  return (
    <>
      <AdminSidebar userEmail={user.email ?? ''} language={lang} />
      <BundlesManager initialBundles={bundles} />
    </>
  );
}
