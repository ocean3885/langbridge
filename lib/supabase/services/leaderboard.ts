'use server';

import { createAdminClient } from '@/lib/supabase/admin';

export type LeaderboardPeriod = 'daily' | 'weekly' | 'monthly' | 'all';
export type LeaderboardMetric = 'stars' | 'sentences' | 'words' | 'correct';

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  displayName: string;
  avatarSeed: string;
  score: number;
  earnedStars: number;
  completedSentences: number;
  masteredSentences: number;
  practicedWords: number;
  masteredWords: number;
  totalCorrect: number;
  studySeconds: number;
  isCurrentUser?: boolean;
}

export interface LeaderboardResult {
  period: LeaderboardPeriod;
  metric: LeaderboardMetric;
  entries: LeaderboardEntry[];
  currentUserRank: LeaderboardEntry | null;
  totalParticipants: number;
  periodLabel: string;
  dateRange: {
    startDate: string | null;
    endDate: string | null;
  };
}

export interface GetLeaderboardOptions {
  period?: LeaderboardPeriod;
  metric?: LeaderboardMetric;
  currentUserId?: string | null;
  userIds?: string[]; // Optional filter for Phase 2 (Friends) / Phase 3 (30-user Leagues)
  limit?: number;
  timeZone?: string;
}

const DEFAULT_TIME_ZONE = 'Asia/Seoul';

