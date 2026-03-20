import { createClient } from '@/lib/supabase/server';
import { getAppUserFromRequest } from '@/lib/auth/app-user';
import { isSuperAdminSqlite } from '@/lib/auth/super-admin';
import { listSqliteChannels } from '@/lib/sqlite/channels';
import { NextRequest, NextResponse } from 'next/server';

// 채널 목록 조회 (관리자 로그인 필요)
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const user = await getAppUserFromRequest(request, supabase);
    if (!user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }

    const isSuperAdmin = await isSuperAdminSqlite({ userId: user.id, email: user.email ?? null });
    if (!isSuperAdmin) {
      return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
    }

    const channels = await listSqliteChannels();
    return NextResponse.json(channels);
  } catch (err) {
    console.error('API 오류:', err);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
