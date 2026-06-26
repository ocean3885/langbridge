import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { ArrowLeft, CalendarDays, Clock3 } from 'lucide-react';
import { getBlogPost } from '@/lib/supabase/services/blog';
import { absoluteUrl } from '@/lib/site-url';

type Props = {
  params: Promise<{ slug: string }>;
};

const formatDate = (date: string) =>
  new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(date));

export const dynamic = 'force-dynamic';

function toAbsoluteUrl(url: string) {
  return url.startsWith('http://') || url.startsWith('https://') ? url : absoluteUrl(url);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getBlogPost(slug);

  if (!post) {
    return {
      title: 'Blog | HolaLingo',
    };
  }

  return {
    title: `${post.seoTitle ?? post.title} | HolaLingo Blog`,
    description: post.seoDescription ?? post.description,
    keywords: post.keywords,
    alternates: {
      canonical: post.canonicalUrl ?? `/blog/${post.slug}`,
    },
    openGraph: {
      title: post.title,
      description: post.description,
      type: 'article',
      url: post.canonicalUrl ?? `/blog/${post.slug}`,
      publishedTime: post.publishedAt,
      modifiedTime: post.updatedAt ?? post.publishedAt,
      images: [
        {
          url: post.ogImage ?? post.image,
          alt: post.title,
        },
      ],
    },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = await getBlogPost(slug);

  if (!post) {
    notFound();
  }

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.description,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt ?? post.publishedAt,
    image: toAbsoluteUrl(post.ogImage ?? post.image),
    author: {
      '@type': 'Organization',
      name: 'HolaLingo',
    },
    publisher: {
      '@type': 'Organization',
      name: 'HolaLingo',
      logo: {
        '@type': 'ImageObject',
        url: absoluteUrl('/images/logo_bg.png'),
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': absoluteUrl(`/blog/${post.slug}`),
    },
  };

  return (
    <article className="mx-auto max-w-4xl py-8 sm:py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <Link
        href="/blog"
        className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-700 hover:underline dark:text-emerald-300"
      >
        <ArrowLeft size={16} />
        블로그로 돌아가기
      </Link>

      <header className="mt-8">
        <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300">{post.category}</p>
        <h1 className="mt-3 text-4xl font-black tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-5xl">
          {post.title}
        </h1>
        <p className="mt-5 text-lg leading-8 text-zinc-600 dark:text-zinc-300">{post.description}</p>
        <div className="mt-6 flex flex-wrap items-center gap-4 text-sm font-semibold text-zinc-500 dark:text-zinc-400">
          <span className="inline-flex items-center gap-2">
            <CalendarDays size={16} />
            {formatDate(post.publishedAt)}
          </span>
          <span className="inline-flex items-center gap-2">
            <Clock3 size={16} />
            {post.readingMinutes}분 읽기
          </span>
        </div>
      </header>

      <div className="relative mt-8 aspect-[16/8] overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-900">
        <Image
          src={post.image}
          alt=""
          fill
          priority
          className="object-cover"
          sizes="(min-width: 896px) 896px, 100vw"
        />
      </div>

      <div className="mt-10 rounded-lg border border-emerald-100 bg-emerald-50 p-5 text-sm leading-7 text-emerald-950 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-50">
        {post.intro}
      </div>

      <div className="mt-10 space-y-10">
        {post.sections.map((section) => (
          <section key={section.heading}>
            <h2 className="text-2xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50">
              {section.heading}
            </h2>
            <div className="mt-4 space-y-4">
              {section.body.map((paragraph) => (
                <p key={paragraph} className="text-base leading-8 text-zinc-600 dark:text-zinc-300">
                  {paragraph}
                </p>
              ))}
            </div>
          </section>
        ))}
      </div>

      <section className="mt-12 rounded-lg border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="text-2xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50">
          {post.cta.title}
        </h2>
        <p className="mt-3 text-sm leading-7 text-zinc-600 dark:text-zinc-300">{post.cta.body}</p>
        <Link
          href={post.cta.href}
          className="mt-5 inline-flex rounded-full bg-[#559c63] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#468653]"
        >
          {post.cta.label}
        </Link>
      </section>
    </article>
  );
}
