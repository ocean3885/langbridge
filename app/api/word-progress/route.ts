import { NextRequest, NextResponse } from 'next/server';
import { getAppUserFromRequest } from '@/lib/auth/app-user';
import { recordWordReviewResult } from '@/lib/supabase/services/bundle-progress';

export async function POST(request: NextRequest) {
  try {
    const user = await getAppUserFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }

    const body = await request.json();
    const { word_id, is_correct, practice_mode } = body;

    if (!word_id || typeof is_correct !== 'boolean' || !['quiz', 'spelling', 'flashcards'].includes(practice_mode)) {
      return NextResponse.json({ error: '유효한 결과 데이터가 필요합니다.' }, { status: 400 });
    }

    const result = await recordWordReviewResult(
      user.id,
      Number(word_id),
      is_correct,
      practice_mode as 'quiz' | 'spelling' | 'flashcards',
    );

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('API 오류 (word-progress):', error);
    return NextResponse.json({ error: error.message || '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
