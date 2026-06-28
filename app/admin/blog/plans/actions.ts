'use server';

import { revalidatePath } from 'next/cache';
import { getAppUserFromServer } from '@/lib/auth/app-user';
import { isSuperAdmin } from '@/lib/auth/super-admin';
import { generateProviderJson, generateProviderText, normalizeWordGenerationProvider } from '@/lib/generator';
import type { WordGenerationProvider } from '@/lib/generator';
import { createAdminClient } from '@/lib/supabase/admin';
import { getBlogPlanningContext } from '@/lib/supabase/services/blog-content-plans';
import {
  BLOG_PLAN_CANDIDATE_PROMPTS_TYPE,
  BLOG_PLAN_POST_PROMPTS_TYPE,
  DEFAULT_BLOG_PLAN_CANDIDATE_PROMPTS,
  DEFAULT_BLOG_PLAN_POST_PROMPTS,
} from './prompt-presets';
import type { BlogPlanCandidatePrompt, BlogPlanPostPrompt } from './prompt-presets';

export type BlogPlanCandidate = {
  title: string;
  description: string;
  slug: string;
  targetKeywords: string[];
  searchIntent: string;
  contentAngle: string;
  audience: string;
  priority: number;
  notes: string;
};

type BlogPlanGenerationResult = {
  success: boolean;
  candidates?: BlogPlanCandidate[];
  contextSummary?: {
    categoryName: string;
    postCount: number;
    activePlanCount: number;
  };
  error?: string;
};

export type BlogPromptLibraryResult = {
  success: boolean;
  candidatePrompts?: BlogPlanCandidatePrompt[];
  postPrompts?: BlogPlanPostPrompt[];
  error?: string;
};

type BlogPromptMutationResult = BlogPromptLibraryResult & {
  selectedId?: string;
};

type BlogPlanSaveResult = {
  success: boolean;
  count?: number;
  error?: string;
};

type BlogPostFromPlanGenerationResult = {
  success: boolean;
  error?: string;
};

type BlogPostJsonFromPlanGenerationResult = BlogPostFromPlanGenerationResult;

type BlogPostFromPlanPublishResult = {
  success: boolean;
  slug?: string;
  error?: string;
};

type BlogPlanDeleteResult = {
  success: boolean;
  error?: string;
};

type BlogPlanCandidateInput = Partial<BlogPlanCandidate>;

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

type BlogContentPlanDetailRow = {
  id: string;
  title: string;
  description: string;
  slug: string | null;
  category_id: string | null;
  target_keywords: string[] | null;
  search_intent: string | null;
  content_angle: string | null;
  audience: string | null;
  priority: number | null;
  notes: string | null;
  status: string;
  blog_categories:
    | {
        slug: string | null;
        name: string | null;
        description: string | null;
      }
    | {
        slug: string | null;
        name: string | null;
        description: string | null;
      }[]
    | null;
};

async function requireSuperAdmin() {
  const user = await getAppUserFromServer();

  if (!user) {
    throw new Error('로그인이 필요합니다.');
  }

  const isAdminUser = await isSuperAdmin({ userId: user.id, email: user.email ?? null });

  if (!isAdminUser) {
    throw new Error('관리자 권한이 필요합니다.');
  }

  return user;
}

function getString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function getNullableString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function firstRelation<T>(value: T | T[] | null): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value;
}

function normalizePromptId(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
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

function normalizeKeywords(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((keyword) => getString(keyword))
      .filter(Boolean)
      .slice(0, 8);
  }

  if (typeof value === 'string') {
    return value
      .split(',')
      .map((keyword) => keyword.trim())
      .filter(Boolean)
      .slice(0, 8);
  }

  return [];
}

function normalizeCategory(value: unknown): CategoryInput | null {
  if (typeof value === 'string' && value.trim()) {
    const name = value.trim();
    const slug = slugify(name);
    return slug ? { slug, name, description: null } : null;
  }

  if (!isRecord(value)) return null;

  const name = getString(value.name);
  const slug = getString(value.slug) || (name ? slugify(name) : '');

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
      const slug = getString(item.slug) || (name ? slugify(name) : '');
      return name && slug ? { slug, name } : null;
    })
    .filter((tag): tag is TagInput => Boolean(tag));

  return Array.from(new Map(tags.map((tag) => [tag.slug, tag])).values());
}

