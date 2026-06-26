import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export type BlogContent = {
  intro: string;
  sections: {
    heading: string;
    body: string[];
  }[];
  cta: {
    title: string;
    body: string;
    href: string;
    label: string;
  };
};

export type BlogPost = {
  slug: string;
  title: string;
  description: string;
  category: string;
  categorySlug: string | null;
  publishedAt: string;
  updatedAt?: string;
  readingMinutes: number;
  image: string;
  keywords: string[];
  intro: string;
  sections: BlogContent['sections'];
  cta: BlogContent['cta'];
  seoTitle?: string;
  seoDescription?: string;
  ogImage?: string;
  canonicalUrl?: string;
};

export type BlogPromptContext = {
  categories: {
    slug: string;
    name: string;
    description: string | null;
  }[];
  posts: {
    slug: string;
    title: string;
    status: string;
  }[];
};

type BlogPostRow = {
  slug: string;
  title: string;
  description: string;
  content: unknown;
  published_at: string | null;
  updated_at: string | null;
  image_url: string | null;
  reading_minutes: number | null;
  seo_title: string | null;
  seo_description: string | null;
  og_image_url: string | null;
  canonical_url: string | null;
  blog_categories:
    | {
        name: string | null;
        slug: string | null;
      }
    | {
        name: string | null;
        slug: string | null;
      }[]
    | null;
  blog_post_tags: {
    blog_tags:
      | {
          name: string | null;
          slug: string | null;
        }
      | {
          name: string | null;
          slug: string | null;
        }[]
      | null;
  }[];
};

type BlogCategoryRow = {
  name: string | null;
  slug: string | null;
};

type BlogTagRow = {
  name: string | null;
  slug: string | null;
};

function firstRelation<T>(value: T | T[] | null): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value;
}

function getCategory(row: BlogPostRow): BlogCategoryRow | null {
  return firstRelation(row.blog_categories);
}

function getTag(value: BlogTagRow | BlogTagRow[] | null): BlogTagRow | null {
  return firstRelation(value);
}

const defaultCta = {
  title: '오늘 배울 스페인어 표현을 바로 시작해 보세요',
  body: '짧은 문장과 단어 묶음으로 부담 없이 스페인어 루틴을 만들 수 있습니다.',
  href: '/learn',
  label: '학습 시작하기',
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeContent(content: unknown): BlogContent {
  if (!isRecord(content)) {
    return { intro: '', sections: [], cta: defaultCta };
  }

  const sections = Array.isArray(content.sections)
    ? content.sections
        .filter(isRecord)
        .map((section) => ({
          heading: typeof section.heading === 'string' ? section.heading : '',
          body: Array.isArray(section.body)
            ? section.body.filter((paragraph): paragraph is string => typeof paragraph === 'string')
            : [],
        }))
        .filter((section) => section.heading && section.body.length > 0)
    : [];

  const cta = isRecord(content.cta)
    ? {
        title: typeof content.cta.title === 'string' ? content.cta.title : defaultCta.title,
        body: typeof content.cta.body === 'string' ? content.cta.body : defaultCta.body,
        href: typeof content.cta.href === 'string' ? content.cta.href : defaultCta.href,
        label: typeof content.cta.label === 'string' ? content.cta.label : defaultCta.label,
      }
    : defaultCta;

  return {
    intro: typeof content.intro === 'string' ? content.intro : '',
    sections,
    cta,
  };
}

function mapBlogPost(row: BlogPostRow): BlogPost {
  const content = normalizeContent(row.content);
  const category = getCategory(row);
  const tagNames = row.blog_post_tags
    .map((tagRow) => getTag(tagRow.blog_tags)?.name)
    .filter((name): name is string => Boolean(name));

  return {
    slug: row.slug,
    title: row.title,
    description: row.description,
    category: category?.name ?? '스페인어 학습',
    categorySlug: category?.slug ?? null,
    publishedAt: row.published_at ?? row.updated_at ?? new Date().toISOString(),
    updatedAt: row.updated_at ?? undefined,
    readingMinutes: row.reading_minutes ?? 3,
    image: row.image_url ?? '/images/heroimg_land.jpg',
    keywords: tagNames,
    intro: content.intro,
    sections: content.sections,
    cta: content.cta,
    seoTitle: row.seo_title ?? undefined,
    seoDescription: row.seo_description ?? undefined,
    ogImage: row.og_image_url ?? undefined,
    canonicalUrl: row.canonical_url ?? undefined,
  };
}

export async function getBlogPosts(): Promise<BlogPost[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('blog_posts')
    .select(`
      slug,
      title,
      description,
      content,
      published_at,
      updated_at,
      image_url,
      reading_minutes,
      seo_title,
      seo_description,
      og_image_url,
      canonical_url,
      blog_categories(name, slug),
      blog_post_tags(blog_tags(name, slug))
    `)
    .order('published_at', { ascending: false });

  if (error) {
    console.error('Failed to list blog posts:', error.message);
    return [];
  }

  return ((data ?? []) as unknown as BlogPostRow[]).map(mapBlogPost);
}

export async function getBlogPost(slug: string): Promise<BlogPost | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('blog_posts')
    .select(`
      slug,
      title,
      description,
      content,
      published_at,
      updated_at,
      image_url,
      reading_minutes,
      seo_title,
      seo_description,
      og_image_url,
      canonical_url,
      blog_categories(name, slug),
      blog_post_tags(blog_tags(name, slug))
    `)
    .eq('slug', slug)
    .maybeSingle();

  if (error) {
    console.error(`Failed to get blog post "${slug}":`, error.message);
    return null;
  }

  return data ? mapBlogPost(data as unknown as BlogPostRow) : null;
}

export async function getBlogPromptContext(): Promise<BlogPromptContext> {
  const supabase = createAdminClient();
  const [{ data: categories, error: categoriesError }, { data: posts, error: postsError }] =
    await Promise.all([
      supabase
        .from('blog_categories')
        .select('slug, name, description')
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true })
        .limit(60),
      supabase
        .from('blog_posts')
        .select('slug, title, status')
        .order('created_at', { ascending: false })
        .limit(80),
    ]);

  if (categoriesError) {
    console.error('Failed to list blog prompt categories:', categoriesError.message);
  }

  if (postsError) {
    console.error('Failed to list blog prompt posts:', postsError.message);
  }

  return {
    categories: ((categories ?? []) as { slug: string; name: string; description: string | null }[]).map(
      (category) => ({
        slug: category.slug,
        name: category.name,
        description: category.description,
      })
    ),
    posts: ((posts ?? []) as { slug: string; title: string; status: string }[]).map((post) => ({
      slug: post.slug,
      title: post.title,
      status: post.status,
    })),
  };
}
