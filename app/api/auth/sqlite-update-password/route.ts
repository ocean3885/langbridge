import { NextRequest, NextResponse } from 'next/server';
import { getAppUserFromRequest } from '@/lib/auth/app-user';
import { updateAuthUserPasswordById } from '@/lib/sqlite/auth-users';

export async function POST(request: NextRequest) {
  try {
    const user = await getAppUserFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }

    const body = await request.json();
    const password = typeof body?.password === 'string' ? body.password : '';

    if (password.length < 6) {
      return NextResponse.json({ error: '비밀번호는 최소 6자 이상이어야 합니다.' }, { status: 400 });
    }

    const updated = await updateAuthUserPasswordById({
      userId: user.id,
      newPassword: password,
    });

    if (!updated) {
      return NextResponse.json({ error: 'SQLite 사용자 비밀번호 변경에 실패했습니다.' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('SQLite update password error:', error);
    return NextResponse.json({ error: '비밀번호 변경 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
