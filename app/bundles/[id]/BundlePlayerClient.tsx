'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowLeft,
  BookOpen,
  Check,
  ChevronDown,
  ChevronsLeft,
  ChevronsRight,
  ChevronLeft,
  ChevronRight,
  Gauge,
  HelpCircle,
  Languages,
  LetterText,
  Pause,
  Play,
  Repeat,
  Shuffle,
  Star,
} from 'lucide-react';
import { getPublicUrl } from '@/lib/utils';
import { formatWordMeaning } from '@/lib/word-meaning';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { getBundleLevelDisplay } from '@/lib/bundle-level';
import { estimateBundleMinutes } from '../bundle-utils';

interface BundlePlayerClientProps {
  bundle: any;
  items: any[];
  language?: 'ko' | 'en';
  user?: any;
  initialItemId?: string | null;
}

type Keyword = {
  word: string;
  meaning: string;
};

const REPEAT_OPTIONS = [1, 2, 3, 5, Infinity];

const translations = {
  ko: {
    backToBundle: '뒤로',
    noItems: '등록된 학습 항목이 없습니다.',
    noImage: '이미지가 없습니다',
    practice: '연습 모드',
    practiceInfo: 'Quiz와 Scramble 문제를 풀고 정답을 맞히면 별을 획득할 수 있습니다.',
    viewItems: '전체 항목 보기',
    flashcards: '플래시카드',
    quickQuiz: '퀵 퀴즈',
    scramble: '스크램블',
    keyWords: '핵심 단어',
    noKeywords: '연결된 핵심 단어가 없습니다.',
    previous: '이전',
    next: '다음',
    first: '첫 문장',
    last: '마지막 문장',
    listen: '듣기',
    slow: '느리게',
    repeat: '반복',
    auto: '자동',
    infiniteRepeat: '무한 반복',
    repeatTimes: (n: number) => `${n}번 반복`,
  },
  en: {
    backToBundle: 'Back',
    noItems: 'No learning items registered.',
    noImage: 'No image available',
    practice: 'Practice',
    practiceInfo: 'Earn stars by answering Quiz and Scramble challenges correctly.',
    viewItems: 'View All Items',
    flashcards: 'Flashcards',
    quickQuiz: 'Quick Quiz',
    scramble: 'Scramble',
    keyWords: 'Key Words',
    noKeywords: 'No related key words.',
    previous: 'Previous',
    next: 'Next',
    first: 'First sentence',
    last: 'Last sentence',
    listen: 'Listen',
    slow: 'Slow',
    repeat: 'Repeat',
    auto: 'Auto',
    infiniteRepeat: 'Infinite repeat',
    repeatTimes: (n: number) => `Repeat ${n} times`,
  },
};

