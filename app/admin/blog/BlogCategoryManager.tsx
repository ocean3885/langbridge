'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { FolderTree, Loader2, Plus, Trash2, X } from 'lucide-react';
import { createBlogCategoryAction, deleteBlogCategoryAction } from '@/app/blog/actions';
import type { AdminBlogCategory } from '@/lib/supabase/services/blog';

interface BlogCategoryManagerProps {
  categories: AdminBlogCategory[];
  language: 'ko' | 'en';
}

const categoryCopy = {
  ko: {
    open: '카테고리',
    title: '블로그 카테고리',
    description: '블로그 글을 묶는 카테고리를 생성하거나 삭제합니다.',
    name: '이름',
    slug: 'Slug',
    slugHelp: '비워두면 이름으로 자동 생성됩니다.',
    categoryDescription: '설명',
    create: '생성',
    creating: '생성 중',
    delete: '삭제',
    deleting: '삭제 중',
    empty: '등록된 카테고리가 없습니다.',
    posts: '글',
    close: '닫기',
    confirmDelete: '이 카테고리를 삭제할까요?',
    inUse: '소속 글이 있어 삭제 불가',
    createError: '카테고리 생성에 실패했습니다.',
    deleteError: '카테고리 삭제에 실패했습니다.',
  },
  en: {
    open: 'Categories',
    title: 'Blog Categories',
    description: 'Create or delete categories used to group blog posts.',
    name: 'Name',
    slug: 'Slug',
    slugHelp: 'Leave blank to generate one from the name.',
    categoryDescription: 'Description',
    create: 'Create',
    creating: 'Creating',
    delete: 'Delete',
    deleting: 'Deleting',
    empty: 'No categories yet.',
    posts: 'posts',
    close: 'Close',
    confirmDelete: 'Delete this category?',
    inUse: 'Cannot delete while posts use it',
    createError: 'Failed to create the category.',
    deleteError: 'Failed to delete the category.',
  },
};

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
}

export function BlogCategoryManager({ categories, language }: BlogCategoryManagerProps) {
  const router = useRouter();
  const t = categoryCopy[language];
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const suggestedSlug = useMemo(() => slugify(name), [name]);

  const handleCreate = () => {
    setError(null);

    startTransition(async () => {
      const result = await createBlogCategoryAction({
        name,
        slug: slug || suggestedSlug,
        description,
      });

      if (!result.success) {
        setError(result.error ?? t.createError);
        return;
      }

      setName('');
      setSlug('');
      setDescription('');
      router.refresh();
    });
  };

  const handleDelete = (category: AdminBlogCategory) => {
    setError(null);

    if (category.postCount > 0) {
      setError(t.inUse);
      return;
    }

    if (!window.confirm(`${t.confirmDelete}\n\n${category.name}`)) {
      return;
    }

    setDeletingId(category.id);
    startTransition(async () => {
      const result = await deleteBlogCategoryAction(category.id);

      if (!result.success) {
        setError(result.error ?? t.deleteError);
        setDeletingId(null);
        return;
      }

      setDeletingId(null);
      router.refresh();
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center justify-center gap-2 rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-bold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
      >
        <FolderTree size={16} />
        {t.open}
      </button>

      {isOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-lg border border-zinc-200 bg-white shadow-xl dark:border-zinc-800 dark:bg-zinc-950">
            <div className="flex items-start justify-between gap-4 border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
              <div>
                <h2 className="text-lg font-black text-zinc-950 dark:text-zinc-50">{t.title}</h2>
                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{t.description}</p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label={t.close}
                title={t.close}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-zinc-300 bg-white text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
              >
                <X size={16} />
              </button>
            </div>

            <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,280px)_1fr]">
              <section className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
                <label className="block text-sm font-bold text-zinc-800 dark:text-zinc-200" htmlFor="blog-category-name">
                  {t.name}
                </label>
                <input
                  id="blog-category-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="mt-2 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                />

                <label className="mt-4 block text-sm font-bold text-zinc-800 dark:text-zinc-200" htmlFor="blog-category-slug">
                  {t.slug}
                </label>
                <input
                  id="blog-category-slug"
                  value={slug}
                  onChange={(event) => setSlug(slugify(event.target.value))}
                  placeholder={suggestedSlug}
                  className="mt-2 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 font-mono text-sm text-zinc-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                />
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{t.slugHelp}</p>

                <label
                  className="mt-4 block text-sm font-bold text-zinc-800 dark:text-zinc-200"
                  htmlFor="blog-category-description"
                >
                  {t.categoryDescription}
                </label>
                <textarea
                  id="blog-category-description"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  className="mt-2 min-h-24 w-full resize-y rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                />

                <button
                  type="button"
                  onClick={handleCreate}
                  disabled={isPending || !name.trim()}
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-md bg-[#559c63] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#468653] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isPending && !deletingId ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />}
                  {isPending && !deletingId ? t.creating : t.create}
                </button>
              </section>

              <section className="min-w-0 rounded-lg border border-zinc-200 dark:border-zinc-800">
                {categories.length > 0 ? (
                  <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
                    {categories.map((category) => {
                      const isDeleting = deletingId === category.id;
                      const isLocked = category.postCount > 0;

                      return (
                        <div key={category.id} className="flex gap-3 p-4">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-bold text-zinc-950 dark:text-zinc-50">{category.name}</p>
                              <span className="rounded-md bg-zinc-100 px-2 py-1 font-mono text-xs font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                                {category.slug}
                              </span>
                            </div>
                            {category.description ? (
                              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{category.description}</p>
                            ) : null}
                            <p className="mt-2 text-xs font-bold uppercase text-zinc-400">
                              {category.postCount} {t.posts}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDelete(category)}
                            disabled={isPending || isLocked}
                            aria-label={t.delete}
                            title={isLocked ? t.inUse : t.delete}
                            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-red-200 bg-red-50 text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200 dark:hover:bg-red-950"
                          >
                            {isDeleting ? <Loader2 className="animate-spin" size={16} /> : <Trash2 size={16} />}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex min-h-56 items-center justify-center p-6 text-center text-sm font-semibold text-zinc-500 dark:text-zinc-400">
                    {t.empty}
                  </div>
                )}
              </section>
            </div>

            {error ? (
              <div className="mx-5 mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
                {error}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
