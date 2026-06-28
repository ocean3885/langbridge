'use server';

import { revalidatePath } from 'next/cache';
import { getAppUserFromServer } from '@/lib/auth/app-user';
import { isSuperAdmin } from '@/lib/auth/super-admin';
import { createAdminClient } from '@/lib/supabase/admin';

type BlogPostCreateResult = {
  success: boolean;
  slug?: string;
  error?: string;
};

type BlogPostMutationResult = BlogPostCreateResult;

type BlogCategoryMutationResult = {
  success: boolean;
  id?: string;
  error?: string;
};

type BlogPromptDraftResult = {
  success: boolean;
  prompt?: string;
  error?: string;
};

const BLOG_PROMPT_DRAFT_TYPE = 'blog_post_prompt';

type BlogPostJson = {
  slug?: unknown;
  title?: unknown;
  description?: unknown;
  category?: unknown;
  tags?: unknown;
  imageUrl?: unknown;
  image_url?: unknown;
  readingMinutes?: unknown;
  reading_minutes?: unknown;
  status?: unknown;
  publishedAt?: unknown;
  published_at?: unknown;
  seoTitle?: unknown;
  seo_title?: unknown;
  seoDescription?: unknown;
  seo_description?: unknown;
  ogImageUrl?: unknown;
  og_image_url?: unknown;
  canonicalUrl?: unknown;
  canonical_url?: unknown;
  content?: unknown;
};

type CategoryInput = {
  slug: string;
  name: string;
  description: string | null;
};

type TagInput = {
  slug: string;
  name: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function getNullableString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

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

function parseJsonText(jsonText: string): BlogPostJson {
  const trimmed = jsonText.trim();
  const withoutFence = trimmed
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
  const parsed = JSON.parse(withoutFence);

  if (!isRecord(parsed)) {
    throw new Error('JSON 최상위 값은 객체여야 합니다.');
  }

  return parsed;
}

function normalizeCategory(value: unknown): CategoryInput | null {
  if (typeof value === 'string' && value.trim()) {
    const name = value.trim();
    const slug = slugify(name);
    return slug ? { slug, name, description: null } : null;
  }

  if (!isRecord(value)) return null;

  const name = getString(value.name);
  const slug = getString(value.slug) ?? (name ? slugify(name) : null);

  if (!name || !slug) return null;

  return {
    slug,
    name,
    description: getNullableString(value.description),
  };
}

function normalizeTags(value: unknown): TagInput[] {
  if (!Array.isArray(value)) return [];

  const tags = value
    .map((item) => {
      if (typeof item === 'string' && item.trim()) {
        const name = item.trim();
        const slug = slugify(name);
        return slug ? { slug, name } : null;
      }

      if (!isRecord(item)) return null;

      const name = getString(item.name);
      const slug = getString(item.slug) ?? (name ? slugify(name) : null);
      return name && slug ? { slug, name } : null;
    })
    .filter((tag): tag is TagInput => Boolean(tag));

  return Array.from(new Map(tags.map((tag) => [tag.slug, tag])).values());
}

function normalizeContent(value: unknown) {
  if (!isRecord(value)) {
    throw new Error('content 객체가 필요합니다.');
  }

  const intro = getString(value.intro);
  const sections = Array.isArray(value.sections) ? value.sections : [];
  const normalizedSections = sections
    .filter(isRecord)
    .map((section) => ({
      heading: getString(section.heading) ?? '',
      body: Array.isArray(section.body)
        ? section.body.filter(
            (paragraph): paragraph is string => typeof paragraph === 'string' && paragraph.trim().length > 0
          )
        : [],
    }))
    .filter((section) => section.heading && section.body.length > 0);

  if (!intro) {
    throw new Error('content.intro가 필요합니다.');
  }

  if (normalizedSections.length === 0) {
    throw new Error('content.sections에 최소 1개 섹션이 필요합니다.');
  }

  const cta = isRecord(value.cta)
    ? {
        title: getString(value.cta.title) ?? '오늘 배울 스페인어 표현을 바로 시작해 보세요',
        body: getString(value.cta.body) ?? '짧은 문장과 단어 묶음으로 부담 없이 스페인어 루틴을 만들 수 있습니다.',
        href: getString(value.cta.href) ?? '/learn',
        label: getString(value.cta.label) ?? '학습 시작하기',
      }
    : {
        title: '오늘 배울 스페인어 표현을 바로 시작해 보세요',
        body: '짧은 문장과 단어 묶음으로 부담 없이 스페인어 루틴을 만들 수 있습니다.',
        href: '/learn',
        label: '학습 시작하기',
      };

  return {
    intro,
    sections: normalizedSections,
    cta,
  };
}

function normalizeReadingMinutes(value: unknown) {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue) || numberValue < 1) return 3;
  return Math.round(numberValue);
}