export default function BundlePlayerClient({
  bundle,
  items,
  language = 'ko',
  user,
  initialItemId = null,
}: BundlePlayerClientProps) {
  const initialIndex = initialItemId ? Math.max(0, items.findIndex((item) => item.id === initialItemId)) : 0;
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isPlaying, setIsPlaying] = useState(false);
  const [repeatCount, setRepeatCount] = useState(3);
  const [currentRepeat, setCurrentRepeat] = useState(0);
  const [showSource, setShowSource] = useState(true);
  const [showTranslation, setShowTranslation] = useState(true);
  const [playbackRate, setPlaybackRate] = useState(1);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isPlayingRef = useRef(false);
  const t = translations[language] || translations.ko;
  const currentItem = items[currentIndex];
  const title = getBundleTitle(bundle, language);
  const categoryName = getCategoryName(bundle, language);
  const level = getBundleLevelDisplay(bundle.level, language).label;
  const audioSrc = getPublicUrl(currentItem?.audio_url || currentItem?.sentences?.audio_url || currentItem?.words?.audio_url);
  const imageSrc = currentItem?.image_url || bundle.image_url || bundle.thumbnail_url || '/images/bundle-fallback.webp';
  const keywords = useMemo(() => getKeywords(currentItem, language), [currentItem, language]);
  const isConversationBundle = bundle.bundle_type?.code === 'conversation';
  const hasSpeakerInfo = isConversationBundle && Boolean(
    currentItem?.speaker_name || currentItem?.speaker_role || currentItem?.speaker_key
  );

  const updateIsPlaying = (playing: boolean) => {
    setIsPlaying(playing);
    isPlayingRef.current = playing;
  };

  useEffect(() => {
    setCurrentRepeat(0);
    if (isPlayingRef.current && currentItem) {
      window.setTimeout(() => playAudio(), 450);
    }
  }, [currentIndex]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate, audioSrc]);

  const playAudio = () => {
    if (!audioRef.current || !audioSrc) {
      updateIsPlaying(false);
      return;
    }
    audioRef.current.playbackRate = playbackRate;
    updateIsPlaying(true);
    audioRef.current.play().catch((err) => {
      console.error('Audio play error:', err);
      updateIsPlaying(false);
    });
  };

  const pauseAudio = () => {
    if (!audioRef.current) return;
    audioRef.current.pause();
    updateIsPlaying(false);
  };

  const togglePlay = () => {
    if (isPlaying) {
      pauseAudio();
      return;
    }
    playAudio();
  };

  const saveCurrentItem = (bundleItemId: string | undefined) => {
    if (!user || !bundleItemId) return;

    void fetch('/api/bundle-progress', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bundle_id: bundle.id,
        current_bundle_item_id: bundleItemId,
      }),
      keepalive: true,
    }).catch((error) => console.error('Failed to save current bundle item:', error));
  };

  const goToItem = (index: number, autoplay = true) => {
    const nextIndex = Math.max(0, Math.min(items.length - 1, index));

    if (nextIndex === currentIndex) {
      if (autoplay) playAudio();
      return;
    }

    setCurrentIndex(nextIndex);
    saveCurrentItem(items[nextIndex]?.id);
    if (autoplay) updateIsPlaying(true);
  };

  const handlePrev = () => {
    if (currentIndex > 0) goToItem(currentIndex - 1, false);
  };

  const handleAudioEnded = () => {
    if (currentRepeat + 1 < repeatCount) {
      setCurrentRepeat((prev) => prev + 1);
      window.setTimeout(() => {
        if (isPlayingRef.current) playAudio();
      }, 700);
      return;
    }

    if (currentIndex < items.length - 1) {
      goToItem(currentIndex + 1);
      return;
    }

    updateIsPlaying(false);
  };

  if (!items || items.length === 0) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center rounded-[28px] bg-white p-10 text-center shadow-sm dark:bg-zinc-900 dark:shadow-black/20">
        <BookOpen className="mb-4 h-12 w-12 text-zinc-300 dark:text-zinc-600" />
        <p className="font-bold text-zinc-500 dark:text-zinc-400">{t.noItems}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto grid max-w-[1320px] gap-4 sm:gap-6 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-start">
      <audio
        ref={audioRef}
        src={audioSrc || ''}
        onEnded={handleAudioEnded}
      />

      <main className="overflow-hidden border-y border-zinc-100 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-black/20 sm:rounded-[22px] sm:border">
        <div className="flex items-center justify-between px-4 py-3 sm:px-5 sm:py-4 md:px-7">
          <Link href={`/bundles/${bundle.id}`} className="inline-flex items-center gap-2 text-sm font-bold text-zinc-700 transition hover:text-[#2f7d4a] dark:text-zinc-300 dark:hover:text-emerald-400">
            <ArrowLeft className="h-4 w-4" />
            {t.backToBundle}
          </Link>
        </div>

        <section className="px-4 pb-4 sm:px-5 sm:pb-5 md:px-7">
          <span className="inline-flex rounded-full bg-[#dff1e5] px-3 py-1 text-xs font-bold text-[#2f7d4a] dark:bg-emerald-950/80 dark:text-emerald-300">{categoryName}</span>
          <h1 className="mt-3 text-2xl font-bold leading-tight tracking-normal text-zinc-950 dark:text-zinc-50 md:text-3xl">{title}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm font-medium text-zinc-500 dark:text-zinc-400">
            <span>{currentIndex + 1} / {items.length} items</span>
            <span>·</span>
            <span>{level}</span>
            <span>·</span>
            <span>Est. {estimateBundleMinutes(items.length)} min</span>
          </div>
        </section>

        <section className="px-0 md:px-7">
          <div className="relative aspect-video overflow-hidden bg-zinc-950 md:rounded-t-[10px]">
            {imageSrc ? (
              <Image src={imageSrc} alt={getItemSource(currentItem) || title} fill priority className="object-cover" sizes="(max-width: 1280px) 100vw, 1020px" />
            ) : (
              <div className="flex h-full flex-col items-center justify-center text-zinc-500 dark:text-zinc-400">
                <BookOpen className="mb-3 h-12 w-12 opacity-50" />
                <span className="text-sm font-bold">{t.noImage}</span>
              </div>
            )}
            <div className="absolute inset-x-0 bottom-0 hidden bg-gradient-to-t from-black/80 via-black/45 to-transparent px-8 py-6 text-center md:block">
              {hasSpeakerInfo && (
                <SpeakerLabel item={currentItem} variant="overlay" />
              )}
              {showSource && (
                <p className={`${hasSpeakerInfo ? 'mt-3' : ''} text-2xl font-black leading-snug text-white drop-shadow md:text-3xl`}>
                  {getItemSource(currentItem)}
                </p>
              )}
              {showTranslation && (
                <p className="mt-2 text-base font-bold leading-relaxed text-white/95 md:text-lg">
                  {getTranslation(currentItem, language)}
                </p>
              )}
            </div>
          </div>

          <div className="border-b border-zinc-100 bg-white px-4 py-5 text-center dark:border-zinc-800 dark:bg-zinc-950 md:hidden">
            {hasSpeakerInfo && (
              <SpeakerLabel item={currentItem} variant="inline" />
            )}
            {showSource && (
              <p className={`${hasSpeakerInfo ? 'mt-3' : ''} text-xl font-extrabold leading-snug text-zinc-950 dark:text-zinc-50`}>
                {getItemSource(currentItem)}
              </p>
            )}
            {showTranslation && (
              <p className="mt-2 text-sm font-medium leading-relaxed text-zinc-600 dark:text-zinc-300">
                {getTranslation(currentItem, language)}
              </p>
            )}
          </div>

          <div className="border-b border-zinc-100 bg-white px-4 py-4 dark:border-zinc-800 dark:bg-zinc-950 sm:px-5 md:px-0">
            <div className="space-y-4">
              <div className="grid grid-cols-4 items-center text-xs font-bold text-zinc-700 dark:text-zinc-300 sm:text-sm">
                <button
                  onClick={() => setPlaybackRate((rate) => (rate === 1 ? 0.78 : 1))}
                  disabled={!audioSrc}
                  aria-pressed={playbackRate < 1}
                  className={`inline-flex min-w-0 items-center justify-center gap-1.5 px-1 py-2 transition hover:text-[#2f7d4a] disabled:cursor-not-allowed disabled:opacity-40 dark:hover:text-emerald-400 sm:gap-2 ${playbackRate < 1 ? 'text-[#2f7d4a] dark:text-emerald-400' : ''}`}
                >
                  <Gauge className="h-4 w-4" />
                  {t.slow}
                </button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="inline-flex min-w-0 items-center justify-center gap-1 px-1 py-2 transition hover:text-[#2f7d4a] dark:hover:text-emerald-400 sm:gap-2">
                      <Repeat className="h-4 w-4 shrink-0" />
                      <span className="hidden sm:inline">{t.repeat}</span>
                      <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-[#e8f3eb] px-1 py-0.5 text-[10px] font-black tabular-nums text-[#2f7d4a] dark:bg-emerald-950/80 dark:text-emerald-300 sm:min-w-6 sm:px-1.5 sm:text-xs">
                        {repeatCount === Infinity ? '∞' : repeatCount}
                      </span>
                      <ChevronDown className="hidden h-3 w-3 sm:block" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    {REPEAT_OPTIONS.map((count) => (
                      <DropdownMenuItem key={String(count)} onClick={() => { setRepeatCount(count); setCurrentRepeat(0); }} className="flex justify-between gap-4">
                        <span>{count === Infinity ? t.infiniteRepeat : t.repeatTimes(count)}</span>
                        {repeatCount === count && <Check className="h-4 w-4 text-[#2f7d4a] dark:text-emerald-400" />}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
                <button onClick={() => setShowSource((value) => !value)} aria-pressed={showSource} className={`inline-flex min-w-0 items-center justify-center gap-1.5 px-1 py-2 transition hover:text-[#2f7d4a] dark:hover:text-emerald-400 sm:gap-2 ${showSource ? '' : 'text-zinc-400 dark:text-zinc-500'}`}>
                  <LetterText className="h-4 w-4" />
                  ES
                </button>
                <button onClick={() => setShowTranslation((value) => !value)} aria-pressed={showTranslation} className={`inline-flex min-w-0 items-center justify-center gap-1.5 px-1 py-2 transition hover:text-[#2f7d4a] dark:hover:text-emerald-400 sm:gap-2 ${showTranslation ? '' : 'text-zinc-400 dark:text-zinc-500'}`}>
                  <Languages className="h-4 w-4" />
                  {language === 'ko' ? 'KO' : 'EN'}
                </button>
              </div>

              <div className="border-t border-zinc-100 pt-4 dark:border-zinc-800">
                <div className="mx-auto grid w-full max-w-[300px] grid-cols-5 items-center">
                  <button
                    onClick={() => goToItem(0, false)}
                    disabled={currentIndex === 0}
                    className="flex h-10 w-10 items-center justify-center rounded-full text-zinc-700 transition hover:bg-zinc-100 disabled:opacity-40 dark:text-zinc-300 dark:hover:bg-zinc-800"
                    aria-label={t.first}
                    title={t.first}
                  >
                    <ChevronsLeft className="h-5 w-5" />
                  </button>
                  <button onClick={handlePrev} disabled={currentIndex === 0} className="flex h-10 w-10 items-center justify-center rounded-full text-zinc-700 transition hover:bg-zinc-100 disabled:opacity-40 dark:text-zinc-300 dark:hover:bg-zinc-800" aria-label={t.previous}>
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button onClick={togglePlay} disabled={!audioSrc} className="flex h-12 w-12 items-center justify-center justify-self-center rounded-full bg-[#2f8f53] text-white shadow-sm transition hover:bg-[#287b48] disabled:cursor-not-allowed disabled:opacity-40 dark:bg-emerald-600 dark:hover:bg-emerald-500" aria-label={isPlaying ? 'Pause' : t.listen}>
                    {isPlaying ? <Pause className="h-5 w-5 fill-current" /> : <Play className="ml-0.5 h-5 w-5 fill-current" />}
                  </button>
                  <button
                    onClick={() => goToItem(currentIndex + 1, false)}
                    disabled={currentIndex === items.length - 1}
                    className="flex h-10 w-10 items-center justify-center justify-self-end rounded-full text-zinc-700 transition hover:bg-zinc-100 disabled:opacity-40 dark:text-zinc-300 dark:hover:bg-zinc-800"
                    aria-label={t.next}
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => goToItem(items.length - 1, false)}
                    disabled={currentIndex === items.length - 1}
                    className="flex h-10 w-10 items-center justify-center justify-self-end rounded-full text-zinc-700 transition hover:bg-zinc-100 disabled:opacity-40 dark:text-zinc-300 dark:hover:bg-zinc-800"
                    aria-label={t.last}
                    title={t.last}
                  >
                    <ChevronsRight className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-5 p-4 sm:p-5 md:p-7">
          <div className="rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950 dark:shadow-black/20">
            <div className="flex w-full items-center px-4 py-4">
              <span className="inline-flex items-center gap-3 text-base font-bold text-zinc-950 dark:text-zinc-50">
                <BookOpen className="h-5 w-5 text-[#2f8f53] dark:text-emerald-400" />
                {t.keyWords}
              </span>
            </div>
            <div className="flex flex-wrap gap-2 border-t border-zinc-100 px-4 pb-4 pt-3 dark:border-zinc-800">
              {keywords.length > 0 ? (
                keywords.map((keyword) => (
                  <span key={`${keyword.word}-${keyword.meaning}`} className="inline-flex items-center gap-2 rounded-full bg-zinc-100 px-3 py-1.5 text-sm font-bold text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
                    {keyword.word}
                    {keyword.meaning && <span className="font-medium text-zinc-500 dark:text-zinc-400">{keyword.meaning}</span>}
                  </span>
                ))
              ) : (
                <span className="text-sm font-medium text-zinc-400 dark:text-zinc-500">{t.noKeywords}</span>
              )}
            </div>
          </div>

        </section>
      </main>

      <aside className="px-3 pb-4 sm:px-0 sm:pb-0">
        <section className="rounded-[18px] border border-zinc-100 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-black/20 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-bold text-zinc-950 dark:text-zinc-50 sm:text-lg">{t.practice}</h2>
          </div>
          <div className="mt-3 flex gap-2 rounded-xl border border-amber-100 bg-amber-50/70 px-3 py-3 text-sm font-medium leading-6 text-zinc-700 dark:border-amber-900/70 dark:bg-amber-950/30 dark:text-zinc-300">
            <Star className="mt-1 h-4 w-4 shrink-0 fill-current text-amber-500 dark:text-amber-300" />
            <p>{t.practiceInfo}</p>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 sm:mt-5 sm:gap-4 lg:grid-cols-1 lg:gap-3">
            <PracticeLink href={`/bundles/${bundle.id}/flashcards`} icon={<BookOpen className="h-5 w-5 sm:h-6 sm:w-6" />} label={t.flashcards} tone="sky" />
            <PracticeLink href={`/bundles/${bundle.id}/quiz`} icon={<HelpCircle className="h-5 w-5 sm:h-6 sm:w-6" />} label={t.quickQuiz} tone="violet" />
            <PracticeLink href={`/bundles/${bundle.id}/scramble`} icon={<Shuffle className="h-5 w-5 sm:h-6 sm:w-6" />} label={t.scramble} tone="orange" />
          </div>
          <Link
            href={`/bundles/${bundle.id}/items`}
            className="mt-4 flex h-11 w-full items-center justify-center rounded-lg border border-zinc-200 bg-white text-sm font-bold text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:border-zinc-600 dark:hover:bg-zinc-700"
          >
            {t.viewItems}
          </Link>
        </section>
      </aside>
    </div>
  );
}

function SpeakerLabel({ item, variant }: { item: any; variant: 'overlay' | 'inline' }) {
  const name = item.speaker_name || item.speaker_key;
  const role = item.speaker_role;
  const isOverlay = variant === 'overlay';

  return (
    <div
      className={`inline-flex max-w-full items-center gap-2 rounded-full px-3 py-1 text-xs font-bold ${
        isOverlay
          ? 'bg-white/90 text-zinc-900 shadow-sm backdrop-blur dark:bg-zinc-900/90 dark:text-zinc-100 dark:shadow-black/30'
          : 'bg-[#f2eee5] text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200'
      }`}
    >
      {name && <span className="truncate">{name}</span>}
      {role && (
        <span className="text-zinc-500 dark:text-zinc-400">
          {name && '· '}
          {role}
        </span>
      )}
    </div>
  );
}

function PracticeLink({
  href,
  icon,
  label,
  tone,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  tone: 'sky' | 'violet' | 'orange';
}) {
  const tones = {
    sky: 'bg-sky-50 text-sky-600 dark:bg-sky-950/70 dark:text-sky-300',
    violet: 'bg-violet-50 text-violet-600 dark:bg-violet-950/70 dark:text-violet-300',
    orange: 'bg-orange-50 text-orange-600 dark:bg-orange-950/70 dark:text-orange-300',
  };

  return (
    <Link href={href} className="flex min-h-[104px] flex-col items-center justify-center gap-2.5 rounded-xl border border-zinc-100 bg-white px-2 text-center transition hover:-translate-y-0.5 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:hover:shadow-black/20 sm:min-h-[132px] sm:gap-3 lg:min-h-[88px] lg:flex-row lg:justify-start lg:px-4 lg:text-left">
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full sm:h-14 sm:w-14 lg:h-12 lg:w-12 ${tones[tone]}`}>{icon}</span>
      <span className="text-xs font-bold leading-tight text-zinc-800 dark:text-zinc-100 sm:text-sm">{label}</span>
    </Link>
  );
}

function getBundleTitle(bundle: any, language: 'ko' | 'en') {
  return (language === 'en' ? bundle.title_en : bundle.title) || bundle.title || bundle.title_en || 'Untitled Bundle';
}

function getCategoryName(bundle: any, language: 'ko' | 'en') {
  return (
    (language === 'en' ? bundle.bundle_category?.name_en : bundle.bundle_category?.name) ||
    bundle.bundle_category?.name ||
    bundle.bundle_category?.name_en ||
    'Scenario Talk'
  );
}

function getTranslation(item: any, language: 'ko' | 'en') {
  return (
    (language === 'en' ? item?.sentences?.translation_en : item?.sentences?.translation) ||
    item?.sentences?.translation ||
    item?.sentences?.translation_en ||
    formatWordMeaning(language === 'en' ? item?.words?.meaning_en : item?.words?.meaning_ko) ||
    formatWordMeaning(item?.words?.meaning_ko) ||
    formatWordMeaning(item?.words?.meaning_en) ||
    ''
  );
}

function getKeywords(item: any, language: 'ko' | 'en'): Keyword[] {
  const metadataKeywords = Array.isArray(item?.metadata?.keywords) ? item.metadata.keywords : [];
  const fromMetadata = metadataKeywords
    .map((keyword: any) => ({
      word: String(keyword.word || keyword.term || '').trim(),
      meaning: formatWordMeaning((language === 'en' ? keyword.meaning_en : keyword.meaning_ko) || keyword.meaning) || '',
    }))
    .filter((keyword: Keyword) => keyword.word);

  const mappedWords = Array.isArray(item?.mapped_words) ? item.mapped_words : [];
  const fromMappings = mappedWords.map((word: any) => ({
      word: word.used_as || word.word,
      meaning:
        (language === 'en' ? word.meaning_en : word.meaning_ko) ||
        word.meaning_ko ||
        word.meaning_en ||
        '',
    }));

  const word = item?.words;
  const directWord = word?.word
    ? [{
        word: word.word,
        meaning: formatWordMeaning(
          (language === 'en' ? word.meaning_en : word.meaning_ko) ||
          word.meaning ||
          word.meaning_ko ||
          word.meaning_en,
        ) || '',
      }]
    : [];

  return Array.from(
    new Map(
      [...fromMetadata, ...fromMappings, ...directWord].map((keyword) => [
        `${keyword.word}-${keyword.meaning}`,
        keyword,
      ]),
    ).values(),
  ).slice(0, 8);
}

function getItemSource(item: any) {
  return item?.sentences?.sentence || item?.words?.word || '';
}