function normalizeContent(value: unknown) {
  if (!isRecord(value)) {
    throw new Error('content 객체가 필요합니다.');
  }

  if (value.format === 'markdown') {
    const body = getString(value.body);

    if (!body) {
      throw new Error('content.body가 필요합니다.');
    }

    return {
      format: 'markdown',
      body,
    };
  }

  const intro = getString(value.intro);
  const sections = Array.isArray(value.sections) ? value.sections : [];
  const normalizedSections = sections
    .filter(isRecord)
    .map((section) => ({
      heading: getString(section.heading),
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
        title: getString(value.cta.title) || '오늘 배울 스페인어 표현을 바로 시작해 보세요',
        body: getString(value.cta.body) || '짧은 문장과 단어 묶음으로 부담 없이 스페인어 루틴을 만들 수 있습니다.',
        href: getString(value.cta.href) || '/learn',
        label: getString(value.cta.label) || '학습 시작하기',
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

function normalizeBlogPostInput(input: BlogPostJson) {
  const title = getString(input.title);
  const description = getString(input.description);
  const slug = getString(input.slug) || (title ? slugify(title) : '');

  if (!title) throw new Error('title이 필요합니다.');
  if (!description) throw new Error('description이 필요합니다.');
  if (!slug) throw new Error('slug가 필요합니다. 영문 slug를 넣어주세요.');

  const content = normalizeContent(input.content);
  const category = normalizeCategory(input.category);
  const tags = normalizeTags(input.tags);
  const status = normalizeStatus(input.status);

  return {
    slug,
    title,
    description,
    content,
    category,
    tags,
    status,
    imageUrl: getNullableString(input.imageUrl) ?? getNullableString(input.image_url),
    readingMinutes: normalizeReadingMinutes(input.readingMinutes ?? input.reading_minutes),
    seoTitle: getNullableString(input.seoTitle) ?? getNullableString(input.seo_title),
    seoDescription: getNullableString(input.seoDescription) ?? getNullableString(input.seo_description),
    ogImageUrl: getNullableString(input.ogImageUrl) ?? getNullableString(input.og_image_url),
    canonicalUrl: getNullableString(input.canonicalUrl) ?? getNullableString(input.canonical_url),
  };
}

function getBlogJsonFromGeneratedPayload(value: unknown): BlogPostJson {
  if (!isRecord(value)) {
    throw new Error('생성된 payload가 없습니다. 먼저 Generate를 실행해 주세요.');
  }

  const blogJson = value.blogJson;

  if (isRecord(blogJson)) {
    return blogJson;
  }

  if (isRecord(value.content)) {
    return value;
  }

  throw new Error('생성된 blog JSON이 없습니다. 다시 Generate를 실행해 주세요.');
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

function normalizeCandidate(value: unknown): BlogPlanCandidate | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return null;
  }

  const record = value as Record<string, unknown>;
  const title = getString(record.title);
  const description = getString(record.description);
  const rawSlug = getString(record.slug);
  const slug = rawSlug ? slugify(rawSlug) : slugify(title);
  const targetKeywords = normalizeKeywords(record.targetKeywords ?? record.target_keywords);
  const searchIntent = getString(record.searchIntent ?? record.search_intent);
  const contentAngle = getString(record.contentAngle ?? record.content_angle);
  const audience = getString(record.audience);
  const notes = getString(record.notes);
  const priorityValue = Number(record.priority);
  const priority = Number.isFinite(priorityValue)
    ? Math.max(0, Math.min(10, Math.round(priorityValue)))
    : 5;

  if (!title || !description || !slug || targetKeywords.length === 0) {
    return null;
  }

  return {
    title,
    description,
    slug,
    targetKeywords,
    searchIntent,
    contentAngle,
    audience,
    priority,
    notes,
  };
}

function normalizeCandidates(value: unknown): BlogPlanCandidate[] {
  const candidates = typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>).plans
    : null;

  if (!Array.isArray(candidates)) {
    throw new Error('LLM 응답에 plans 배열이 없습니다.');
  }

  return candidates
    .map(normalizeCandidate)
    .filter((candidate): candidate is BlogPlanCandidate => Boolean(candidate))
    .slice(0, 8);
}

function findDuplicateValues(values: string[]) {
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  values.forEach((value) => {
    if (seen.has(value)) {
      duplicates.add(value);
      return;
    }

    seen.add(value);
  });

  return Array.from(duplicates);
}

function formatSlugList(slugs: string[]) {
  return slugs.slice(0, 5).join(', ');
}

function buildAdminDraftPayload(data: Record<string, unknown>) {
  return {
    ...data,
    version: 1,
    updatedAt: new Date().toISOString(),
  };
}

function normalizeCandidatePrompt(value: unknown): BlogPlanCandidatePrompt | null {
  if (!isRecord(value)) return null;

  const title = getString(value.title);
  const prompt = getString(value.prompt);
  const id = normalizePromptId(getString(value.id) || title);

  if (!id || !title || !prompt) return null;

  return { id, title, prompt };
}

function normalizePostPrompt(value: unknown): BlogPlanPostPrompt | null {
  if (!isRecord(value)) return null;

  const title = getString(value.title);
  const draftPrompt = getString(value.draftPrompt);
  const jsonPrompt = getString(value.jsonPrompt);
  const id = normalizePromptId(getString(value.id) || title);

  if (!id || !title || !draftPrompt || !jsonPrompt) return null;

  return { id, title, draftPrompt, jsonPrompt };
}

function uniqueById<T extends { id: string }>(items: T[]) {
  return Array.from(new Map(items.map((item) => [item.id, item])).values());
}

function getPromptsFromDraftData<T>(
  data: unknown,
  normalize: (value: unknown) => T | null,
  defaults: T[]
) {
  if (!isRecord(data) || !Array.isArray(data.prompts)) {
    return defaults;
  }

  const prompts = data.prompts.map(normalize).filter((prompt): prompt is T => Boolean(prompt));
  return prompts.length > 0 ? uniqueById(prompts as (T & { id: string })[]) as T[] : defaults;
}

async function getPromptCollection<T>(
  supabase: ReturnType<typeof createAdminClient>,
  userId: string,
  type: string,
  normalize: (value: unknown) => T | null,
  defaults: T[]
) {
  const { data, error } = await supabase
    .from('admin_drafts')
    .select('data')
    .eq('user_id', userId)
    .eq('type', type)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`프롬프트 불러오기 실패: ${error.message}`);
  }

  return getPromptsFromDraftData(data?.data, normalize, defaults);
}

