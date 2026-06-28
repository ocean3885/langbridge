import { createAdminClient } from '@/lib/supabase/admin';

export type BlogContentPlanStatus =
  | 'pending'
  | 'generating'
  | 'ready'
  | 'published'
  | 'paused'
  | 'discarded';

export type BlogPlanCategory = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
};

export type BlogContentPlanListItem = {
  id: string;
  title: string;
  description: string;
  slug: string | null;
  category: {
    name: string;
    slug: string | null;
  } | null;
  targetKeywords: string[];
  searchIntent: string | null;
  contentAngle: string | null;
  audience: string | null;
  status: BlogContentPlanStatus;
  priority: number;
  hasGeneratedPayload: boolean;
  hasGeneratedDraft: boolean;
  hasGeneratedJson: boolean;
  generatedDraftText: string | null;
  generatedJsonText: string | null;
  linkedPost: {
    slug: string;
    title: string;
  } | null;
  createdAt: string;
  updatedAt: string;
};

export type BlogPlanningContextItem = {
  title: string;
  slug: string | null;
  description: string;
};

export type BlogPlanningContext = {
  category: BlogPlanCategory;
  existingPosts: BlogPlanningContextItem[];
  activePlans: BlogPlanningContextItem[];
};

type BlogContentPlanRow = {
  id: string;
  title: string;
  description: string;
  slug: string | null;
  target_keywords: string[] | null;
  search_intent: string | null;
  content_angle: string | null;
  audience: string | null;
  status: BlogContentPlanStatus;
  priority: number | null;
  generated_payload: unknown;
  created_at: string;
  updated_at: string;
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
  blog_posts:
    | {
        slug: string | null;
        title: string | null;
      }
    | {
        slug: string | null;
        title: string | null;
      }[]
    | null;
};

type CategoryRow = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
};

type ContextRow = {
  title: string | null;
  slug: string | null;
  description: string | null;
};

function firstRelation<T>(value: T | T[] | null): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function mapPlan(row: BlogContentPlanRow): BlogContentPlanListItem {
  const category = firstRelation(row.blog_categories);
  const linkedPost = firstRelation(row.blog_posts);
  const generatedPayload = isRecord(row.generated_payload) ? row.generated_payload : null;
  const draftText = typeof generatedPayload?.draftText === 'string' ? generatedPayload.draftText : null;
  const blogJson = isRecord(generatedPayload?.blogJson) ? generatedPayload.blogJson : null;

  return {
    id: row.id,
    title: row.title,
    description: row.description,
    slug: row.slug,
    category: category?.name
      ? {
          name: category.name,
          slug: category.slug,
        }
      : null,
    targetKeywords: row.target_keywords ?? [],
    searchIntent: row.search_intent,
    contentAngle: row.content_angle,
    audience: row.audience,
    status: row.status,
    priority: row.priority ?? 0,
    hasGeneratedPayload: Boolean(row.generated_payload),
    hasGeneratedDraft: Boolean(draftText),
    hasGeneratedJson: Boolean(blogJson),
    generatedDraftText: draftText,
    generatedJsonText: blogJson ? JSON.stringify(blogJson, null, 2) : null,
    linkedPost: linkedPost?.slug && linkedPost?.title
      ? {
          slug: linkedPost.slug,
          title: linkedPost.title,
        }
      : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapContextItem(row: ContextRow): BlogPlanningContextItem | null {
  if (!row.title || !row.description) {
    return null;
  }

  return {
    title: row.title,
    slug: row.slug,
    description: row.description,
  };
}

export async function getBlogPlanCategories(): Promise<BlogPlanCategory[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('blog_categories')
    .select('id, slug, name, description')
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });

  if (error) {
    console.error('Failed to list blog plan categories:', error.message);
    return [];
  }

  return ((data ?? []) as CategoryRow[]).map((category) => ({
    id: category.id,
    slug: category.slug,
    name: category.name,
    description: category.description,
  }));
}

export async function getAdminBlogContentPlans(): Promise<BlogContentPlanListItem[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('blog_content_plans')
    .select(`
      id,
      title,
      description,
      slug,
      target_keywords,
      search_intent,
      content_angle,
      audience,
      status,
      priority,
      generated_payload,
      created_at,
      updated_at,
      blog_categories(name, slug),
      blog_posts(slug, title)
    `)
    .order('status', { ascending: true })
    .order('priority', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to list blog content plans:', error.message);
    return [];
  }

  return ((data ?? []) as unknown as BlogContentPlanRow[]).map(mapPlan);
}

export async function getBlogPlanningContext(categoryId: string): Promise<BlogPlanningContext | null> {
  const supabase = createAdminClient();
  const [{ data: category, error: categoryError }, { data: posts, error: postsError }, { data: plans, error: plansError }] =
    await Promise.all([
      supabase
        .from('blog_categories')
        .select('id, slug, name, description')
        .eq('id', categoryId)
        .maybeSingle(),
      supabase
        .from('blog_posts')
        .select('title, slug, description')
        .eq('category_id', categoryId)
        .order('created_at', { ascending: false })
        .limit(80),
      supabase
        .from('blog_content_plans')
        .select('title, slug, description')
        .eq('category_id', categoryId)
        .in('status', ['pending', 'generating', 'ready', 'paused'])
        .order('created_at', { ascending: false })
        .limit(80),
    ]);

  if (categoryError) {
    console.error('Failed to get blog planning category:', categoryError.message);
    return null;
  }

  if (!category) {
    return null;
  }

  if (postsError) {
    console.error('Failed to list blog planning posts:', postsError.message);
  }

  if (plansError) {
    console.error('Failed to list blog planning plans:', plansError.message);
  }

  return {
    category: category as CategoryRow,
    existingPosts: ((posts ?? []) as ContextRow[]).map(mapContextItem).filter(Boolean) as BlogPlanningContextItem[],
    activePlans: ((plans ?? []) as ContextRow[]).map(mapContextItem).filter(Boolean) as BlogPlanningContextItem[],
  };
}
