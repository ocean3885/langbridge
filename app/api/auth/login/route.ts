import { NextRequest, NextResponse } from 'next/server';
import { upsertAuthUserMirror } from '@/lib/supabase/services/auth-users';
import { upsertUserProfile } from '@/lib/supabase/services/user-profiles';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
    const password = typeof body?.password === 'string' ? body.password : '';

    if (!email || !password) {
      return NextResponse.json({ error: '이메일과 비밀번호를 입력하세요.' }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError || !authData.user) {
      console.error('Supabase Auth login failed:', authError?.message);
      const authMessage = authError?.message?.toLowerCase() || '';
      const authCode = String(authError?.code || '').toLowerCase();
      const isEmailNotConfirmed =
        authCode.includes('email_not_confirmed') ||
        authMessage.includes('email not confirmed') ||
        authMessage.includes('email_not_confirmed');

      if (isEmailNotConfirmed) {
        return NextResponse.json({ error: '이메일 인증이 완료되지 않았습니다. 메일함에서 인증 링크를 확인해 주세요.' }, { status: 403 });
      }

      return NextResponse.json({ error: '이메일 또는 비밀번호가 올바르지 않습니다.' }, { status: 401 });
    }

    await upsertUserProfile({
      id: authData.user.id,
      email: authData.user.email || email,
      createdAt: authData.user.created_at,
    });

    await upsertAuthUserMirror({
      id: authData.user.id,
      email: authData.user.email || email,
      createdAt: authData.user.created_at,
    });

    return NextResponse.json({
      success: true,
      user: { id: authData.user.id, email: authData.user.email || email },
    });
  } catch (error) {
    console.error('Supabase Auth login error:', error);
    return NextResponse.json({ error: '로그인 처리 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