function normalizeStatus(value: unknown) {
  return value === 'draft' || value === 'archived' ? value : 'published';
}

async function requireSuperAdmin() {
  const user = await getAppUserFromServer();
  if (!user) {
    throw new Error('로그인이 필요합니다.');
  }

  const isAdminUser = await isSuperAdmin({ userId: user.id, email: user.email });
  if (!isAdminUser) {
    throw new Error('권한이 없습니다.');
  }

  return user;
}

async function upsertCategory(
  supabase: ReturnType<typeof createAdminClient>,
  category: CategoryInput | null
) {
  if (!category) {
    return null;
  }

  const { data, error } = await supabase
    .from('blog_categories')
    .upsert(
      {
        slug: category.slug,
        name: category.name,
        description: category.description,
      },
      { onConflict: 'slug' }
    )
    .select('id')
    .single();

  if (error || !data) {
    throw new Error(`카테고리 저장 실패: ${error?.message ?? 'unknown error'}`);
  }

  return data.id as string;
}

async function replacePostTags(
  supabase: ReturnType<typeof createAdminClient>,
  postId: string,
  tags: TagInput[]
) {
  const { error: deleteError } = await supabase.from('blog_post_tags').delete().eq('post_id', postId);

  if (deleteError) {
    throw new Error(`기존 태그 삭제 실패: ${deleteError.message}`);
  }

  if (tags.length === 0) {
    return;
  }

  const { data: savedTags, error: tagsError } = await supabase
    .from('blog_tags')
    .upsert(tags, { onConflict: 'slug' })
    .select('id, slug');

  if (tagsError || !savedTags) {
    throw new Error(`태그 저장 실패: ${tagsError?.message ?? 'unknown error'}`);
  }

  const { error: relationError } = await supabase.from('blog_post_tags').insert(
    savedTags.map((tag) => ({
      post_id: postId,
      tag_id: tag.id,
    }))
  );

  if (relationError) {
    throw new Error(`태그 연결 실패: ${relationError.message}`);
  }
}

function normalizeBlogPostInput(input: BlogPostJson) {
  const title = getString(input.title);
  const description = getString(input.description);
  const slug = getString(input.slug) ?? (title ? slugify(title) : null);

  if (!title) throw new Error('title이 필요합니다.');
  if (!description) throw new Error('description이 필요합니다.');
  if (!slug) throw new Error('slug가 필요합니다. 영문 slug를 넣어주세요.');

  const content = normalizeContent(input.content);
  const category = normalizeCategory(input.category);
  const tags = normalizeTags(input.tags);
  const status = normalizeStatus(input.status);
  const publishedAt =
    status === 'published'
      ? getNullableString(input.publishedAt) ?? getNullableString(input.published_at) ?? new Date().toISOString()
      : null;

  return {
    slug,
    title,
    description,
    content,
    category,
    tags,
    status,
    publishedAt,
    imageUrl: getNullableString(input.imageUrl) ?? getNullableString(input.image_url),
    readingMinutes: normalizeReadingMinutes(input.readingMinutes ?? input.reading_minutes),
    seoTitle: getNullableString(input.seoTitle) ?? getNullableString(input.seo_title),
    seoDescription: getNullableString(input.seoDescription) ?? getNullableString(input.seo_description),
    ogImageUrl: getNullableString(input.ogImageUrl) ?? getNullableString(input.og_image_url),
    canonicalUrl: getNullableString(input.canonicalUrl) ?? getNullableString(input.canonical_url),
  };
}

function getPromptFromDraftData(data: unknown) {
  if (!isRecord(data)) return null;
  return getString(data.prompt);
}

export async function getBlogPostPromptDraftAction(): Promise<BlogPromptDraftResult> {
  try {
    const user = await requireSuperAdmin();
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('admin_drafts')
      .select('data')
      .eq('user_id', user.id)
      .eq('type', BLOG_PROMPT_DRAFT_TYPE)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      return { success: false, error: `프롬프트 불러오기 실패: ${error.message}` };
    }

    return { success: true, prompt: getPromptFromDraftData(data?.data) ?? undefined };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '프롬프트를 불러오지 못했습니다.',
    };
  }
}

