'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ExternalLink, Loader2, Pencil, Trash2 } from 'lucide-react';
import { deleteBlogPostAction } from '@/app/blog/actions';

interface BlogPostListActionsProps {
  slug: string;
  title: string;
  language: 'ko' | 'en';
  viewLabel: string;
}

const actionCopy = {
  ko: {
    edit: '수정',
    delete: '삭제',
    deleting: '삭제 중',
    confirm: '이 블로그 글을 삭제할까요?',
    error: '삭제에 실패했습니다.',
  },
  en: {
    edit: 'Edit',
    delete: 'Delete',
    deleting: 'Deleting',
    confirm: 'Delete this blog post?',
    error: 'Failed to delete.',
  },
};

export function BlogPostListActions({ slug, title, language, viewLabel }: BlogPostListActionsProps) {
  const router = useRouter();
  const t = actionCopy[language];
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleDelete = () => {
    setError(null);

    if (!window.confirm(`${t.confirm}\n\n${title}`)) {
      return;
    }

    startTransition(async () => {
      const result = await deleteBlogPostAction(slug);

      if (!result.success) {
        setError(result.error ?? t.error);
        return;
      }

      router.refresh();
    });
  };

  return (
    <div className="w-[124px] shrink-0">
      <div className="flex flex-nowrap gap-2">
        <Link
          href={`/blog/${slug}`}
          aria-label={viewLabel}
          title={viewLabel}
          className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-zinc-300 bg-white text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          <ExternalLink size={16} />
        </Link>
        <Link
          href={`/admin/blog/${slug}/edit`}
          aria-label={t.edit}
          title={t.edit}
          className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-zinc-300 bg-white text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          <Pencil size={16} />
        </Link>
        <button
          type="button"
          onClick={handleDelete}
          disabled={isPending}
          aria-label={t.delete}
          title={t.delete}
          className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-red-200 bg-red-50 text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200 dark:hover:bg-red-950"
        >
          {isPending ? <Loader2 className="animate-spin" size={16} /> : <Trash2 size={16} />}
        </button>
      </div>
      {error ? <p className="text-xs font-semibold text-red-600 dark:text-red-300">{error}</p> : null}
    </div>
  );
}
