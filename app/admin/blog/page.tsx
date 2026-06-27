import { redirect } from 'next/navigation';
import Link from 'next/link';
import { CalendarDays, Clock, FileText, ListChecks, Plus } from 'lucide-react';
import { getAppUserFromServer, getDisplayLanguage } from '@/lib/auth/app-user';
import { isSuperAdmin } from '@/lib/auth/super-admin';
import { getAdminBlogPosts } from '@/lib/supabase/services/blog';
import type { AdminBlogPostListItem } from '@/lib/supabase/services/blog';
import AdminSidebar from '../AdminSidebar';
import { BlogPostListActions } from './BlogPostListActions';

const pageCopy = {
  ko: {
    title: '블로그 관리',
    description: '게시된 글과 초안 상태를 확인하고 새 블로그 글을 생성합니다.',
    create: '글 작성',
    plans: '기획',
    emptyTitle: '아직 블로그 글이 없습니다',
    emptyDescription: '작성 버튼으로 첫 블로그 글을 생성해 보세요.',
    tableTitle: '블로그 글 목록',
    status: '상태',
    category: '카테고리',
    publishedAt: '게시일',
    updatedAt: '수정일',
    readingMinutes: '분',
    viewPost: '글 보기',
    draftDate: '미게시',
  },
  en: {
    title: 'Blog Management',
    description: 'Review published posts and drafts, then create a new blog post.',
    create: 'Create',
    plans: 'Plans',
    emptyTitle: 'No blog posts yet',
    emptyDescription: 'Use the create button to generate the first blog post.',
    tableTitle: 'Blog posts',
    status: 'Status',
    category: 'Category',
    publishedAt: 'Published',
    updatedAt: 'Updated',
    readingMinutes: 'min',
    viewPost: 'View post',
    draftDate: 'Unpublished',
  },
};

function formatDate(value: string | null, language: 'ko' | 'en') {
  if (!value) {
    return pageCopy[language].draftDate;
  }

  return new Intl.DateTimeFormat(language === 'ko' ? 'ko-KR' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(value));
}

function StatusBadge({ status }: { status: string }) {
  const isPublished = status === 'published';

  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-bold ${
        isPublished
          ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-800'
          : 'bg-amber-50 text-amber-700 ring-1 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-800'
      }`}
    >
      {status}
    </span>
  );
}

function BlogPostRow({ post, language }: { post: AdminBlogPostListItem; language: 'ko' | 'en' }) {
  const t = pageCopy[language];

  return (
    <article className="grid gap-4 border-b border-zinc-200 px-5 py-4 last:border-b-0 dark:border-zinc-800 xl:grid-cols-[1fr_140px_150px_110px_124px] xl:items-center">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={post.status} />
          <span className="rounded-md bg-zinc-100 px-2 py-1 text-xs font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
            {post.category}
          </span>
        </div>
        <h2 className="mt-2 truncate text-base font-black text-zinc-950 dark:text-zinc-50">
          {post.title}
        </h2>
        <p className="mt-1 truncate font-mono text-xs text-zinc-500 dark:text-zinc-400">
          /blog/{post.slug}
        </p>
      </div>

      <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400 lg:block">
        <span className="text-xs font-bold uppercase text-zinc-400 lg:hidden">{t.publishedAt}</span>
        <span>{formatDate(post.publishedAt, language)}</span>
      </div>

      <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400 lg:block">
        <span className="text-xs font-bold uppercase text-zinc-400 lg:hidden">{t.updatedAt}</span>
        <span>{formatDate(post.updatedAt ?? post.createdAt, language)}</span>
      </div>

      <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
        <Clock size={16} />
        <span>
          {post.readingMinutes ?? 0} {t.readingMinutes}
        </span>
      </div>

      <BlogPostListActions slug={post.slug} title={post.title} language={language} viewLabel={t.viewPost} />
    </article>
  );
}

export default async function AdminBlogPage() {
  const [user, language] = await Promise.all([
    getAppUserFromServer(),
    getDisplayLanguage(),
  ]);

  if (!user) {
    redirect('/auth/login?redirectTo=/admin/blog');
  }

  const isAdminUser = await isSuperAdmin({ userId: user.id, email: user.email ?? null });

  if (!isAdminUser) {
    redirect('/');
  }

  const posts = await getAdminBlogPosts();
  const t = pageCopy[language];

  return (
    <>
      <AdminSidebar userEmail={user.email ?? ''} language={language} />
      <main className="min-h-screen bg-[#F9F7F2] px-4 py-8 text-zinc-950 dark:bg-zinc-950 dark:text-zinc-50 md:ml-64 md:px-8">
        <div className="mx-auto max-w-6xl space-y-6">
          <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-3xl font-black tracking-normal">{t.title}</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                {t.description}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/admin/blog/plans"
                className="inline-flex items-center justify-center gap-2 rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-bold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
              >
                <ListChecks size={16} />
                {t.plans}
              </Link>
              <Link
                href="/admin/blog/new"
                className="inline-flex items-center justify-center gap-2 rounded-md bg-[#559c63] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#468653]"
              >
                <Plus size={16} />
                {t.create}
              </Link>
            </div>
          </header>

          <section className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <FileText size={18} className="text-[#559c63]" />
                <h2 className="text-sm font-black text-zinc-900 dark:text-zinc-100">
                  {t.tableTitle}
                </h2>
              </div>
              <div className="hidden items-center gap-6 text-xs font-bold uppercase text-zinc-400 xl:flex">
                <span className="w-[140px]">{t.publishedAt}</span>
                <span className="w-[150px]">{t.updatedAt}</span>
                <span className="w-[110px]">{t.readingMinutes}</span>
                <span className="w-[124px]" />
              </div>
            </div>

            {posts.length > 0 ? (
              <div>
                {posts.map((post) => (
                  <BlogPostRow key={post.slug} post={post} language={language} />
                ))}
              </div>
            ) : (
              <div className="flex min-h-[280px] flex-col items-center justify-center px-6 py-12 text-center">
                <CalendarDays size={34} className="text-zinc-400" />
                <h2 className="mt-4 text-lg font-black text-zinc-900 dark:text-zinc-100">
                  {t.emptyTitle}
                </h2>
                <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                  {t.emptyDescription}
                </p>
                <Link
                  href="/admin/blog/new"
                  className="mt-5 inline-flex items-center justify-center gap-2 rounded-md bg-[#559c63] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#468653]"
                >
                  <Plus size={16} />
                  {t.create}
                </Link>
              </div>
            )}
          </section>
        </div>
      </main>
    </>
  );
}
