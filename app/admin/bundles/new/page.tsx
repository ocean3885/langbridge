import { redirect } from 'next/navigation';
import { getAppUserFromServer, getDisplayLanguage } from '@/lib/auth/app-user';
import { isSuperAdmin } from '@/lib/auth/super-admin';
import AdminSidebar from '../../AdminSidebar';
import BundleCreateForm from './BundleCreateForm';

export default async function NewBundlePage() {
  const user = await getAppUserFromServer();
  const lang = await getDisplayLanguage();
  
  if (!user) {
    redirect('/auth/login?redirectTo=/admin/bundles/new');
  }
  
  const isAdminUser = await isSuperAdmin({ userId: user.id, email: user.email ?? null });
  
  if (!isAdminUser) {
    redirect('/');
  }
  
  return (
    <>
      <AdminSidebar userEmail={user.email ?? ''} language={lang} />
      <BundleCreateForm userId={user.id} />
    </>
  );
}
