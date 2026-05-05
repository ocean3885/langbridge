/**
 * DeepSeek API를 사용하여 단어 정보를 생성하는 유틸리티
 */

const DEEPSEEK_API_URL = "https://api.deepseek.com/chat/completions";

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

/**
 * DEEPSEEK API를 사용하여 단어 정보를 생성합니다.
 * @param word 분석할 스페인어 단어
 * @returns 생성된 단어 정보 객체
 */
export async function generateWordInfoDeepseek(word: string): Promise<WordInfo> {
  const apiKey = process.env.DEEPSEEK_API_KEY;

  if (!apiKey) {
    console.error("DEEPSEEK_API_KEY is not set in environment variables.");
    return {
      word,
      pos: [],
      meaning_ko: {},
      meaning_en: {},
      gender: null,
      error: "API key is missing"
    };
  }

  const prompt = `
당신은 스페인어 전문가입니다. 단어 '${word}'에 대한 데이터를 JSON으로 생성하세요.

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
3. 동사인 경우 conjugations에 6개 시제 변화를 포함합니다.
4. 명사/형용사인 경우 declensions에 성수 변화를 포함합니다.
`;

  try {
    const response = await fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          { role: "system", content: "스페인어 교육 전문가로서 JSON 형식으로만 응답하세요." },
          { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" },
        stream: false
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API error: ${response.status} ${errorText}`);
    }

    const result = await response.json();
    const rawData = JSON.parse(result.choices[0].message.content);

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