async function upsertPromptCollection(
  supabase: ReturnType<typeof createAdminClient>,
  userId: string,
  type: string,
  prompts: unknown[]
) {
  const { data: existingDraft, error: fetchError } = await supabase
    .from('admin_drafts')
    .select('id')
    .eq('user_id', userId)
    .eq('type', type)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (fetchError) {
    throw new Error(`프롬프트 확인 실패: ${fetchError.message}`);
  }

  const payload = buildAdminDraftPayload({ prompts });
  const query = existingDraft?.id
    ? supabase
        .from('admin_drafts')
        .update({ data: payload, updated_at: new Date().toISOString() })
        .eq('id', existingDraft.id)
        .eq('user_id', userId)
    : supabase.from('admin_drafts').insert({
        user_id: userId,
        type,
        data: payload,
      });

  const { error } = await query;

  if (error) {
    throw new Error(`프롬프트 저장 실패: ${error.message}`);
  }
}

function buildPlanDraftPrompt(plan: BlogContentPlanDetailRow, basePrompt: string) {
  const category = firstRelation(plan.blog_categories);

  return `${basePrompt}

Plan data:
- title: ${plan.title}
- description: ${plan.description}
- slug: ${plan.slug ?? ''}
- category.slug: ${category?.slug ?? ''}
- category.name: ${category?.name ?? ''}
- category.description: ${category?.description ?? ''}
- targetKeywords: ${(plan.target_keywords ?? []).join(', ') || 'none'}
- searchIntent: ${plan.search_intent ?? 'none'}
- contentAngle: ${plan.content_angle ?? 'none'}
- audience: ${plan.audience ?? 'English-speaking Spanish learners'}
- priority: ${plan.priority ?? 0}
- notes: ${plan.notes ?? 'none'}`;
}

function buildPlanJsonPrompt(plan: BlogContentPlanDetailRow, draftText: string, basePrompt: string) {
  const category = firstRelation(plan.blog_categories);

  return `${basePrompt}

Plan metadata:
{
  "slug": "${plan.slug ?? ''}",
  "title": "${plan.title}",
  "description": "${plan.description}",
  "category": {
    "slug": "${category?.slug ?? ''}",
    "name": "${category?.name ?? ''}",
    "description": "${category?.description ?? ''}"
  },
  "targetKeywords": ${JSON.stringify(plan.target_keywords ?? [])},
  "searchIntent": ${JSON.stringify(plan.search_intent ?? '')},
  "contentAngle": ${JSON.stringify(plan.content_angle ?? '')},
  "audience": ${JSON.stringify(plan.audience ?? '')}
}

Article draft:
${draftText}

Output schema:
{
  "slug": "spanish-example-post",
  "title": "Spanish Basics Beginners Can Use Every Day",
  "description": "Learn practical Spanish basics with clear examples, common mistakes, and a simple practice routine.",
  "tags": [
    { "slug": "spanish-beginner", "name": "Spanish beginner" }
  ],
  "image_url": "",
  "reading_minutes": 5,
  "status": "published",
  "seo_title": "Spanish Basics for Beginners",
  "seo_description": "Learn beginner-friendly Spanish basics with examples, common mistakes, and quick practice.",
  "og_image_url": "",
  "canonical_url": "/blog/spanish-example-post",
  "content": {
    "format": "markdown",
    "body": "## Spanish phrases you can use today\n\nParagraph content..."
  }
}`;
}

async function getPostPromptForGeneration(
  supabase: ReturnType<typeof createAdminClient>,
  userId: string,
  promptId: string
) {
  const prompts = await getPromptCollection(
    supabase,
    userId,
    BLOG_PLAN_POST_PROMPTS_TYPE,
    normalizePostPrompt,
    DEFAULT_BLOG_PLAN_POST_PROMPTS
  );
  const prompt = prompts.find((item) => item.id === promptId) ?? prompts[0];

  return {
    id: prompt.id,
    draftPrompt: prompt.draftPrompt,
    jsonPrompt: prompt.jsonPrompt,
  };
}

