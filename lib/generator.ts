import { GoogleGenerativeAI } from '@google/generative-ai';

const OPENAI_RESPONSES_API_URL = 'https://api.openai.com/v1/responses';
const OPENAI_MODEL = process.env.CHATGPT_MODEL || 'gpt-4.1-mini';
const DEEPSEEK_CHAT_API_URL = 'https://api.deepseek.com/chat/completions';
const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-chat';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

export type WordGenerationProvider = 'deepseek' | 'chatgpt' | 'gemini';

export function normalizeWordGenerationProvider(value: unknown): WordGenerationProvider {
  return value === 'chatgpt' || value === 'gemini' ? value : 'deepseek';
}

/**
 * 단어 정보 생성을 위한 인터페이스 정의
 */
export interface WordInfo {
  word: string;
  pos: string[];
  meaning_ko: Record<string, string[] | string>;
  meaning_en: Record<string, string[] | string>;
  gender: 'm' | 'f' | 'mf' | null;
  conjugations?: {
    pres?: Record<string, string>;
    pret?: Record<string, string>;
    impf?: Record<string, string>;
    futr?: Record<string, string>;
    cond?: Record<string, string>;
    perf?: Record<string, string>;
  };
  declensions?: {
    ms?: string;
    mp?: string;
    fs?: string;
    fp?: string;
  };
  error?: string;
}

export interface SentenceWordCandidate {
  surface: string;
  lemma: string;
  pos?: string[];
}

export interface SentenceWordExtractionResult {
  index: number;
  words: SentenceWordCandidate[];
  excludedWords: string[];
}

export interface WordInfoGenerationContext {
  surface?: string;
  expectedPos?: string[];
}

function normalizePosValues(values: unknown[]) {
  const aliases: Record<string, string> = {
    adjective: 'adj',
    adjetivo: 'adj',
    noun: 'noun',
    sustantivo: 'noun',
    nombre: 'noun',
    verb: 'verb',
    verbo: 'verb',
    adverb: 'adv',
    adverbio: 'adv',
  };

  return values
    .map(pos => aliases[String(pos).toLowerCase().trim()] || String(pos).toLowerCase().trim())
    .filter(Boolean);
}

function inferExpectedPosFromSurface(lemma: string, surface?: string) {
  const normalizedLemma = lemma.toLowerCase().trim();
  const normalizedSurface = surface?.toLowerCase().trim();

  if (!normalizedSurface || normalizedLemma === normalizedSurface) {
    return [];
  }

  if (
    normalizedLemma.endsWith('o') &&
    (
      normalizedSurface === `${normalizedLemma.slice(0, -1)}a` ||
      normalizedSurface === `${normalizedLemma}s` ||
      normalizedSurface === `${normalizedLemma.slice(0, -1)}as`
    )
  ) {
    return ['adj'];
  }

  return [];
}

function stripJsonCodeFence(text: string) {
  const trimmed = text.trim();

  if (trimmed.startsWith('```json')) {
    return trimmed.slice(7, trimmed.endsWith('```') ? -3 : undefined).trim();
  }

  if (trimmed.startsWith('```')) {
    return trimmed.slice(3, trimmed.endsWith('```') ? -3 : undefined).trim();
  }

  return trimmed;
}

function extractOpenAIResponseText(responseJson: any) {
  if (typeof responseJson.output_text === 'string') {
    return responseJson.output_text;
  }

  for (const item of responseJson.output || []) {
    for (const content of item.content || []) {
      if (typeof content.text === 'string') {
        return content.text;
      }
    }
  }

  throw new Error('OpenAI API 응답에서 텍스트 출력을 찾을 수 없습니다.');
}

