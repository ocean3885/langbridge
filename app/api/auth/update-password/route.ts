import { NextRequest, NextResponse } from 'next/server';
import { getAppUserFromRequest } from '@/lib/auth/app-user';
import { createClient } from '@/lib/supabase/server';

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

    const supabase = await createClient();
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      console.error('Supabase Auth update password error:', error.message);
      return NextResponse.json({ error: '비밀번호 변경에 실패했습니다.' }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Supabase Auth update password error:', error);
    return NextResponse.json({ error: '비밀번호 변경 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