async function getCandidatePromptForGeneration(
  supabase: ReturnType<typeof createAdminClient>,
  userId: string,
  promptId: string
) {
  const prompts = await getPromptCollection(
    supabase,
    userId,
    BLOG_PLAN_CANDIDATE_PROMPTS_TYPE,
    normalizeCandidatePrompt,
    DEFAULT_BLOG_PLAN_CANDIDATE_PROMPTS
  );
  return prompts.find((item) => item.id === promptId) ?? prompts[0];
}

function formatContextItems(items: { title: string; slug: string | null; description: string }[]) {
  if (items.length === 0) {
    return 'none';
  }

  return items
    .map((item) => `- title: ${item.title}\n  slug: ${item.slug ?? 'none'}\n  description: ${item.description}`)
    .join('\n');
}

function buildPlanGenerationPrompt(input: {
  categoryName: string;
  categorySlug: string;
  categoryDescription: string | null;
  existingPosts: { title: string; slug: string | null; description: string }[];
  activePlans: { title: string; slug: string | null; description: string }[];
  candidateCount: number;
  seedKeywords: string[];
  excludedTopics: string;
  audience: string;
  direction: string;
  basePrompt: string;
}) {
  return `${input.basePrompt}

Number of proposals to generate: ${input.candidateCount}

Category:
- name: ${input.categoryName}
- slug: ${input.categorySlug}
- description: ${input.categoryDescription ?? 'none'}

Existing published/draft posts in the same category:
${formatContextItems(input.existingPosts)}

Active content plans in the same category:
${formatContextItems(input.activePlans)}

Operator requests:
- Keywords to include if useful: ${input.seedKeywords.length > 0 ? input.seedKeywords.join(', ') : 'none'}
- Topics/keywords to avoid: ${input.excludedTopics || 'none'}
- Target audience: ${input.audience || 'English-speaking beginner Spanish learners'}
- Content direction: ${input.direction || 'Focus on general Spanish learning topics with clear SEO search intent and practical learner usefulness. Do not make the topic about HolaLingo, the app, product features, pricing, reviews, or comparisons unless explicitly requested.'}

Output only a JSON object:
{
  "plans": [
    {
      "title": "Planning title in English",
      "description": "Planning description in English",
      "slug": "kebab-case-slug",
      "targetKeywords": ["keyword one", "keyword two", "keyword three"],
      "searchIntent": "Search intent in English",
      "contentAngle": "Content angle in English",
      "audience": "Target audience in English",
      "priority": 7,
      "notes": "Brief note explaining why this does not overlap with existing posts or active plans"
    }
  ]
}`;
}

export async function generateBlogPlanCandidatesAction(input: {
  categoryId: string;
  candidateCount: number;
  seedKeywords: string;
  excludedTopics: string;
  audience: string;
  direction: string;
  provider: WordGenerationProvider;
  promptId: string;
}): Promise<BlogPlanGenerationResult> {
  try {
    const user = await requireSuperAdmin();
    const categoryId = getString(input.categoryId);

    if (!categoryId) {
      return { success: false, error: '카테고리를 선택해 주세요.' };
    }

    const context = await getBlogPlanningContext(categoryId);

    if (!context) {
      return { success: false, error: '선택한 카테고리를 찾지 못했습니다.' };
    }

    const supabase = createAdminClient();
    const selectedPrompt = await getCandidatePromptForGeneration(supabase, user.id, getString(input.promptId));
    const candidateCount = Math.max(1, Math.min(8, Math.round(Number(input.candidateCount) || 3)));
    const prompt = buildPlanGenerationPrompt({
      categoryName: context.category.name,
      categorySlug: context.category.slug,
      categoryDescription: context.category.description,
      existingPosts: context.existingPosts,
      activePlans: context.activePlans,
      candidateCount,
      seedKeywords: normalizeKeywords(input.seedKeywords),
      excludedTopics: getString(input.excludedTopics),
      audience: getString(input.audience),
      direction: getString(input.direction),
      basePrompt: selectedPrompt.prompt,
    });
    const raw = await generateProviderJson(
      normalizeWordGenerationProvider(input.provider),
      prompt,
      'You are an SEO blog content strategist for general Spanish learning content. Generate planning proposals in English unless the user explicitly requests another language. Do not make the topic about HolaLingo, its app, product features, pricing, reviews, or comparisons unless explicitly requested. Output only a valid JSON object.'
    );
    const candidates = normalizeCandidates(raw);

    if (candidates.length === 0) {
      return { success: false, error: '저장 가능한 기획 후보가 생성되지 않았습니다.' };
    }

    return {
      success: true,
      candidates,
      contextSummary: {
        categoryName: context.category.name,
        postCount: context.existingPosts.length,
        activePlanCount: context.activePlans.length,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '기획 후보 생성 중 오류가 발생했습니다.',
    };
  }
}

export async function getBlogPlanPromptLibraryAction(): Promise<BlogPromptLibraryResult> {
  try {
    const user = await requireSuperAdmin();
    const supabase = createAdminClient();
    const [candidatePrompts, postPrompts] = await Promise.all([
      getPromptCollection(
        supabase,
        user.id,
        BLOG_PLAN_CANDIDATE_PROMPTS_TYPE,
        normalizeCandidatePrompt,
        DEFAULT_BLOG_PLAN_CANDIDATE_PROMPTS
      ),
      getPromptCollection(
        supabase,
        user.id,
        BLOG_PLAN_POST_PROMPTS_TYPE,
        normalizePostPrompt,
        DEFAULT_BLOG_PLAN_POST_PROMPTS
      ),
    ]);

    return {
      success: true,
      candidatePrompts,
      postPrompts,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '프롬프트를 불러오지 못했습니다.',
    };
  }
}

export async function saveBlogPlanCandidatePromptAction(input: {
  id?: string;
  title: string;
  prompt: string;
}): Promise<BlogPromptMutationResult> {
  try {
    const user = await requireSuperAdmin();
    const title = getString(input.title);
    const prompt = getString(input.prompt);

    if (!title || !prompt) {
      return { success: false, error: '프롬프트 제목과 내용을 입력해 주세요.' };
    }

    const supabase = createAdminClient();
    const prompts = await getPromptCollection(
      supabase,
      user.id,
      BLOG_PLAN_CANDIDATE_PROMPTS_TYPE,
      normalizeCandidatePrompt,
      DEFAULT_BLOG_PLAN_CANDIDATE_PROMPTS
    );
    const id = normalizePromptId(input.id ? getString(input.id) : title);
    const nextPrompt = { id, title, prompt };
    const nextPrompts = uniqueById([...prompts.filter((item) => item.id !== id), nextPrompt]);

    await upsertPromptCollection(supabase, user.id, BLOG_PLAN_CANDIDATE_PROMPTS_TYPE, nextPrompts);

    return { success: true, candidatePrompts: nextPrompts, selectedId: id };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '프롬프트를 저장하지 못했습니다.',
    };
  }
}

