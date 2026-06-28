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

export const DEFAULT_BLOG_PLAN_CANDIDATE_PROMPT = `HolaLingo 블로그의 신규 콘텐츠 기획안을 생성하세요.

기획 방향:
- 한국어 사용자를 위한 스페인어 학습 블로그 주제를 제안합니다.
- 기존 글과 활성 기획안의 title, slug, description과 주제/검색 의도가 겹치지 않게 생성합니다.
- 같은 카테고리 안에서 더 구체적인 하위 주제, 다른 상황, 다른 학습 단계, 다른 검색 의도를 선택합니다.
- SEO 검색 유입과 앱 학습 전환을 함께 고려합니다.
- title과 description은 한국어로 작성합니다.
- slug는 영문 소문자 kebab-case, 숫자와 하이픈만 사용합니다.
- targetKeywords는 3~6개입니다.
- priority는 0~10 정수로 작성합니다.
- notes에는 왜 기존 글과 겹치지 않는지 짧게 작성합니다.
- JSON 객체만 출력합니다.`;

export const DEFAULT_BLOG_PLAN_DRAFT_PROMPT = `Plan 데이터를 바탕으로 한국어 사용자를 위한 스페인어 학습 블로그 원고를 작성하세요.

작성 방향:
- 검색 유입을 고려하되, 실제 학습자가 바로 써먹을 수 있는 설명과 예문을 우선합니다.
- 얕은 개요가 아니라 학습 순서, 자주 틀리는 점, 실제 스페인어 예문을 포함합니다.
- 한국어 설명은 친절하고 자연스럽게 쓰고, 스페인어 표현에는 가능하면 바로 뒤에 한국어 뜻을 붙입니다.
- 기존 글이나 기획과 같은 검색 의도를 반복하지 말고 plan의 angle과 notes를 살려 차별화합니다.
- 최종 원고는 제목, 도입, 본문 섹션, 마무리 CTA를 포함한 완성된 글 형태로 작성합니다.
- JSON을 출력하지 말고 원고 본문만 출력합니다.`;

export const DEFAULT_BLOG_PLAN_JSON_PROMPT = `아래 원고를 HolaLingo 블로그 JSON 스키마로 변환하세요.

변환 규칙:
- 원고의 의미를 유지하되, blog_posts 저장용 JSON 객체만 출력합니다.
- slug는 plan slug를 우선 사용하고, 영문 소문자 kebab-case를 유지합니다.
- category는 plan의 category.slug, category.name, category.description을 그대로 사용합니다.
- title은 한국어 기준 공백 포함 22~45자 권장입니다.
- description은 블로그 카드와 상세 상단에 보이는 독자 친화 요약으로 작성합니다.
- seoTitle은 검색 결과에 자연스럽게 보이도록 25~55자 권장입니다.
- seoDescription은 검색 결과 노출을 고려한 메타 설명으로 작성합니다.
- tags는 4~8개이며 slug는 영문 소문자 kebab-case로 작성합니다.
- imageUrl과 ogImageUrl은 빈 문자열로 둡니다.
- status는 "published"로 둡니다.
- canonicalUrl은 반드시 "/blog/{slug}" 형식입니다.
- content.intro는 2~3문장입니다.
- content.sections는 4~5개 권장입니다.
- 각 section.heading은 구체적인 실행 팁이 드러나게 작성합니다.
- 각 section.body는 정확히 2개 문단 문자열 배열입니다.
- cta.href는 "/learn", "/bundles", "/learn/review/words" 중 하나를 사용합니다.
- JSON 객체 외의 설명, markdown 코드블록, 주석, trailing comma는 출력하지 않습니다.`;

export const DEFAULT_BLOG_PLAN_CANDIDATE_PROMPTS: BlogPlanCandidatePrompt[] = [
  {
    id: 'standard-plan',
    title: '표준 기획 생성',
    prompt: DEFAULT_BLOG_PLAN_CANDIDATE_PROMPT,
  },
  {
    id: 'seo-longtail-plan',
    title: '롱테일 SEO 기획',
    prompt: `${DEFAULT_BLOG_PLAN_CANDIDATE_PROMPT}

추가 방향:
- 검색 의도가 좁고 명확한 롱테일 키워드 중심으로 기획합니다.
- 초보자가 실제로 검색할 법한 구체적인 문제, 상황, 질문을 제목에 반영합니다.
- 기존 글과 비슷한 넓은 주제라면 더 좁은 상황형 하위 주제로 쪼갭니다.`,
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
