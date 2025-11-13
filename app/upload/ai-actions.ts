"use server";

import { GoogleGenerativeAI } from '@google/generative-ai';

export async function generateSentencesAction(formData: FormData) {
  const keyword = formData.get('keyword') as string;
  const count = parseInt(formData.get('count') as string) || 5;
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
- Format: [${targetLang} sentence]|[Korean translation]
- Return ONLY the sentences in this format, one pair per line
- Do NOT include any numbering, explanations, or extra text

Example output format:
[${targetLang} sentence with keyword]|[한국어 번역]
[${targetLang} sentence with keyword]|[한국어 번역]
[${targetLang} sentence with keyword]|[한국어 번역]`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    
    // 문장을 파싱하여 원문과 번역을 분리
    const lines = text
      .split('\n')
      .map(s => s.trim())
      .filter(s => s && s.includes('|'))
      .slice(0, count);

    if (lines.length === 0) {
      throw new Error('문장 생성에 실패했습니다. 다시 시도해주세요.');
    }

    // 원문과 번역을 번갈아 배치
    const sentences: string[] = [];
    for (const line of lines) {
      const [original, translation] = line.split('|').map(s => s.trim());
      if (original && translation) {
        sentences.push(original);
        sentences.push(translation);
      }
    }

    return { sentences };
  } catch (error) {
    console.error('Gemini API 오류:', error);
    throw new Error('AI 문장 생성 중 오류가 발생했습니다.');
  }
}
