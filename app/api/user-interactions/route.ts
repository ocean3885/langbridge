import { NextRequest, NextResponse } from 'next/server';
import { getAppUserFromRequest } from '@/lib/auth/app-user';
import { upsertUserSentenceInteraction } from '@/lib/supabase/services/user-interactions';

export async function POST(request: NextRequest) {
  try {
    const user = await getAppUserFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }

    const body = await request.json();
    const { sentence_id, is_pinned, memo, proficiency_level } = body;

    if (!sentence_id) {
      return NextResponse.json({ error: 'sentence_id가 필요합니다.' }, { status: 400 });
    }

    // 서비스 레이어를 통해 Upsert 수행 (Admin Client 사용)
    const updated = await upsertUserSentenceInteraction(user.id, Number(sentence_id), {
      is_pinned,
      memo,
      proficiency_level
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('API 오류 (user-interactions):', error);
    return NextResponse.json({ error: error.message || '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
