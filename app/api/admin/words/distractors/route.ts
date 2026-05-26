import { getAppUserFromRequest } from '@/lib/auth/app-user';
import { isSuperAdmin } from '@/lib/auth/super-admin';
import { deleteDistractor, updateDistractor } from '@/lib/supabase/services/words';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';

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

    const { wordId, items } = await request.json();

    if (!wordId || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: '단어 ID와 혼동 어휘 배열이 필요합니다.' }, { status: 400 });
    }

    const insertData = items.map((item) => {
      if (
        typeof item.word !== 'string' ||
        typeof item.meaning_ko !== 'string' ||
        typeof item.meaning_en !== 'string' ||
        !item.word.trim() ||
        !item.meaning_ko.trim() ||
        !item.meaning_en.trim()
      ) {
        throw new Error('각 항목에는 "word", "meaning_ko", "meaning_en" 문자열 값이 모두 필요합니다.');
      }

      return {
        word_id: Number(wordId),
        distractor: item.word.trim(),
        meaning_ko: item.meaning_ko.trim(),
        meaning_en: item.meaning_en.trim(),
      };
    });

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('words_distractor')
      .insert(insertData)
      .select();

    if (error) {
      throw new Error(`혼동 어휘 저장 실패: ${error.message}`);
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('API 오류:', error);
    return NextResponse.json({ error: error.message || '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await getAppUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }

    const isAdminUser = await isSuperAdmin({ userId: user.id, email: user.email ?? null });
    if (!isAdminUser) {
      return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
    }

    const { id, distractor, meaning_ko, meaning_en } = await request.json();

    if (!id) {
      return NextResponse.json({ error: '혼동 어휘 ID를 입력해주세요.' }, { status: 400 });
    }

    await updateDistractor(Number(id), { distractor, meaning_ko, meaning_en });

    return NextResponse.json({ message: '혼동 어휘가 수정되었습니다.' });
  } catch (error) {
    console.error('API 오류:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

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
      return NextResponse.json({ error: '혼동 어휘 ID를 입력해주세요.' }, { status: 400 });
    }

    await deleteDistractor(Number(id));

    return NextResponse.json({ message: '혼동 어휘가 삭제되었습니다.' });
  } catch (error) {
    console.error('API 오류:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
