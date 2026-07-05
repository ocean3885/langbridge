import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Inbox, Mail, MessageSquareText } from 'lucide-react';
import { getAppUserFromServer, getDisplayLanguage } from '@/lib/auth/app-user';
import { isSuperAdmin } from '@/lib/auth/super-admin';
import { listFeedbackBoardPosts, type SupabaseBoardPost } from '@/lib/supabase/services/board';
import AdminSidebar from '../AdminSidebar';

type FeedbackCategory = 'Bug' | 'Feature' | 'Content' | 'Other';

const categories: FeedbackCategory[] = ['Bug', 'Feature', 'Content', 'Other'];

const pageCopy = {
  ko: {
    title: '피드백 관리',
    description: '사용자가 보낸 오류 제보, 기능 제안, 콘텐츠 의견을 확인합니다.',
    all: '전체',
    emptyTitle: '아직 피드백이 없습니다',
    emptyDescription: '피드백 페이지에서 접수된 내용이 여기에 표시됩니다.',
    author: '작성자',
    createdAt: '작성일',
    category: '유형',
    total: (count: number) => `${count}건`,
    unknownUser: '알 수 없음',
  },
  en: {
    title: 'Feedback Management',
    description: 'Review bug reports, feature ideas, and content suggestions from users.',
    all: 'All',
    emptyTitle: 'No feedback yet',
    emptyDescription: 'Feedback submitted from the feedback page will appear here.',
    author: 'Author',
    createdAt: 'Created',
    category: 'Type',
    total: (count: number) => `${count} items`,
    unknownUser: 'Unknown',
  },
};

interface AdminFeedbackPageProps {
  searchParams?: Promise<{ category?: string }>;
}

export default async function AdminFeedbackPage({ searchParams }: AdminFeedbackPageProps) {
  const [user, language, resolvedParams] = await Promise.all([
    getAppUserFromServer(),
    getDisplayLanguage(),
    searchParams ? searchParams : Promise.resolve(undefined),
  ]);

  if (!user) {
    redirect('/auth/login?redirectTo=/admin/feedback');
  }

  const isAdminUser = await isSuperAdmin({ userId: user.id, email: user.email ?? null });

  if (!isAdminUser) {
    redirect('/');
  }

  const selectedCategory = normalizeCategory(resolvedParams?.category);
  const { posts, total } = await listFeedbackBoardPosts({ category: selectedCategory ?? undefined });
  const t = pageCopy[language];

  return (
    <>
      <AdminSidebar userEmail={user.email ?? ''} language={language} />
      <main className="min-h-screen bg-[#F9F7F2] px-4 py-8 text-zinc-950 dark:bg-zinc-950 dark:text-zinc-50 md:ml-64 md:px-8">
        <div className="mx-auto max-w-6xl space-y-6">
          <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-normal">{t.title}</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                {t.description}
              </p>
            </div>
            <div className="inline-flex w-fit items-center gap-2 rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
              <Inbox size={16} className="text-[#559c63]" />
              {t.total(total)}
            </div>
          </header>

          <nav className="flex flex-wrap gap-2">
            <FeedbackFilterLink label={t.all} href="/admin/feedback" active={!selectedCategory} />
            {categories.map((category) => (
              <FeedbackFilterLink
                key={category}
                label={category}
                href={`/admin/feedback?category=${category}`}
                active={selectedCategory === category}
              />
            ))}
          </nav>

          <section className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            {posts.length > 0 ? (
              <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {posts.map((post) => (
                  <FeedbackRow key={post.id} post={post} language={language} />
                ))}
              </div>
            ) : (
              <div className="flex min-h-[280px] flex-col items-center justify-center px-6 py-12 text-center">
                <MessageSquareText size={36} className="text-zinc-400" />
                <h2 className="mt-4 text-lg font-bold text-zinc-900 dark:text-zinc-100">
                  {t.emptyTitle}
                </h2>
                <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                  {t.emptyDescription}
                </p>
              </div>
            )}
          </section>
        </div>
      </main>
    </>
  );
}

function FeedbackFilterLink({ label, href, active }: { label: string; href: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={`rounded-md border px-3 py-2 text-sm font-semibold transition ${
        active
          ? 'border-[#559c63] bg-[#EEF7EF] text-[#3f7d42] dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200'
          : 'border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800'
      }`}
    >
      {label}
    </Link>
  );
}

function FeedbackRow({ post, language }: { post: SupabaseBoardPost; language: 'ko' | 'en' }) {
  const t = pageCopy[language];
  const parsed = parseFeedbackTitle(post.title);
  const body = stripFeedbackMetadata(post.content);

  return (
    <article className="grid gap-4 px-5 py-5 xl:grid-cols-[1fr_180px_132px] xl:items-start">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-md bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-800">
            {parsed.category}
          </span>
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
            <Mail size={13} />
            {post.user_email || t.unknownUser}
          </span>
        </div>
        <h2 className="mt-3 text-base font-bold text-zinc-950 dark:text-zinc-50">
          {parsed.subject}
        </h2>
        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-zinc-600 dark:text-zinc-400">
          {body}
        </p>
      </div>

      <dl className="grid grid-cols-2 gap-3 text-sm text-zinc-600 dark:text-zinc-400 xl:block xl:space-y-3">
        <div>
          <dt className="text-xs font-bold uppercase text-zinc-400">{t.author}</dt>
          <dd className="mt-1 truncate">{post.user_email?.split('@')[0] || t.unknownUser}</dd>
        </div>
        <div>
          <dt className="text-xs font-bold uppercase text-zinc-400">{t.category}</dt>
          <dd className="mt-1">{parsed.category}</dd>
        </div>
      </dl>

      <div className="text-sm text-zinc-500 dark:text-zinc-400">
        <span className="text-xs font-bold uppercase text-zinc-400 xl:hidden">{t.createdAt}: </span>
        {formatDate(post.created_at, language)}
      </div>
    </article>
  );
}

function normalizeCategory(value: string | undefined): FeedbackCategory | null {
  if (!value) return null;
  const normalized = categories.find((category) => category.toLowerCase() === value.toLowerCase());
  return normalized ?? null;
}

function parseFeedbackTitle(title: string): { category: string; subject: string } {
  const match = title.match(/^\[Feedback\]\[([^\]]+)\]\s*(.*)$/);
  if (!match) {
    return { category: 'Other', subject: title };
  }

  return {
    category: match[1] || 'Other',
    subject: match[2] || '(No subject)',
  };
}

function stripFeedbackMetadata(content: string) {
  return content.replace(/^Category:\s*[^\n]+\n\n?/, '').trim();
}

function formatDate(value: string, language: 'ko' | 'en') {
  return new Intl.DateTimeFormat(language === 'ko' ? 'ko-KR' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}