function parseJsonText(text: string, providerName: string) {
  const trimmed = stripJsonCodeFence(text);

  try {
    return JSON.parse(trimmed);
  } catch {
    const objectStart = trimmed.indexOf('{');
    const objectEnd = trimmed.lastIndexOf('}');
    if (objectStart !== -1 && objectEnd > objectStart) {
      try {
        return JSON.parse(trimmed.slice(objectStart, objectEnd + 1));
      } catch {
        // Fall through to the clearer error below.
      }
    }

    const snippet = trimmed.slice(0, 120);
    throw new Error(`${providerName} API가 JSON이 아닌 응답을 반환했습니다: ${snippet}`);
  }
}

function isRetryableOpenAIError(message: string) {
  const lower = message.toLowerCase();
  return (
    lower.includes('upstream') ||
    lower.includes('temporarily unavailable') ||
    lower.includes('timeout') ||
    lower.includes('502') ||
    lower.includes('503') ||
    lower.includes('504')
  );
}

async function generateChatGptJson(prompt: string, systemInstruction: string) {
  const apiKey = process.env.CHATGPT_API_KEY;

  if (!apiKey) {
    throw new Error('CHATGPT_API_KEY is not set in environment variables.');
  }

  let lastError: unknown;

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
    const response = await fetch(OPENAI_RESPONSES_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        instructions: systemInstruction,
        input: prompt,
        text: {
          format: { type: 'json_object' },
        },
      }),
    });

    const responseJson = await response.json();

    if (!response.ok) {
      const message = responseJson?.error?.message || response.statusText;
      throw new Error(`OpenAI API error: ${response.status} ${message}`);
    }

      return parseJsonText(extractOpenAIResponseText(responseJson), 'ChatGPT');
    } catch (error: any) {
      lastError = error;
      const message = String(error?.message || error);

      if (attempt === 0 && isRetryableOpenAIError(message)) {
        continue;
      }

      break;
    }
  }

  try {
    throw lastError;
  } catch (error: any) {
    const message = String(error?.message || error);

    if (message.includes('401')) {
      throw new Error('OpenAI API 인증에 실패했습니다. CHATGPT_API_KEY 값을 확인해주세요.');
    }

    if (message.includes('429')) {
      throw new Error('OpenAI API 요청 한도 또는 결제 한도에 도달했습니다. 사용량/결제 상태를 확인하거나 잠시 후 다시 시도해주세요.');
    }

    if (isRetryableOpenAIError(message)) {
      throw new Error('OpenAI API가 일시적으로 불안정한 응답을 반환했습니다. 잠시 후 다시 시도해주세요.');
    }

    throw error;
  }
}

function extractChatCompletionText(responseJson: any, providerName: string) {
  const text = responseJson?.choices?.[0]?.message?.content;
  if (typeof text === 'string') {
    return text;
  }

  throw new Error(`${providerName} API 응답에서 텍스트 출력을 찾을 수 없습니다.`);
}

async function generateDeepseekJson(prompt: string, systemInstruction: string) {
  const apiKey = process.env.DEEPSEEK_API_KEY;

  if (!apiKey) {
    throw new Error('DEEPSEEK_API_KEY is not set in environment variables.');
  }

  const response = await fetch(DEEPSEEK_CHAT_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: DEEPSEEK_MODEL,
      messages: [
        { role: 'system', content: systemInstruction },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
      stream: false,
    }),
  });

  const responseJson = await response.json();

  if (!response.ok) {
    const message = responseJson?.error?.message || response.statusText;
    throw new Error(`DeepSeek API error: ${response.status} ${message}`);
  }

  return parseJsonText(extractChatCompletionText(responseJson, 'DeepSeek'), 'DeepSeek');
}

async function generateGeminiJson(prompt: string, systemInstruction: string) {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not set in environment variables.');
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: GEMINI_MODEL,
    systemInstruction,
  });
  const result = await model.generateContent(prompt);
  const text = result.response.text();

  return parseJsonText(text, 'Gemini');
}

async function generateProviderJson(
  providerValue: WordGenerationProvider,
  prompt: string,
  systemInstruction: string
) {
  const provider = normalizeWordGenerationProvider(providerValue);

  if (provider === 'chatgpt') {
    return generateChatGptJson(prompt, systemInstruction);
  }

  if (provider === 'gemini') {
    return generateGeminiJson(prompt, systemInstruction);
  }

  return generateDeepseekJson(prompt, systemInstruction);
}

