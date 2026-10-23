import Image from 'next/image';
import Link from 'next/link';
import { Clock, BookOpen, ArrowRight, FileText, Lock } from 'lucide-react';
import { getBundleLevelDisplay } from '@/lib/bundle-level';
import type { BundleProgressSnapshot, BundleRow, Language } from '../types';
import {
  getBundleDescription,
  getBundleImage,
  getBundleTitle,
  getCategoryName,
  getCategoryKey,
  getCategoryHref,
  bundleItemCount,
  estimateBundleMinutes,
} from '../bundle-utils';

export function BundleRowCard({
  bundle,
  language,
  categoryStyle,
  progress,
  isLoggedIn = false,
  priority = false,
  onSelectCategory,
}: {
  bundle: BundleRow;
  language: Language;
  categoryStyle: { color: string; iconColor: string };
  progress?: BundleProgressSnapshot | null;
  isLoggedIn?: boolean;
  priority?: boolean;
  onSelectCategory?: (categoryKey: string) => void;
}) {
  const title = getBundleTitle(bundle, language);
  const description = getBundleDescription(bundle, language);
  const image = getBundleImage(bundle, 0);
  const level = getBundleLevelDisplay(bundle.level, language);
  const lessonsCount = bundleItemCount(bundle);
  const wordsCount = bundle.study_words_count ?? 0;
  const duration = `${estimateBundleMinutes(lessonsCount)} min`;
  const categoryName = getCategoryName(bundle, language);
  const isPremium = bundle.access_level === 'premium';
  const progressPercent = getProgressPercent(progress);
  const progressBadge = isLoggedIn ? getProgressBadge(progress, progressPercent, language) : null;
  const progressLabel = language === 'ko' ? '전체 진행률' : 'Overall progress';

  const primaryButtonLabel = (() => {
    if (progress?.is_completed) {
      return language === 'ko' ? '다시 학습' : 'Review';
    }
    if (progress?.is_started || progressPercent > 0) {
      return language === 'ko' ? '이어서 학습' : 'Continue';
    }
    return language === 'ko' ? '학습 시작' : 'Start Learning';
  })();

  const secondaryButtonLabel = language === 'ko' ? '상세보기' : 'View Details';

  const handleCategoryClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (bundle.bundle_category) {
      if (onSelectCategory) {
        onSelectCategory(getCategoryKey(bundle.bundle_category));
      } else {
        window.location.href = getCategoryHref(bundle.bundle_category, language);
      }
    }
  };

  return (
    <div className="group flex flex-col gap-6 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition-all duration-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 md:flex-row md:items-center">
      {/* Thumbnail Image */}
      <div className="relative aspect-[1.5/1] w-full shrink-0 overflow-hidden rounded-xl bg-zinc-100 dark:bg-zinc-800 md:w-[240px] lg:w-[280px]">
        <Image
          src={image}
          alt={title}
          fill
          priority={priority}
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          sizes="(max-width: 768px) 100vw, 280px"
        />
      </div>

      {/* Content Area */}
      <div className="flex flex-1 flex-col justify-between self-stretch py-1">
        <div>
          {/* Category Tag */}
          <div className="flex flex-wrap items-center gap-2">
            {bundle.bundle_category ? (
              <button
                type="button"
                onClick={handleCategoryClick}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition-transform duration-200 hover:scale-105 active:scale-95 cursor-pointer ${categoryStyle.color} ${categoryStyle.iconColor}`}
                title={language === 'ko' ? `${categoryName} 번들 모아보기` : `Filter by ${categoryName}`}
              >
                {categoryName}
              </button>
            ) : (
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${categoryStyle.color} ${categoryStyle.iconColor}`}>
                {categoryName}
              </span>
            )}
            {isPremium && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#FBE9E2] px-3 py-1 text-xs font-bold text-[#C65D47] dark:bg-orange-950/40 dark:text-orange-200">
                <Lock className="h-3 w-3" />
                Premium
              </span>
            )}
            {progressBadge && (
              <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ${progressBadge.className}`}>
                {progressBadge.label}
              </span>
            )}
          </div>

          {/* Title */}
          <h3 className="mt-3 text-lg font-bold text-zinc-900 dark:text-zinc-50 md:text-xl lg:text-2xl leading-tight">
            {title}
          </h3>

          {/* Description */}
          <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
            {description}
          </p>
        </div>

        {/* Metadata & Learning Mode Chips */}
        <div className="mt-4 flex flex-col gap-2.5">
          <div className="flex flex-wrap items-center gap-5 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-zinc-400" />
              <span>
                {language === 'ko'
                  ? `문장 ${lessonsCount}${wordsCount > 0 ? ` · 단어 ${wordsCount}` : ''}`
                  : `${lessonsCount} ${lessonsCount === 1 ? 'sentence' : 'sentences'}${
                      wordsCount > 0 ? ` · ${wordsCount} ${wordsCount === 1 ? 'word' : 'words'}` : ''
                    }`}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex h-4 w-4 items-center justify-center text-zinc-400">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <span>{level.label}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-zinc-400" />
              <span>{duration}</span>
            </div>
          </div>

          {/* Micro Feature Chips */}
          <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-medium text-zinc-600 dark:text-zinc-300">
            <span className="inline-flex items-center gap-1 rounded-md bg-zinc-100 px-2 py-0.5 dark:bg-zinc-800">
              <span>🎧</span>
              <span>{language === 'ko' ? '오디오 스트림' : 'Audio Stream'}</span>
            </span>
            <span className="inline-flex items-center gap-1 rounded-md bg-zinc-100 px-2 py-0.5 dark:bg-zinc-800">
              <span>✍️</span>
              <span>{language === 'ko' ? '문장 연습' : 'Sentence Practice'}</span>
            </span>
            {wordsCount > 0 && (
              <span className="inline-flex items-center gap-1 rounded-md bg-zinc-100 px-2 py-0.5 dark:bg-zinc-800">
                <span>📚</span>
                <span>{language === 'ko' ? '단어 학습' : 'Vocabulary'}</span>
              </span>
            )}
          </div>
        </div>

        {isLoggedIn && (
          <div className="mt-4">
            <div className="mb-1.5 flex items-center justify-between text-xs font-semibold text-zinc-500 dark:text-zinc-400">
              <div className="flex items-center gap-1.5">
                <span>{progressLabel}</span>
                {typeof progress?.earned_stars === 'number' &&
                  typeof progress?.max_stars === 'number' &&
                  progress.max_stars > 0 && (
                    <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                      <span className="text-xs">⭐</span>
                      <span className="tabular-nums">
                        {progress.earned_stars}/{progress.max_stars}
                      </span>
                    </span>
                  )}
              </div>
              <span className="tabular-nums font-bold text-zinc-700 dark:text-zinc-300">{progressPercent}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
              <div
                className="h-full rounded-full bg-[#63a464] transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Buttons */}
      <div className="flex flex-col gap-3 shrink-0 self-center w-full md:w-auto md:justify-center">
        <Link
          href={`/bundles/${bundle.id}/learn`}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-[#559c63] hover:bg-[#468653] px-6 py-2.5 text-sm font-bold text-white shadow-sm transition duration-200 whitespace-nowrap"
        >
          <span>{primaryButtonLabel}</span>
          <ArrowRight className="h-4 w-4" />
        </Link>
        <Link
          href={`/bundles/${bundle.id}`}
          className="inline-flex items-center justify-center gap-2 rounded-full border border-zinc-200 bg-white hover:bg-zinc-50 px-6 py-2.5 text-sm font-bold text-zinc-700 shadow-sm transition duration-200 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700 whitespace-nowrap"
        >
          <BookOpen className="h-4 w-4 text-zinc-400" />
          <span>{secondaryButtonLabel}</span>
        </Link>
      </div>
    </div>
  );
}

function getProgressPercent(progress?: BundleProgressSnapshot | null) {
  const ratio = Number(progress?.progress_ratio || 0);
  if (!Number.isFinite(ratio)) return 0;
  return Math.min(100, Math.max(0, Math.round(ratio * 100)));
}

function getProgressBadge(
  progress: BundleProgressSnapshot | null | undefined,
  progressPercent: number,
  language: Language,
) {
  if (progress?.is_completed) {
    return {
      label: language === 'ko' ? '전체 완료' : 'Fully completed',
      className: 'bg-[#edf7ed] text-[#497a4d] dark:bg-green-950/90 dark:text-green-300',
    };
  }

  if (progress?.is_started || progressPercent > 0) {
    return {
      label: language === 'ko' ? '진행 중' : 'In Progress',
      className: 'bg-[#dff1e5] text-[#2f7d4a] dark:bg-emerald-950/90 dark:text-emerald-300',
    };
  }

  return {
    label: language === 'ko' ? '시작 전' : 'Not Started',
    className: 'bg-[#fff7e6] text-[#7f6330] dark:bg-amber-950/90 dark:text-amber-300',
  };
}
