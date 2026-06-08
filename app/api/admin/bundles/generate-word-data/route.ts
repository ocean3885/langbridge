import { NextRequest, NextResponse } from 'next/server';
import { getAppUserFromRequest } from '@/lib/auth/app-user';
import { isSuperAdmin } from '@/lib/auth/super-admin';
import {
  generateSentenceWordCandidatesDeepseek,
  generateWordInfoDeepseek,
  normalizeWordGenerationProvider,
  WordInfo
} from '@/lib/generator';
import { createAdminClient } from '@/lib/supabase/admin';

type BundleWordDataItem = {
  index: number;
  sentence: string;
  translation?: string;
  translation_en?: string;
};

type WordJsonEntry = {
  word: string;
  pos: string[];
  meaning_ko: Record<string, any>;
  meaning_en: Record<string, any>;
  gender: string | null;
  conjugations: Record<string, any> | null;
  declensions: Record<string, any>;
};

const EXCLUDED_LEMMAS = new Set([
  'yo',
  'tú',
  'tu',
  'él',
  'el',
  'ella',
  'ello',
  'ellos',
  'ellas',
  'usted',
  'ustedes',
  'nosotros',
  'nosotras',
  'vosotros',
  'vosotras',
  'me',
  'te',
  'se',
  'nos',
  'os',
  'mi',
  'mis',
  'tu',
  'tus',
  'su',
  'sus',
  'nuestro',
  'nuestra',
  'nuestros',
  'nuestras',
  'vuestro',
  'vuestra',
  'vuestros',
  'vuestras',
]);

const COMMON_PERSON_NAMES = new Set([
  'ana',
  'carlos',
  'carmen',
  'daniel',
  'david',
  'diego',
  'elena',
  'francisco',
  'javier',
  'josé',
  'jose',
  'juan',
  'laura',
  'lucía',
  'lucia',
  'luis',
  'maría',
  'maria',
  'miguel',
  'pablo',
  'pedro',
  'sofia',
  'sofía',
]);

