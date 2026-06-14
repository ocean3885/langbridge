'use client';

import { useRouter } from 'next/navigation';
import { FormEvent, useMemo, useState, useTransition } from 'react';
import { Star } from 'lucide-react';
import type { LearningGoalSummary } from '@/lib/supabase/services/learning-goal-preferences';

type DisplayLanguage = 'ko' | 'en';

const goalCopy = {
  ko: {
    title: '오늘의 목표',
    edit: '수정',
    save: '저장',
    cancel: '취소',
    unit: '문제',
    goalMet: '오늘 목표를 달성했어요!',
    empty: '오늘 첫 학습을 시작해봐요.',
    keepGoing: '계속 좋아요!',
    inputLabel: '하루 목표 문제 수',
    error: '목표를 저장하지 못했습니다.',
  },
  en: {
    title: "Today's Goal",
    edit: 'Edit',
    save: 'Save',
    cancel: 'Cancel',
    unit: 'answers',
    goalMet: 'Goal complete for today!',
    empty: 'Answer your first question today.',
    keepGoing: 'Keep going!',
    inputLabel: 'Daily goal answers',
    error: 'Could not save goal.',
  },
};

const previewGoalSummary: LearningGoalSummary = {
  todayCount: 16,
  dailyGoalCount: 20,
  progressPercent: 80,
  goalMet: false,
};

const previewCopy = {
  ko: {
    learnedTitle: '최근 학습한 단어',
    review: '복습하기',
    progressTitle: '학습 추이',
    progressRows: [
      ['획득한 별', '42'],
      ['완료한 문장', '128'],
      ['정답률', '86%'],
    ],
    words: [
      ['pedir', '주문하다'],
      ['delicioso', '맛있는'],
      ['el menu', '메뉴'],
      ['la cuenta', '계산서'],
      ['gracias', '고마워요'],
    ],
  },
  en: {
    learnedTitle: 'Recently Learned',
    review: 'Review',
    progressTitle: 'Progress',
    progressRows: [
      ['Earned Stars', '42'],
      ['Sentences Completed', '128'],
      ['Practice Accuracy', '86%'],
    ],
    words: [
      ['pedir', 'to order'],
      ['delicioso', 'delicious'],
      ['el menu', 'the menu'],
      ['la cuenta', 'the bill'],
      ['gracias', 'thank you'],
    ],
  },
};

