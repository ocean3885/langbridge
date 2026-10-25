import type { LearningStreakSummary } from '@/lib/supabase/services/learning-daily-activity';

export function RecentActivitySection({ summary, language }: { summary: LearningStreakSummary; language: 'ko' | 'en' }) {
  const ko = language === 'ko';
  const activeDays = summary.weekDates.filter(day => day.active).length;
  const dateLabel = (date: string) => new Intl.DateTimeFormat(ko ? 'ko-KR' : 'en', {
    timeZone: 'UTC', month: 'numeric', day: 'numeric',
  }).format(new Date(`${date}T00:00:00Z`));

  return (
    <section className="mt-7 rounded-lg border border-zinc-200 p-5 dark:border-zinc-800 sm:p-6">
      <h2 className="text-xl font-bold">{ko ? '최근 7일 학습 활동' : 'Learning activity · last 7 days'}</h2>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
        {ko ? `최근 7일 중 ${activeDays}일 학습했어요.` : `You studied on ${activeDays} of the last 7 days.`}
      </p>
      <ul className="mt-5 grid grid-cols-7 gap-1.5 sm:gap-3">
        {summary.weekDates.map(({ date, active }, index) => (
          <li key={date} className={`rounded-lg border px-1 py-3 text-center ${active ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200' : 'border-zinc-200 bg-zinc-50 text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400'}`}>
            <time dateTime={date} className="block text-[11px] sm:text-sm">{dateLabel(date)}</time>
            <span className="my-2 block text-lg font-bold" aria-hidden="true">{active ? '✓' : '—'}</span>
            <span className="sr-only">{active ? (ko ? '학습 기록 있음' : 'Learning recorded') : (ko ? '학습 기록 없음' : 'No learning recorded')}</span>
            {index === summary.weekDates.length - 1 && <span className="block text-[10px] font-semibold">{ko ? '오늘' : 'Today'}</span>}
          </li>
        ))}
      </ul>
      {activeDays === 0 && <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-300">{ko ? '오늘은 가벼운 연습으로 시작해볼까요?' : 'Ready to get started? Try a little practice today.'}</p>}
    </section>
  );
}
