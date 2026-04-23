import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthUserPassword } from '@/lib/supabase/services/auth-users';
import { upsertUserProfile } from '@/lib/supabase/services/user-profiles';

const SESSION_COOKIE = 'lb_user_id';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
    const password = typeof body?.password === 'string' ? body.password : '';

    if (!email || !password) {
      return NextResponse.json({ error: '이메일과 비밀번호를 입력하세요.' }, { status: 400 });
    }

    const user = await verifyAuthUserPassword({ email, password });
    if (!user) {
      return NextResponse.json({ error: '이메일 또는 비밀번호가 올바르지 않습니다.' }, { status: 401 });
    }

    await upsertUserProfile({
      id: user.id,
      email: user.email,
      createdAt: user.created_at,
    });

    const response = NextResponse.json({
      success: true,
      user: { id: user.id, email: user.email },
    });

    response.cookies.set(SESSION_COOKIE, user.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (error) {
    console.error('SQLite login error:', error);
    return NextResponse.json({ error: '로그인 처리 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
