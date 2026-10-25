import Link from 'next/link';
import { Check, ChevronRight, Star } from 'lucide-react';
import { getBundleStarProgress } from '@/lib/practice/progress';
import { PRACTICE_REGISTRY, type PracticeBundleItem } from '@/lib/practice/registry';
import type { BundleProgressSummary } from '@/lib/supabase/services/bundle-progress';

const sentenceModeLabels: Record<string, string> = {
  quiz: '문장 퀴즈',
  scramble: '단어 배열',
  wordfill: '빈칸 채우기',
};

export default function BundleAchievementSummary({
  bundleId, items, progress, language, isLoggedIn,
}: {
  bundleId: string;
  items: PracticeBundleItem[];
  progress: BundleProgressSummary;
  language: 'ko' | 'en';
  isLoggedIn: boolean;
}) {
  const ko = language === 'ko';
  const stars = getBundleStarProgress(items, progress.itemInteractions, language);
  const completion = progress.completion;
  const words = completion?.wordProgress;
  const percent = stars.max > 0 ? Math.round(stars.earned / stars.max * 100) : 0;
  const badges = completion?.isCompleted
    ? [ko ? '전체 완료' : 'Bundle complete']
    : [
      completion?.sentenceCompleted ? (ko ? '문장 완료' : 'Sentences complete') : null,
      completion?.wordCompleted ? (ko ? '단어 완료' : 'Words complete') : null,
    ].filter(Boolean);

  return (
    <section aria-label={ko ? '성취도 요약' : 'Achievement summary'} className="min-w-0 rounded-[18px] border border-zinc-100 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 lg:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-bold text-zinc-950 dark:text-zinc-50">{ko ? '나의 성취도' : 'My achievements'}</h2>
        {badges.map(badge => (
          <span key={badge} className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
            <Check aria-hidden="true" className="h-3 w-3 shrink-0" />{badge}
          </span>
        ))}
      </div>
      {isLoggedIn ? (
        <div className="mt-3 space-y-2.5">
          {stars.max > 0 && (
            <div>
              <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 text-xs">
                <span className="inline-flex items-center gap-1 font-medium text-zinc-700 dark:text-zinc-300">
                  <Star aria-hidden="true" className="h-3.5 w-3.5 shrink-0 fill-amber-500 text-amber-500" />
                  {ko ? '마스터리 스타' : 'Mastery stars'}
                </span>
                <span className="font-bold tabular-nums text-amber-700 dark:text-amber-400">{stars.earned} / {stars.max} · {percent}%</span>
              </div>
              <div role="progressbar" aria-label={ko ? '마스터리 스타 달성률' : 'Mastery star progress'} aria-valuemin={0} aria-valuemax={stars.max} aria-valuenow={stars.earned} className="mt-2 h-1.5 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                <div className="h-full rounded-full bg-amber-500" style={{ width: `${Math.min(100, percent)}%` }} />
              </div>
              <ul aria-label={ko ? '문장 연습별 획득 스타' : 'Stars by sentence practice'} className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] leading-5 text-zinc-500 dark:text-zinc-400">
                {stars.modes.filter(mode => mode.max > 0).map(mode => (
                  <li key={mode.mode} className="inline-flex max-w-full flex-wrap items-center gap-x-1">
                    <span>{ko ? sentenceModeLabels[mode.mode] || PRACTICE_REGISTRY[mode.mode].label : PRACTICE_REGISTRY[mode.mode].label}</span>
                    <span className={`whitespace-nowrap font-semibold tabular-nums ${mode.earned >= mode.max ? 'text-emerald-700 dark:text-emerald-400' : 'text-zinc-700 dark:text-zinc-300'}`}>
                      {mode.earned}/{mode.max}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {words && words.total > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-600 dark:text-zinc-400">
              <span>{ko ? '단어 완료' : 'Words completed'}</span>
              <span className="font-semibold tabular-nums text-zinc-800 dark:text-zinc-200">{words.completed} / {words.total}{ko ? '개' : ''}</span>
            </div>
          )}
          {stars.max === 0 && !words?.total && <p className="text-xs text-zinc-500 dark:text-zinc-400">{ko ? '아직 표시할 성취도가 없어요.' : 'No achievements to show yet.'}</p>}
        </div>
      ) : (
        <p className="mt-2 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">{ko ? '로그인하면 학습 성취도를 기록할 수 있어요.' : 'Log in to track your achievements.'}</p>
      )}
      <Link href={`/bundles/${bundleId}`} className="mt-2 inline-flex min-h-9 max-w-full items-center gap-1 text-xs font-semibold text-[#2f7d4a] hover:underline dark:text-emerald-400">
        {ko ? '성취도 자세히 보기' : 'View achievement details'}<ChevronRight aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
      </Link>
    </section>
  );
}
