'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, BookOpen, ChevronDown, ChevronUp, Flame, MessagesSquare } from 'lucide-react';
import type { ReviewDueBundle } from '@/lib/supabase/services/learning-review';

interface ReviewBundlesSectionProps {
  bundles: ReviewDueBundle[];
  language: 'ko' | 'en';
}

const INITIAL_VISIBLE_COUNT = 4;

export default function ReviewBundlesSection({ bundles, language }: ReviewBundlesSectionProps) {
  const [expanded, setExpanded] = useState(false);
  const ko = language === 'ko';

  if (!bundles || bundles.length === 0) return null;

  const visibleBundles = expanded ? bundles : bundles.slice(0, INITIAL_VISIBLE_COUNT);
  const hasMore = bundles.length > INITIAL_VISIBLE_COUNT;
  const remainingCount = bundles.length - INITIAL_VISIBLE_COUNT;

  return (
    <section className="mt-10 border-t border-zinc-200 pt-8 dark:border-zinc-800">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold sm:text-2xl">
              {ko ? '번들별 복습' : 'Bundle Review'}
            </h2>
            <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-bold text-green-800 dark:bg-green-950/80 dark:text-green-300">
              {ko ? `${bundles.length}개 번들 대기` : `${bundles.length} bundles`}
            </span>
          </div>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {bundles.length >= 4
              ? (ko
                ? '복습할 번들이 많을 때는 가장 급한 번들부터 하루 1~2개씩 가볍게 확인해보세요.'
                : 'When many bundles are due, start light with 1–2 of the most urgent each day.')
              : (ko
                ? '학습했던 번들 단위로 모아서 복습할 수 있어요.'
                : 'Review expressions and words grouped by the bundle you studied.')}
          </p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        {visibleBundles.map((bundle, index) => {
          const isTopUrgent = index === 0;
          const title = (ko ? bundle.title : bundle.title_en) || bundle.title;
          const categoryName = (ko ? bundle.category_name : bundle.category_name_en) || bundle.category_name;
          const hasBoth = bundle.availableSentences > 0 && bundle.availableWords > 0;
          const primaryType = bundle.availableSentences >= bundle.availableWords ? 'sentences' : 'words';

          return (
            <div
              key={bundle.id}
              className={`relative flex flex-col justify-between rounded-xl border p-5 transition-all ${
                isTopUrgent
                  ? 'border-green-300 bg-gradient-to-br from-green-50/70 to-white shadow-sm dark:border-green-800 dark:from-green-950/30 dark:to-zinc-900'
                  : 'border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center rounded-md bg-zinc-100 px-2 py-0.5 text-xs font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                    {categoryName || (ko ? '일반' : 'General')}
                  </span>
                  {isTopUrgent && (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-600 dark:text-amber-400">
                      <Flame className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                      {ko ? '가장 시급한 복습' : 'Most urgent'}
                    </span>
                  )}
                </div>

                <h3 className="mt-2.5 text-base font-bold text-zinc-900 dark:text-zinc-100">
                  <Link
                    href={`/bundles/${bundle.id}`}
                    className="hover:text-green-700 hover:underline dark:hover:text-green-400"
                  >
                    {title}
                  </Link>
                </h3>

                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  {bundle.availableSentences > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-md bg-zinc-100 px-2.5 py-1 font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
                      <MessagesSquare className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                      {ko ? `문장 ${bundle.availableSentences}개` : `${bundle.availableSentences} sentences`}
                    </span>
                  )}
                  {bundle.availableWords > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-md bg-zinc-100 px-2.5 py-1 font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
                      <BookOpen className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                      {ko ? `단어 ${bundle.availableWords}개` : `${bundle.availableWords} words`}
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-zinc-100 dark:border-zinc-800/80">
                {hasBoth ? (
                  <div className="flex flex-wrap gap-2">
                    <Link
                      prefetch={false}
                      href={`/learn/review/sentences?bundleId=${bundle.id}&returnTo=/learn/review`}
                      className="inline-flex min-h-9 flex-1 items-center justify-center rounded-lg bg-[#3f9657] px-3 text-xs font-bold text-white transition hover:bg-[#2f7d4a]"
                    >
                      {ko ? `문장 (${bundle.availableSentences})` : `Sentences (${bundle.availableSentences})`}
                    </Link>
                    <Link
                      prefetch={false}
                      href={`/learn/review/words?bundleId=${bundle.id}&returnTo=/learn/review`}
                      className="inline-flex min-h-9 flex-1 items-center justify-center rounded-lg border border-zinc-200 bg-white px-3 text-xs font-bold text-zinc-800 transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
                    >
                      {ko ? `단어 (${bundle.availableWords})` : `Words (${bundle.availableWords})`}
                    </Link>
                  </div>
                ) : (
                  <Link
                    prefetch={false}
                    href={`/learn/review/${primaryType}?bundleId=${bundle.id}&returnTo=/learn/review`}
                    className="inline-flex min-h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-[#3f9657] px-4 text-xs font-bold text-white transition hover:bg-[#2f7d4a]"
                  >
                    {ko
                      ? `${primaryType === 'sentences' ? '문장' : '단어'} ${bundle.availableTotal}개 복습 시작`
                      : `Review ${bundle.availableTotal} ${primaryType === 'sentences' ? 'sentences' : 'words'}`}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {hasMore && (
        <div className="mt-5 text-center">
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-4 py-2 text-xs font-bold text-zinc-700 shadow-sm transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
          >
            {expanded ? (
              <>
                <ChevronUp className="h-4 w-4" />
                {ko ? '번들 목록 접기' : 'Collapse bundles'}
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4" />
                {ko ? `나머지 ${remainingCount}개 번들 더보기` : `Show ${remainingCount} more bundles`}
              </>
            )}
          </button>
        </div>
      )}
    </section>
  );
}
