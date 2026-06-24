import { NextRequest, NextResponse } from 'next/server';
import { getAppUserFromRequest } from '@/lib/auth/app-user';
import { isSuperAdmin } from '@/lib/auth/super-admin';
import {
  getWordsWithDistractors,
  listWordDistractors,
  updateReviewedWordDistractors,
  updateWord,
  getWordById,
} from '@/lib/supabase/services/words';
import { generateProviderJson, WordGenerationProvider } from '@/lib/generator';

const MAX_VERIFY_BATCH_SIZE = 10;
const MIN_DISTRACTOR_COUNT = 6;
const VERIFY_STATUSES = new Set(['valid', 'corrected', 'flagged']);
const ALLOWED_POS = new Set(['noun', 'verb', 'adj', 'adv', 'prep', 'conj', 'pron', 'det', 'interj']);
const POS_ALIASES: Record<string, string> = {
  noun: 'noun',
  n: 'noun',
  verb: 'verb',
  v: 'verb',
  adjective: 'adj',
  adj: 'adj',
  adverb: 'adv',
  adv: 'adv',
  preposition: 'prep',
  prep: 'prep',
  conjunction: 'conj',
  conj: 'conj',
  pronoun: 'pron',
  pron: 'pron',
  determiner: 'det',
  article: 'det',
  det: 'det',
  interjection: 'interj',
  interj: 'interj',
};
const ALLOWED_GENDERS = new Set(['m', 'f', 'mf']);

type JsonRecord = Record<string, unknown>;

interface VerifiedDistractor {
  id?: string | number;
  word: string;
  meaning_ko: string;
  meaning_en: string;
}

interface VerifiedWordData {
  word: string;
  pos: string[];
  meaning_ko: Record<string, string[]>;
  meaning_en: Record<string, string[]>;
  gender: string | null;
  difficulty: number;
  conjugations: JsonRecord;
  declensions: Record<string, string>;
  distractors: VerifiedDistractor[];
}

