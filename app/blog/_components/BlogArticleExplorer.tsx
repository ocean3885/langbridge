'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { CalendarDays, ChevronLeft, ChevronRight, Clock3, Search } from 'lucide-react';
import type { BlogPost } from '@/lib/supabase/services/blog';

interface BlogArticleExplorerProps {
  posts: BlogPost[];
  language: 'ko' | 'en';
}

const categoryStyles = [
  'bg-[#edf3df] text-[#4f8a50]',
  'bg-[#ffe3ad] text-[#8a6828]',
  'bg-[#dce9f6] text-[#4c7197]',
  'bg-[#e7def9] text-[#7260a8]',
  'bg-[#f9dfca] text-[#9a6645]',
  'bg-[#e9f0dc] text-[#637d50]',
];

const ITEMS_PER_PAGE = 9;

const explorerCopy = {
  ko: {
    all: '전체',
    searchLabel: '글 검색',
    searchPlaceholder: '글 검색...',
    minRead: '분 읽기',
    previous: '이전',
    next: '다음',
    noResultsTitle: '검색 결과가 없습니다',
    noResultsDescription: '다른 카테고리나 검색어를 시도해보세요.',
  },
  en: {
    all: 'All',
    searchLabel: 'Search articles',
    searchPlaceholder: 'Search articles...',
    minRead: 'min read',
    previous: 'Previous',
    next: 'Next',
    noResultsTitle: 'No articles found',
    noResultsDescription: 'Try another category or search term.',
  },
};

function formatDate(date: string, language: 'ko' | 'en') {
  return new Intl.DateTimeFormat(language === 'ko' ? 'ko-KR' : 'en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(date));
}

function getCategoryStyle(category: string) {
  const code = Array.from(category).reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return categoryStyles[code % categoryStyles.length];
}

export function BlogArticleExplorer({ posts, language }: BlogArticleExplorerProps) {
  const t = explorerCopy[language];
  const [activeCategory, setActiveCategory] = useState(t.all);
  const [query, setQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const categories = useMemo(() => {
    const uniqueCategories = Array.from(new Set(posts.map((post) => post.category))).filter(Boolean);
    return [t.all, ...uniqueCategories];
  }, [posts, t.all]);

  const filteredPosts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return posts.filter((post) => {
      const matchesCategory = activeCategory === t.all || post.category === activeCategory;
      const matchesQuery =
        !normalizedQuery ||
        [post.title, post.description, post.category, post.slug, ...post.keywords]
          .join(' ')
          .toLowerCase()
          .includes(normalizedQuery);

      return matchesCategory && matchesQuery;
    });
  }, [activeCategory, posts, query, t.all]);

  const totalPages = Math.max(1, Math.ceil(filteredPosts.length / ITEMS_PER_PAGE));

  const displayedPosts = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredPosts.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [currentPage, filteredPosts]);

  const pageNumbers = useMemo(() => {
    const pages: (number | string)[] = [];

    if (totalPages <= 7) {
      for (let page = 1; page <= totalPages; page += 1) pages.push(page);
      return pages;
    }

    pages.push(1);
    if (currentPage > 3) pages.push('...');

    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);
    for (let page = start; page <= end; page += 1) pages.push(page);

    if (currentPage < totalPages - 2) pages.push('...');
    pages.push(totalPages);

    return pages;
  }, [currentPage, totalPages]);

  const goToPage = (page: number) => {
    setCurrentPage(Math.min(totalPages, Math.max(1, page)));
    document.getElementById('articles')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <section id="articles" className="mt-14">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex gap-3 overflow-x-auto pb-1">
          {categories.map((category) => {
            const isActive = category === activeCategory;
            return (
              <button
                key={category}
                type="button"
                onClick={() => {
                  setActiveCategory(category);
                  setCurrentPage(1);
                }}
                className={`h-10 shrink-0 rounded-full border px-5 text-sm font-semibold transition-all duration-200 ${
                  isActive
                    ? 'border-[#4e8d53] bg-[#4e8d53] text-white shadow-sm shadow-emerald-700/20'
                    : 'border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-750'
                }`}
              >
                {category}
              </button>
            );
          })}
        </div>

        <label className="relative block w-full lg:w-72">
          <span className="sr-only">{t.searchLabel}</span>
          <Search className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400 dark:text-zinc-550" />
          <input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setCurrentPage(1);
            }}
            className="h-10 w-full rounded-full border border-zinc-200 bg-white pl-5 pr-11 text-sm text-zinc-800 shadow-sm outline-none transition placeholder:text-zinc-400 focus:border-[#559c63] focus:ring-1 focus:ring-[#559c63] dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500"
            placeholder={t.searchPlaceholder}
          />
        </label>
      </div>

      {filteredPosts.length > 0 ? (
        <>
          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {displayedPosts.map((post) => (
              <Link
                key={post.slug}
                href={`/blog/${post.slug}`}
                className="group flex min-h-[236px] flex-col rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-[#559c63]/50 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-emerald-500/50"
              >
                <span
                  className={`inline-flex w-fit rounded-md px-2 py-1 text-xs font-black uppercase ${getCategoryStyle(
                    post.category
                  )}`}
                >
                  {post.category}
                </span>
                <h2 className="mt-5 text-xl font-bold leading-snug text-[#1f1b18] transition group-hover:text-[#4e8d53] dark:text-zinc-50 dark:group-hover:text-emerald-300">
                  {post.title}
                </h2>
                <p className="mt-4 line-clamp-3 text-sm leading-7 text-zinc-500 dark:text-zinc-400">
                  {post.description}
                </p>
                <div className="mt-auto flex flex-wrap items-center gap-4 pt-7 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                  <span className="inline-flex items-center gap-1.5">
                    <Clock3 size={14} />
                    {language === 'ko' ? `${post.readingMinutes}${t.minRead}` : `${post.readingMinutes} ${t.minRead}`}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <CalendarDays size={14} />
                    {formatDate(post.publishedAt, language)}
                  </span>
                </div>
              </Link>
            ))}
          </div>

          {totalPages > 1 ? (
            <nav className="mt-8 flex flex-wrap items-center justify-center gap-2" aria-label="Blog pagination">
              <button
                type="button"
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="inline-flex h-10 items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-600 shadow-sm transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-45 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
              >
                <ChevronLeft size={16} />
                {t.previous}
              </button>

              {pageNumbers.map((page, index) =>
                page === '...' ? (
                  <span key={`ellipsis-${index}`} className="px-2 text-sm font-semibold text-zinc-400">
                    ...
                  </span>
                ) : (
                  <button
                    key={page}
                    type="button"
                    onClick={() => goToPage(Number(page))}
                    className={`h-10 min-w-10 rounded-full px-3 text-sm font-semibold transition ${
                      page === currentPage
                        ? 'bg-[#4e8d53] text-white shadow-sm shadow-emerald-700/20'
                        : 'border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700'
                    }`}
                  >
                    {page}
                  </button>
                )
              )}

              <button
                type="button"
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="inline-flex h-10 items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-600 shadow-sm transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-45 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
              >
                {t.next}
                <ChevronRight size={16} />
              </button>
            </nav>
          ) : null}
        </>
      ) : (
        <div className="mt-8 rounded-2xl border border-zinc-200 bg-white p-10 text-center dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-xl font-bold text-[#1f1b18] dark:text-zinc-50">{t.noResultsTitle}</h2>
          <p className="mt-3 text-sm leading-7 text-zinc-500 dark:text-zinc-400">
            {t.noResultsDescription}
          </p>
        </div>
      )}
    </section>
  );
}
