import { getAppUserFromRequest } from '@/lib/auth/app-user';
import { isSuperAdmin } from '@/lib/auth/super-admin';
import { deleteDistractor, updateDistractor } from '@/lib/supabase/services/words';
import { NextRequest, NextResponse } from 'next/server';

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