export async function deleteBlogPlanCandidatePromptAction(id: string): Promise<BlogPromptMutationResult> {
  try {
    const user = await requireSuperAdmin();
    const promptId = getString(id);

    if (!promptId) {
      return { success: false, error: '삭제할 프롬프트가 필요합니다.' };
    }

    const supabase = createAdminClient();
    const prompts = await getPromptCollection(
      supabase,
      user.id,
      BLOG_PLAN_CANDIDATE_PROMPTS_TYPE,
      normalizeCandidatePrompt,
      DEFAULT_BLOG_PLAN_CANDIDATE_PROMPTS
    );
    const nextPrompts = prompts.filter((prompt) => prompt.id !== promptId);

    if (nextPrompts.length === 0) {
      return { success: false, error: '프롬프트는 최소 1개 이상 필요합니다.' };
    }

    await upsertPromptCollection(supabase, user.id, BLOG_PLAN_CANDIDATE_PROMPTS_TYPE, nextPrompts);

    return { success: true, candidatePrompts: nextPrompts, selectedId: nextPrompts[0]?.id };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '프롬프트를 삭제하지 못했습니다.',
    };
  }
}

export async function saveBlogPlanPostPromptAction(input: {
  id?: string;
  title: string;
  draftPrompt: string;
  jsonPrompt: string;
}): Promise<BlogPromptMutationResult> {
  try {
    const user = await requireSuperAdmin();
    const title = getString(input.title);
    const draftPrompt = getString(input.draftPrompt);
    const jsonPrompt = getString(input.jsonPrompt);

    if (!title || !draftPrompt || !jsonPrompt) {
      return { success: false, error: '프롬프트 제목, 원고 프롬프트, JSON 변환 프롬프트를 모두 입력해 주세요.' };
    }

    const supabase = createAdminClient();
    const prompts = await getPromptCollection(
      supabase,
      user.id,
      BLOG_PLAN_POST_PROMPTS_TYPE,
      normalizePostPrompt,
      DEFAULT_BLOG_PLAN_POST_PROMPTS
    );
    const id = normalizePromptId(input.id ? getString(input.id) : title);
    const nextPrompt = { id, title, draftPrompt, jsonPrompt };
    const nextPrompts = uniqueById([...prompts.filter((item) => item.id !== id), nextPrompt]);

    await upsertPromptCollection(supabase, user.id, BLOG_PLAN_POST_PROMPTS_TYPE, nextPrompts);

    return { success: true, postPrompts: nextPrompts, selectedId: id };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '프롬프트를 저장하지 못했습니다.',
    };
  }
}

