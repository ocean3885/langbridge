import { notFound, redirect } from 'next/navigation';
import { getAppUserFromServer, getDisplayLanguage } from '@/lib/auth/app-user';
import { isSuperAdmin } from '@/lib/auth/super-admin';
import { getAdminBlogPostEditorData, getBlogPromptContext } from '@/lib/supabase/services/blog';
import AdminSidebar from '../../../AdminSidebar';
import { BlogPostWorkbench } from '../../BlogPostWorkbench';

interface AdminBlogEditPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default async function AdminBlogEditPage({ params }: AdminBlogEditPageProps) {
  const { slug } = await params;
  const [user, language] = await Promise.all([
    getAppUserFromServer(),
    getDisplayLanguage(),
  ]);

  if (!user) {
    redirect(`/auth/login?redirectTo=/admin/blog/${slug}/edit`);
  }

  const isAdminUser = await isSuperAdmin({ userId: user.id, email: user.email ?? null });

  if (!isAdminUser) {
    redirect('/');
  }

  const [promptContext, post] = await Promise.all([
    getBlogPromptContext(),
    getAdminBlogPostEditorData(slug),
  ]);

  if (!post) {
    notFound();
  }

  return (
    <>
      <AdminSidebar userEmail={user.email ?? ''} language={language} />
      <BlogPostWorkbench
        promptContext={promptContext}
        language={language}
        mode="edit"
        originalSlug={post.slug}
        initialJsonText={post.jsonText}
      />
    </>
  );
}
