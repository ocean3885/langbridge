import { getAppUserFromRequest } from '@/lib/auth/app-user';
import { isSuperAdmin } from '@/lib/auth/super-admin';
import {
  generateWordInfoDeepseek,
  generateWordLemmaDeepseek,
  type WordInfo,
} from '@/lib/generator';
import { generateTTS } from '@/lib/tts';
import { getSentenceById } from '@/lib/supabase/services/sentences';
import { deleteFileFromPublicUrl } from '@/lib/supabase/services/storage';
import { deleteWord, getWordByText, insertWord } from '@/lib/supabase/services/words';
import { insertMapping } from '@/lib/supabase/services/word-sentence-map';
import { NextRequest, NextResponse } from 'next/server';

function tokenize(value: string) {
  return value
    .normalize('NFC')
    .toLocaleLowerCase('es')
    .match(/[\p{L}\p{M}\p{N}]+/gu) || [];
}

function sentenceContainsSurface(sentence: string, surface: string) {
  const sentenceTokens = tokenize(sentence);
  const surfaceTokens = tokenize(surface);

  if (surfaceTokens.length === 0 || surfaceTokens.length > sentenceTokens.length) {
    return false;
  }

  return sentenceTokens.some((_, startIndex) =>
    surfaceTokens.every((token, offset) => sentenceTokens[startIndex + offset] === token)
  );
}

function normalizeMeanings(meanings: WordInfo['meaning_ko'] | WordInfo['meaning_en']) {
  return Object.fromEntries(
    Object.entries(meanings || {}).map(([pos, value]) => [
      pos,
      Array.isArray(value) ? value : [value],
    ])
  );
}

function normalizeGender(gender: WordInfo['gender']) {
  const normalized = gender?.trim().toLowerCase();
  return normalized === 'm' || normalized === 'f' || normalized === 'mf'
    ? normalized
    : null;
}

async function generateWordAudio(word: string, langCode: string) {
  const audioUrl = await generateTTS(word, 'words', langCode, 0.8, {
    provider: 'google',
    speed: 0.8,
  });

  if (!audioUrl) {
    throw new Error('Google TTS 음성 생성에 실패했습니다.');
  }

  return audioUrl;
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
    const sentenceId = Number(body.sentenceId);
    const surface = typeof body.word === 'string' ? body.word.trim() : '';
    const requestedLangCode = typeof body.langCode === 'string' ? body.langCode.trim() : '';

    if (!Number.isInteger(sentenceId) || sentenceId <= 0 || !surface || !requestedLangCode) {
      return NextResponse.json(
        { error: '필수 정보(sentenceId, word, langCode)가 올바르지 않습니다.' },
        { status: 400 }
      );
    }

    const sentence = await getSentenceById(sentenceId);
    if (!sentence) {
      return NextResponse.json({ error: '문장을 찾을 수 없습니다.' }, { status: 404 });
    }

    if (!sentenceContainsSurface(sentence.sentence, surface)) {
      return NextResponse.json(
        { error: `'${surface}' 단어를 현재 문장에서 찾을 수 없습니다.` },
        { status: 400 }
      );
    }

    const langCode = sentence.lang_code || requestedLangCode;

    // 문장 문맥은 기본형 판별에만 사용하고, 단어 정보는 기본형만으로 별도 생성한다.
    console.log(`DeepSeek 단어 기본형을 판별합니다: ${surface}`);
    const lemma = await generateWordLemmaDeepseek(surface, sentence.sentence);

    let normalizedWord = lemma.toLocaleLowerCase('es').trim();
    let existingWord = await getWordByText(normalizedWord, langCode);
    let wordId: number;
    let createdWordId: number | null = null;

    if (existingWord) {
      wordId = existingWord.id;
    } else {
      console.log(`DeepSeek 단어 정보를 생성합니다: ${lemma}`);
      const wordInfo: WordInfo = await generateWordInfoDeepseek(lemma);

      if (wordInfo.error) {
        return NextResponse.json(
          { error: `단어 정보 생성 실패: ${wordInfo.error}` },
          { status: 502 }
        );
      }

      normalizedWord = typeof wordInfo.word === 'string'
        ? wordInfo.word.toLocaleLowerCase('es').trim()
        : '';

      if (!normalizedWord) {
        return NextResponse.json(
          { error: 'AI가 유효한 단어 원형을 반환하지 않았습니다.' },
          { status: 502 }
        );
      }

      // 정보 생성 결과가 판별된 lemma와 달라졌다면 중복 등록을 한 번 더 방지한다.
      existingWord = await getWordByText(normalizedWord, langCode);
      if (existingWord) {
        wordId = existingWord.id;
      } else {
        const audioUrl = await generateWordAudio(normalizedWord, langCode);

        try {
          wordId = await insertWord({
            word: normalizedWord,
            langCode,
            pos: wordInfo.pos,
            meaning_ko: normalizeMeanings(wordInfo.meaning_ko),
            meaning_en: normalizeMeanings(wordInfo.meaning_en),
            gender: normalizeGender(wordInfo.gender),
            declensions: wordInfo.declensions,
            conjugations: wordInfo.conjugations,
            audioUrl,
          });
          createdWordId = wordId;
        } catch (error) {
          await deleteFileFromPublicUrl(audioUrl);
          throw error;
        }
      }
    }

    let mappingCreated = false;

    try {
      const mapping = await insertMapping({
        wordId,
        sentenceId,
        usedAs: surface,
      });
      mappingCreated = mapping.created;
    } catch (error) {
      // 신규 단어가 문장 연결에 실패하면 단어와 해당 오디오도 함께 롤백한다.
      if (createdWordId) {
        try {
          await deleteWord(createdWordId);
        } catch (rollbackError) {
          console.error('신규 단어 롤백 실패:', rollbackError);
        }
      }
      throw error;
    }

    return NextResponse.json({
      success: true,
      wordId,
      extractedWord: normalizedWord,
      reusedExistingWord: Boolean(existingWord),
      mappingCreated,
    });
  } catch (error) {
    console.error('단어 등록 및 매핑 API 오류:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : '서버 오류가 발생했습니다.',
    }, { status: 500 });
  }
}