export async function deleteBlogPlanPostPromptAction(id: string): Promise<BlogPromptMutationResult> {
  try {
    const user = await requireSuperAdmin();
    const promptId = getString(id);

    if (!promptId) {
      return { success: false, error: '삭제할 프롬프트가 필요합니다.' };
    }

    const supabase = createAdminClient();
    const prompts = await getPromptCollection(
      supabase,
      user.id,
      BLOG_PLAN_POST_PROMPTS_TYPE,
      normalizePostPrompt,
      DEFAULT_BLOG_PLAN_POST_PROMPTS
    );
    const nextPrompts = prompts.filter((prompt) => prompt.id !== promptId);

    if (nextPrompts.length === 0) {
      return { success: false, error: '프롬프트는 최소 1개 이상 필요합니다.' };
    }

    await upsertPromptCollection(supabase, user.id, BLOG_PLAN_POST_PROMPTS_TYPE, nextPrompts);

    return { success: true, postPrompts: nextPrompts, selectedId: nextPrompts[0]?.id };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '프롬프트를 삭제하지 못했습니다.',
    };
  }
}

export async function saveBlogPlanCandidatesAction(input: {
  categoryId: string;
  candidates: BlogPlanCandidateInput[];
}): Promise<BlogPlanSaveResult> {
  try {
    const user = await requireSuperAdmin();
    const categoryId = getString(input.categoryId);

    if (!categoryId) {
      return { success: false, error: '카테고리를 선택해 주세요.' };
    }

    const candidates = input.candidates
      .map(normalizeCandidate)
      .filter((candidate): candidate is BlogPlanCandidate => Boolean(candidate));

    if (candidates.length === 0) {
      return { success: false, error: '저장할 기획 후보를 선택해 주세요.' };
    }

    const supabase = createAdminClient();
    const { data: category, error: categoryError } = await supabase
      .from('blog_categories')
      .select('id')
      .eq('id', categoryId)
      .maybeSingle();

    if (categoryError) {
      return { success: false, error: `카테고리 확인 실패: ${categoryError.message}` };
    }

    if (!category) {
      return { success: false, error: '선택한 카테고리를 찾지 못했습니다.' };
    }

    const candidateSlugs = candidates.map((candidate) => candidate.slug);
    const duplicateInputSlugs = findDuplicateValues(candidateSlugs);

    if (duplicateInputSlugs.length > 0) {
      return {
        success: false,
        error: `선택한 후보 안에 중복 slug가 있습니다: ${formatSlugList(duplicateInputSlugs)}`,
      };
    }

    const [{ data: existingPlans, error: plansError }, { data: existingPosts, error: postsError }] = await Promise.all([
      supabase
        .from('blog_content_plans')
        .select('slug')
        .in('slug', candidateSlugs),
      supabase
        .from('blog_posts')
        .select('slug')
        .in('slug', candidateSlugs),
    ]);

    if (plansError) {
      return { success: false, error: `기존 기획 slug 확인 실패: ${plansError.message}` };
    }

    if (postsError) {
      return { success: false, error: `기존 글 slug 확인 실패: ${postsError.message}` };
    }

    const planSlugs = ((existingPlans ?? []) as { slug: string | null }[])
      .map((plan) => plan.slug)
      .filter((slug): slug is string => Boolean(slug));
    const postSlugs = ((existingPosts ?? []) as { slug: string | null }[])
      .map((post) => post.slug)
      .filter((slug): slug is string => Boolean(slug));
    const conflictingSlugs = Array.from(new Set([...planSlugs, ...postSlugs]));

    if (conflictingSlugs.length > 0) {
      return {
        success: false,
        error: `이미 사용 중인 slug가 있습니다: ${formatSlugList(conflictingSlugs)}`,
      };
    }

    const { error } = await supabase.from('blog_content_plans').insert(
      candidates.map((candidate) => ({
        title: candidate.title,
        description: candidate.description,
        slug: candidate.slug,
        category_id: categoryId,
        target_keywords: candidate.targetKeywords,
        search_intent: candidate.searchIntent || null,
        content_angle: candidate.contentAngle || null,
        audience: candidate.audience || null,
        priority: candidate.priority,
        notes: candidate.notes || null,
        status: 'pending',
        created_by: user.id,
      }))
    );

    if (error) {
      return { success: false, error: `기획 저장 실패: ${error.message}` };
    }

    revalidatePath('/admin/blog/plans');

    return { success: true, count: candidates.length };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '기획 저장 중 오류가 발생했습니다.',
    };
  }
}

