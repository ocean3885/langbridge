import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';

// 채널 목록 조회 (관리자 로그인 필요)
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }

    const admin = createAdminClient();
    const { data: isSuperAdmin } = await admin.rpc('get_user_is_super_admin', {
      user_id: user.id
    });
    if (!isSuperAdmin) {
      return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
    }

    const { data, error } = await supabase
      .from('video_channels')
      .select('id, channel_name, channel_url, language_id')
      .order('channel_name', { ascending: true });

    if (error) {
      console.error('채널 조회 오류:', error);
      return NextResponse.json({ error: '채널 조회에 실패했습니다.' }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (err) {
    console.error('API 오류:', err);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
