import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// 채널 목록 조회 (관리자 로그인 필요)
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('lang_profiles')
      .select('is_premium')
      .eq('id', user.id)
      .single();
    if (!profile?.is_premium) {
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
