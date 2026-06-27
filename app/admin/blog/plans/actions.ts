'use server';

import { revalidatePath } from 'next/cache';
import { getAppUserFromServer } from '@/lib/auth/app-user';
import { isSuperAdmin } from '@/lib/auth/super-admin';
import { generateProviderJson, normalizeWordGenerationProvider } from '@/lib/generator';
import type { WordGenerationProvider } from '@/lib/generator';
import { createAdminClient } from '@/lib/supabase/admin';
import { getBlogPlanningContext } from '@/lib/supabase/services/blog-content-plans';

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

type BlogPlanSaveResult = {
  success: boolean;
  count?: number;
  error?: string;
};

type BlogPlanCandidateInput = Partial<BlogPlanCandidate>;

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

function formatContextItems(items: { title: string; slug: string | null; description: string }[]) {
  if (items.length === 0) {
    return '없음';
  }

  return items
    .map((item) => `- title: ${item.title}\n  slug: ${item.slug ?? '없음'}\n  description: ${item.description}`)
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
}) {
  return `HolaLingo 블로그의 신규 콘텐츠 기획안을 ${input.candidateCount}개 생성해줘.

카테고리:
- name: ${input.categoryName}
- slug: ${input.categorySlug}
- description: ${input.categoryDescription ?? '없음'}

같은 카테고리의 기존 발행/초안 글:
${formatContextItems(input.existingPosts)}

같은 카테고리의 활성 기획안:
${formatContextItems(input.activePlans)}

운영자 요청:
- 포함하면 좋은 키워드: ${input.seedKeywords.length > 0 ? input.seedKeywords.join(', ') : '없음'}
- 제외할 주제/키워드: ${input.excludedTopics || '없음'}
- 대상 독자: ${input.audience || '한국어를 사용하는 스페인어 초급 학습자'}
- 콘텐츠 방향: ${input.direction || 'SEO 검색 유입과 앱 학습 전환을 함께 고려'}

기획 규칙:
- 기존 글과 활성 기획안의 title, slug, description과 주제/검색 의도가 겹치지 않게 생성
- 같은 카테고리 안에서 더 구체적인 하위 주제, 다른 상황, 다른 학습 단계, 다른 검색 의도를 선택
- slug는 영문 소문자 kebab-case, 숫자와 하이픈만 사용
- title과 description은 한국어로 작성
- targetKeywords는 3~6개
- priority는 0~10 정수로 작성
- notes에는 왜 기존 글과 겹치지 않는지 짧게 작성

출력은 JSON 객체만 사용:
{
  "plans": [
    {
      "title": "기획 제목",
      "description": "기획 설명",
      "slug": "kebab-case-slug",
      "targetKeywords": ["키워드1", "키워드2", "키워드3"],
      "searchIntent": "검색 의도",
      "contentAngle": "콘텐츠 관점",
      "audience": "대상 독자",
      "priority": 7,
      "notes": "중복 회피 메모"
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
}): Promise<BlogPlanGenerationResult> {
  try {
    await requireSuperAdmin();
    const categoryId = getString(input.categoryId);

    if (!categoryId) {
      return { success: false, error: '카테고리를 선택해 주세요.' };
    }

    const context = await getBlogPlanningContext(categoryId);

    if (!context) {
      return { success: false, error: '선택한 카테고리를 찾지 못했습니다.' };
    }

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
    });
    const raw = await generateProviderJson(
      normalizeWordGenerationProvider(input.provider),
      prompt,
      '너는 한국어 사용자를 위한 스페인어 학습 SEO 블로그 콘텐츠 전략가다. 반드시 유효한 JSON 객체만 출력한다.'
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