function formatActivityDate(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function getPeriodDateRange(period: LeaderboardPeriod, timeZone: string): { startDate: string | null; endDate: string | null; label: string } {
  const now = new Date();
  const today = formatActivityDate(now, timeZone);

  if (period === 'daily') {
    return {
      startDate: today,
      endDate: today,
      label: '오늘',
    };
  }

  if (period === 'weekly') {
    // Current week Monday ~ Sunday (KST / Local)
    const [year, month, day] = today.split('-').map(Number);
    const dateObj = new Date(Date.UTC(year, month - 1, day));
    const dayOfWeek = dateObj.getUTCDay(); // 0 is Sunday, 1 is Monday...
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    dateObj.setUTCDate(dateObj.getUTCDate() + diffToMonday);
    const startOfWeek = dateObj.toISOString().slice(0, 10);

    return {
      startDate: startOfWeek,
      endDate: today,
      label: '이번 주',
    };
  }

  if (period === 'monthly') {
    const startOfMonth = `${today.slice(0, 7)}-01`;
    return {
      startDate: startOfMonth,
      endDate: today,
      label: '이번 달',
    };
  }

  return {
    startDate: null,
    endDate: null,
    label: '전체 기간',
  };
}

function maskDisplayName(email: string | null | undefined, userId: string): string {
  if (email && email.includes('@')) {
    const [username, domain] = email.split('@');
    if (username.length <= 3) {
      return `${username}***@${domain}`;
    }
    return `${username.slice(0, 3)}***@${domain}`;
  }
  const shortId = userId.slice(0, 6);
  return `학습자 #${shortId}`;
}

export async function getLeaderboard(options: GetLeaderboardOptions = {}): Promise<LeaderboardResult> {
  const period = options.period || 'weekly';
  const metric = options.metric || 'stars';
  const limit = Math.min(Math.max(1, options.limit || 50), 100);
  const timeZone = options.timeZone || DEFAULT_TIME_ZONE;
  const currentUserId = options.currentUserId || null;

  const { startDate, endDate, label: periodLabel } = getPeriodDateRange(period, timeZone);
  const supabase = createAdminClient();

  let query = supabase
    .from('user_learning_daily_activity')
    .select('user_id, earned_stars, completed_sentences, mastered_sentences, practiced_words, mastered_words, total_correct_count, total_incorrect_count, study_seconds');

  if (startDate) {
    query = query.gte('activity_date', startDate);
  }
  if (endDate) {
    query = query.lte('activity_date', endDate);
  }
  if (options.userIds && options.userIds.length > 0) {
    query = query.in('user_id', options.userIds);
  }

  const { data: rows, error } = await query;

  if (error) {
    console.error('Error fetching leaderboard data:', error);
    return {
      period,
      metric,
      entries: [],
      currentUserRank: null,
      totalParticipants: 0,
      periodLabel,
      dateRange: { startDate, endDate },
    };
  }

  // Aggregate stats per user
  const userAggregates = new Map<
    string,
    {
      userId: string;
      earnedStars: number;
      completedSentences: number;
      masteredSentences: number;
      practicedWords: number;
      masteredWords: number;
      totalCorrect: number;
      totalIncorrect: number;
      studySeconds: number;
    }
  >();

  for (const row of rows || []) {
    const userId = row.user_id;
    if (!userId) continue;

    const existing = userAggregates.get(userId) || {
      userId,
      earnedStars: 0,
      completedSentences: 0,
      masteredSentences: 0,
      practicedWords: 0,
      masteredWords: 0,
      totalCorrect: 0,
      totalIncorrect: 0,
      studySeconds: 0,
    };

    existing.earnedStars += Number(row.earned_stars || 0);
    existing.completedSentences += Number(row.completed_sentences || 0);
    existing.masteredSentences += Number(row.mastered_sentences || 0);
    existing.practicedWords += Number(row.practiced_words || 0);
    existing.masteredWords += Number(row.mastered_words || 0);
    existing.totalCorrect += Number(row.total_correct_count || 0);
    existing.totalIncorrect += Number(row.total_incorrect_count || 0);
    existing.studySeconds += Number(row.study_seconds || 0);

    userAggregates.set(userId, existing);
  }

  // If current user is not in results yet (e.g. 0 activity this period), make sure they can still be ranked if requested
  if (currentUserId && !userAggregates.has(currentUserId)) {
    userAggregates.set(currentUserId, {
      userId: currentUserId,
      earnedStars: 0,
      completedSentences: 0,
      masteredSentences: 0,
      practicedWords: 0,
      masteredWords: 0,
      totalCorrect: 0,
      totalIncorrect: 0,
      studySeconds: 0,
    });
  }

  // Calculate score for each user
  const userList = Array.from(userAggregates.values()).map((u) => {
    let score = 0;
    switch (metric) {
      case 'stars':
        score = u.earnedStars;
        break;
      case 'sentences':
        score = u.masteredSentences > 0 ? u.masteredSentences : u.completedSentences;
        break;
      case 'words':
        score = u.masteredWords > 0 ? u.masteredWords : u.practicedWords;
        break;
      case 'correct':
        score = u.totalCorrect;
        break;
    }
    return {
      ...u,
      score,
    };
  });

  // Sort descending by score, tie-breaker: earnedStars -> totalCorrect -> userId
  userList.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.earnedStars !== a.earnedStars) return b.earnedStars - a.earnedStars;
    if (b.totalCorrect !== a.totalCorrect) return b.totalCorrect - a.totalCorrect;
    return a.userId.localeCompare(b.userId);
  });

  // Fetch profiles for users in top ranking + current user
  const userIdsToFetch = Array.from(
    new Set([
      ...userList.slice(0, limit).map((u) => u.userId),
      ...(currentUserId ? [currentUserId] : []),
    ]),
  );

  const profileMap = new Map<string, { email: string | null }>();
  if (userIdsToFetch.length > 0) {
    const { data: profiles } = await supabase
      .from('user_profiles')
      .select('id, email')
      .in('id', userIdsToFetch);

    for (const p of profiles || []) {
      profileMap.set(p.id, { email: p.email });
    }
  }

  let currentUserRank: LeaderboardEntry | null = null;
  const entries: LeaderboardEntry[] = [];

  userList.forEach((user, index) => {
    const rank = index + 1;
    const isCurrentUser = currentUserId === user.userId;
    const profile = profileMap.get(user.userId);
    const displayName = maskDisplayName(profile?.email, user.userId);
    const avatarSeed = user.userId;

    const entry: LeaderboardEntry = {
      rank,
      userId: user.userId,
      displayName,
      avatarSeed,
      score: user.score,
      earnedStars: user.earnedStars,
      completedSentences: user.completedSentences,
      masteredSentences: user.masteredSentences,
      practicedWords: user.practicedWords,
      masteredWords: user.masteredWords,
      totalCorrect: user.totalCorrect,
      studySeconds: user.studySeconds,
      isCurrentUser,
    };

    if (isCurrentUser) {
      currentUserRank = entry;
    }

    if (index < limit) {
      entries.push(entry);
    }
  });

  return {
    period,
    metric,
    entries,
    currentUserRank,
    totalParticipants: userList.length,
    periodLabel,
    dateRange: {
      startDate,
      endDate,
    },
  };
}
