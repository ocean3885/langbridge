'use client';

import { useState, useTransition } from 'react';
import {
  Award,
  Calendar,
  CheckCircle2,
  Crown,
  Flame,
  Loader2,
  Medal,
  Sparkles,
  Star,
  Target,
  Trophy,
  Users,
} from 'lucide-react';
import {
  getLeaderboard,
  type LeaderboardEntry,
  type LeaderboardMetric,
  type LeaderboardPeriod,
  type LeaderboardResult,
} from '@/lib/supabase/services/leaderboard';

type DisplayLanguage = 'ko' | 'en';

interface RankingsClientProps {
  language: DisplayLanguage;
  currentUserId: string;
  initialData: LeaderboardResult;
}

const copy = {
  ko: {
    periods: {
      weekly: '이번 주',
      daily: '오늘',
      monthly: '이번 달',
      all: '전체',
    },
    metrics: {
      stars: '스타 (Stars)',
      sentences: '마스터 문장',
      words: '마스터 단어',
      correct: '정답 수',
    },
    metricUnits: {
      stars: '⭐',
      sentences: '개',
      words: '개',
      correct: '회',
    },
    podiumRanks: ['1위', '2위', '3위'],
    emptyTitle: '아직 학습 기록이 없습니다',
    emptySubtitle: '지금 학습을 시작하여 랭킹의 첫 주인공이 되어보세요!',
    startStudy: '학습 시작하기',
    myRankTitle: '내 현재 순위',
    unranked: '순위권 외',
    totalLearners: (n: number) => `총 ${n}명의 학습자 참여 중`,
    scoreLabel: '포인트',
    youBadge: '나',
    streakBadge: '학습 중',
    rankText: (r: number) => `${r}위`,
  },
  en: {
    periods: {
      weekly: 'This Week',
      daily: 'Today',
      monthly: 'This Month',
      all: 'All Time',
    },
    metrics: {
      stars: 'Stars',
      sentences: 'Mastered Sentences',
      words: 'Mastered Words',
      correct: 'Correct Answers',
    },
    metricUnits: {
      stars: '⭐',
      sentences: 'sentences',
      words: 'words',
      correct: 'correct',
    },
    podiumRanks: ['1st', '2nd', '3rd'],
    emptyTitle: 'No learning records yet',
    emptySubtitle: 'Start studying now to claim the top spot on the leaderboard!',
    startStudy: 'Start Learning',
    myRankTitle: 'My Ranking',
    unranked: 'Unranked',
    totalLearners: (n: number) => `${n} active learners`,
    scoreLabel: 'Points',
    youBadge: 'YOU',
    streakBadge: 'Active',
    rankText: (r: number) => `#${r}`,
  },
};

const AVATAR_GRADIENTS = [
  'from-pink-500 to-rose-500',
  'from-purple-500 to-indigo-500',
  'from-blue-500 to-cyan-500',
  'from-emerald-500 to-teal-500',
  'from-amber-500 to-orange-500',
  'from-violet-500 to-fuchsia-500',
];

function getAvatarGradient(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % AVATAR_GRADIENTS.length;
  return AVATAR_GRADIENTS[index];
}

