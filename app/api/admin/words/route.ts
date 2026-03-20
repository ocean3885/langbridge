import { createClient } from '@/lib/supabase/server';
import { getAppUserFromRequest } from '@/lib/auth/app-user';
import { isSuperAdminSqlite } from '@/lib/auth/super-admin';
import { listSqliteLanguages } from '@/lib/sqlite/languages';
import { createWordSqlite, deleteWordSqlite, hasWordUsageSqlite, listWordsSqlite, updateWordSqlite } from '@/lib/sqlite/words';
import { NextRequest, NextResponse } from 'next/server';

function withLanguage<T extends { language_id: number }>(
  row: T,
  languageMap: Map<number, { id: number; name_en: string | null; name_ko: string; code: string }>
) {
  return {
    ...row,
    languages: languageMap.get(row.language_id) ?? null,
  };
}

// 단어 목록 조회
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const user = await getAppUserFromRequest(request, supabase);
    if (!user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }

    const [words, languages] = await Promise.all([
      listWordsSqlite(),
      listSqliteLanguages(),
    ]);
    const languageMap = new Map(
      languages.map((l) => [l.id, { id: l.id, name_en: l.name_en, name_ko: l.name_ko, code: l.code }])
    );

    return NextResponse.json(words.map((row) => withLanguage(row, languageMap)));
  } catch (error) {
    console.error('API 오류:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

// 단어 추가
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const user = await getAppUserFromRequest(request, supabase);
    if (!user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }

    // 운영자 확인
    const isSuperAdmin = await isSuperAdminSqlite({ userId: user.id, email: user.email ?? null });

    if (!isSuperAdmin) {
      return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
    }

    const { language_id, text, meaning_ko, level, part_of_speech } = await request.json();

    if (!language_id || !text || !meaning_ko || !level) {
      return NextResponse.json({ error: '필수 필드를 입력해주세요.' }, { status: 400 });
    }

    const created = await createWordSqlite({
      languageId: Number(language_id),
      text,
      meaningKo: meaning_ko,
      level,
      partOfSpeech: part_of_speech || null,
    });
    const languages = await listSqliteLanguages();
    const languageMap = new Map(
      languages.map((l) => [l.id, { id: l.id, name_en: l.name_en, name_ko: l.name_ko, code: l.code }])
    );

    return NextResponse.json(withLanguage(created, languageMap), { status: 201 });
  } catch (error) {
    console.error('API 오류:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

// 단어 수정
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    const user = await getAppUserFromRequest(request, supabase);
    if (!user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }

    // 운영자 확인
    const isSuperAdmin = await isSuperAdminSqlite({ userId: user.id, email: user.email ?? null });

    if (!isSuperAdmin) {
      return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
    }

    const { id, language_id, text, meaning_ko, level, part_of_speech } = await request.json();

    if (!id || !language_id || !text || !meaning_ko || !level) {
      return NextResponse.json({ error: '필수 필드를 입력해주세요.' }, { status: 400 });
    }

    const updated = await updateWordSqlite({
      id: Number(id),
      languageId: Number(language_id),
      text,
      meaningKo: meaning_ko,
      level,
      partOfSpeech: part_of_speech || null,
    });

    if (!updated) {
      return NextResponse.json({ error: '단어를 찾을 수 없습니다.' }, { status: 404 });
    }

    const languages = await listSqliteLanguages();
    const languageMap = new Map(
      languages.map((l) => [l.id, { id: l.id, name_en: l.name_en, name_ko: l.name_ko, code: l.code }])
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
    const supabase = await createClient();
    const user = await getAppUserFromRequest(request, supabase);
    if (!user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }

    // 운영자 확인
    const isSuperAdmin = await isSuperAdminSqlite({ userId: user.id, email: user.email ?? null });

    if (!isSuperAdmin) {
      return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: '단어 ID를 입력해주세요.' }, { status: 400 });
    }

    const wordId = parseInt(id);
    const usage = await hasWordUsageSqlite(wordId);
    if (usage.used) {
      return NextResponse.json(
        { error: `${usage.reason} 삭제할 수 없습니다.` },
        { status: 400 }
      );
    }

    await deleteWordSqlite(wordId);

    return NextResponse.json({ message: '단어가 삭제되었습니다.' });
  } catch (error) {
    console.error('API 오류:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
