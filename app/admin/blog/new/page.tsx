import { redirect } from 'next/navigation';
import { getAppUserFromServer, getDisplayLanguage } from '@/lib/auth/app-user';
import { isSuperAdmin } from '@/lib/auth/super-admin';
import { getBlogPromptContext } from '@/lib/supabase/services/blog';
import AdminSidebar from '../../AdminSidebar';
import { BlogPostWorkbench } from '../BlogPostWorkbench';

export default async function AdminBlogCreatePage() {
  const [user, language] = await Promise.all([
    getAppUserFromServer(),
    getDisplayLanguage(),
  ]);

  if (!user) {
    redirect('/auth/login?redirectTo=/admin/blog/new');
  }

  const isAdminUser = await isSuperAdmin({ userId: user.id, email: user.email ?? null });

  if (!isAdminUser) {
    redirect('/');
  }

  const promptContext = await getBlogPromptContext();

  return (
    <>
      <AdminSidebar userEmail={user.email ?? ''} language={language} />
      <BlogPostWorkbench promptContext={promptContext} language={language} />
    </>
  );
}
