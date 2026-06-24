import { NextRequest, NextResponse } from 'next/server';
import { getAppUserFromRequest } from '@/lib/auth/app-user';
import { isSuperAdmin } from '@/lib/auth/super-admin';
import { generateWordInfoDeepseek } from '@/lib/generator';
import { getWordById, updateWord } from '@/lib/supabase/services/words';

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

    const { wordId } = await request.json();
    if (!wordId) {
      return NextResponse.json({ error: '단어 ID가 필요합니다.' }, { status: 400 });
    }

    const existingWord = await getWordById(Number(wordId));
    if (!existingWord) {
      return NextResponse.json({ error: '단어를 찾을 수 없습니다.' }, { status: 404 });
    }

    const wordInfo = await generateWordInfoDeepseek(existingWord.word);
    if (wordInfo.error) {
      return NextResponse.json({ error: `단어 정보 생성 실패: ${wordInfo.error}` }, { status: 500 });
    }

    const updates = {
      word: wordInfo.word || existingWord.word,
      langCode: existingWord.lang_code,
      pos: Array.isArray(wordInfo.pos) ? wordInfo.pos : [],
      meaning_ko: wordInfo.meaning_ko as any || {},
      meaning_en: wordInfo.meaning_en as any || {},
      gender: wordInfo.gender ?? null,
      difficulty: Number.isInteger(wordInfo.difficulty) &&
        Number(wordInfo.difficulty) >= 1 &&
        Number(wordInfo.difficulty) <= 7
        ? Number(wordInfo.difficulty)
        : existingWord.difficulty || 1,
      declensions: wordInfo.declensions as any || {},
      conjugations: wordInfo.conjugations as any || {},
    };

    await updateWord(Number(wordId), updates);

    return NextResponse.json({
      success: true,
      ...existingWord,
      word: updates.word,
      lang_code: updates.langCode,
      pos: updates.pos,
      meaning_ko: updates.meaning_ko,
      meaning_en: updates.meaning_en,
      gender: updates.gender,
      difficulty: updates.difficulty,
      declensions: updates.declensions,
      conjugations: updates.conjugations,
    });
  } catch (error) {
    console.error('단어 정보 재생성 API 오류:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : '서버 오류가 발생했습니다.'
    }, { status: 500 });
  }
}
