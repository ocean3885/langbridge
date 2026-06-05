import { Check, Flame } from 'lucide-react';
import type { LearningStreakSummary } from '@/lib/supabase/services/learning-daily-activity';

type DisplayLanguage = 'ko' | 'en';

const copy = {
  ko: {
    dayStreak: (count: number) => `${count}일 연속 학습`,
    freshStart: '오늘부터 학습을 시작해 연속 학습을 만들어봐요.',
    activeToday: '좋아요! 이 흐름을 계속 이어가요.',
    waitingToday: '오늘 학습하면 연속 기록을 이어갈 수 있어요.',
    completed: '학습 완료',
    notCompleted: '미학습',
  },
  en: {
    dayStreak: (count: number) => `${count} Day Streak`,
    freshStart: 'Start today and build your study streak.',
    activeToday: "Great job! Let's keep it going.",
    waitingToday: "Today's lesson is waiting for you.",
    completed: 'completed',
    notCompleted: 'not completed',
  },
};

const previewStreakSummary: LearningStreakSummary = {
  currentStreak: 7,
  activeToday: true,
  activeDates: [],
  weekDates: [
    { date: '2026-05-30', active: true },
    { date: '2026-05-31', active: true },
    { date: '2026-06-01', active: true },
    { date: '2026-06-02', active: true },
    { date: '2026-06-03', active: true },
    { date: '2026-06-04', active: true },
    { date: '2026-06-05', active: true },
  ],
};

export function StreakCard({
  summary = previewStreakSummary,
  language = 'en',
}: {
  summary?: LearningStreakSummary;
  language?: DisplayLanguage;
}) {
  const t = copy[language];
  const sourceWeekDates = summary.weekDates.length > 0 ? summary.weekDates : previewStreakSummary.weekDates;
  const isFreshStart = summary.currentStreak === 0 && !summary.activeToday;
  const todayIndex = Math.min(summary.currentStreak, 6);
  const weekDates = buildStreakTimelineDates({
    todayDateString: sourceWeekDates[sourceWeekDates.length - 1]?.date,
    todayIndex,
    activeDates: summary.activeDates,
    sourceWeekDates,
  });
  const message = isFreshStart
    ? t.freshStart
    : summary.activeToday
      ? t.activeToday
      : t.waitingToday;

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-black/20">
      <h3 className="flex items-center gap-2 font-bold">
        <Flame className="h-5 w-5 text-[#df7c38]" />
        {t.dayStreak(summary.currentStreak)}
      </h3>
      <div className="mt-6 grid grid-cols-7 gap-2 text-center text-xs text-zinc-600 dark:text-zinc-400">
        {weekDates.map((day, index) => {
          const isToday = index === todayIndex;
          const markerClass = day.active
            ? 'bg-[#71a66e] text-white'
            : isToday
              ? 'border-2 border-[#eb7b36] bg-white dark:bg-zinc-900'
              : 'bg-zinc-100 dark:bg-zinc-800';

          return (
            <div key={day.date} className="space-y-3">
              <span>{formatWeekday(day.date, language)}</span>
              <span
                className={`mx-auto flex h-7 w-7 items-center justify-center rounded-full ${markerClass}`}
                aria-label={`${formatDisplayDate(day.date, language)} ${day.active ? t.completed : t.notCompleted}`}
              >
                {day.active && <Check className="h-4 w-4" />}
              </span>
            </div>
          );
        })}
      </div>
      <p className="mt-4 text-center text-sm text-zinc-500 dark:text-zinc-400">{message}</p>
    </div>
  );
}

function formatWeekday(dateString: string, language: DisplayLanguage) {
  const date = new Date(`${dateString}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return '';

  return new Intl.DateTimeFormat(language === 'ko' ? 'ko-KR' : 'en', {
    weekday: 'short',
    timeZone: 'UTC',
  }).format(date);
}

function formatDisplayDate(dateString: string, language: DisplayLanguage) {
  const date = new Date(`${dateString}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return dateString;

  return new Intl.DateTimeFormat(language === 'ko' ? 'ko-KR' : 'en', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

function buildStreakTimelineDates({
  todayDateString,
  todayIndex,
  activeDates,
  sourceWeekDates,
}: {
  todayDateString: string | undefined;
  todayIndex: number;
  activeDates: string[];
  sourceWeekDates: LearningStreakSummary['weekDates'];
}) {
  const today = todayDateString || formatDateString(new Date());
  const activeDateSet = new Set([
    ...activeDates,
    ...sourceWeekDates.filter((day) => day.active).map((day) => day.date),
  ]);
  const startDate = addDays(today, -todayIndex);

  return Array.from({ length: 7 }, (_, index) => ({
    date: addDays(startDate, index),
    active: activeDateSet.has(addDays(startDate, index)),
  }));
}

function addDays(dateString: string, days: number) {
  const date = new Date(`${dateString}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return dateString;

  date.setUTCDate(date.getUTCDate() + days);
  return formatDateString(date);
}

function formatDateString(date: Date) {
  return date.toISOString().slice(0, 10);
}