export async function saveBlogPostPromptDraftAction(prompt: string): Promise<BlogPromptDraftResult> {
  try {
    const user = await requireSuperAdmin();
    const normalizedPrompt = getString(prompt);

    if (!normalizedPrompt) {
      return { success: false, error: '저장할 프롬프트를 입력해 주세요.' };
    }

    const supabase = createAdminClient();
    const payload = {
      prompt: normalizedPrompt,
      version: 1,
      updatedAt: new Date().toISOString(),
    };
    const { data: existingDraft, error: fetchError } = await supabase
      .from('admin_drafts')
      .select('id')
      .eq('user_id', user.id)
      .eq('type', BLOG_PROMPT_DRAFT_TYPE)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (fetchError) {
      return { success: false, error: `프롬프트 확인 실패: ${fetchError.message}` };
    }

    const query = existingDraft?.id
      ? supabase
          .from('admin_drafts')
          .update({ data: payload, updated_at: new Date().toISOString() })
          .eq('id', existingDraft.id)
          .eq('user_id', user.id)
      : supabase.from('admin_drafts').insert({
          user_id: user.id,
          type: BLOG_PROMPT_DRAFT_TYPE,
          data: payload,
        });

    const { error } = await query;

    if (error) {
      return { success: false, error: `프롬프트 저장 실패: ${error.message}` };
    }

    return { success: true, prompt: normalizedPrompt };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '프롬프트를 저장하지 못했습니다.',
    };
  }
}

export async function resetBlogPostPromptDraftAction(): Promise<BlogPromptDraftResult> {
  try {
    const user = await requireSuperAdmin();
    const supabase = createAdminClient();
    const { error } = await supabase
      .from('admin_drafts')
      .delete()
      .eq('user_id', user.id)
      .eq('type', BLOG_PROMPT_DRAFT_TYPE);

    if (error) {
      return { success: false, error: `프롬프트 초기화 실패: ${error.message}` };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '프롬프트를 초기화하지 못했습니다.',
    };
  }
}

export async function createBlogPostFromJsonAction(jsonText: string): Promise<BlogPostCreateResult> {
  try {
    const user = await requireSuperAdmin();
    const normalized = normalizeBlogPostInput(parseJsonText(jsonText));

    const supabase = createAdminClient();
    const categoryId = await upsertCategory(supabase, normalized.category);

    const { data: post, error: postError } = await supabase
      .from('blog_posts')
      .insert({
        slug: normalized.slug,
        title: normalized.title,
        description: normalized.description,
        content: normalized.content,
        status: normalized.status,
        published_at: normalized.publishedAt,
        category_id: categoryId,
        image_url: normalized.imageUrl,
        reading_minutes: normalized.readingMinutes,
        seo_title: normalized.seoTitle,
        seo_description: normalized.seoDescription,
        og_image_url: normalized.ogImageUrl,
        canonical_url: normalized.canonicalUrl,
        author_id: user.id,
      })
      .select('id, slug')
      .single();

    if (postError || !post) {
      return { success: false, error: `블로그 글 저장 실패: ${postError?.message ?? 'unknown error'}` };
    }

    await replacePostTags(supabase, post.id, normalized.tags);

    revalidatePath('/blog');
    revalidatePath(`/blog/${post.slug}`);
    revalidatePath('/admin/blog');
    revalidatePath('/sitemap.xml');

    return { success: true, slug: post.slug };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '블로그 글 생성 중 오류가 발생했습니다.',
    };
  }
}

