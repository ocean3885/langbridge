import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { ArrowLeft, CalendarDays, Clock3 } from 'lucide-react';
import { getBlogPost } from '@/lib/supabase/services/blog';
import { getDisplayLanguage } from '@/lib/auth/app-user';
import { absoluteUrl } from '@/lib/site-url';

type Props = {
  params: Promise<{ slug: string }>;
};

const blogPostCopy = {
  ko: {
    backToBlog: '블로그로 돌아가기',
    minRead: '분 읽기',
  },
  en: {
    backToBlog: 'Back to Blog',
    minRead: 'min read',
  },
};

const formatDate = (date: string, language: 'ko' | 'en') =>
  new Intl.DateTimeFormat(language === 'ko' ? 'ko-KR' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(date));

export const dynamic = 'force-dynamic';

function toAbsoluteUrl(url: string) {
  return url.startsWith('http://') || url.startsWith('https://') ? url : absoluteUrl(url);
}

function renderInlineMarkdown(text: string) {
  return text.split(/(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g).map((part, index) => {
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code
          key={index}
          className="rounded-md bg-[#EEF7EF] px-1.5 py-0.5 text-[0.94em] font-bold text-[#35633e] ring-1 ring-[#d8eadb] dark:bg-emerald-500/10 dark:text-emerald-100 dark:ring-emerald-500/20"
        >
          {part.slice(1, -1)}
        </code>
      );
    }

    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={index} className="font-bold text-zinc-950 dark:text-zinc-50">
          {part.slice(2, -2)}
        </strong>
      );
    }

    if (part.startsWith('*') && part.endsWith('*')) {
      return <em key={index}>{part.slice(1, -1)}</em>;
    }

    return part;
  });
}

function splitMarkdownTableRow(line: string) {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim());
}

function isMarkdownTable(lines: string[]) {
  return lines.length >= 2 && /^\s*\|?[\s:|-]+\|[\s:|-]+\|?\s*$/.test(lines[1]);
}