export function GoalCard({
  summary = previewGoalSummary,
  language = 'en',
  editable = false,
}: {
  summary?: LearningGoalSummary;
  language?: DisplayLanguage;
  editable?: boolean;
}) {
  const router = useRouter();
  const t = goalCopy[language];
  const [currentSummary, setCurrentSummary] = useState(summary);
  const [isEditing, setIsEditing] = useState(false);
  const [goalInput, setGoalInput] = useState(String(summary.dailyGoalCount));
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const displayPercent = Math.max(0, currentSummary.progressPercent);
  const displayPercentText = Math.min(999, displayPercent);
  const progressPercent = Math.min(100, displayPercent);
  const progressDegrees = useMemo(() => `${progressPercent * 3.6}deg`, [progressPercent]);
  const helperText = currentSummary.goalMet
    ? t.goalMet
    : currentSummary.todayCount <= 0
      ? t.empty
      : t.keepGoing;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const nextGoal = Number(goalInput);
    if (!Number.isFinite(nextGoal) || nextGoal < 1 || nextGoal > 100) {
      setError(t.error);
      return;
    }

    startTransition(() => {
      void (async () => {
        const response = await fetch('/api/learning-goal', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ daily_goal_count: nextGoal }),
        });

        if (!response.ok) {
          setError(t.error);
          return;
        }

        const nextSummary = (await response.json()) as LearningGoalSummary;
        setCurrentSummary(nextSummary);
        setGoalInput(String(nextSummary.dailyGoalCount));
        setIsEditing(false);
        router.refresh();
      })();
    });
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-black/20">
      <div className="mb-5 flex items-center justify-between">
        <h3 className={`${language === 'ko' ? 'font-sans font-bold' : 'font-serif font-semibold'} text-xl`}>
          {t.title}
        </h3>
        {editable && !isEditing && (
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="rounded-full px-2 py-1 text-sm font-medium text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
          >
            {t.edit}
          </button>
        )}
      </div>
      <div className="flex items-center gap-6">
        <div
          className="relative flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-[#e8eee5] dark:bg-zinc-800"
          aria-label={`${displayPercentText}%`}
          role="progressbar"
          aria-valuenow={displayPercentText}
          aria-valuemin={0}
          aria-valuemax={999}
        >
          <div
            className="absolute inset-0 rounded-full"
            style={{ background: `conic-gradient(#66a665 ${progressDegrees}, transparent 0deg)` }}
          />
          <div className="absolute inset-[9px] rounded-full bg-white dark:bg-zinc-900" />
          <span className="relative text-2xl font-bold">{displayPercentText}%</span>
        </div>
        <div className="min-w-0 flex-1">
          {isEditing ? (
            <form onSubmit={handleSubmit} className="space-y-3">
              <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                {t.inputLabel}
              </label>
              <input
                type="number"
                min={1}
                max={100}
                value={goalInput}
                onChange={(event) => setGoalInput(event.target.value)}
                className="h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm font-semibold outline-none transition focus:border-[#66a665] focus:ring-2 focus:ring-[#66a665]/20 dark:border-zinc-700 dark:bg-zinc-950"
              />
              {error && <p className="text-xs text-red-500">{error}</p>}
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={isPending}
                  className="rounded-full bg-[#63a464] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#4e9250] disabled:opacity-60"
                >
                  {t.save}
                </button>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => {
                    setIsEditing(false);
                    setGoalInput(String(currentSummary.dailyGoalCount));
                    setError(null);
                  }}
                  className="rounded-full border border-zinc-200 px-4 py-2 text-xs font-bold text-zinc-600 transition hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  {t.cancel}
                </button>
              </div>
            </form>
          ) : (
            <>
              <p className="text-2xl font-bold">
                {currentSummary.todayCount} / {currentSummary.dailyGoalCount}
              </p>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">{t.unit}</p>
              <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">{helperText}</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export function MiniListCard({ language = 'en' }: { language?: DisplayLanguage }) {
  const t = previewCopy[language];

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-black/20">
      <h3 className="mb-4 font-bold">{t.learnedTitle}</h3>
      {t.words.map(([word, meaning]) => (
        <div key={word} className="flex items-center justify-between py-2 text-sm">
          <strong>{word}</strong>
          <span className="text-zinc-500 dark:text-zinc-400">{meaning}</span>
        </div>
      ))}
      <button className="mt-4 w-full rounded-lg border border-zinc-200 py-2 text-sm font-semibold transition hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800">
        {t.review}
      </button>
    </div>
  );
}

export function ProgressChartCard({ language = 'en' }: { language?: DisplayLanguage }) {
  const t = previewCopy[language];

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-black/20">
      <div className="mb-5">
        <h3 className={`${language === 'ko' ? 'font-sans font-bold' : 'font-serif font-semibold'} text-xl`}>
          {t.progressTitle}
        </h3>
      </div>
      <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
        {t.progressRows.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between py-3 text-sm">
            <span className="inline-flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
              {label === t.progressRows[0][0] && <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-500" />}
              {label}
            </span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
      <div className="mt-5 rounded-lg bg-[#f5f8f1] px-3 py-2 text-xs font-medium text-[#5f7f56] dark:bg-zinc-800 dark:text-emerald-200">
        {language === 'ko'
          ? '가입 후 학습 기록이 쌓이면 이 수치들이 자동으로 업데이트됩니다.'
          : 'These numbers update automatically as you learn after signing up.'}
      </div>
    </div>
  );
}
