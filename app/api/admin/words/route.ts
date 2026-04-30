import { getAppUserFromRequest } from '@/lib/auth/app-user';
import { isSuperAdmin } from '@/lib/auth/super-admin';
import { listLanguages } from '@/lib/supabase/services/languages';
import { listWords, updateWord, deleteWord, getWordById } from '@/lib/supabase/services/words';
import { NextRequest, NextResponse } from 'next/server';

function withLanguage<T extends { lang_code: string }>(
  row: T,
  languageMap: Map<string, { id: number; name_en: string | null; name_ko: string; code: string }>
) {
  return {
    ...row,
    languages: languageMap.get(row.lang_code) ?? null,
  };
}

// 단어 목록 조회
export async function GET(request: NextRequest) {
  try {
    const user = await getAppUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }

    const [words, languages] = await Promise.all([
      listWords(),
      listLanguages(),
    ]);
    const languageMap = new Map(
      languages.map((l) => [l.code, { id: l.id, name_en: l.name_en || null, name_ko: l.name_ko, code: l.code }])
    );

    return NextResponse.json(words.map((row) => withLanguage(row, languageMap)));
  } catch (error) {
    console.error('API 오류:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}


// 단어 수정
export async function PUT(request: NextRequest) {
  try {
    const user = await getAppUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }

    // 운영자 확인
    const isAdminUser = await isSuperAdmin({ userId: user.id, email: user.email ?? null });

    if (!isAdminUser) {
      return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
    }

    const { id, word, lang_code, pos, meaning, gender, declensions, conjugations, audio_url } = await request.json();

    if (!id || !word || !lang_code) {
      return NextResponse.json({ error: 'ID, 단어, 언어 코드는 필수입니다.' }, { status: 400 });
    }

    await updateWord(Number(id), {
      word,
      langCode: lang_code,
      pos: pos || [],
      meaning: meaning || {},
      gender: gender || null,
      declensions: declensions || {},
      conjugations: conjugations || {},
      audioUrl: audio_url || null,
    });

    const updated = await getWordById(Number(id));

    if (!updated) {
      return NextResponse.json({ error: '단어를 찾을 수 없습니다.' }, { status: 404 });
    }

    const languages = await listLanguages();
    const languageMap = new Map(
      languages.map((l) => [l.code, { id: l.id, name_en: l.name_en || null, name_ko: l.name_ko, code: l.code }])
    );

    return NextResponse.json(withLanguage(updated, languageMap));
  } catch (error) {
    console.error('API 오류:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

// 단어 삭제
export async function DELETE(request: NextRequest) {
  try {
    const user = await getAppUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }

    // 운영자 확인
    const isAdminUser = await isSuperAdmin({ userId: user.id, email: user.email ?? null });

    if (!isAdminUser) {
      return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: '단어 ID를 입력해주세요.' }, { status: 400 });
    }

    const wordId = parseInt(id);
    await deleteWord(wordId);

    return NextResponse.json({ message: '단어가 삭제되었습니다.' });
  } catch (error) {
    console.error('API 오류:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
