import { redirect } from 'next/navigation';
import { getAppUserFromServer, getDisplayLanguage } from '@/lib/auth/app-user';
import { isSuperAdmin } from '@/lib/auth/super-admin';
import {
  getAdminBlogContentPlans,
  getBlogPlanCategories,
} from '@/lib/supabase/services/blog-content-plans';
import AdminSidebar from '../../AdminSidebar';
import { BlogContentPlansManager } from './BlogContentPlansManager';

export default async function AdminBlogPlansPage() {
  const [user, language] = await Promise.all([
    getAppUserFromServer(),
    getDisplayLanguage(),
  ]);

  if (!user) {
    redirect('/auth/login?redirectTo=/admin/blog/plans');
  }

  const isAdminUser = await isSuperAdmin({ userId: user.id, email: user.email ?? null });

  if (!isAdminUser) {
    redirect('/');
  }

  const [categories, plans] = await Promise.all([
    getBlogPlanCategories(),
    getAdminBlogContentPlans(),
  ]);

  return (
    <>
      <AdminSidebar userEmail={user.email ?? ''} language={language} />
      <BlogContentPlansManager categories={categories} plans={plans} language={language} />
    </>
  );
}