interface VerifiedAiResult {
  status: 'valid' | 'corrected' | 'flagged';
  reason: string;
  corrected_data: VerifiedWordData | null;
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requireNonEmptyString(value: unknown, path: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${path}는 비어 있지 않은 문자열이어야 합니다.`);
  }
  return value.trim();
}

function normalizePos(value: unknown, path: string): string {
  const rawValue = requireNonEmptyString(value, path).toLowerCase();
  const normalized = POS_ALIASES[rawValue];
  if (!normalized || !ALLOWED_POS.has(normalized)) {
    throw new Error(`${path}의 품사 "${rawValue}"는 허용되지 않습니다.`);
  }
  return normalized;
}

function normalizeGender(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'string') {
    throw new Error('corrected_data.gender는 "m", "f", "mf" 또는 null이어야 합니다.');
  }

  const rawValue = value.toLowerCase().trim();
  if (!rawValue || rawValue === 'null' || rawValue === 'none' || rawValue === 'n/a' || rawValue === 'na') {
    return null;
  }

  const aliases: Record<string, string> = {
    m: 'm',
    male: 'm',
    masculine: 'm',
    masculino: 'm',
    masc: 'm',
    f: 'f',
    female: 'f',
    feminine: 'f',
    femenino: 'f',
    fem: 'f',
    mf: 'mf',
    'm/f': 'mf',
    'm-f': 'mf',
    'm, f': 'mf',
    'm,f': 'mf',
    'masculine/feminine': 'mf',
    'masculine and feminine': 'mf',
    'masculino/femenino': 'mf',
  };
  const normalized = aliases[rawValue];
  if (!normalized || !ALLOWED_GENDERS.has(normalized)) {
    throw new Error('corrected_data.gender는 "m", "f", "mf" 또는 null이어야 합니다.');
  }

  return normalized;
}

function validateMeaningMap(value: unknown, path: string, pos: string[]): Record<string, string[]> {
  if (!isRecord(value)) {
    throw new Error(`${path}는 품사별 뜻 배열 객체여야 합니다.`);
  }

  const entries = Object.entries(value);
  if (entries.length === 0) {
    throw new Error(`${path}에는 하나 이상의 뜻이 필요합니다.`);
  }

  const result: Record<string, string[]> = {};
  for (const [key, meanings] of entries) {
    const normalizedKey = normalizePos(key, `${path}의 키`);

    const meaningList = typeof meanings === 'string' ? [meanings] : meanings;
    if (!Array.isArray(meaningList) || meaningList.length === 0) {
      throw new Error(`${path}.${key}는 비어 있지 않은 문자열 또는 문자열 배열이어야 합니다.`);
    }

    const normalizedMeanings = meaningList.map((meaning, index) =>
      requireNonEmptyString(meaning, `${path}.${key}[${index}]`)
    );
    result[normalizedKey] = Array.from(new Set([
      ...(result[normalizedKey] || []),
      ...normalizedMeanings,
    ]));
  }

  for (const posValue of pos) {
    if (!result[posValue]) {
      throw new Error(`${path}에 pos 항목 "${posValue}"의 뜻이 없습니다.`);
    }
  }

  return result;
}

function validateOptionalStringRecord(value: unknown, path: string): Record<string, string> {
  if (value === null || value === undefined) {
    return {};
  }
  if (!isRecord(value)) {
    throw new Error(`${path}는 객체여야 합니다.`);
  }

  const result: Record<string, string> = {};
  for (const [key, item] of Object.entries(value)) {
    if (item === null || item === undefined || (typeof item === 'string' && item.trim() === '')) {
      continue;
    }
    result[key] = requireNonEmptyString(item, `${path}.${key}`);
  }
  return result;
}

function validateOptionalRecord(value: unknown, path: string): JsonRecord {
  if (value === null || value === undefined) {
    return {};
  }
  if (!isRecord(value)) {
    throw new Error(`${path}는 객체여야 합니다.`);
  }
  return value;
}

function validateCorrectedData(
  value: unknown,
  sourceWord?: string,
  expectedDistractorCount?: number
): VerifiedWordData {
  if (!isRecord(value)) {
    throw new Error('corrected_data는 객체여야 합니다.');
  }

  const word = requireNonEmptyString(value.word, 'corrected_data.word');
  if (!Array.isArray(value.pos) || value.pos.length === 0) {
    throw new Error('corrected_data.pos는 하나 이상의 품사를 가진 배열이어야 합니다.');
  }
  const pos = value.pos.map((item, index) => {
    return normalizePos(item, `corrected_data.pos[${index}]`);
  });
  if (new Set(pos).size !== pos.length) {
    throw new Error('corrected_data.pos에 중복 품사가 있습니다.');
  }

  const gender = normalizeGender(value.gender);

  if (!Number.isInteger(value.difficulty) || Number(value.difficulty) < 1 || Number(value.difficulty) > 7) {
    throw new Error('corrected_data.difficulty는 1~7 사이의 정수여야 합니다.');
  }
  if (!Array.isArray(value.distractors) || value.distractors.length < MIN_DISTRACTOR_COUNT) {
    throw new Error(`corrected_data.distractors는 최소 ${MIN_DISTRACTOR_COUNT}개 이상이어야 합니다.`);
  }
  if (
    expectedDistractorCount !== undefined &&
    value.distractors.length !== expectedDistractorCount
  ) {
    throw new Error(`corrected_data.distractors는 최종 오답 ${expectedDistractorCount}개 전체를 반환해야 합니다.`);
  }

  const forbiddenWords = new Set(
    [sourceWord, word]
      .filter((item): item is string => typeof item === 'string')
      .map((item) => item.trim().toLocaleLowerCase())
  );
  const seenDistractors = new Set<string>();
  const distractors = value.distractors.map((item, index) => {
    if (!isRecord(item)) {
      throw new Error(`corrected_data.distractors[${index}]는 객체여야 합니다.`);
    }
    if (
      item.id !== undefined &&
      typeof item.id !== 'string' &&
      typeof item.id !== 'number'
    ) {
      throw new Error(`corrected_data.distractors[${index}].id 형식이 올바르지 않습니다.`);
    }

    const distractorWord = requireNonEmptyString(item.word, `corrected_data.distractors[${index}].word`);
    const normalizedWord = distractorWord.toLocaleLowerCase();
    if (forbiddenWords.has(normalizedWord)) {
      throw new Error(`corrected_data.distractors[${index}]가 원본 또는 교정 단어와 같습니다.`);
    }
    if (seenDistractors.has(normalizedWord)) {
      throw new Error(`corrected_data.distractors에 중복 단어 "${distractorWord}"가 있습니다.`);
    }
    seenDistractors.add(normalizedWord);

    return {
      ...(item.id !== undefined ? { id: item.id } : {}),
      word: distractorWord,
      meaning_ko: requireNonEmptyString(item.meaning_ko, `corrected_data.distractors[${index}].meaning_ko`),
      meaning_en: requireNonEmptyString(item.meaning_en, `corrected_data.distractors[${index}].meaning_en`),
    };
  });

  return {
    word,
    pos,
    meaning_ko: validateMeaningMap(value.meaning_ko, 'corrected_data.meaning_ko', pos),
    meaning_en: validateMeaningMap(value.meaning_en, 'corrected_data.meaning_en', pos),
    gender,
    difficulty: Number(value.difficulty),
    conjugations: validateOptionalRecord(value.conjugations, 'corrected_data.conjugations'),
    declensions: validateOptionalStringRecord(value.declensions, 'corrected_data.declensions'),
    distractors,
  };
}

function validateAiResult(
  value: unknown,
  sourceWord: string,
  expectedDistractorCount: number,
  requiresCorrectedData: boolean
): VerifiedAiResult {
  if (!isRecord(value) || typeof value.status !== 'string' || !VERIFY_STATUSES.has(value.status)) {
    throw new Error('status는 "valid", "corrected", "flagged" 중 하나여야 합니다.');
  }

  const status = value.status as VerifiedAiResult['status'];
  const reason = requireNonEmptyString(value.reason, 'reason');
  const correctedData = value.corrected_data === null || value.corrected_data === undefined
    ? null
    : validateCorrectedData(value.corrected_data, sourceWord, expectedDistractorCount);

  if ((status === 'corrected' || requiresCorrectedData) && correctedData === null) {
    throw new Error('오답 생성 또는 교정이 필요한 경우 corrected_data가 필요합니다.');
  }

  return {
    status: correctedData ? 'corrected' : status,
    reason,
    corrected_data: correctedData,
  };
}

// POST: AI 단어 및 오답 스캔 검수 결과 생성
export async function POST(request: NextRequest) {
  try {
    const user = await getAppUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }

    const isAdminUser = await isSuperAdmin({ userId: user.id, email: user.email ?? null });
    if (!isAdminUser) {
      return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
    }

    const { wordIds } = await request.json();
    if (!Array.isArray(wordIds) || wordIds.length === 0) {
      return NextResponse.json({ error: '검수할 단어 ID 배열이 유효하지 않습니다.' }, { status: 400 });
    }
    if (wordIds.length > MAX_VERIFY_BATCH_SIZE) {
      return NextResponse.json(
        { error: `검수 단위는 최대 ${MAX_VERIFY_BATCH_SIZE}개입니다.` },
        { status: 400 }
      );
    }
    if (wordIds.some((id) => !Number.isInteger(Number(id)) || Number(id) <= 0)) {
      return NextResponse.json({ error: '검수할 단어 ID는 양의 정수여야 합니다.' }, { status: 400 });
    }

    // 1. 단어 정보 및 연결된 혼동 어휘 데이터 조회
    const words = await getWordsWithDistractors(wordIds);
    if (words.length === 0) {
      return NextResponse.json({ error: '검수 대상 단어를 찾을 수 없습니다.' }, { status: 404 });
    }

    // 2. 사용할 AI Provider 선정 (Gemini를 기본으로 활용하되, 다른 키도 대비)
    const provider: WordGenerationProvider = process.env.GEMINI_API_KEY ? 'gemini' : 'deepseek';

    // 3. 각 단어별 병렬 LLM 검수 호출
    const results = await Promise.all(
      words.map(async (word) => {
        try {
          const originalDistractors = Array.isArray(word.words_distractor) ? word.words_distractor : [];
          const targetDistractorCount = Math.max(originalDistractors.length, MIN_DISTRACTOR_COUNT);
          const missingDistractorCount = targetDistractorCount - originalDistractors.length;
          const prompt = `
당신은 스페인어 사전 편집자 및 어학 퀴즈 검수 전문가입니다.
제시된 단어 본체 정보와 연결된 모든 혼동 어휘(오답) 데이터를 퀴즈 적합성 기준에 맞춰 검수 및 교정하십시오.
기존 오답이 ${MIN_DISTRACTOR_COUNT}개 미만이면 부족한 수만큼 새 오답을 생성하여 총 ${MIN_DISTRACTOR_COUNT}개 이상을 보장하십시오.

[단어 및 오답 데이터]
${JSON.stringify({
  id: word.id,
  word: word.word,
  lang_code: word.lang_code,
  pos: word.pos,
  meaning_ko: word.meaning_ko,
  meaning_en: word.meaning_en,
  gender: word.gender,
  difficulty: word.difficulty || 1,
  declensions: word.declensions,
  conjugations: word.conjugations,
  distractors: originalDistractors.map((d: any) => ({
    id: d.id,
    word: d.distractor,
    meaning_ko: d.meaning_ko,
    meaning_en: d.meaning_en
  }))
}, null, 2)}

[검수 및 교정 지침]
1. 단어 본체 검수:
   - 철자(spelling) 오류가 있는지 확인하고, 필요시 수정하십시오.
   - 품사(pos)는 반드시 "noun", "verb", "adj", "adv", "prep", "conj", "pron", "det", "interj" 중 하나를 사용하고, 뜻(meaning_ko, meaning_en)의 품사 키도 동일한 축약형으로 맞추십시오.
   - 뜻에서 원어(스페인어)는 제거하고 순수한 번역어(KO/EN)만 남기십시오.
   - 명사/형용사의 성별(gender) 및 성수 변화(declensions), 동사의 시제 변화(conjugations) 오류를 수정하십시오.
   - 해당하지 않는 declensions 변화형은 빈 문자열이나 null로 채우지 말고 해당 키를 생략하십시오.
   - 동사가 아니거나 활용 정보가 없으면 conjugations는 빈 객체 {}로 반환하십시오.
   - 단어의 인지도 및 사용 빈도를 고려하여 CEFR 레벨 난이도(difficulty)의 타당성을 평가하십시오. (1: Beginner/입문, 2: A1, 3: A2, 4: B1, 5: B2, 6: C1, 7: C2). 현재 지정된 난이도가 너무 낮거나 높은 경우, 적절한 정수 값(1~7 사이)으로 제안하십시오.
2. 오답(distractors) 검수 (퀴즈 유효성):
   - 입력된 기존 오답 ${originalDistractors.length}개 전체를 빠짐없이 검수하십시오.
   - 반환하는 distractors 배열은 반드시 ${targetDistractorCount}개여야 합니다.
   - ${missingDistractorCount > 0
     ? `기존 오답이 ${MIN_DISTRACTOR_COUNT}개 미만이므로 새 오답을 ${missingDistractorCount}개 생성하고, 새 항목의 id는 빈 문자열 ""로 반환하십시오.`
     : `기존 오답이 이미 ${MIN_DISTRACTOR_COUNT}개 이상이므로 새 오답을 추가하지 말고 기존 ${originalDistractors.length}개 전체만 검수하십시오.`}
   - 매력적인 오답은 원본 단어와 같은 의미 영역, 같은 카테고리, 연상 관계, 반의어 관계, 상황상 함께 쓰이는 단어일 수 있습니다. 이런 "관련 있지만 뜻은 다른" 오답은 유지하거나 선호하십시오.
   - 교체해야 하는 경우는 오답이 원본 단어의 정답으로도 인정될 수 있을 정도의 동의어/준동의어이거나, meaning_ko/meaning_en이 원본 뜻과 실질적으로 겹쳐 복수 정답 시비가 생기는 경우로 제한하십시오.
   - 단순히 의미가 가깝다, 같은 주제다, 함께 떠오른다는 이유만으로 오답을 교체하지 마십시오.
   - 오답 단어가 실제 스페인어 단어인지, 원형 또는 적절한 활용형인지 확인하십시오.
   - 오답이 비어 있거나 중복되거나 원본 단어와 똑같지 않게 하십시오.
   - 오류가 발견된 오답은 다른 적절한 스페인어 오답 단어와 뜻으로 수정/대체하되, 최종 오답 개수는 ${targetDistractorCount}개로 맞추십시오.
3. 최종 판정 (status):
   - 오류가 전혀 없고 완벽하면 status를 "valid"로 하십시오.
   - 하나라도 수정 사항(난이도 포함 단어 정보, 뜻, 오답 리스트 등)이 있으면 status를 "corrected"로 하십시오.
   - 심각한 문제가 있어 수동 확인이 필요하다면 status를 "flagged"로 하십시오.

인사말이나 설명 없이 반드시 아래 JSON 포맷으로만 응답하십시오:
{
  "status": "valid" | "corrected" | "flagged",
  "reason": "검수 결과에 대한 간략한 요약 설명 (수정된 사항 기술)",
  "corrected_data": {
    "word": "원형 단어",
    "pos": ["품사"],
    "meaning_ko": { "품사": ["뜻"] },
    "meaning_en": { "품사": ["뜻"] },
    "gender": "m 또는 f 또는 mf, 성별이 없으면 문자열이 아닌 JSON null",
    "difficulty": 1 | 2 | 3 | 4 | 5 | 6 | 7,
    "conjugations": { ... },
    "declensions": { ... },
    "distractors": [
      { "id": "기존 오답 ID (새로 대체한 경우 빈 문자열)", "word": "오답 단어", "meaning_ko": "한국어 뜻", "meaning_en": "영어 뜻" }
    ]
  }
}
`;

          const rawAiResult = await generateProviderJson(
            provider,
            prompt,
            "스페인어 교육 및 사전 편집자로서 JSON 형식으로만 응답하세요."
          );
          const aiResult = validateAiResult(
            rawAiResult,
            word.word,
            targetDistractorCount,
            missingDistractorCount > 0
          );

          return {
            id: word.id,
            status: aiResult.status,
            reason: aiResult.reason,
            original_data: {
              word: word.word,
              pos: word.pos,
              meaning_ko: word.meaning_ko,
              meaning_en: word.meaning_en,
              gender: word.gender,
              declensions: word.declensions,
              conjugations: word.conjugations,
              difficulty: word.difficulty || 1,
              distractors: originalDistractors.map((d: any) => ({
                id: d.id,
                word: d.distractor,
                meaning_ko: d.meaning_ko,
                meaning_en: d.meaning_en
              }))
            },
            corrected_data: aiResult.corrected_data
          };
        } catch (err: any) {
          console.error(`단어 검수 중 오류 발생 (ID: ${word.id}):`, err);
          return {
            id: word.id,
            status: 'flagged',
            reason: `AI 검수 호출 실패: ${err.message || String(err)}`,
            original_data: {
              word: word.word,
              pos: word.pos,
              meaning_ko: word.meaning_ko,
              meaning_en: word.meaning_en,
              gender: word.gender,
              declensions: word.declensions,
              conjugations: word.conjugations,
              difficulty: word.difficulty || 1,
              distractors: (word.words_distractor || []).map((d: any) => ({
                id: d.id,
                word: d.distractor,
                meaning_ko: d.meaning_ko,
                meaning_en: d.meaning_en
              }))
            },
            corrected_data: null
          };
        }
      })
    );

    return NextResponse.json({ results });

  } catch (error: any) {
    console.error('AI 검수 API 오류:', error);
    return NextResponse.json({ error: error.message || '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

// PUT: 개별 단어의 검수 결과 결정 반영 (승인완료 / 반려완료 / 미완료 등)
export async function PUT(request: NextRequest) {
  try {
    const user = await getAppUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }

    const isAdminUser = await isSuperAdmin({ userId: user.id, email: user.email ?? null });
    if (!isAdminUser) {
      return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
    }

    const { wordId, action, wordData, distractors } = await request.json();
    if (!wordId) {
      return NextResponse.json({ error: '단어 ID는 필수입니다.' }, { status: 400 });
    }

    const targetId = Number(wordId);
    if (!Number.isInteger(targetId) || targetId <= 0) {
      return NextResponse.json({ error: '단어 ID는 양의 정수여야 합니다.' }, { status: 400 });
    }

    if (action === 'approve' || action === 'confirm') {
      let validatedWordData: VerifiedWordData | null = null;
      if (wordData !== undefined || distractors !== undefined) {
        const existingDistractors = await listWordDistractors(targetId);
        const targetDistractorCount = Math.max(existingDistractors.length, MIN_DISTRACTOR_COUNT);
        validatedWordData = validateCorrectedData(
          { ...wordData, distractors },
          typeof wordData?.word === 'string' ? wordData.word : undefined,
          targetDistractorCount
        );
      }

      // 1. 단어 정보 업데이트
      if (validatedWordData) {
        await updateWord(targetId, {
          word: validatedWordData.word,
          pos: validatedWordData.pos,
          meaning_ko: validatedWordData.meaning_ko,
          meaning_en: validatedWordData.meaning_en,
          gender: validatedWordData.gender,
          declensions: validatedWordData.declensions,
          conjugations: validatedWordData.conjugations,
          difficulty: validatedWordData.difficulty,
          isVerified: true
        });
      } else {
        await updateWord(targetId, { isVerified: true });
      }

      // 2. 오답(distractors) 리스트 업데이트 (교정안이 존재하거나 새로 덮어쓸 경우)
      if (validatedWordData) {
        await updateReviewedWordDistractors(targetId, validatedWordData.distractors);
      }
    } else if (action === 'reject') {
      // 반려완료: 기존 데이터 유지하고 검수 상태만 완료(true) 처리
      await updateWord(targetId, { isVerified: true });
    } else if (action === 'incomplete' || action === 'hold') {
      // 미완료: 데이터 변경 없이 검수 미완료(false) 유지
      await updateWord(targetId, { isVerified: false });
    } else {
      return NextResponse.json({ error: '올바르지 않은 검수 조치(action)입니다.' }, { status: 400 });
    }

    // 최신 상태 단어 조회하여 반환
    const updatedWord = await getWordById(targetId);

    return NextResponse.json({ success: true, word: updatedWord });

  } catch (error: any) {
    console.error('검수 결과 저장 API 오류:', error);
    return NextResponse.json({ error: error.message || '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
