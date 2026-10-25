'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, BookOpen, ChevronDown, ChevronUp, Sparkles, MessagesSquare } from 'lucide-react';
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
              {ko ? `${bundles.length}개 번들` : `${bundles.length} bundles`}
            </span>
          </div>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {ko ? '기억을 되살리고 싶은 번들을 골라 가볍게 복습해보세요.' : 'Pick a bundle and refresh what you’ve learned.'}
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
        {visibleBundles.map((bundle, index) => {
          const isTopUrgent = index === 0;
          const title = (ko ? bundle.title : bundle.title_en) || bundle.title;
          const categoryName = (ko ? bundle.category_name : bundle.category_name_en) || bundle.category_name;
          const actions = [
            { type: 'sentences', count: bundle.availableSentences, Icon: MessagesSquare, label: ko ? '문장 복습' : 'Review sentences' },
            { type: 'words', count: bundle.availableWords, Icon: BookOpen, label: ko ? '단어 복습' : 'Review words' },
          ].filter(action => action.count > 0);

          return (
            <article
              key={bundle.id}
              className={`group flex min-w-0 flex-col overflow-hidden rounded-2xl border shadow-sm transition-shadow hover:shadow-md ${
                isTopUrgent
                  ? 'border-emerald-200 bg-emerald-50/60 dark:border-emerald-800 dark:bg-emerald-950/20'
                  : 'border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900'
              }`}
            >
              <div className="flex-1 p-4 pb-3">
                <Link href={`/bundles/${bundle.id}`} className="flex items-center gap-3 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2">
                  <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-800">
                    <Image src={bundle.thumbnail_url || '/images/bundle-fallback.webp'} alt="" fill sizes="56px" className="object-cover transition-transform duration-300 group-hover:scale-105" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px]">
                      <span className="font-medium text-zinc-500 dark:text-zinc-400">{categoryName || (ko ? '일반' : 'General')}</span>
                      {isTopUrgent && <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 dark:text-emerald-300">
                        <Sparkles className="h-3 w-3" aria-hidden="true" />
                        {ko ? '먼저 복습해보세요' : 'Start here'}
                      </span>}
                    </div>
                    <h3 className="line-clamp-2 break-words text-base font-bold leading-snug text-zinc-900 transition-colors hover:text-emerald-700 dark:text-zinc-100 dark:hover:text-emerald-300">{title}</h3>
                  </div>
                </Link>
                <div className="mt-3">
                  <div className="flex flex-wrap items-center gap-2">
                    {bundle.availableSentences > 0 && (
                      <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-100/70 px-2 py-1 text-xs font-semibold text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-200">
                        <MessagesSquare className="h-3.5 w-3.5" aria-hidden="true" />
                        {ko ? `문장 ${bundle.availableSentences}개` : `${bundle.availableSentences} sentences`}
                      </span>
                    )}
                    {bundle.availableWords > 0 && (
                      <span className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-950/60 dark:text-blue-200">
                        <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
                        {ko ? `단어 ${bundle.availableWords}개` : `${bundle.availableWords} words`}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="mx-4 grid grid-cols-[repeat(auto-fit,minmax(min(100%,8rem),1fr))] gap-2 border-t border-zinc-200/70 py-3 dark:border-zinc-800">
                {actions.map(({ type, Icon, label }) => (
                  <Link key={type} prefetch={false}
                    href={`/learn/review/${type}?bundleId=${bundle.id}&returnTo=/learn/review`}
                    className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-bold transition-colors outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 ${
                      actions.length === 1
                        ? 'bg-[#3f9657] text-white hover:bg-[#2f7d4a]'
                        : type === 'sentences'
                          ? 'border border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200 dark:hover:bg-emerald-900/60'
                          : 'border border-blue-200 bg-blue-50 text-blue-800 hover:bg-blue-100 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-200 dark:hover:bg-blue-900/60'
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                    {label}
                    {actions.length === 1 && <ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" />}
                  </Link>
                ))}
              </div>
            </article>
          );
        })}
      </div>

      {hasMore && (
        <div className="mt-5 text-center">
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            aria-expanded={expanded}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-4 py-2 text-xs font-bold text-zinc-700 shadow-sm transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
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
