'use server';

import { createAdminClient } from '@/lib/supabase/admin';

const DEFAULT_ACTIVITY_TIME_ZONE = 'Asia/Seoul';

export type LearningActivityType =
  | 'bundle_study'
  | 'practice_access'
  | 'practice_result'
  | (string & {});

export interface UserLearningDailyActivity {
  id: string;
  user_id: string;
  activity_date: string;
  activity_count: number;
  first_activity_at: string | null;
  last_activity_at: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface RecordLearningDailyActivityInput {
  userId: string;
  activityType: LearningActivityType;
  bundleId?: string | null;
  bundleItemId?: string | null;
  practiceMode?: string | null;
  isCorrect?: boolean | null;
  occurredAt?: Date;
  timeZone?: string;
}

export interface LearningStreakSummary {
  currentStreak: number;
  activeToday: boolean;
  activeDates: string[];
  weekDates: {
    date: string;
    active: boolean;
  }[];
}

export async function recordLearningDailyActivity(input: RecordLearningDailyActivityInput) {
  const supabase = createAdminClient();
  const occurredAt = input.occurredAt || new Date();
  const occurredAtIso = occurredAt.toISOString();
  const timeZone = input.timeZone || DEFAULT_ACTIVITY_TIME_ZONE;
  const activityDate = formatActivityDate(occurredAt, timeZone);

  const { data: existing, error: existingError } = await supabase
    .from('user_learning_daily_activity')
    .select('*')
    .eq('user_id', input.userId)
    .eq('activity_date', activityDate)
    .maybeSingle();

  if (existingError) {
    console.error('Error fetching daily learning activity:', existingError);
    throw existingError;
  }

  const existingMetadata = normalizeMetadata(existing?.metadata);
  const activityTypes = incrementActivityType(existingMetadata.activity_types, input.activityType);
  const metadata = removeUndefinedValues({
    ...existingMetadata,
    activity_types: activityTypes,
    last_activity_type: input.activityType,
    last_bundle_id: input.bundleId,
    last_bundle_item_id: input.bundleItemId,
    last_practice_mode: input.practiceMode,
    last_is_correct: input.isCorrect,
    time_zone: timeZone,
  });

  if (existing) {
    const { data, error } = await supabase
      .from('user_learning_daily_activity')
      .update({
        activity_count: Number(existing.activity_count || 0) + 1,
        first_activity_at: existing.first_activity_at || occurredAtIso,
        last_activity_at: occurredAtIso,
        metadata,
        updated_at: occurredAtIso,
      })
      .eq('id', existing.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating daily learning activity:', error);
      throw error;
    }

    return data as UserLearningDailyActivity;
  }

  const { data, error } = await supabase
    .from('user_learning_daily_activity')
    .insert({
      user_id: input.userId,
      activity_date: activityDate,
      activity_count: 1,
      first_activity_at: occurredAtIso,
      last_activity_at: occurredAtIso,
      metadata,
      created_at: occurredAtIso,
      updated_at: occurredAtIso,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating daily learning activity:', error);
    throw error;
  }

  return data as UserLearningDailyActivity;
}

export async function getLearningStreakSummary(
  userId: string,
  options?: { days?: number; timeZone?: string },
): Promise<LearningStreakSummary> {
  const timeZone = options?.timeZone || DEFAULT_ACTIVITY_TIME_ZONE;
  const today = formatActivityDate(new Date(), timeZone);
  const days = options?.days || 7;
  const lookbackStart = addDays(today, -60);

  const { data, error } = await createAdminClient()
    .from('user_learning_daily_activity')
    .select('activity_date')
    .eq('user_id', userId)
    .gte('activity_date', lookbackStart)
    .order('activity_date', { ascending: false });

  if (error) {
    console.error('Error fetching learning streak summary:', error);
    return {
      currentStreak: 0,
      activeToday: false,
      activeDates: [],
      weekDates: buildWeekDates(today, new Set(), days),
    };
  }

  const activeDates = new Set((data || []).map((row) => String(row.activity_date)));
  const activeToday = activeDates.has(today);
  const yesterday = addDays(today, -1);
  const streakStartDate = activeToday ? today : activeDates.has(yesterday) ? yesterday : null;
  let currentStreak = 0;

  if (streakStartDate) {
    let cursor = streakStartDate;
    while (activeDates.has(cursor)) {
      currentStreak += 1;
      cursor = addDays(cursor, -1);
    }
  }

  return {
    currentStreak,
    activeToday,
    activeDates: Array.from(activeDates),
    weekDates: buildWeekDates(today, activeDates, days),
  };
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

function addDays(dateString: string, days: number) {
  const date = new Date(`${dateString}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function buildWeekDates(today: string, activeDates: Set<string>, days: number) {
  return Array.from({ length: days }, (_, index) => {
    const date = addDays(today, index - days + 1);
    return {
      date,
      active: activeDates.has(date),
    };
  });
}

function normalizeMetadata(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}

function incrementActivityType(value: unknown, activityType: string) {
  const activityTypes = normalizeMetadata(value);
  return {
    ...activityTypes,
    [activityType]: Number(activityTypes[activityType] || 0) + 1,
  };
}

function removeUndefinedValues(value: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(value).filter(([, entryValue]) => entryValue !== undefined),
  );
}
