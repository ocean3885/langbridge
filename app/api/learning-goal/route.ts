import { NextRequest, NextResponse } from 'next/server';
import { getAppUserFromRequest } from '@/lib/auth/app-user';
import {
  MAX_DAILY_GOAL_COUNT,
  MIN_DAILY_GOAL_COUNT,
  getTodayLearningGoalSummary,
  updateDailyGoalCount,
} from '@/lib/supabase/services/learning-goal-preferences';

export async function PATCH(request: NextRequest) {
  try {
    const user = await getAppUserFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }

    const body = await request.json();
    const dailyGoalCount = Number(body.daily_goal_count);

    if (
      !Number.isFinite(dailyGoalCount) ||
      !Number.isInteger(dailyGoalCount) ||
      dailyGoalCount < MIN_DAILY_GOAL_COUNT ||
      dailyGoalCount > MAX_DAILY_GOAL_COUNT
    ) {
      return NextResponse.json(
        { error: `${MIN_DAILY_GOAL_COUNT}-${MAX_DAILY_GOAL_COUNT} 사이의 목표값이 필요합니다.` },
        { status: 400 },
      );
    }

    await updateDailyGoalCount(user.id, dailyGoalCount);
    const summary = await getTodayLearningGoalSummary(user.id);

    return NextResponse.json(summary);
  } catch (error: any) {
    console.error('API 오류 (learning goal update):', error);
    return NextResponse.json({ error: error.message || '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
