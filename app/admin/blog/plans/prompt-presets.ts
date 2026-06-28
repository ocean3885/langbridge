export const BLOG_PLAN_CANDIDATE_PROMPTS_TYPE = 'blog_plan_candidate_prompts';
export const BLOG_PLAN_POST_PROMPTS_TYPE = 'blog_plan_post_prompts';

export type BlogPlanCandidatePrompt = {
  id: string;
  title: string;
  prompt: string;
};

export type BlogPlanPostPrompt = {
  id: string;
  title: string;
  draftPrompt: string;
  jsonPrompt: string;
};

export type BlogPostPromptPreset = {
  id: string;
  label: string;
  description: string;
  draftPrompt: string;
  jsonPrompt: string;
};

export const DEFAULT_BLOG_PLAN_CANDIDATE_PROMPT = `Generate a new Spanish learning blog content planning proposal.

Planning direction:
- Suggest Spanish learning blog topics for English-speaking learners.
- Focus on general Spanish learning topics, not on HolaLingo itself.
- Do not generate topics about HolaLingo, the app, product features, pricing, reviews, or comparisons unless explicitly requested.
- Avoid overlap with the title, slug, description, topic, and search intent of existing posts and active content plans.
- Within the same category, choose a more specific subtopic, a different learning situation, a different learner level, or a different search intent.
- Consider SEO search traffic and learner usefulness.
- Write title, description, searchIntent, contentAngle, audience, and notes in English.
- slug must use lowercase English kebab-case only, with letters, numbers, and hyphens.
- targetKeywords must include 3-6 English keywords.
- priority must be an integer from 0 to 10.
- In notes, briefly explain why this proposal does not overlap with existing posts or active plans.
- Output only a JSON object.`;

export const DEFAULT_BLOG_PLAN_DRAFT_PROMPT = `Write a complete Spanish learning blog article for English-speaking learners based on the given Plan data.

Writing direction:
- Prioritize practical learning value over shallow SEO content.
- Explain Spanish expressions and grammar clearly in natural English.
- Include a natural learning order, common mistakes, and practical Spanish examples with English meanings.
- Use the plan's angle and notes to make the article distinct from existing articles or planned topics.
- Write a complete publishable Markdown article with headings, examples, lists, tables, and a closing CTA when useful.
- Do not output JSON. Output only the final article body in Markdown.`;

export const DEFAULT_BLOG_PLAN_JSON_PROMPT = `Convert the article below into the HolaLingo blog JSON schema.

Conversion rules:
- Preserve the article meaning and output only one JSON object for blog_posts storage.
- Use the plan slug first, keeping it lowercase kebab-case.
- Write title, description, seo_title, seo_description, tag names, and content.body in English.
- seo_title should read naturally in search results, ideally 25-55 characters.
- seo_description should be a clear search-friendly meta description.
- tags must include 4-8 items, and tag slugs must be lowercase kebab-case.
- Set image_url and og_image_url to empty strings.
- Set status to "published".
- canonical_url must use "/blog/{slug}".
- content must be { "format": "markdown", "body": "..." }.
- content.body must contain the full Markdown article body.
- Do not output explanations, markdown code fences, comments, or trailing commas.`;

export const DEFAULT_BLOG_PLAN_CANDIDATE_PROMPTS: BlogPlanCandidatePrompt[] = [
  {
    id: 'standard-plan',
    title: 'Standard plan generation',
    prompt: DEFAULT_BLOG_PLAN_CANDIDATE_PROMPT,
  },
  {
    id: 'seo-longtail-plan',
    title: 'Long-tail SEO plan',
    prompt: `${DEFAULT_BLOG_PLAN_CANDIDATE_PROMPT}

Additional direction:
- Focus on long-tail keywords with narrow and clear search intent.
- Reflect specific problems, situations, or questions that beginner learners would realistically search for.
- If a topic is broadly similar to an existing post, narrow it into a more specific situational subtopic.`,
  },
];

export const BLOG_POST_PROMPT_PRESETS: BlogPostPromptPreset[] = [
  {
    id: 'standard-seo',
    label: '표준 SEO 글',
    description: '검색 유입과 학습 실용성을 균형 있게 반영합니다.',
    draftPrompt: DEFAULT_BLOG_PLAN_DRAFT_PROMPT,
    jsonPrompt: DEFAULT_BLOG_PLAN_JSON_PROMPT,
  },
  {
    id: 'beginner-friendly',
    label: '초보자 친화형',
    description: '쉬운 설명, 반복 예문, 학습 순서 중심으로 작성합니다.',
    draftPrompt: `${DEFAULT_BLOG_PLAN_DRAFT_PROMPT}

추가 방향:
- 스페인어를 막 시작한 독자가 이해할 수 있도록 어려운 문법 용어를 풀어서 설명합니다.
- 예문은 짧고 반복하기 쉬운 문장 위주로 구성합니다.
- 각 섹션마다 "무엇부터 하면 되는지"가 분명하게 드러나야 합니다.`,
    jsonPrompt: DEFAULT_BLOG_PLAN_JSON_PROMPT,
  },
  {
    id: 'conversation-practical',
    label: '회화 실전형',
    description: '상황별 대화 예문과 실제 사용법 중심으로 작성합니다.',
    draftPrompt: `${DEFAULT_BLOG_PLAN_DRAFT_PROMPT}

추가 방향:
- 실제 대화에서 바로 쓸 수 있는 짧은 문장과 상황별 변형을 충분히 포함합니다.
- 비슷한 표현의 뉘앙스 차이를 설명합니다.
- 학습자가 소리 내어 따라 말할 수 있도록 자연스러운 회화 흐름을 만듭니다.`,
    jsonPrompt: DEFAULT_BLOG_PLAN_JSON_PROMPT,
  },
  {
    id: 'grammar-guide',
    label: '문법 설명형',
    description: '규칙, 예외, 자주 틀리는 포인트를 차분하게 정리합니다.',
    draftPrompt: `${DEFAULT_BLOG_PLAN_DRAFT_PROMPT}

추가 방향:
- 문법 구조를 단계별로 설명하되 과도하게 학술적으로 쓰지 않습니다.
- 규칙과 예외를 구분하고, 초보자가 자주 틀리는 포인트를 분명히 짚습니다.
- 예문은 문법 포인트가 잘 보이는 문장으로 구성합니다.`,
    jsonPrompt: DEFAULT_BLOG_PLAN_JSON_PROMPT,
  },
];

export const DEFAULT_BLOG_PLAN_POST_PROMPTS: BlogPlanPostPrompt[] = BLOG_POST_PROMPT_PRESETS.map((preset) => ({
  id: preset.id,
  title: preset.label,
  draftPrompt: preset.draftPrompt,
  jsonPrompt: preset.jsonPrompt,
}));
