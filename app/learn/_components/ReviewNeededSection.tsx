import Link from 'next/link';
import { ArrowRight, BookOpenCheck, Layers, Search } from 'lucide-react';
import type { ReviewNeededSummary } from '@/lib/supabase/services/bundle-progress';

type DisplayLanguage = 'ko' | 'en';

const copy = {
  ko: {
    title: '복습이 필요해요',
    description: '숙련도가 낮은 항목부터 오늘 복습할 것만 추천해요.',
    total: (count: number, limit: number) => `오늘 추천 ${count}/${limit}`,
    sentences: '문장',
    words: '단어',
    startReview: '복습 시작하기',
    moreReview: '더 복습하기',
    sentenceReview: '문장 복습',
    wordReview: '단어 복습',
    availableTotal: (count: number) => `전체 복습 후보 ${count}개`,
    emptyTitle: '지금은 복습할 항목이 없어요',
    emptyDescription: '새 번들을 학습하면 복습 항목이 여기에 쌓입니다.',
    browseBundles: '새 번들 둘러보기',
  },
  en: {
    title: 'Review Needed',
    description: 'Start with the lowest-proficiency items recommended for today.',
    total: (count: number, limit: number) => `${count}/${limit} today`,
    sentences: 'Sentences',
    words: 'Words',
    startReview: 'Start Review',
    moreReview: 'More Review',
    sentenceReview: 'Sentences',
    wordReview: 'Words',
    availableTotal: (count: number) => `${count} available to review`,
    emptyTitle: 'Nothing to review right now',
    emptyDescription: 'Study a new bundle and review items will appear here.',
    browseBundles: 'Browse Bundles',
  },
};