export async function updateBlogPostFromJsonAction(
  originalSlug: string,
  jsonText: string
): Promise<BlogPostMutationResult> {
  try {
    await requireSuperAdmin();
    const normalized = normalizeBlogPostInput(parseJsonText(jsonText));
    const supabase = createAdminClient();

    const { data: existingPost, error: fetchError } = await supabase
      .from('blog_posts')
      .select('id, slug')
      .eq('slug', originalSlug)
      .maybeSingle();

    if (fetchError) {
      return { success: false, error: `블로그 글 조회 실패: ${fetchError.message}` };
    }

    if (!existingPost) {
      return { success: false, error: '수정할 블로그 글을 찾지 못했습니다.' };
    }

    const categoryId = await upsertCategory(supabase, normalized.category);
    const { data: updatedPost, error: updateError } = await supabase
      .from('blog_posts')
      .update({
        slug: normalized.slug,
        title: normalized.title,
        description: normalized.description,
        content: normalized.content,
        status: normalized.status,
        published_at: normalized.publishedAt,
        category_id: categoryId,
        image_url: normalized.imageUrl,
        reading_minutes: normalized.readingMinutes,
        seo_title: normalized.seoTitle,
        seo_description: normalized.seoDescription,
        og_image_url: normalized.ogImageUrl,
        canonical_url: normalized.canonicalUrl,
      })
      .eq('id', existingPost.id)
      .select('id, slug')
      .single();

    if (updateError || !updatedPost) {
      return { success: false, error: `블로그 글 수정 실패: ${updateError?.message ?? 'unknown error'}` };
    }

    await replacePostTags(supabase, updatedPost.id, normalized.tags);

    revalidatePath('/blog');
    revalidatePath(`/blog/${originalSlug}`);
    revalidatePath(`/blog/${updatedPost.slug}`);
    revalidatePath('/admin/blog');
    revalidatePath(`/admin/blog/${updatedPost.slug}/edit`);
    revalidatePath('/sitemap.xml');

    return { success: true, slug: updatedPost.slug };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '블로그 글 수정 중 오류가 발생했습니다.',
    };
  }
}

export async function deleteBlogPostAction(slug: string): Promise<BlogPostMutationResult> {
  try {
    await requireSuperAdmin();
    const normalizedSlug = getString(slug);

    if (!normalizedSlug) {
      return { success: false, error: '삭제할 블로그 slug가 필요합니다.' };
    }

    const supabase = createAdminClient();
    const { error } = await supabase.from('blog_posts').delete().eq('slug', normalizedSlug);

    if (error) {
      return { success: false, error: `블로그 글 삭제 실패: ${error.message}` };
    }

    revalidatePath('/blog');
    revalidatePath(`/blog/${normalizedSlug}`);
    revalidatePath('/admin/blog');
    revalidatePath('/sitemap.xml');

    return { success: true, slug: normalizedSlug };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '블로그 글 삭제 중 오류가 발생했습니다.',
    };
  }
}

export async function createBlogCategoryAction(input: {
  name?: string;
  slug?: string;
  description?: string;
}): Promise<BlogCategoryMutationResult> {
  try {
    await requireSuperAdmin();

    const name = getString(input.name);
    const slug = getString(input.slug) ?? (name ? slugify(name) : null);

    if (!name) {
      return { success: false, error: '카테고리 이름을 입력해 주세요.' };
    }

    if (!slug) {
      return { success: false, error: '영문 slug를 입력해 주세요.' };
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('blog_categories')
      .insert({
        name,
        slug,
        description: getNullableString(input.description),
      })
      .select('id')
      .single();

    if (error || !data) {
      return { success: false, error: `카테고리 생성 실패: ${error?.message ?? 'unknown error'}` };
    }

    revalidatePath('/blog');
    revalidatePath('/admin/blog');
    revalidatePath('/admin/blog/new');
    revalidatePath('/admin/blog/plans');

    return { success: true, id: data.id as string };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '카테고리 생성 중 오류가 발생했습니다.',
    };
  }
}

export async function deleteBlogCategoryAction(id: string): Promise<BlogCategoryMutationResult> {
  try {
    await requireSuperAdmin();
    const categoryId = getString(id);

    if (!categoryId) {
      return { success: false, error: '삭제할 카테고리가 필요합니다.' };
    }

    const supabase = createAdminClient();
    const { count, error: countError } = await supabase
      .from('blog_posts')
      .select('id', { count: 'exact', head: true })
      .eq('category_id', categoryId);

    if (countError) {
      return { success: false, error: `카테고리 사용 여부 확인 실패: ${countError.message}` };
    }

    if ((count ?? 0) > 0) {
      return { success: false, error: '이미 이 카테고리에 소속된 글이 있어 삭제할 수 없습니다.' };
    }

    const { error } = await supabase.from('blog_categories').delete().eq('id', categoryId);

    if (error) {
      return { success: false, error: `카테고리 삭제 실패: ${error.message}` };
    }

    revalidatePath('/blog');
    revalidatePath('/admin/blog');
    revalidatePath('/admin/blog/new');
    revalidatePath('/admin/blog/plans');

    return { success: true, id: categoryId };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '카테고리 삭제 중 오류가 발생했습니다.',
    };
  }
}
