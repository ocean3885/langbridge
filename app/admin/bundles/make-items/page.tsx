import { redirect } from 'next/navigation';
import { getAppUserFromServer, getDisplayLanguage } from '@/lib/auth/app-user';
import { isSuperAdmin } from '@/lib/auth/super-admin';
import { listCategories } from '@/lib/supabase/services/bundles';
import AdminSidebar from '../../AdminSidebar';
import BundleItemsMaker from './BundleItemsMaker';

export default async function MakeBundleItemsPage() {
  const user = await getAppUserFromServer();
  const lang = await getDisplayLanguage();

  if (!user) {
    redirect('/auth/login?redirectTo=/admin/bundles/make-items');
  }

  const isAdminUser = await isSuperAdmin({ userId: user.id, email: user.email ?? null });
  if (!isAdminUser) {
    redirect('/');
  }

  const categories = await listCategories();

  return (
    <>
      <AdminSidebar userEmail={user.email ?? ''} language={lang} />
      <BundleItemsMaker userId={user.id} categories={categories} />
    </>
  );
}
