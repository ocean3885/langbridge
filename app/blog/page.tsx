import Link from 'next/link';
import type { Metadata } from 'next';
import { ArrowRight } from 'lucide-react';
import { getBlogPosts } from '@/lib/supabase/services/blog';
import { getDisplayLanguage } from '@/lib/auth/app-user';
import { BlogArticleExplorer } from './_components/BlogArticleExplorer';

export const metadata: Metadata = {
  title: '스페인어 학습 블로그 | HolaLingo',
  description:
    '스페인어 초보 공부법, 여행 스페인어, 단어 암기와 회화 표현을 쉽게 익힐 수 있는 HolaLingo 블로그입니다.',
  alternates: {
    canonical: '/blog',
  },
  openGraph: {
    title: '스페인어 학습 블로그 | HolaLingo',
    description:
      '스페인어 초보 공부법, 여행 스페인어, 단어 암기와 회화 표현을 쉽게 익힐 수 있는 HolaLingo 블로그입니다.',
    url: '/blog',
    type: 'website',
  },
};

export const dynamic = 'force-dynamic';

const blogPageCopy = {
  ko: {
    description:
      '스페인어 초보자를 위한 쉬운 학습 가이드입니다. 단어, 문법, 듣기, 실전 표현을 명확한 설명과 예문으로 익혀보세요.',
    startLearning: '스페인어 학습 시작하기',
    emptyTitle: '아직 게시된 블로그 글이 없습니다',
    emptyDescription: '새 글을 발행하면 이곳에 표시됩니다.',
    ctaTitle: '배운 내용을 바로 연습해볼까요?',
    ctaDescription:
      'HolaLingo에서 스페인어 단어, 문장, 듣기, 플래시카드, 짧은 퀴즈를 한곳에서 연습해보세요.',
    ctaSecondary: '번들 둘러보기',
  },
  en: {
    description:
      'Simple Spanish learning guides for beginners. Learn vocabulary, grammar, listening skills, and useful phrases with clear explanations and examples.',
    startLearning: 'Start Learning Spanish',
    emptyTitle: 'No published blog posts yet',
    emptyDescription: 'Published posts will appear here.',
    ctaTitle: 'Ready to practice what you learned?',
    ctaDescription:
      'Use HolaLingo to practice Spanish words, sentences, listening, flashcards, and quick quizzes in one place.',
    ctaSecondary: 'Explore Bundles',
  },
};

export default async function BlogPage() {
  const [posts, language] = await Promise.all([
    getBlogPosts(),
    getDisplayLanguage(),
  ]);
  const copy = blogPageCopy[language];

  return (
    <div className="relative overflow-hidden px-2 pb-12 text-[#1f1b18] dark:text-zinc-100">
      <div className="relative mx-auto max-w-6xl">
        <section className="grid min-h-[330px] gap-10 py-8 md:py-12 lg:grid-cols-[1fr_0.92fr] lg:items-center">
          <div>
            <h1 className="font-serif text-3xl font-semibold leading-tight tracking-normal text-[#1f1b18] sm:text-5xl lg:text-6xl dark:text-zinc-50">
              HolaLingo Blog
              <span className="ml-3 inline-flex text-3xl text-[#559c63] sm:text-5xl lg:text-6xl">🌿</span>
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-zinc-650 dark:text-zinc-405 sm:text-lg">
              {copy.description}
            </p>
            <div className="mt-9 flex flex-wrap items-center justify-center gap-3 lg:justify-start">
              <Link
                href="/learn"
                className="inline-flex h-12 w-fit max-w-full items-center justify-center whitespace-nowrap rounded-full bg-[#559c63] px-7 text-sm font-bold text-white shadow-sm transition hover:bg-[#468653] active:scale-95"
              >
                {copy.startLearning}
              </Link>
            </div>
          </div>

          <div className="relative">
            <picture>
              <source media="(min-width: 1024px)" srcSet="/images/blog_vertical.webp" />
              <img
                src="/images/blog_horizontal.webp"
                alt="HolaLingo Spanish learning blog illustration"
                className="h-auto w-full rounded-2xl border border-[#f5ead2] bg-[#fffcf5] object-cover shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50"
              />
            </picture>
          </div>
        </section>

        {posts.length > 0 ? (
          <BlogArticleExplorer posts={posts} language={language} />
        ) : (
          <section
            id="articles"
            className="mt-14 rounded-2xl border border-zinc-200 bg-white p-10 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
          >
            <h2 className="text-xl font-bold text-[#1f1b18] dark:text-zinc-50">{copy.emptyTitle}</h2>
            <p className="mt-3 text-sm leading-7 text-zinc-500 dark:text-zinc-400">
              {copy.emptyDescription}
            </p>
          </section>
        )}

        <section className="mt-8 grid gap-6 rounded-2xl border border-[#f5ead2] bg-[#fffcf5] p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50 sm:grid-cols-[160px_1fr_auto] sm:items-center sm:p-8">
          <div className="relative mx-auto h-28 w-32 sm:mx-0">
            <div className="absolute inset-0 rounded-[45%_55%_50%_50%/45%_50%_50%_55%] bg-[#edf3df]" />
            <div className="absolute inset-x-7 bottom-1 h-12 rounded-t-lg bg-[#559c63]" />
            <div className="absolute left-1/2 top-0 h-24 w-2 -translate-x-1/2 rounded-full bg-[#4f8a50]" />
            <div className="absolute left-11 top-4 h-8 w-4 -rotate-45 rounded-full bg-[#4f8a50]" />
            <div className="absolute right-10 top-7 h-8 w-4 rotate-45 rounded-full bg-[#4f8a50]" />
            <div className="absolute left-9 top-12 h-8 w-4 -rotate-45 rounded-full bg-[#4f8a50]" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-[#1f1b18] sm:text-3xl dark:text-zinc-50">
              {copy.ctaTitle}
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-7 text-zinc-500 dark:text-zinc-400">
              {copy.ctaDescription}
            </p>
          </div>
          <div className="flex flex-col gap-4 sm:items-center">
            <Link
              href="/bundles"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#559c63] px-8 text-sm font-bold text-white shadow-sm transition hover:bg-[#468653] active:scale-95"
            >
              {copy.ctaSecondary}
              <ArrowRight size={16} />
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
