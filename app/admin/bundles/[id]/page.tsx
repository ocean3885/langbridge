import { redirect, notFound } from 'next/navigation';
import { getAppUserFromServer } from '@/lib/auth/app-user';
import { isSuperAdmin } from '@/lib/auth/super-admin';
import { getBundle, listBundleItems } from '@/lib/supabase/services/bundles';
import AdminSidebar from '../../AdminSidebar';
import BundleDetail from './BundleDetail';

export default async function BundleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getAppUserFromServer();
  
  if (!user) {
    redirect(`/auth/login?redirectTo=/admin/bundles/${id}`);
  }
  
  const isAdminUser = await isSuperAdmin({ userId: user.id, email: user.email ?? null });
  
  if (!isAdminUser) {
    redirect('/');
  }
  
  const bundle = await getBundle(id);
  
  if (!bundle) {
    notFound();
  }
  
  const items = await listBundleItems(id);
  
  return (
    <>
      <AdminSidebar userEmail={user.email ?? ''} />
      <BundleDetail bundle={bundle} items={items} />
    </>
  );
}
