import { getAppUserFromRequest } from '@/lib/auth/app-user';
import { isSuperAdmin } from '@/lib/auth/super-admin';
import {
  listSentences,
  insertSentence,
  updateSentence,
  deleteSentence,
  getSentenceById,
} from '@/lib/supabase/services/sentences';
import { NextRequest, NextResponse } from 'next/server';

function withLanguage<T extends { id: number }>(
  row: T
) {
  return {
    ...row,
    languages: null,
  };
}

// 문장 목록 조회
export async function GET(request: NextRequest) {
  try {
    const user = await getAppUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }

    const sentences = await listSentences();

    return NextResponse.json(sentences.map((row) => withLanguage(row)));
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
    const isAdminUser = await isSuperAdmin({ userId: user.id, email: user.email ?? null });

    if (!isAdminUser) {
      return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
    }

    const { sentence, translation, audio_url } = await request.json();

    if (!sentence || !translation) {
      return NextResponse.json({ error: '필수 필드를 입력해주세요.' }, { status: 400 });
    }

    const sentenceId = await insertSentence({
      sentence,
      translation,
      audio_url: audio_url || null,
    });
    
    const created = await getSentenceById(sentenceId);
    if (!created) throw new Error('문장 생성 후 조회 실패');

    return NextResponse.json(withLanguage(created), { status: 201 });
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
    const isAdminUser = await isSuperAdmin({ userId: user.id, email: user.email ?? null });

    if (!isAdminUser) {
      return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
    }

    const { id, sentence, translation, audio_url } = await request.json();

    if (!id || !sentence || !translation) {
      return NextResponse.json({ error: '필수 필드를 입력해주세요.' }, { status: 400 });
    }

    await updateSentence(Number(id), {
      sentence,
      translation,
      audio_url: audio_url || null,
    });

    const data = await getSentenceById(Number(id));

    if (!data) {
      return NextResponse.json({ error: '문장을 찾을 수 없습니다.' }, { status: 404 });
    }

    return NextResponse.json(withLanguage(data));
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
    const isAdminUser = await isSuperAdmin({ userId: user.id, email: user.email ?? null });

    if (!isAdminUser) {
      return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: '문장 ID를 입력해주세요.' }, { status: 400 });
    }

    const sentenceId = parseInt(id);
    await deleteSentence(sentenceId);

    return NextResponse.json({ message: '문장이 삭제되었습니다.' });
  } catch (error) {
    console.error('API 오류:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
