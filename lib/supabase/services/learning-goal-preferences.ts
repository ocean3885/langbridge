import { createAdminClient } from '@/lib/supabase/admin';

const DEFAULT_ACTIVITY_TIME_ZONE = 'Asia/Seoul';
export const DEFAULT_DAILY_GOAL_COUNT = 20;
export const MIN_DAILY_GOAL_COUNT = 1;
export const MAX_DAILY_GOAL_COUNT = 100;

export interface LearningGoalPreferences {
  user_id: string;
  daily_goal_count: number;
  daily_goal_metric: 'activity_count' | (string & {});
  created_at: string;
  updated_at: string;
}

export interface LearningGoalSummary {
  todayCount: number;
  dailyGoalCount: number;
  progressPercent: number;
  goalMet: boolean;
}

export async function getLearningGoalPreferences(userId: string): Promise<LearningGoalPreferences> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('user_learning_preferences')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching learning goal preferences:', error);
  }

  if (data) {
    return data as LearningGoalPreferences;
  }

  return {
    user_id: userId,
    daily_goal_count: DEFAULT_DAILY_GOAL_COUNT,
    daily_goal_metric: 'activity_count',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

export async function updateDailyGoalCount(userId: string, dailyGoalCount: number) {
  const normalizedGoal = normalizeDailyGoalCount(dailyGoalCount);
  const now = new Date().toISOString();

  const { data, error } = await createAdminClient()
    .from('user_learning_preferences')
    .upsert(
      {
        user_id: userId,
        daily_goal_count: normalizedGoal,
        daily_goal_metric: 'activity_count',
        updated_at: now,
      },
      { onConflict: 'user_id' },
    )
    .select()
    .single();

  if (error) {
    console.error('Error updating daily learning goal:', error);
    throw error;
  }

  return data as LearningGoalPreferences;
}

export async function getTodayLearningGoalSummary(
  userId: string,
  options?: { timeZone?: string },
): Promise<LearningGoalSummary> {
  const supabase = createAdminClient();
  const timeZone = options?.timeZone || DEFAULT_ACTIVITY_TIME_ZONE;
  const today = formatActivityDate(new Date(), timeZone);

  const [preferences, activityResult] = await Promise.all([
    getLearningGoalPreferences(userId),
    supabase
      .from('user_learning_daily_activity')
      .select('activity_count')
      .eq('user_id', userId)
      .eq('activity_date', today)
      .maybeSingle(),
  ]);

  if (activityResult.error) {
    console.error('Error fetching today learning activity:', activityResult.error);
  }

  const todayCount = Number(activityResult.data?.activity_count || 0);
  const dailyGoalCount = normalizeDailyGoalCount(preferences.daily_goal_count);
  const progressPercent = Math.min(100, Math.round((todayCount / dailyGoalCount) * 100));

  return {
    todayCount,
    dailyGoalCount,
    progressPercent,
    goalMet: todayCount >= dailyGoalCount,
  };
}

export function normalizeDailyGoalCount(value: number) {
  if (!Number.isFinite(value)) return DEFAULT_DAILY_GOAL_COUNT;
  return Math.min(MAX_DAILY_GOAL_COUNT, Math.max(MIN_DAILY_GOAL_COUNT, Math.round(value)));
}

function formatActivityDate(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const partMap = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${partMap.year}-${partMap.month}-${partMap.day}`;
}
