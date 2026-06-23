import { NextRequest, NextResponse } from 'next/server';
import { upsertAuthUserMirror } from '@/lib/supabase/services/auth-users';
import { upsertUserProfile } from '@/lib/supabase/services/user-profiles';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
    const password = typeof body?.password === 'string' ? body.password : '';
    const requestedRedirect = typeof body?.redirectTo === 'string' ? body.redirectTo : '/';
    const redirectTo = requestedRedirect.startsWith('/') && !requestedRedirect.startsWith('//')
      ? requestedRedirect
      : '/';

    if (!email || !password) {
      return NextResponse.json({ error: '이메일과 비밀번호를 입력하세요.' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: '비밀번호는 최소 6자 이상이어야 합니다.' }, { status: 400 });
    }

    const supabase = await createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${request.nextUrl.origin}/auth/confirm?next=${encodeURIComponent(redirectTo)}`,
      },
    });

    if (error || !data.user) {
      return NextResponse.json({ error: error?.message || '회원가입에 실패했습니다.' }, { status: 400 });
    }

    const user = data.user;

    await Promise.all([
      upsertUserProfile({
        id: user.id,
        email: user.email || email,
        createdAt: user.created_at,
      }),
      upsertAuthUserMirror({
        id: user.id,
        email: user.email || email,
        createdAt: user.created_at,
      }),
    ]);

    const response = NextResponse.json({
      success: true,
      user: { id: user.id, email: user.email || email },
    });

    return response;
  } catch (error) {
    console.error('Supabase Auth sign-up error:', error);
    return NextResponse.json({ error: '회원가입 처리 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