export default function RankingsClient({
  language,
  currentUserId,
  initialData,
}: RankingsClientProps) {
  const [leaderboard, setLeaderboard] = useState<LeaderboardResult>(initialData);
  const [period, setPeriod] = useState<LeaderboardPeriod>(initialData.period);
  const [metric, setMetric] = useState<LeaderboardMetric>(initialData.metric);
  const [isPending, startTransition] = useTransition();

  const t = copy[language];

  const handleFilterChange = (newPeriod: LeaderboardPeriod, newMetric: LeaderboardMetric) => {
    setPeriod(newPeriod);
    setMetric(newMetric);
    startTransition(async () => {
      try {
        const data = await getLeaderboard({
          period: newPeriod,
          metric: newMetric,
          currentUserId,
          limit: 50,
        });
        setLeaderboard(data);
      } catch (err) {
        console.error('Failed to update leaderboard:', err);
      }
    });
  };

  const top3 = leaderboard.entries.slice(0, 3);
  const remaining = leaderboard.entries.slice(3);
  const currentUserEntry = leaderboard.currentUserRank;

  // Podium order: [2nd (left), 1st (center), 3rd (right)]
  const podiumOrder = [
    top3.find((e) => e.rank === 2),
    top3.find((e) => e.rank === 1),
    top3.find((e) => e.rank === 3),
  ].filter(Boolean) as LeaderboardEntry[];

  return (
    <div className="space-y-6 pb-20">
      {/* Filters Bar */}
      <div className="flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 md:p-5">
        {/* Period Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 pb-4 dark:border-zinc-800">
          <div className="flex flex-wrap items-center gap-1.5 rounded-xl bg-zinc-100 p-1 dark:bg-zinc-800">
            {(['weekly', 'daily', 'monthly', 'all'] as LeaderboardPeriod[]).map((p) => {
              const active = period === p;
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => handleFilterChange(p, metric)}
                  disabled={isPending}
                  className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all sm:text-sm ${
                    active
                      ? 'bg-white text-emerald-600 shadow-sm dark:bg-zinc-700 dark:text-emerald-400'
                      : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200'
                  }`}
                >
                  {t.periods[p]}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2 text-xs font-medium text-zinc-500 dark:text-zinc-400">
            <Users className="h-4 w-4 text-emerald-500" />
            <span>{t.totalLearners(leaderboard.totalParticipants)}</span>
            {isPending && <Loader2 className="h-4 w-4 animate-spin text-emerald-500" />}
          </div>
        </div>

        {/* Metric Tabs */}
        <div className="flex flex-wrap items-center gap-2">
          {(
            [
              { id: 'stars', icon: Star, color: 'text-amber-500' },
              { id: 'sentences', icon: Target, color: 'text-emerald-500' },
              { id: 'words', icon: Sparkles, color: 'text-blue-500' },
              { id: 'correct', icon: CheckCircle2, color: 'text-purple-500' },
            ] as const
          ).map(({ id, icon: Icon, color }) => {
            const active = metric === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => handleFilterChange(period, id)}
                disabled={isPending}
                className={`inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-bold transition-all sm:text-sm ${
                  active
                    ? 'border-emerald-500 bg-emerald-50/70 text-emerald-800 shadow-sm dark:border-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300'
                    : 'border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800'
                }`}
              >
                <Icon className={`h-4 w-4 ${color}`} />
                {t.metrics[id]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Top 3 Podium Section */}
      {top3.length > 0 ? (
        <div className="rounded-3xl border border-zinc-200/80 bg-gradient-to-b from-white via-zinc-50 to-zinc-100 p-6 shadow-sm dark:border-zinc-800/80 dark:from-zinc-900 dark:via-zinc-900/60 dark:to-zinc-950 md:p-8">
          <div className="mb-6 text-center">
            <h2 className="text-lg font-black tracking-tight text-zinc-900 dark:text-white sm:text-xl">
              ✨ {leaderboard.periodLabel} TOP 3
            </h2>
          </div>

          <div className="grid grid-cols-1 items-end gap-4 sm:grid-cols-3 sm:gap-6">
            {podiumOrder.map((entry) => {
              const isFirst = entry.rank === 1;
              const isSecond = entry.rank === 2;
              const isThird = entry.rank === 3;

              const heightClass = isFirst
                ? 'sm:order-2 order-1'
                : isSecond
                ? 'sm:order-1 order-2'
                : 'sm:order-3 order-3';

              const ringColor = isFirst
                ? 'ring-4 ring-amber-400 dark:ring-amber-500 shadow-amber-200 dark:shadow-amber-950/50'
                : isSecond
                ? 'ring-3 ring-zinc-300 dark:ring-zinc-600 shadow-zinc-200 dark:shadow-zinc-900'
                : 'ring-3 ring-amber-700/50 dark:ring-amber-700 shadow-amber-900/20';

              const bgBadge = isFirst
                ? 'bg-amber-500 text-white'
                : isSecond
                ? 'bg-zinc-400 text-white'
                : 'bg-amber-700 text-white';

              return (
                <div
                  key={entry.userId}
                  className={`relative flex flex-col items-center rounded-2xl border p-5 text-center transition-all ${
                    entry.isCurrentUser
                      ? 'border-emerald-500 bg-emerald-50/50 shadow-md dark:border-emerald-600 dark:bg-emerald-950/30'
                      : 'border-zinc-200 bg-white/90 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/80'
                  } ${heightClass}`}
                >
                  {/* Rank Crown/Medal */}
                  <div className="absolute -top-3">
                    <div
                      className={`inline-flex items-center gap-1 rounded-full px-3 py-0.5 text-xs font-black shadow-md ${bgBadge}`}
                    >
                      {isFirst ? <Crown className="h-3.5 w-3.5" /> : <Medal className="h-3.5 w-3.5" />}
                      {t.podiumRanks[entry.rank - 1]}
                    </div>
                  </div>

                  {/* Avatar */}
                  <div className="mt-3">
                    <div
                      className={`flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-tr text-xl font-black text-white shadow-lg sm:h-20 sm:w-20 ${getAvatarGradient(
                        entry.avatarSeed,
                      )} ${ringColor}`}
                    >
                      {entry.displayName.slice(0, 1).toUpperCase()}
                    </div>
                  </div>

                  {/* User info */}
                  <div className="mt-3 w-full">
                    <div className="flex items-center justify-center gap-1.5">
                      <p className="truncate text-sm font-bold text-zinc-900 dark:text-white sm:text-base">
                        {entry.displayName}
                      </p>
                      {entry.isCurrentUser && (
                        <span className="rounded bg-emerald-500 px-1.5 py-0.5 text-[10px] font-black text-white">
                          {t.youBadge}
                        </span>
                      )}
                    </div>

                    {/* Score */}
                    <div className="mt-2 rounded-xl bg-zinc-100/80 px-3 py-2 dark:bg-zinc-800/80">
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">{t.scoreLabel}</p>
                      <p className="text-lg font-black text-zinc-900 dark:text-white sm:text-xl">
                        {entry.score.toLocaleString()} {t.metricUnits[metric]}
                      </p>
                    </div>

                    {/* Secondary stats */}
                    <div className="mt-3 flex items-center justify-around text-[11px] text-zinc-500 dark:text-zinc-400">
                      <span title="획득 스타">⭐ {entry.earnedStars}</span>
                      <span title="마스터 문장">📝 {entry.masteredSentences}</span>
                      <span title="정답 수">🎯 {entry.totalCorrect}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="rounded-3xl border border-dashed border-zinc-300 bg-white p-12 text-center dark:border-zinc-800 dark:bg-zinc-900">
          <Trophy className="mx-auto h-12 w-12 text-zinc-300 dark:text-zinc-700" />
          <h3 className="mt-3 text-base font-bold text-zinc-800 dark:text-zinc-200">{t.emptyTitle}</h3>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{t.emptySubtitle}</p>
        </div>
      )}

      {/* Leaderboard List (Rank 4 ~ 50) */}
      {remaining.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="border-b border-zinc-100 px-5 py-3.5 dark:border-zinc-800">
            <h3 className="text-sm font-bold text-zinc-700 dark:text-zinc-300">순위 목록</h3>
          </div>
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {remaining.map((entry) => (
              <div
                key={entry.userId}
                className={`flex items-center justify-between px-4 py-3.5 transition-colors sm:px-6 ${
                  entry.isCurrentUser
                    ? 'bg-emerald-50/60 dark:bg-emerald-950/30'
                    : 'hover:bg-zinc-50/80 dark:hover:bg-zinc-800/50'
                }`}
              >
                <div className="flex items-center gap-3 sm:gap-4">
                  {/* Rank */}
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-100 text-xs font-black text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                    {entry.rank}
                  </span>

                  {/* Avatar */}
                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-tr text-xs font-black text-white shadow ${getAvatarGradient(
                      entry.avatarSeed,
                    )}`}
                  >
                    {entry.displayName.slice(0, 1).toUpperCase()}
                  </div>

                  {/* Display Name */}
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-zinc-900 dark:text-white sm:text-sm">
                        {entry.displayName}
                      </span>
                      {entry.isCurrentUser && (
                        <span className="rounded bg-emerald-500 px-1.5 py-0.5 text-[9px] font-black text-white">
                          {t.youBadge}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-zinc-400 dark:text-zinc-500">
                      <span>⭐ {entry.earnedStars}</span>
                      <span>•</span>
                      <span>🎯 {entry.totalCorrect}정답</span>
                    </div>
                  </div>
                </div>

                {/* Score */}
                <div className="text-right">
                  <span className="text-sm font-black text-zinc-900 dark:text-white sm:text-base">
                    {entry.score.toLocaleString()}
                  </span>
                  <span className="ml-1 text-xs text-zinc-500 dark:text-zinc-400">
                    {t.metricUnits[metric]}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Persistent My Rank Sticky Card */}
      {currentUserEntry && (
        <div className="sticky bottom-4 z-20 mx-auto max-w-2xl rounded-2xl border border-emerald-500/40 bg-white/95 p-4 shadow-xl backdrop-blur dark:border-emerald-500/30 dark:bg-zinc-900/95">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500 text-sm font-black text-white shadow-md">
                {currentUserEntry.rank ? t.rankText(currentUserEntry.rank) : '-'}
              </div>
              <div>
                <p className="text-xs font-bold text-zinc-500 dark:text-zinc-400">{t.myRankTitle}</p>
                <p className="text-sm font-black text-zinc-900 dark:text-white">
                  {currentUserEntry.displayName}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-xs text-zinc-500 dark:text-zinc-400">{t.scoreLabel}</p>
                <p className="text-base font-black text-emerald-600 dark:text-emerald-400">
                  {currentUserEntry.score.toLocaleString()} {t.metricUnits[metric]}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
