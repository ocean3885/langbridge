"use server";

import { GoogleGenerativeAI } from '@google/generative-ai';

type GeneratedPair = {
  original: string;
  translation: string;
};

function stripCodeFence(input: string): string {
  return input
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
}

function parseJsonPairs(text: string, limit: number): GeneratedPair[] {
  const normalized = stripCodeFence(text);
  const parsed = JSON.parse(normalized) as unknown;
  if (!Array.isArray(parsed)) return [];

  const pairs: GeneratedPair[] = [];
  for (const item of parsed) {
    if (!item || typeof item !== 'object') continue;
    const original = (item as { original?: unknown }).original;
    const translation = (item as { translation?: unknown }).translation;

    if (typeof original === 'string' && typeof translation === 'string') {
      const o = original.trim();
      const t = translation.trim();
      if (o && t) {
        pairs.push({ original: o, translation: t });
      }
    }

    if (pairs.length >= limit) break;
  }

  return pairs;
}

function parseLinePairs(text: string, limit: number): GeneratedPair[] {
  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const pairs: GeneratedPair[] = [];

  for (const line of lines) {
    const noBullet = line.replace(/^[-*•\d.)\s]+/, '').trim();

    const separators = ['|', ' - ', ' — ', '\t'];
    let original = '';
    let translation = '';

    for (const separator of separators) {
      if (!noBullet.includes(separator)) continue;
      const [left, ...rest] = noBullet.split(separator);
      if (left && rest.length > 0) {
        original = left.trim();
        translation = rest.join(separator).trim();
        break;
      }
    }

    if (!original || !translation) continue;

    pairs.push({ original, translation });
    if (pairs.length >= limit) break;
  }

  return pairs;
}

export async function generateSentencesAction(formData: FormData) {
  const keyword = formData.get('keyword') as string;
  const requestedCount = parseInt(formData.get('count') as string) || 5;
  const count = Math.max(1, Math.min(20, requestedCount));
  const languageCode = formData.get('language_code') as string || 'es-ES';

  if (!keyword || !keyword.trim()) {
    throw new Error('단어 또는 구문을 입력해주세요.');
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY 환경 변수가 설정되지 않았습니다.');
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  // 언어 코드에서 언어명 추출 (es-ES -> Spanish, ko-KR -> Korean 등)
  const langMap: Record<string, string> = {
    'es-ES': 'Spanish',
    'es-MX': 'Spanish (Mexico)',
    'en-US': 'English',
    'en-GB': 'English (UK)',
    'fr-FR': 'French',
    'de-DE': 'German',
    'it-IT': 'Italian',
    'pt-BR': 'Portuguese (Brazil)',
    'ja-JP': 'Japanese',
    'zh-CN': 'Chinese (Mandarin)',
    'ko-KR': 'Korean',
  };

  const targetLang = langMap[languageCode] || 'Spanish';

  const prompt = `Generate exactly ${count} simple sentences in ${targetLang} that use the word or phrase "${keyword}".

Requirements:
- Each sentence should be natural and commonly used in daily conversation
- Sentences should be at beginner to intermediate level
- Each sentence must contain the keyword "${keyword}"
- For EACH sentence, provide the ${targetLang} sentence AND its Korean translation
- Return ONLY a JSON array
- Each item must be: {"original":"...","translation":"..."}
- Do NOT include markdown code fences
- Do NOT include numbering, explanations, or extra text

Output example:
[{"original":"...","translation":"..."}]`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();

    let pairs = parseJsonPairs(text, count);
    if (pairs.length === 0) {
      pairs = parseLinePairs(text, count);
    }

    if (pairs.length === 0) {
      console.error('Gemini 응답 파싱 실패:', {
        preview: text.slice(0, 300),
      });
      throw new Error('문장 생성 결과를 해석하지 못했습니다. 다시 시도해주세요.');
    }

    // 원문과 번역을 번갈아 배치
    const sentences: string[] = [];
    for (const pair of pairs) {
      sentences.push(pair.original);
      sentences.push(pair.translation);
    }

    return { sentences };
  } catch (error) {
    console.error('Gemini API 오류:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('AI 문장 생성 중 오류가 발생했습니다.');
  }
}