function renderMarkdownTable(lines: string[], key: number) {
  const headers = splitMarkdownTableRow(lines[0]);
  const rows = lines.slice(2).map(splitMarkdownTableRow).filter((row) => row.some(Boolean));

  return (
    <div key={key} className="my-8 overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse text-left text-sm">
          <thead className="bg-zinc-50 text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">
            <tr>
              {headers.map((header) => (
                <th key={header} className="border-b border-zinc-200 px-4 py-3 font-black dark:border-zinc-800">
                  {renderInlineMarkdown(header)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {rows.map((row, rowIndex) => (
              <tr key={`${row.join('-')}-${rowIndex}`} className="bg-white dark:bg-zinc-950">
                {headers.map((header, cellIndex) => (
                  <td key={`${header}-${cellIndex}`} className="px-4 py-3 leading-7 text-zinc-600 dark:text-zinc-300">
                    {renderInlineMarkdown(row[cellIndex] ?? '')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function normalizeHeadingText(value: string) {
  return value
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

function renderMarkdownBody(body: string, postTitle: string) {
  let skippedDuplicateTitle = false;

  return body
    .trim()
    .split(/\n{2,}/)
    .map((block, index) => {
      const text = block.trim();
      const heading = /^(#{1,4})\s+(.+)$/.exec(text);
      const lines = text.split('\n').map((line) => line.trim()).filter(Boolean);

      if (heading) {
        const level = heading[1].length;
        const headingText = heading[2];

        if (
          level === 1 &&
          !skippedDuplicateTitle &&
          normalizeHeadingText(headingText) === normalizeHeadingText(postTitle)
        ) {
          skippedDuplicateTitle = true;
          return null;
        }

        if (level <= 2) {
          return (
            <h2 key={index} className="mt-12 border-t border-zinc-200 pt-8 text-2xl font-black leading-tight tracking-tight text-zinc-950 first:mt-0 first:border-t-0 first:pt-0 dark:border-zinc-800 dark:text-zinc-50 sm:text-3xl">
              {renderInlineMarkdown(headingText)}
            </h2>
          );
        }

        return (
          <h3 key={index} className="mt-8 text-xl font-black tracking-tight text-zinc-950 dark:text-zinc-50">
            {renderInlineMarkdown(headingText)}
          </h3>
        );
      }

      if (/^-{3,}$/.test(text)) {
        return <hr key={index} className="my-10 border-zinc-200 dark:border-zinc-800" />;
      }

      if (isMarkdownTable(lines)) {
        return renderMarkdownTable(lines, index);
      }

      if (lines.every((line) => line.startsWith('>'))) {
        return (
          <blockquote key={index} className="my-7 border-l-4 border-[#559c63] bg-emerald-50 px-5 py-4 text-base font-semibold leading-8 text-emerald-950 dark:bg-emerald-500/10 dark:text-emerald-100">
            {lines.map((line) => line.replace(/^>\s?/, '')).map((line) => (
              <p key={line}>{renderInlineMarkdown(line)}</p>
            ))}
          </blockquote>
        );
      }

      const unorderedItems = lines
        .map((line) => /^[-*]\s+(.+)$/.exec(line))
        .filter((match): match is RegExpExecArray => Boolean(match));
      const orderedItems = lines
        .map((line) => /^\d+\.\s+(.+)$/.exec(line))
        .filter((match): match is RegExpExecArray => Boolean(match));

      if (unorderedItems.length === lines.length && unorderedItems.length > 0) {
        return (
          <ul key={index} className="my-5 list-disc space-y-2 rounded-lg bg-zinc-50 px-6 py-5 pl-10 text-base leading-8 text-zinc-650 dark:bg-zinc-900/70 dark:text-zinc-300">
            {unorderedItems.map((item) => (
              <li key={item[1]}>{renderInlineMarkdown(item[1])}</li>
            ))}
          </ul>
        );
      }

      if (orderedItems.length === lines.length && orderedItems.length > 0) {
        return (
          <ol key={index} className="my-5 list-decimal space-y-2 rounded-lg bg-zinc-50 px-6 py-5 pl-10 text-base leading-8 text-zinc-650 dark:bg-zinc-900/70 dark:text-zinc-300">
            {orderedItems.map((item) => (
              <li key={item[1]}>{renderInlineMarkdown(item[1])}</li>
            ))}
          </ol>
        );
      }

      return (
        <p key={index} className="my-5 whitespace-pre-line text-lg leading-9 text-zinc-650 dark:text-zinc-300">
          {renderInlineMarkdown(text)}
        </p>
      );
    });
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
  const [post, language] = await Promise.all([
    getBlogPost(slug),
    getDisplayLanguage(),
  ]);

  if (!post) {
    notFound();
  }

  const copy = blogPostCopy[language];
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
        {copy.backToBlog}
      </Link>

      <header className="mt-8">
        <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300">{post.category}</p>
        <h1 className="mt-3 text-3xl font-black leading-tight tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-5xl">
          {post.title}
        </h1>
        <p className="mt-5 text-lg leading-8 text-zinc-600 dark:text-zinc-300">{post.description}</p>
        <div className="mt-6 flex flex-wrap items-center gap-4 text-sm font-semibold text-zinc-500 dark:text-zinc-400">
          <span className="inline-flex items-center gap-2">
            <CalendarDays size={16} />
            {formatDate(post.publishedAt, language)}
          </span>
          <span className="inline-flex items-center gap-2">
            <Clock3 size={16} />
            {language === 'ko' ? `${post.readingMinutes}${copy.minRead}` : `${post.readingMinutes} ${copy.minRead}`}
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

      {post.markdown ? (
        <div className="mt-10">{renderMarkdownBody(post.markdown.body, post.title)}</div>
      ) : (
        <>
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
        </>
      )}

      <nav className="mt-12 border-t border-zinc-200 pt-6 dark:border-zinc-800" aria-label="Blog post footer navigation">
        <Link
          href="/blog"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-zinc-200 bg-white px-5 text-sm font-bold text-zinc-700 shadow-sm transition hover:border-[#559c63]/50 hover:bg-[#EEF7EF] hover:text-[#35633e] dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:border-emerald-500/40 dark:hover:bg-emerald-500/10 dark:hover:text-emerald-100"
        >
          <ArrowLeft size={16} />
          {copy.backToBlog}
        </Link>
      </nav>
    </article>
  );
}