/**
 * OpenAI API를 사용하여 단어 정보를 생성합니다.
 * @param word 분석할 스페인어 단어
 * @returns 생성된 단어 정보 객체
 */
export async function generateWordInfoDeepseek(
  word: string,
  context: WordInfoGenerationContext = {},
  provider: WordGenerationProvider = 'deepseek'
): Promise<WordInfo> {
  const surface = context.surface?.trim();
  const expectedPos = Array.from(new Set([
    ...(Array.isArray(context.expectedPos) ? normalizePosValues(context.expectedPos) : []),
    ...inferExpectedPosFromSurface(word, surface),
  ]));
  const prompt = `
당신은 스페인어 전문가입니다. 단어 '${word}'에 대한 데이터를 JSON으로 생성하세요.
${surface ? `문장에 실제 나온 형태(surface): '${surface}'` : ''}
${expectedPos.length > 0 ? `문장 내 품사 후보(expectedPos): ${JSON.stringify(expectedPos)}` : ''}

### [출력 스키마]
{
  "word": "원형",
  "pos": ["품사"],
  "meaning_ko": { "품사": "한국어 뜻" },
  "meaning_en": { "품사": "영어 뜻" },
  "gender": "m/f/mf/null",
  "conjugations": {
    "pres": { "s1": "...", "s2": "...", "s3": "...", "p1": "...", "p2": "...", "p3": "..." },
    "pret": { "s1": "...", "s2": "...", "s3": "...", "p1": "...", "p2": "...", "p3": "..." },
    "impf": { "s1": "...", "s2": "...", "s3": "...", "p1": "...", "p2": "...", "p3": "..." },
    "futr": { "s1": "...", "s2": "...", "s3": "...", "p1": "...", "p2": "...", "p3": "..." },
    "cond": { "s1": "...", "s2": "...", "s3": "...", "p1": "...", "p2": "...", "p3": "..." },
    "perf": { "s1": "...", "s2": "...", "s3": "...", "p1": "...", "p2": "...", "p3": "..." }
  },
  "declensions": { "ms": "...", "mp": "...", "fs": "...", "fp": "..." }
}

### [지침]
1. 뜻은 한국어/영어를 함께 작성하되, 해당 필드에 원본 단어(스페인어)를 포함하지 마세요.
2. meaning_en에는 순수한 영어 번역만, meaning_ko에는 순수한 한국어 번역만 작성하세요.
3. pos 값은 반드시 다음 중 하나 이상만 사용하세요: "noun", "verb", "adj", "adv", "prep", "conj", "pron", "det", "interj".
4. 하나의 lemma가 여러 품사로 자연스럽게 쓰이면 pos 배열에 주요 품사를 함께 포함하세요.
5. expectedPos는 문장 속 쓰임에 대한 참고 정보입니다. 해당 품사가 자연스러운 경우 pos 배열 앞쪽에 배치하세요.
6. meaning_ko와 meaning_en은 pos 배열의 각 품사를 키로 모두 작성하세요.
7. 명사의 성별 정보는 pos에 넣지 말고 gender에 넣으세요.
8. 동사인 경우 conjugations에 6개 시제 변화를 포함합니다.
9. 명사/형용사인 경우 declensions에 성수 변화를 포함합니다.
`;

  try {
    const rawData = await generateProviderJson(
      provider,
      prompt,
      "스페인어 교육 전문가로서 JSON 형식으로만 응답하세요."
    );

    // 데이터 정규화 (Normalization)
    if (rawData.conjugations && typeof rawData.conjugations === 'object') {
      const normalizedConjugations: any = {};
      for (const tense of Object.keys(rawData.conjugations)) {
        normalizedConjugations[tense] = normalizeConjugations(rawData.conjugations[tense]);
      }
      rawData.conjugations = normalizedConjugations;
    }

    // declensions 정규화
    if (rawData.declensions && typeof rawData.declensions === 'object') {
      const isEmpty = Object.values(rawData.declensions).every(v => v === "" || v === null);
      if (isEmpty) {
        rawData.declensions = {};
      }
    }

    return rawData as WordInfo;
  } catch (error) {
    console.error(`Error generating word info for ${word}:`, error);
    return {
      word,
      pos: [],
      meaning_ko: {},
      meaning_en: {},
      gender: null,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

export async function generateSentenceWordCandidatesDeepseek(
  items: { index: number; sentence: string; translation?: string; translation_en?: string }[],
  provider: WordGenerationProvider = 'deepseek'
): Promise<SentenceWordExtractionResult[]> {
  const prompt = `
당신은 스페인어 형태소 분석 및 어휘 선별 전문가입니다.
아래 스페인어 문장들에서 학습 가치가 있는 주요 단어를 추출하고, 각 단어의 사전 기본형(lemma)을 찾으세요.

### [입력]
${JSON.stringify(items, null, 2)}

### [출력 스키마]
반드시 아래 JSON 객체 형식으로만 응답하세요.
{
  "results": [
    {
      "index": 0,
      "words": [
        { "surface": "문장에 실제 나온 형태", "lemma": "사전 기본형", "pos": ["품사"] }
      ],
      "excludedWords": ["제외한 관사/전치사/대명사/기초 불용어"]
    }
  ]
}

### [지침]
1. lemma는 words 테이블의 word 컬럼과 비교할 수 있게 소문자 기본형으로 작성하세요.
2. 동사는 부정사 기본형으로 작성하세요. 예: tienes -> tener, fui -> ir 또는 ser 중 문맥상 맞는 것.
3. 명사/형용사는 남성 단수 기본형을 우선 작성하세요. 예: trabajos -> trabajo, pasados -> pasado.
4. 다중 단어 표현은 하나의 word로 넣지 말고, 학습 가치가 있는 개별 단어로 분리하세요.
5. 관사, 전치사, 접속사, 대명사, 소유형, 사람이름처럼 단독 학습 가치가 낮은 단어는 excludedWords에 넣으세요.
6. pos 값은 "noun", "verb", "adj", "adv", "prep", "conj", "pron", "det", "interj" 중에서 고르세요. 성별은 pos에 넣지 마세요.
7. 중복 lemma는 같은 문장 안에서 한 번만 포함하되 surface는 대표 사용형을 유지하세요.
8. 인사말이나 설명 없이 JSON만 반환하세요.
`;

  const rawData = await generateProviderJson(
    provider,
    prompt,
    "스페인어 형태소 분석 전문가로서 JSON 형식으로만 응답하세요."
  );
  const results = Array.isArray(rawData.results) ? rawData.results : [];

  return results.map((row: any) => {
    const seen = new Set<string>();
    const words = Array.isArray(row.words) ? row.words : [];

    return {
      index: Number(row.index),
      words: words
        .map((word: any) => ({
          surface: String(word.surface || '').trim().toLowerCase(),
          lemma: String(word.lemma || '').trim().toLowerCase(),
          pos: Array.isArray(word.pos) ? word.pos.map((pos: unknown) => String(pos)) : undefined,
        }))
        .filter((word: SentenceWordCandidate) => {
          if (!word.surface || !word.lemma || seen.has(word.lemma)) {
            return false;
          }

          seen.add(word.lemma);
          return true;
        }),
      excludedWords: Array.isArray(row.excludedWords)
        ? row.excludedWords.map((word: unknown) => String(word).trim()).filter(Boolean)
        : [],
    };
  }).filter((row: SentenceWordExtractionResult) => Number.isInteger(row.index));
}

/**
 * 다양한 형태의 동사 변화 응답을 표준 {s1, s2, s3, p1, p2, p3} 형식으로 변환합니다.
 */
function normalizeConjugations(val: any): Record<string, string> {
  const keys = ['s1', 's2', 's3', 'p1', 'p2', 'p3'];
  const result: Record<string, string> = {};

  if (Array.isArray(val)) {
    // [s1, s2, s3, p1, p2, p3] 또는 [[s1, s2, s3], [p1, p2, p3]] 형태인 경우
    const flat = val.flat();
    keys.forEach((key, i) => {
      result[key] = flat[i] || "";
    });
  } else if (typeof val === 'object' && val !== null) {
    // 객체인 경우 (이미 s1~p3거나 yo~ustedes인 경우 대응)
    const personMap: Record<string, string> = {
      'yo': 's1', 'tú': 's2', 'tu': 's2', 'él': 's3', 'el': 's3', 'ella': 's3', 'usted': 's3',
      'nosotros': 'p1', 'nosotras': 'p1', 'vosotros': 'p2', 'vosotras': 'p2',
      'ellos': 'p3', 'ellas': 'p3', 'ustedes': 'p3'
    };

    Object.entries(val).forEach(([k, v]) => {
      const normalizedKey = personMap[k.toLowerCase()] || k.toLowerCase();
      if (keys.includes(normalizedKey)) {
        result[normalizedKey] = String(v);
      }
    });
  } else if (typeof val === 'string') {
    // "como, comes, come..." 형태인 경우
    const parts = val.split(',').map(s => s.trim());
    keys.forEach((key, i) => {
      result[key] = parts[i] || "";
    });
  }

  // 누락된 키 보정
  keys.forEach(k => { if (!result[k]) result[k] = ""; });

  // 만약 모든 값이 비어있다면 빈 객체 반환
  if (Object.values(result).every(v => v === "")) {
    return {};
  }

  return result;
}

/**
 * 헷갈릴 만한 유사 단어(Distractors)를 생성합니다.
 * @param word 기준 단어
 * @param count 생성할 개수 (기본 6개)
 */
export async function generateDistractorsDeepseek(word: string, count: number = 6): Promise<any[]> {
  const prompt = `
당신은 스페인어 교육 전문가입니다. 학습자가 제시된 단어 '${word}'의 뜻을 맞히는 퀴즈를 풀 때, 헷갈릴 만한 유사 단어(Distractors) ${count}개를 생성해야 합니다.

유사 단어 선정 기준:
1. '${word}'와 철자가 유사하여 시각적으로 혼동을 주는 단어
2. '${word}'와 의미가 비슷하여 개념적으로 혼동을 주는 단어(유의어)

출력 형식:
반드시 다음 구조의 JSON 리스트 형식으로만 출력하세요.
[
  {"word": "유사단어1", "meaning_ko": "한국어 뜻", "meaning_en": "영어 뜻"},
  ...
]

주의사항:
- 뜻은 한국어(meaning_ko)와 영어(meaning_en)로 각각 작성하세요.
- 제시된 원래 단어 '${word}'는 절대로 결과 리스트에 포함하지 마세요. 오직 유사 단어만 생성하세요.
- 인사말이나 설명 없이 오직 JSON 데이터만 반환하세요.
`;

  try {
    const data = await generateProviderJson(
      'deepseek',
      prompt,
      "스페인어 교육 전문가로서 JSON 형식으로만 응답하세요."
    );
    
    let distractorsList: any[] = [];
    if (Array.isArray(data)) {
      distractorsList = data;
    } else if (typeof data === 'object' && data !== null) {
      const list = Object.values(data).find(val => Array.isArray(val));
      if (list) distractorsList = list as any[];
    }

    // 원본 단어와 동일한 단어가 포함된 경우 필터링
    const normalizedWord = word.toLowerCase().trim();
    return distractorsList.filter(d => 
      d.word && d.word.toLowerCase().trim() !== normalizedWord
    );
  } catch (error) {
    console.error(`Error generating distractors for ${word}:`, error);
    return [];
  }
}