function normalizeWord(value: unknown) {
  return String(value || '').trim().toLowerCase();
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function isCapitalizedNameCandidate(surface: string, sentence: string) {
  if (!surface || surface.length < 2) return false;

  const escaped = escapeRegExp(surface);
  const pattern = new RegExp(`(^|[^\\p{L}])${escaped}([^\\p{L}]|$)`, 'iu');
  const match = pattern.exec(sentence);
  if (!match) return false;

  const matchedText = match[0].replace(/^[^\p{L}]+|[^\p{L}]+$/gu, '');
  const startsAtSentenceBeginning = match.index === 0 || !/[^\s¿¡"'([{]/.test(sentence.slice(0, match.index));
  if (startsAtSentenceBeginning && !COMMON_PERSON_NAMES.has(normalizeWord(matchedText))) {
    return false;
  }

  return /^[A-ZÁÉÍÓÚÜÑ][a-záéíóúüñ]+$/.test(matchedText);
}

function isSingleWordCandidate(value: string) {
  return /^[a-záéíóúüñ]+$/i.test(value);
}

function filterExcludedCandidates(
  result: Awaited<ReturnType<typeof generateSentenceWordCandidatesDeepseek>>[number],
  sentence: string
) {
  const excluded = new Set(result.excludedWords || []);
  const words = result.words.filter((word) => {
    const surface = normalizeWord(word.surface);
    const lemma = normalizeWord(word.lemma);
    const shouldExclude =
      !isSingleWordCandidate(surface) ||
      !isSingleWordCandidate(lemma) ||
      EXCLUDED_LEMMAS.has(surface) ||
      EXCLUDED_LEMMAS.has(lemma) ||
      COMMON_PERSON_NAMES.has(surface) ||
      COMMON_PERSON_NAMES.has(lemma) ||
      isCapitalizedNameCandidate(word.surface, sentence);

    if (shouldExclude) {
      excluded.add(word.surface || word.lemma);
      return false;
    }

    return true;
  });

  return {
    ...result,
    words,
    excludedWords: Array.from(excluded).filter(Boolean),
  };
}

function toWordJsonEntry(wordInfo: any, fallbackLemma: string): WordJsonEntry {
  return {
    word: normalizeWord(wordInfo?.word || fallbackLemma),
    pos: Array.isArray(wordInfo?.pos) ? wordInfo.pos : [],
    meaning_ko: wordInfo?.meaning_ko && typeof wordInfo.meaning_ko === 'object' ? wordInfo.meaning_ko : {},
    meaning_en: wordInfo?.meaning_en && typeof wordInfo.meaning_en === 'object' ? wordInfo.meaning_en : {},
    gender: typeof wordInfo?.gender === 'string' ? wordInfo.gender : null,
    conjugations: wordInfo?.conjugations && typeof wordInfo.conjugations === 'object' ? wordInfo.conjugations : null,
    declensions: wordInfo?.declensions && typeof wordInfo.declensions === 'object' ? wordInfo.declensions : {},
  };
}

async function fetchExistingWords(lemmas: string[], langCode: string) {
  if (lemmas.length === 0) {
    return new Map<string, any>();
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('words')
    .select('*')
    .eq('lang_code', langCode)
    .in('word', lemmas);

  if (error) {
    throw new Error(`기존 단어 조회 실패: ${error.message}`);
  }

  return new Map((data || []).map((row: any) => [normalizeWord(row.word), row]));
}

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

    const body = await request.json();
    const items = Array.isArray(body.items) ? body.items as BundleWordDataItem[] : [];
    const langCode = typeof body.langCode === 'string' ? body.langCode : 'es';
    const modelProvider = normalizeWordGenerationProvider(body.modelProvider);

    const validItems = items
      .map((item) => ({
        index: Number(item.index),
        sentence: String(item.sentence || '').trim(),
        translation: item.translation,
        translation_en: item.translation_en,
      }))
      .filter((item) => Number.isInteger(item.index) && item.sentence);

    if (validItems.length === 0) {
      return NextResponse.json({ error: '분석할 문장이 없습니다.' }, { status: 400 });
    }

    const rawExtractionResults = await generateSentenceWordCandidatesDeepseek(validItems, modelProvider);
    const sentenceByIndex = new Map(validItems.map((item) => [item.index, item.sentence]));
    const extractionResults = rawExtractionResults.map((result) =>
      filterExcludedCandidates(result, sentenceByIndex.get(result.index) || '')
    );
    const lemmaSet = new Set<string>();
    const generationContextByLemma = new Map<string, { surface?: string; expectedPos?: string[] }>();

    for (const result of extractionResults) {
      for (const word of result.words) {
        const lemma = normalizeWord(word.lemma);
        if (lemma) {
          lemmaSet.add(lemma);
          if (!generationContextByLemma.has(lemma)) {
            generationContextByLemma.set(lemma, {
              surface: word.surface,
              expectedPos: word.pos,
            });
          }
        }
      }
    }

    const existingWords = await fetchExistingWords(Array.from(lemmaSet), langCode);
    const generatedWords = new Map<string, WordInfo>();
    const missingLemmas = Array.from(lemmaSet).filter((lemma) => !existingWords.has(lemma));

    for (const lemma of missingLemmas) {
      const wordInfo = await generateWordInfoDeepseek(lemma, generationContextByLemma.get(lemma), modelProvider);
      if (!wordInfo.error) {
        generatedWords.set(normalizeWord(wordInfo.word || lemma), wordInfo);
      }
    }

    const results = extractionResults.map((result) => {
      const wordsJson: Record<string, WordJsonEntry> = {};
      const existing: string[] = [];
      const generated: string[] = [];
      const failed: string[] = [];

      for (const candidate of result.words) {
        const surface = normalizeWord(candidate.surface);
        const lemma = normalizeWord(candidate.lemma);
        if (!surface || !lemma) continue;

        const existingWord = existingWords.get(lemma);
        const generatedWord = generatedWords.get(lemma);

        if (existingWord) {
          existing.push(lemma);
          wordsJson[surface] = toWordJsonEntry(existingWord, lemma);
        } else if (generatedWord) {
          generated.push(lemma);
          wordsJson[surface] = toWordJsonEntry(generatedWord, lemma);
        } else {
          failed.push(lemma);
        }
      }

      return {
        index: result.index,
        status: failed.length > 0 ? 'partial' : 'completed',
        existingWords: existing,
        generatedWords: generated,
        failedWords: failed,
        excludedWords: result.excludedWords,
        wordJson: { words: wordsJson },
      };
    });

    return NextResponse.json({ modelProvider, results });
  } catch (error) {
    console.error('번들 단어 데이터 자동 생성 오류:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : '서버 오류가 발생했습니다.'
    }, { status: 500 });
  }
}