export async function generateBlogPostFromPlanAction(input: {
  planId: string;
  provider: WordGenerationProvider;
  promptId: string;
}): Promise<BlogPostFromPlanGenerationResult> {
  let rollbackStatus = 'pending';

  try {
    const user = await requireSuperAdmin();
    const planId = getString(input.planId);

    if (!planId) {
      return { success: false, error: '글을 생성할 기획을 선택해 주세요.' };
    }

    const supabase = createAdminClient();
    const { data: plan, error: planError } = await supabase
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
        priority,
        notes,
        status,
        blog_categories(slug, name, description)
      `)
      .eq('id', planId)
      .maybeSingle();

    if (planError) {
      return { success: false, error: `기획 조회 실패: ${planError.message}` };
    }

    if (!plan) {
      return { success: false, error: '기획을 찾지 못했습니다.' };
    }

    const normalizedPlan = plan as unknown as BlogContentPlanDetailRow;
    rollbackStatus = normalizedPlan.status === 'generating' ? 'pending' : normalizedPlan.status;

    if (normalizedPlan.status === 'published') {
      return { success: false, error: '이미 발행된 기획은 글을 다시 생성할 수 없습니다.' };
    }

    const provider = normalizeWordGenerationProvider(input.provider);
    const prompt = await getPostPromptForGeneration(supabase, user.id, getString(input.promptId));

    const { error: generatingError } = await supabase
      .from('blog_content_plans')
      .update({ status: 'generating' })
      .eq('id', planId);

    if (generatingError) {
      return { success: false, error: `생성 상태 저장 실패: ${generatingError.message}` };
    }

    const draftText = await generateProviderText(
      provider,
      buildPlanDraftPrompt(normalizedPlan, prompt.draftPrompt),
      'You are an expert Spanish learning blog editor for English-speaking learners. Do not output JSON. Write only a complete, publishable Markdown article in natural English.'
    );

    if (!draftText) {
      throw new Error('원고 생성 결과가 비어 있습니다.');
    }

    const generatedAt = new Date().toISOString();
    const { error: updateError } = await supabase
      .from('blog_content_plans')
      .update({
        status: 'pending',
        generated_payload: {
          draftText,
          provider,
          promptId: prompt.id,
          promptTypes: {
            candidate: BLOG_PLAN_CANDIDATE_PROMPTS_TYPE,
            post: BLOG_PLAN_POST_PROMPTS_TYPE,
          },
          generatedAt,
        },
        generated_at: generatedAt,
      })
      .eq('id', planId);

    if (updateError) {
      return { success: false, error: `생성 결과 저장 실패: ${updateError.message}` };
    }

    revalidatePath('/admin/blog/plans');

    return { success: true };
  } catch (error) {
    const supabase = createAdminClient();
    const planId = getString(input.planId);

    if (planId) {
      await supabase.from('blog_content_plans').update({ status: rollbackStatus }).eq('id', planId);
      revalidatePath('/admin/blog/plans');
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : '블로그 글 생성 중 오류가 발생했습니다.',
    };
  }
}

export async function generateBlogPostJsonFromPlanAction(input: {
  planId: string;
  provider: WordGenerationProvider;
  promptId: string;
}): Promise<BlogPostJsonFromPlanGenerationResult> {
  let rollbackStatus = 'pending';

  try {
    const user = await requireSuperAdmin();
    const planId = getString(input.planId);

    if (!planId) {
      return { success: false, error: 'JSON으로 변환할 기획을 선택해 주세요.' };
    }

    const supabase = createAdminClient();
    const { data: plan, error: planError } = await supabase
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
        priority,
        notes,
        status,
        generated_payload,
        blog_categories(slug, name, description)
      `)
      .eq('id', planId)
      .maybeSingle();

    if (planError) {
      return { success: false, error: `기획 조회 실패: ${planError.message}` };
    }

    if (!plan) {
      return { success: false, error: '기획을 찾지 못했습니다.' };
    }

    const normalizedPlan = plan as unknown as BlogContentPlanDetailRow & { generated_payload: unknown };
    rollbackStatus = normalizedPlan.status === 'generating' ? 'pending' : normalizedPlan.status;

    if (normalizedPlan.status === 'published') {
      return { success: false, error: '이미 발행된 기획은 JSON으로 변환할 수 없습니다.' };
    }

    if (!isRecord(normalizedPlan.generated_payload) || !getString(normalizedPlan.generated_payload.draftText)) {
      return { success: false, error: '먼저 Gen으로 글 원고를 생성해 주세요.' };
    }

    const provider = normalizeWordGenerationProvider(input.provider);
    const prompt = await getPostPromptForGeneration(supabase, user.id, getString(input.promptId));

    const { error: generatingError } = await supabase
      .from('blog_content_plans')
      .update({ status: 'generating' })
      .eq('id', planId);

    if (generatingError) {
      return { success: false, error: `변환 상태 저장 실패: ${generatingError.message}` };
    }

    const draftText = getString(normalizedPlan.generated_payload.draftText);
    const blogJson = await generateProviderJson(
      provider,
      buildPlanJsonPrompt(normalizedPlan, draftText, prompt.jsonPrompt),
      '너는 블로그 원고를 엄격한 JSON 스키마로 변환하는 편집자다. 반드시 유효한 JSON 객체만 출력한다.'
    );
    const generatedAt = new Date().toISOString();

    const { error: updateError } = await supabase
      .from('blog_content_plans')
      .update({
        status: 'ready',
        generated_payload: {
          ...normalizedPlan.generated_payload,
          blogJson,
          provider,
          promptId: prompt.id,
          jsonGeneratedAt: generatedAt,
        },
        generated_at: generatedAt,
      })
      .eq('id', planId);

    if (updateError) {
      return { success: false, error: `JSON 변환 결과 저장 실패: ${updateError.message}` };
    }

    revalidatePath('/admin/blog/plans');

    return { success: true };
  } catch (error) {
    const supabase = createAdminClient();
    const planId = getString(input.planId);

    if (planId) {
      await supabase.from('blog_content_plans').update({ status: rollbackStatus }).eq('id', planId);
      revalidatePath('/admin/blog/plans');
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : '블로그 글 JSON 변환 중 오류가 발생했습니다.',
    };
  }
}