export function ReviewNeededSection({
  summary,
  language,
  compact = false,
}: {
  summary: ReviewNeededSummary;
  language: DisplayLanguage;
  compact?: boolean;
}) {
  const t = copy[language];
  const hasReviewItems = summary.total > 0;

  if (compact) {
    return (
      <aside className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-black/20">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className={`${getDisplayHeadingClass(language)} text-xl`}>{t.title}</h3>
            <p className="mt-2 text-sm leading-6 text-zinc-500 dark:text-zinc-400">{t.description}</p>
          </div>
          {hasReviewItems && (
            <span className="shrink-0 rounded-full bg-[#f1f8ef] px-3 py-1 text-xs font-bold text-[#4f934f] dark:bg-emerald-950/40 dark:text-emerald-200">
              {summary.total}/{summary.limit}
            </span>
          )}
        </div>

        {hasReviewItems ? (
          <>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <CompactReviewMetric
                icon={BookOpenCheck}
                label={t.sentences}
                value={summary.sentences}
                availableValue={summary.availableSentences}
                tone="emerald"
              />
              <CompactReviewMetric
                icon={Layers}
                label={t.words}
                value={summary.words}
                availableValue={summary.availableWords}
                tone="amber"
              />
            </div>
            <p className="mt-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
              {t.availableTotal(summary.availableTotal)}
            </p>
            <div className="mt-5 grid gap-2">
              <Link href="/bundles" className="inline-flex items-center justify-center gap-2 rounded-full bg-[#63a464] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#4e9250]">
                {t.startReview}
                <ArrowRight className="h-4 w-4" />
              </Link>
              {summary.availableTotal > summary.total && (
                <Link href="/bundles" className="rounded-full border border-zinc-200 px-4 py-2 text-center text-xs font-bold text-zinc-600 transition hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800">
                  {t.moreReview}
                </Link>
              )}
            </div>
          </>
        ) : (
          <div className="mt-5 flex items-start gap-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#e5f0e4] text-[#5d9361] dark:bg-emerald-950/50 dark:text-emerald-200">
              <Search className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <h4 className="font-bold">{t.emptyTitle}</h4>
              <p className="mt-1 text-sm leading-6 text-zinc-500 dark:text-zinc-400">{t.emptyDescription}</p>
              <Link href="/bundles" className="mt-4 inline-flex rounded-full bg-[#63a464] px-5 py-2 text-xs font-bold text-white transition hover:bg-[#4e9250]">
                {t.browseBundles}
              </Link>
            </div>
          </div>
        )}
      </aside>
    );
  }

  return (
    <section>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className={`${getDisplayHeadingClass(language)} text-2xl`}>{t.title}</h2>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">{t.description}</p>
        </div>
        {hasReviewItems && (
          <span className="inline-flex w-fit rounded-full bg-[#f1f8ef] px-4 py-2 text-sm font-bold text-[#4f934f] dark:bg-emerald-950/40 dark:text-emerald-200">
            {t.total(summary.total, summary.limit)}
          </span>
        )}
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-black/20">
        {hasReviewItems ? (
          <div className="grid gap-0 md:grid-cols-[1fr_auto]">
            <div className="grid divide-y divide-zinc-100 dark:divide-zinc-800 sm:grid-cols-2 sm:divide-x sm:divide-y-0">
              <ReviewCountCard
                icon={BookOpenCheck}
                label={t.sentences}
                value={summary.sentences}
                availableValue={summary.availableSentences}
                tone="emerald"
              />
              <ReviewCountCard
                icon={Layers}
                label={t.words}
                value={summary.words}
                availableValue={summary.availableWords}
                tone="amber"
              />
            </div>
            <div className="flex flex-col justify-center gap-3 border-t border-zinc-100 p-5 dark:border-zinc-800 md:min-w-[220px] md:border-l md:border-t-0">
              <p className="text-center text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                {t.availableTotal(summary.availableTotal)}
              </p>
              <Link href="/bundles" className="inline-flex items-center justify-center gap-2 rounded-full bg-[#63a464] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#4e9250]">
                {t.startReview}
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/bundles" className="rounded-full border border-[#63a464]/30 bg-[#f1f8ef] px-3 py-2 text-center text-xs font-bold text-[#4f934f] transition hover:bg-[#e5f0e4] dark:border-emerald-800/60 dark:bg-emerald-950/30 dark:text-emerald-200 dark:hover:bg-emerald-950/50">
                {t.moreReview}
              </Link>
              <div className="grid grid-cols-2 gap-2">
                <Link href="/bundles" className="rounded-full border border-zinc-200 px-3 py-2 text-center text-xs font-semibold text-zinc-600 transition hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800">
                  {t.sentenceReview}
                </Link>
                <Link href="/bundles" className="rounded-full border border-zinc-200 px-3 py-2 text-center text-xs font-semibold text-zinc-600 transition hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800">
                  {t.wordReview}
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-5 p-7 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#e5f0e4] text-[#5d9361] dark:bg-emerald-950/50 dark:text-emerald-200">
                <Search className="h-7 w-7" />
              </span>
              <div>
                <h3 className={`${getDisplayHeadingClass(language)} text-xl`}>{t.emptyTitle}</h3>
                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{t.emptyDescription}</p>
              </div>
            </div>
            <Link href="/bundles" className="inline-flex items-center justify-center rounded-full bg-[#63a464] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#4e9250]">
              {t.browseBundles}
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}

function ReviewCountCard({
  icon: Icon,
  label,
  value,
  availableValue,
  tone,
}: {
  icon: typeof BookOpenCheck;
  label: string;
  value: number;
  availableValue: number;
  tone: 'emerald' | 'amber';
}) {
  const toneClass = tone === 'emerald'
    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/35 dark:text-emerald-200'
    : 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-200';

  return (
    <div className="flex items-center gap-4 p-5">
      <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${toneClass}`}>
        <Icon className="h-6 w-6" />
      </span>
      <div>
        <p className="text-3xl font-bold tabular-nums text-zinc-900 dark:text-zinc-100">{value}</p>
        <p className="mt-1 text-xs font-black uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{label}</p>
        {availableValue > value && (
          <p className="mt-1 text-xs font-semibold text-zinc-400 dark:text-zinc-500">/ {availableValue}</p>
        )}
      </div>
    </div>
  );
}

function CompactReviewMetric({
  icon: Icon,
  label,
  value,
  availableValue,
  tone,
}: {
  icon: typeof BookOpenCheck;
  label: string;
  value: number;
  availableValue: number;
  tone: 'emerald' | 'amber';
}) {
  const toneClass = tone === 'emerald'
    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/35 dark:text-emerald-200'
    : 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-200';

  return (
    <div className="flex items-center gap-3 rounded-lg border border-zinc-100 p-3 dark:border-zinc-800">
      <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${toneClass}`}>
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <div className="flex items-baseline gap-1">
          <p className="text-2xl font-bold tabular-nums text-zinc-900 dark:text-zinc-100">{value}</p>
          {availableValue > value && (
            <p className="text-xs font-semibold text-zinc-400 dark:text-zinc-500">/ {availableValue}</p>
          )}
        </div>
        <p className="truncate text-[11px] font-black uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{label}</p>
      </div>
    </div>
  );
}

function getDisplayHeadingClass(language: DisplayLanguage) {
  return language === 'ko'
    ? 'font-sans font-bold'
    : 'font-serif font-semibold';
}
