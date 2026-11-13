import { redirect, notFound } from 'next/navigation';
import { getAppUserFromServer, getDisplayLanguage } from '@/lib/auth/app-user';
import { isSuperAdmin } from '@/lib/auth/super-admin';
import { getBundle, listBundleItems, getBundleWords, getBundleStudyWordIds } from '@/lib/supabase/services/bundles';
import { getAdminBlogPosts } from '@/lib/supabase/services/blog';
import AdminSidebar from '../../AdminSidebar';
import BundleDetail from './BundleDetail';

export default async function BundleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getAppUserFromServer();
  const lang = await getDisplayLanguage();
  
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
  
  const [items, words, studyWordIds, blogPosts] = await Promise.all([
    listBundleItems(id),
    getBundleWords(id),
    getBundleStudyWordIds(id),
    getAdminBlogPosts(),
  ]);
  
  return (
    <>
      <AdminSidebar userEmail={user.email ?? ''} language={lang} />
      <BundleDetail bundle={bundle} items={items} words={words} initialStudyWordIds={studyWordIds} blogPosts={blogPosts} />
    </>
  );
}