export async function publishBlogPostFromPlanAction(planIdInput: string): Promise<BlogPostFromPlanPublishResult> {
  try {
    const user = await requireSuperAdmin();
    const planId = getString(planIdInput);

    if (!planId) {
      return { success: false, error: '발행할 기획을 선택해 주세요.' };
    }

    const supabase = createAdminClient();
    const { data: plan, error: planError } = await supabase
      .from('blog_content_plans')
      .select('id, status, category_id, generated_payload, linked_post_id')
      .eq('id', planId)
      .maybeSingle();

    if (planError) {
      return { success: false, error: `기획 조회 실패: ${planError.message}` };
    }

    if (!plan) {
      return { success: false, error: '기획을 찾지 못했습니다.' };
    }

    if (plan.linked_post_id || plan.status === 'published') {
      return { success: false, error: '이미 발행된 기획입니다.' };
    }

    if (plan.status !== 'ready') {
      return { success: false, error: 'Generate 완료 후 ready 상태의 기획만 발행할 수 있습니다.' };
    }

    const normalized = normalizeBlogPostInput(getBlogJsonFromGeneratedPayload(plan.generated_payload));
    const { data: existingPost, error: existingPostError } = await supabase
      .from('blog_posts')
      .select('id')
      .eq('slug', normalized.slug)
      .maybeSingle();

    if (existingPostError) {
      return { success: false, error: `기존 글 확인 실패: ${existingPostError.message}` };
    }

    if (existingPost) {
      return { success: false, error: `이미 같은 slug의 글이 있습니다: ${normalized.slug}` };
    }

    const categoryId = plan.category_id ?? (await upsertCategory(supabase, normalized.category));
    const publishedAt = new Date().toISOString();
    const { data: post, error: postError } = await supabase
      .from('blog_posts')
      .insert({
        slug: normalized.slug,
        title: normalized.title,
        description: normalized.description,
        content: normalized.content,
        status: 'published',
        published_at: publishedAt,
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

    try {
      await replacePostTags(supabase, post.id, normalized.tags);
    } catch (error) {
      await supabase.from('blog_posts').delete().eq('id', post.id);
      throw error;
    }

    const { error: updatePlanError } = await supabase
      .from('blog_content_plans')
      .update({
        status: 'published',
        linked_post_id: post.id,
        published_at: publishedAt,
      })
      .eq('id', planId);

    if (updatePlanError) {
      await supabase.from('blog_posts').delete().eq('id', post.id);
      return { success: false, error: `기획 연결 저장 실패: ${updatePlanError.message}` };
    }

    revalidatePath('/blog');
    revalidatePath(`/blog/${post.slug}`);
    revalidatePath('/admin/blog');
    revalidatePath('/admin/blog/plans');
    revalidatePath('/sitemap.xml');

    return { success: true, slug: post.slug };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '블로그 글 발행 중 오류가 발생했습니다.',
    };
  }
}

export async function deleteBlogContentPlanAction(planIdInput: string): Promise<BlogPlanDeleteResult> {
  try {
    await requireSuperAdmin();
    const planId = getString(planIdInput);

    if (!planId) {
      return { success: false, error: '삭제할 기획을 선택해 주세요.' };
    }

    const supabase = createAdminClient();
    const { data: plan, error: planError } = await supabase
      .from('blog_content_plans')
      .select('id, status, linked_post_id')
      .eq('id', planId)
      .maybeSingle();

    if (planError) {
      return { success: false, error: `기획 조회 실패: ${planError.message}` };
    }

    if (!plan) {
      return { success: false, error: '기획을 찾지 못했습니다.' };
    }

    if (plan.linked_post_id || plan.status === 'published') {
      return { success: false, error: '발행된 기획은 삭제할 수 없습니다.' };
    }

    const { error: deleteError } = await supabase
      .from('blog_content_plans')
      .delete()
      .eq('id', planId)
      .is('linked_post_id', null)
      .neq('status', 'published');

    if (deleteError) {
      return { success: false, error: `기획 삭제 실패: ${deleteError.message}` };
    }

    revalidatePath('/admin/blog/plans');

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '기획 삭제 중 오류가 발생했습니다.',
    };
  }
}
