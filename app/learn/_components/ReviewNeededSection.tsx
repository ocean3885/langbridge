import Link from 'next/link';
import { ArrowRight, BookOpenCheck, Layers, Search } from 'lucide-react';
import type { ReviewNeededSummary } from '@/lib/supabase/services/learning-review';

type DisplayLanguage = 'ko' | 'en';

const copy = {
  ko: {
    title: '복습이 필요해요',
    description: '숙련도가 낮은 항목부터 오늘 복습할 것만 추천해요.',
    sentences: '문장',
    sentenceDescription: '학습한 문장 구조와 표현을 다시 떠올려요.',
    words: '단어',
    wordDescription: '다시 확인이 필요한 단어를 짧게 강화해요.',
    startReview: '시작하기',
    availableTotal: (count: number) => `전체 복습 후보 ${count}개`,
    emptyTitle: '지금은 복습할 항목이 없어요',
    emptyDescription: '새 번들을 학습하면 복습 항목이 여기에 쌓입니다.',
    browseBundles: '새 번들 둘러보기',
  },
  en: {
    title: 'Review Needed',
    description: 'Start with the lowest-proficiency items recommended for today.',
    sentences: 'Sentences',
    sentenceDescription: 'Review sentence patterns and expressions from your bundles.',
    words: 'Words',
    wordDescription: 'Strengthen vocabulary that needs another pass.',
    startReview: 'Start',
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
        </div>

        {hasReviewItems ? (
          <>
            <div className="mt-5 divide-y divide-zinc-100 dark:divide-zinc-800">
              <CompactReviewMetric
                icon={BookOpenCheck}
                label={t.sentences}
                description={t.sentenceDescription}
                value={summary.availableSentences}
                reviewHref="/learn/review/sentences"
                reviewLabel={t.startReview}
                tone="emerald"
              />
              <CompactReviewMetric
                icon={Layers}
                label={t.words}
                description={t.wordDescription}
                value={summary.availableWords}
                reviewHref="/learn/review/words"
                reviewLabel={t.startReview}
                tone="amber"
              />
            </div>
            <p className="mt-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
              {t.availableTotal(summary.availableTotal)}
            </p>
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
      </div>

      <div className="mt-4">
        {hasReviewItems ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <ReviewCountCard
              icon={BookOpenCheck}
              label={t.sentences}
              description={t.sentenceDescription}
              value={summary.availableSentences}
              reviewHref="/learn/review/sentences"
              reviewLabel={t.startReview}
              tone="emerald"
            />
            <ReviewCountCard
              icon={Layers}
              label={t.words}
              description={t.wordDescription}
              value={summary.availableWords}
              reviewHref="/learn/review/words"
              reviewLabel={t.startReview}
              tone="amber"
            />
          </div>
        ) : (
          <div className="flex flex-col gap-5 rounded-xl border border-zinc-200 bg-white p-7 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-black/20 sm:flex-row sm:items-center sm:justify-between">
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
  description,
  value,
  reviewHref,
  reviewLabel,
  tone,
}: {
  icon: typeof BookOpenCheck;
  label: string;
  description: string;
  value: number;
  reviewHref: string;
  reviewLabel: string;
  tone: 'emerald' | 'amber';
}) {
  const toneClass = tone === 'emerald'
    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/35 dark:text-emerald-200'
    : 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-200';

  return (
    <Link href={reviewHref} className="group rounded-xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:border-[#8bbf87] hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-black/20 dark:hover:border-emerald-700">
      <div className="flex items-start justify-between gap-4">
        <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${toneClass}`}>
          <Icon className="h-6 w-6" />
        </span>
        <div className="text-right">
          <p className="text-4xl font-bold tabular-nums text-zinc-900 dark:text-zinc-100">{value}</p>
        </div>
      </div>
      <div className="mt-6">
        <h3 className="text-base font-black text-zinc-900 dark:text-zinc-100">{label}</h3>
        <p className="mt-2 min-h-[44px] text-sm leading-6 text-zinc-500 dark:text-zinc-400">{description}</p>
      </div>
      <ReviewAction label={reviewLabel} />
    </Link>
  );
}

function CompactReviewMetric({
  icon: Icon,
  label,
  description,
  value,
  reviewHref,
  reviewLabel,
  tone,
}: {
  icon: typeof BookOpenCheck;
  label: string;
  description: string;
  value: number;
  reviewHref: string;
  reviewLabel: string;
  tone: 'emerald' | 'amber';
}) {
  const toneClass = tone === 'emerald'
    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/35 dark:text-emerald-200'
    : 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-200';

  return (
    <Link href={reviewHref} className="group grid grid-cols-[1fr_auto] items-center gap-3 py-4 first:pt-0 last:pb-0">
      <div className="flex min-w-0 items-start gap-3">
        <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${toneClass}`}>
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <div className="flex items-baseline gap-2">
            <p className="text-[11px] font-black uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{label}</p>
            <p className="text-lg font-bold tabular-nums text-zinc-900 dark:text-zinc-100">{value}</p>
          </div>
          <p className="mt-1 text-xs leading-5 text-zinc-500 dark:text-zinc-400">{description}</p>
        </div>
      </div>
      <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-zinc-200 text-zinc-500 transition group-hover:border-[#8bbf87] group-hover:bg-[#f1f8ef] group-hover:text-[#3f7d42] dark:border-zinc-700 dark:text-zinc-400 dark:group-hover:border-emerald-700 dark:group-hover:bg-emerald-950/30 dark:group-hover:text-emerald-100 justify-self-end" aria-label={reviewLabel}>
        <ArrowRight className="h-4 w-4" />
      </span>
    </Link>
  );
}

function ReviewAction({ label }: { label: string }) {
  return (
    <span className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-[#4f934f] transition group-hover:text-[#3f7d42] dark:text-emerald-200 dark:group-hover:text-emerald-100">
      <span>{label}</span>
      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#f1f8ef] transition group-hover:bg-[#e5f0e4] dark:bg-emerald-950/40 dark:group-hover:bg-emerald-950/70">
        <ArrowRight className="h-4 w-4" />
      </span>
    </span>
  );
}

function getDisplayHeadingClass(language: DisplayLanguage) {
  return language === 'ko'
    ? 'font-sans font-bold'
    : 'font-serif font-semibold';
}
