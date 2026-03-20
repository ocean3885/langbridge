import { createAdminClient } from '@/lib/supabase/admin';
import { getStorageBucket } from '@/lib/supabase/storage';
import { getAppUserFromRequest } from '@/lib/auth/app-user';
import { isSuperAdminSqlite } from '@/lib/auth/super-admin';
import {
  createSentenceSqlite,
  deleteSentenceSqlite,
  findSentenceByIdSqlite,
  hasSentenceMappingSqlite,
  listSentencesSqlite,
  updateSentenceSqlite,
} from '@/lib/sqlite/sentences';
import { listSqliteLanguages } from '@/lib/sqlite/languages';
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

// 문장 목록 조회
export async function GET(request: NextRequest) {
  try {
    const user = await getAppUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }

    const [sentences, languages] = await Promise.all([
      listSentencesSqlite(),
      listSqliteLanguages(),
    ]);
    const languageMap = new Map(
      languages.map((l) => [l.id, { id: l.id, name_en: l.name_en, name_ko: l.name_ko, code: l.code }])
    );

    return NextResponse.json(sentences.map((row) => withLanguage(row, languageMap)));
  } catch (error) {
    console.error('API 오류:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

// 문장 추가
export async function POST(request: NextRequest) {
  try {
    const user = await getAppUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }

    // 운영자 확인
    const isSuperAdmin = await isSuperAdminSqlite({ userId: user.id, email: user.email ?? null });

    if (!isSuperAdmin) {
      return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
    }

    const { language_id, text, translation_ko, audio_path, context_category } = await request.json();

    if (!language_id || !text || !translation_ko || !audio_path) {
      return NextResponse.json({ error: '필수 필드를 입력해주세요.' }, { status: 400 });
    }

    const created = await createSentenceSqlite({
      languageId: Number(language_id),
      text,
      translationKo: translation_ko,
      audioPath: audio_path,
      contextCategory: context_category || null,
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

// 문장 수정
export async function PUT(request: NextRequest) {
  try {
    const user = await getAppUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }

    // 운영자 확인
    const isSuperAdmin = await isSuperAdminSqlite({ userId: user.id, email: user.email ?? null });

    if (!isSuperAdmin) {
      return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
    }

    const { id, language_id, text, translation_ko, audio_path, context_category } = await request.json();

    if (!id || !language_id || !text || !translation_ko || !audio_path) {
      return NextResponse.json({ error: '필수 필드를 입력해주세요.' }, { status: 400 });
    }

    const oldSentence = await findSentenceByIdSqlite(Number(id));
    const data = await updateSentenceSqlite({
      id: Number(id),
      languageId: Number(language_id),
      text,
      translationKo: translation_ko,
      audioPath: audio_path,
      contextCategory: context_category || null,
    });

    if (!data) {
      return NextResponse.json({ error: '문장을 찾을 수 없습니다.' }, { status: 404 });
    }

    // 오디오 파일이 변경된 경우 이전 파일 삭제
    if (oldSentence?.audio_path && oldSentence.audio_path !== audio_path) {
      try {
        const adminClient = createAdminClient();
        const storageBucket = getStorageBucket();
        const { error: storageError } = await adminClient.storage
          .from(storageBucket)
          .remove([oldSentence.audio_path]);

        if (storageError) {
          console.error('이전 오디오 파일 삭제 실패:', storageError);
        }
      } catch (adminErr) {
        console.error('Admin 클라이언트 오류:', adminErr);
      }
    }

    const languages = await listSqliteLanguages();
    const languageMap = new Map(
      languages.map((l) => [l.id, { id: l.id, name_en: l.name_en, name_ko: l.name_ko, code: l.code }])
    );

    return NextResponse.json(withLanguage(data, languageMap));
  } catch (error) {
    console.error('API 오류:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

// 문장 삭제
export async function DELETE(request: NextRequest) {
  try {
    const user = await getAppUserFromRequest(request);
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
      return NextResponse.json({ error: '문장 ID를 입력해주세요.' }, { status: 400 });
    }

    const sentenceId = parseInt(id);
    const usedMappings = await hasSentenceMappingSqlite(sentenceId);
    if (usedMappings) {
      return NextResponse.json(
        { error: '이 문장을 사용하는 단어 매핑이 있어 삭제할 수 없습니다.' },
        { status: 400 }
      );
    }

    const sentence = await findSentenceByIdSqlite(sentenceId);
    if (!sentence) {
      return NextResponse.json({ error: '문장을 찾을 수 없습니다.' }, { status: 404 });
    }

    await deleteSentenceSqlite(sentenceId);

    // Storage에서 오디오 파일 삭제 (Service Role 사용)
    if (sentence?.audio_path) {
      try {
        const adminClient = createAdminClient();
        const storageBucket = getStorageBucket();
        const { error: storageError } = await adminClient.storage
          .from(storageBucket)
          .remove([sentence.audio_path]);

        if (storageError) {
          console.error('스토리지 파일 삭제 실패:', storageError);
        }
      } catch (adminErr) {
        console.error('Admin 클라이언트 오류:', adminErr);
      }
    }

    return NextResponse.json({ message: '문장이 삭제되었습니다.' });
  } catch (error) {
    console.error('API 오류:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
