import { getAppUserFromRequest } from '@/lib/auth/app-user';
import { isSuperAdmin } from '@/lib/auth/super-admin';
import {
  createLanguage,
  deleteLanguage,
  findLanguageByCode,
  hasLanguageUsage,
  listLanguagesByEnglishName,
  updateLanguage,
} from '@/lib/supabase/services/languages';
import { NextRequest, NextResponse } from 'next/server';

// 언어 목록 조회
export async function GET(request: NextRequest) {
  try {
    const user = await getAppUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }

    const data = await listLanguagesByEnglishName();
    return NextResponse.json(data);
  } catch (error) {
    console.error('API 오류:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

// 언어 추가
export async function POST(request: NextRequest) {
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

    const { name_en, name_ko, code } = await request.json();

    if (!name_en || !name_ko || !code) {
      return NextResponse.json({ error: '모든 필드를 입력해주세요.' }, { status: 400 });
    }

    // 중복 코드 확인
    const existing = await findLanguageByCode({ code });

    if (existing) {
      return NextResponse.json({ error: '이미 존재하는 언어 코드입니다.' }, { status: 400 });
    }

    const data = await createLanguage({
      nameEn: name_en,
      nameKo: name_ko,
      code,
    });

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('API 오류:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

// 언어 수정
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

    const { id, name_en, name_ko, code } = await request.json();

    if (!id || !name_en || !name_ko || !code) {
      return NextResponse.json({ error: '모든 필드를 입력해주세요.' }, { status: 400 });
    }

    // 중복 코드 확인 (자신 제외)
    const existing = await findLanguageByCode({
      code,
      excludeId: Number(id),
    });

    if (existing) {
      return NextResponse.json({ error: '이미 존재하는 언어 코드입니다.' }, { status: 400 });
    }

    const data = await updateLanguage({
      id: Number(id),
      nameEn: name_en,
      nameKo: name_ko,
      code,
    });

    if (!data) {
      return NextResponse.json({ error: '언어를 찾을 수 없습니다.' }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('API 오류:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

// 언어 삭제
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
      return NextResponse.json({ error: '언어 ID를 입력해주세요.' }, { status: 400 });
    }

    const languageId = parseInt(id);
    const usage = await hasLanguageUsage(languageId);
    if (usage.used) {
      return NextResponse.json(
        { error: `이 언어를 사용하는 ${usage.reason} 있어 삭제할 수 없습니다.` },
        { status: 400 }
      );
    }

    await deleteLanguage(languageId);

    return NextResponse.json({ message: '언어가 삭제되었습니다.' });
  } catch (error) {
    console.error('API 오류:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
