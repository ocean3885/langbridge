'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  BookOpen,
  Bookmark,
  Check,
  ChevronDown,
  ChevronLeft,
  HelpCircle,
  Lock,
  MoreVertical,
  Pause,
  Play,
  Repeat,
  RotateCcw,
  Shuffle,
  StickyNote,
  Volume2,
  X,
  Zap,
} from 'lucide-react';
import { getPublicUrl } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { BundleProgressSummary } from '@/lib/supabase/services/bundle-progress';
import { type UserSentenceInteraction } from '@/lib/supabase/services/user-interactions';

interface BundlePlayerClientProps {
  bundle: any;
  items: any[];
  language?: 'ko' | 'en';
  initialInteractions?: UserSentenceInteraction[];
  initialProgress?: BundleProgressSummary;
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
    backToBundle: '번들로 돌아가기',
    noItems: '등록된 학습 항목이 없습니다.',
    noImage: '이미지가 없습니다',
    progressTitle: '내 진행률',
    complete: (done: number, total: number) => `${done} / ${total} 완료`,
    status: 'STATUS',
    inProgress: '진행 중',
    notStarted: '시작 전',
    completed: '완료',
    remaining: '남은 항목',
    remainingItems: (count: number) => `${count}개`,
    lastStudied: '최근 학습',
    today: '오늘',
    noRecord: '-',
    level: '레벨',
    items: '문장 목록',
    practice: '연습 모드',
    flashcards: '플래시카드',
    quickQuiz: '퀵 퀴즈',
    scramble: '스크램블',
    keyWords: '핵심 단어',
    previous: '이전',
    markNext: '학습 완료 & 다음',
    listen: '듣기',
    slow: '느리게',
    repeat: '반복',
    auto: '자동',
    infiniteRepeat: '무한 반복',
    repeatTimes: (n: number) => `${n}번 반복`,
    memoPlaceholder: '메모를 입력하세요...',
    save: '저장',
    cancel: '취소',
    loginRequired: '로그인이 필요한 기능입니다.',
  },
  en: {
    backToBundle: 'Back to Bundle',
    noItems: 'No learning items registered.',
    noImage: 'No image available',
    progressTitle: 'My progress',
    complete: (done: number, total: number) => `${done} / ${total} complete`,
    status: 'STATUS',
    inProgress: 'In progress',
    notStarted: 'Not started',
    completed: 'Completed',
    remaining: 'REMAINING',
    remainingItems: (count: number) => `${count} items`,
    lastStudied: 'LAST STUDIED',
    today: 'Today',
    noRecord: '-',
    level: 'LEVEL',
    items: 'Items',
    practice: 'Practice',
    flashcards: 'Flashcards',
    quickQuiz: 'Quick Quiz',
    scramble: 'Scramble',
    keyWords: 'Key Words',
    previous: 'Previous',
    markNext: 'Mark as Learned & Next',
    listen: 'Listen',
    slow: 'Slow',
    repeat: 'Repeat',
    auto: 'Auto',
    infiniteRepeat: 'Infinite repeat',
    repeatTimes: (n: number) => `Repeat ${n} times`,
    memoPlaceholder: 'Enter memo...',
    save: 'Save',
    cancel: 'Cancel',
    loginRequired: 'Login required for this feature.',
  },
};

export default function BundlePlayerClient({
  bundle,
  items,
  language = 'ko',
  initialInteractions = [],
  initialProgress,
  user,
  initialItemId = null,
}: BundlePlayerClientProps) {
  const initialIndex = initialItemId ? Math.max(0, items.findIndex((item) => item.id === initialItemId)) : 0;
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isPlaying, setIsPlaying] = useState(false);
  const [repeatCount, setRepeatCount] = useState(1);
  const [currentRepeat, setCurrentRepeat] = useState(0);
  const [showSource, setShowSource] = useState(true);
  const [showTranslation, setShowTranslation] = useState(true);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isSavingProgress, setIsSavingProgress] = useState(false);
  const [interactions, setInteractions] = useState<UserSentenceInteraction[]>(initialInteractions);
  const [completedItemIds, setCompletedItemIds] = useState<Set<string>>(
    () => new Set((initialProgress?.itemInteractions || []).filter((item) => item.is_completed).map((item) => item.bundle_item_id)),
  );
  const [editingMemoId, setEditingMemoId] = useState<number | null>(null);
  const [tempMemo, setTempMemo] = useState('');

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isPlayingRef = useRef(false);
  const t = translations[language] || translations.ko;
  const currentItem = items[currentIndex];
  const currentInteraction = interactions.find((interaction) => interaction.sentence_id === currentItem?.sentence_id);
  const title = getBundleTitle(bundle, language);
  const categoryName = getCategoryName(bundle, language);
  const level = getLevelLabel(bundle.level);
  const audioSrc = getPublicUrl(currentItem?.audio_url || currentItem?.sentences?.audio_url);
  const imageSrc = currentItem?.image_url || bundle.thumbnail_url;
  const completedCount = Math.max(initialProgress?.completedItems || 0, completedItemIds.size);
  const progressPercent = items.length > 0 ? Math.round((completedCount / items.length) * 100) : 0;
  const isCompleted = completedCount >= items.length && items.length > 0;
  const hasStarted = completedCount > 0 || currentIndex > 0 || Boolean(initialProgress?.bundleInteraction?.is_started);
  const lastStudiedLabel = formatProgressDate(initialProgress?.bundleInteraction?.last_studied_at, language) || (hasStarted ? t.today : t.noRecord);
  const keywords = useMemo(() => getKeywords(currentItem, language), [currentItem, language]);

  const updateIsPlaying = (playing: boolean) => {
    setIsPlaying(playing);
    isPlayingRef.current = playing;
  };

  useEffect(() => {
    setCurrentRepeat(0);
    setCurrentTime(0);
    setEditingMemoId(null);
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
    if (!audioRef.current) return;
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

  const goToItem = (index: number, autoplay = true) => {
    const nextIndex = Math.max(0, Math.min(items.length - 1, index));

    if (nextIndex === currentIndex) {
      if (autoplay) playAudio();
      return;
    }

    setCurrentIndex(nextIndex);
    if (autoplay) updateIsPlaying(true);
  };

  const markCurrentItemCompleted = async () => {
    if (!currentItem) return;

    setCompletedItemIds((prev) => new Set(prev).add(currentItem.id));

    if (!user) return;

    setIsSavingProgress(true);
    try {
      const response = await fetch('/api/bundle-progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bundle_id: bundle.id,
          bundle_item_id: currentItem.id,
        }),
      });

      if (!response.ok) throw new Error('Failed to save progress');
    } catch {
      alert('Failed to save learning progress.');
    } finally {
      setIsSavingProgress(false);
    }
  };

  const handleNext = () => {
    markCurrentItemCompleted();
    if (currentIndex < items.length - 1) {
      goToItem(currentIndex + 1, false);
      return;
    }
    updateIsPlaying(false);
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
      markCurrentItemCompleted();
      goToItem(currentIndex + 1);
      return;
    }

    markCurrentItemCompleted();
    updateIsPlaying(false);
  };

  const handleTogglePin = async (e: React.MouseEvent, sentenceId: number) => {
    e.stopPropagation();
    if (!user) {
      alert(t.loginRequired);
      return;
    }

    const interaction = interactions.find((item) => item.sentence_id === sentenceId);
    const newIsPinned = !interaction?.is_pinned;

    try {
      const response = await fetch('/api/user-interactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sentence_id: sentenceId,
          is_pinned: newIsPinned,
        }),
      });

      if (!response.ok) throw new Error('Failed to update pin');
      const updated = await response.json();

      setInteractions((prev) => {
        const filtered = prev.filter((item) => item.sentence_id !== sentenceId);
        return [...filtered, updated];
      });
    } catch {
      alert('Failed to update pin status.');
    }
  };

  const handleStartEditMemo = (e: React.MouseEvent, sentenceId: number, memo?: string | null) => {
    e.stopPropagation();
    if (!user) {
      alert(t.loginRequired);
      return;
    }

    setTempMemo(memo || '');
    setEditingMemoId(sentenceId);
  };

  const handleSaveMemo = async (e: React.MouseEvent, sentenceId: number) => {
    e.stopPropagation();
    if (!user || !sentenceId) return;

    try {
      const response = await fetch('/api/user-interactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sentence_id: sentenceId,
          memo: tempMemo.trim() || null,
        }),
      });

      if (!response.ok) throw new Error('Failed to save memo');
      const updated = await response.json();

      setInteractions((prev) => {
        const filtered = prev.filter((item) => item.sentence_id !== sentenceId);
        return [...filtered, updated];
      });
      setEditingMemoId(null);
    } catch {
      alert('Failed to save memo.');
    }
  };

  if (!items || items.length === 0) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center rounded-[28px] bg-white p-10 text-center shadow-sm">
        <BookOpen className="mb-4 h-12 w-12 text-zinc-300" />
        <p className="font-bold text-zinc-500">{t.noItems}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto grid max-w-[1540px] gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
      <audio
        ref={audioRef}
        src={audioSrc || ''}
        onEnded={handleAudioEnded}
        onLoadedMetadata={(event) => setDuration(event.currentTarget.duration || 0)}
        onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime || 0)}
      />

      <main className="overflow-hidden rounded-[22px] border border-zinc-100 bg-white shadow-sm">
        <div className="flex items-center justify-between px-5 py-4 md:px-7">
          <Link href={`/bundles/${bundle.id}`} className="inline-flex items-center gap-2 text-sm font-bold text-zinc-700 transition hover:text-[#2f7d4a]">
            <ArrowLeft className="h-4 w-4" />
            {t.backToBundle}
          </Link>
          <div className="flex items-center gap-1">
            <button
              onClick={(e) => currentItem?.sentence_id && handleTogglePin(e, currentItem.sentence_id)}
              className="flex h-10 w-10 items-center justify-center rounded-full text-zinc-800 transition hover:bg-zinc-100"
              aria-label="Save item"
            >
              <Bookmark className={`h-5 w-5 ${currentInteraction?.is_pinned ? 'fill-[#2f8f53] text-[#2f8f53]' : ''}`} />
            </button>
            <button className="flex h-10 w-10 items-center justify-center rounded-full text-zinc-800 transition hover:bg-zinc-100" aria-label="More">
              <MoreVertical className="h-5 w-5" />
            </button>
          </div>
        </div>

        <section className="px-5 pb-5 md:px-7">
          <span className="inline-flex rounded-full bg-[#dff1e5] px-3 py-1 text-xs font-black text-[#2f7d4a]">{categoryName}</span>
          <h1 className="mt-3 text-2xl font-black leading-tight tracking-normal text-zinc-950 md:text-3xl">{title}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm font-semibold text-zinc-500">
            <span>{currentIndex + 1} / {items.length} items</span>
            <span>·</span>
            <span>{level}</span>
            <span>·</span>
            <span>Est. {Math.max(8, Math.ceil(items.length * 1.6))} min</span>
          </div>
        </section>

        <section className="px-0 md:px-7">
          <div className="relative aspect-[16/7.2] min-h-[300px] overflow-hidden bg-zinc-950 md:rounded-t-[10px]">
            {imageSrc ? (
              <Image src={imageSrc} alt={currentItem?.sentences?.sentence || title} fill priority className="object-cover" sizes="(max-width: 1280px) 100vw, 1020px" />
            ) : (
              <div className="flex h-full flex-col items-center justify-center text-zinc-500">
                <BookOpen className="mb-3 h-12 w-12 opacity-50" />
                <span className="text-sm font-bold">{t.noImage}</span>
              </div>
            )}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/45 to-transparent px-5 py-6 text-center md:px-8">
              {showSource && (
                <p className="text-2xl font-black leading-snug text-white drop-shadow md:text-3xl">
                  {currentItem?.sentences?.sentence}
                </p>
              )}
              {showTranslation && (
                <p className="mt-2 text-base font-bold leading-relaxed text-white/95 md:text-lg">
                  {getTranslation(currentItem, language)}
                </p>
              )}
            </div>
          </div>

          <div className="border-b border-zinc-100 bg-white px-5 py-4 md:px-0">
            <div className="grid gap-4 md:grid-cols-[auto_1fr_auto] md:items-center">
              <div className="flex flex-wrap items-center gap-4 text-sm font-bold text-zinc-700">
                <button onClick={togglePlay} className="inline-flex items-center gap-2 transition hover:text-[#2f7d4a]">
                  <Volume2 className="h-4 w-4" />
                  {t.listen}
                </button>
                <button
                  onClick={() => setPlaybackRate((rate) => (rate === 1 ? 0.78 : 1))}
                  className={`inline-flex items-center gap-2 transition hover:text-[#2f7d4a] ${playbackRate < 1 ? 'text-[#2f7d4a]' : ''}`}
                >
                  <Zap className="h-4 w-4" />
                  {t.slow}
                </button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="inline-flex items-center gap-2 transition hover:text-[#2f7d4a]">
                      <Repeat className="h-4 w-4" />
                      {t.repeat}
                      <ChevronDown className="h-3 w-3" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    {REPEAT_OPTIONS.map((count) => (
                      <DropdownMenuItem key={String(count)} onClick={() => { setRepeatCount(count); setCurrentRepeat(0); }}>
                        {count === Infinity ? t.infiniteRepeat : t.repeatTimes(count)}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
                <button onClick={() => setShowSource((value) => !value)} className={`inline-flex items-center gap-2 transition hover:text-[#2f7d4a] ${showSource ? '' : 'text-zinc-400'}`}>
                  <RotateCcw className="h-4 w-4" />
                  ES
                </button>
                <button onClick={() => setShowTranslation((value) => !value)} className={`inline-flex items-center gap-2 transition hover:text-[#2f7d4a] ${showTranslation ? '' : 'text-zinc-400'}`}>
                  <BadgeCheck className="h-4 w-4" />
                  {language === 'ko' ? 'KO' : 'EN'}
                </button>
              </div>

              <div className="flex items-center gap-3">
                <span className="w-9 text-right text-sm font-semibold text-zinc-500">{formatTime(currentTime)}</span>
                <input
                  type="range"
                  min={0}
                  max={duration || 0}
                  value={Math.min(currentTime, duration || currentTime)}
                  onChange={(event) => {
                    const value = Number(event.target.value);
                    setCurrentTime(value);
                    if (audioRef.current) audioRef.current.currentTime = value;
                  }}
                  className="h-1 w-full accent-[#2f8f53]"
                />
                <span className="w-9 text-sm font-semibold text-zinc-500">{formatTime(duration)}</span>
              </div>

              <div className="flex items-center justify-end gap-3">
                <button onClick={handlePrev} disabled={currentIndex === 0} className="flex h-10 w-10 items-center justify-center rounded-full text-zinc-700 transition hover:bg-zinc-100 disabled:opacity-40">
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button onClick={togglePlay} className="flex h-12 w-12 items-center justify-center rounded-full bg-[#2f8f53] text-white shadow-sm transition hover:bg-[#287b48]">
                  {isPlaying ? <Pause className="h-5 w-5 fill-current" /> : <Play className="ml-0.5 h-5 w-5 fill-current" />}
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-5 p-5 md:p-7">
          <div className="rounded-xl border border-zinc-200 bg-white shadow-sm">
            <button className="flex w-full items-center justify-between px-4 py-4 text-left">
              <span className="inline-flex items-center gap-3 text-base font-black text-zinc-950">
                <BookOpen className="h-5 w-5 text-[#2f8f53]" />
                {t.keyWords}
              </span>
              <ChevronDown className="h-5 w-5 text-zinc-800" />
            </button>
            <div className="flex flex-wrap gap-2 border-t border-zinc-100 px-4 pb-4 pt-3">
              {keywords.length > 0 ? (
                keywords.map((keyword) => (
                  <span key={`${keyword.word}-${keyword.meaning}`} className="inline-flex items-center gap-2 rounded-full bg-zinc-100 px-3 py-1.5 text-sm font-bold text-zinc-800">
                    {keyword.word}
                    {keyword.meaning && <span className="font-semibold text-zinc-500">{keyword.meaning}</span>}
                  </span>
                ))
              ) : (
                <span className="text-sm font-semibold text-zinc-400">No keywords</span>
              )}
            </div>
          </div>

          {editingMemoId && currentItem?.sentence_id && (
            <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="inline-flex items-center gap-2 text-xs font-black uppercase text-zinc-500">
                  <StickyNote className="h-4 w-4" />
                  Memo
                </span>
                <button onClick={() => setEditingMemoId(null)} className="rounded-full p-1 transition hover:bg-white">
                  <X className="h-4 w-4 text-zinc-500" />
                </button>
              </div>
              <textarea
                value={tempMemo}
                onChange={(event) => setTempMemo(event.target.value)}
                placeholder={t.memoPlaceholder}
                className="w-full resize-none rounded-lg border border-emerald-100 bg-white p-3 text-sm outline-none focus:border-[#2f8f53]"
                rows={3}
              />
              <div className="mt-3 flex justify-end gap-2">
                <button onClick={() => setEditingMemoId(null)} className="rounded-lg px-4 py-2 text-xs font-bold text-zinc-500 transition hover:bg-white">
                  {t.cancel}
                </button>
                <button onClick={(event) => handleSaveMemo(event, currentItem.sentence_id)} className="rounded-lg bg-[#2f8f53] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#287b48]">
                  {t.save}
                </button>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button onClick={handlePrev} disabled={currentIndex === 0} className="inline-flex h-14 items-center justify-center gap-3 rounded-lg border border-zinc-200 bg-white px-8 text-sm font-black text-zinc-900 transition hover:bg-zinc-50 disabled:opacity-40">
              <ArrowLeft className="h-5 w-5" />
              {t.previous}
            </button>
            <button onClick={handleNext} disabled={isSavingProgress} className="inline-flex h-14 items-center justify-center gap-3 rounded-lg bg-[#2f8f53] px-8 text-sm font-black text-white shadow-sm transition hover:bg-[#287b48] disabled:opacity-70">
              {t.markNext}
              <ArrowRight className="h-5 w-5" />
            </button>
          </div>
        </section>
      </main>

      <aside className="space-y-5 xl:sticky xl:top-24 xl:self-start">
        <section className="rounded-[18px] border border-zinc-100 bg-white p-6 shadow-sm">
          <p className="text-sm font-black text-zinc-800">{t.progressTitle}</p>
          <div className="mt-3 flex items-end justify-between gap-4">
            <p className="text-xl font-black text-zinc-950">{t.complete(completedCount, items.length)}</p>
            <p className="text-sm font-black text-zinc-900">{progressPercent}%</p>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-200">
            <div className="h-full rounded-full bg-[#2f8f53] transition-all" style={{ width: `${Math.min(100, progressPercent)}%` }} />
          </div>
          <div className="mt-5 grid grid-cols-2 gap-2">
            <ProgressMeta label={t.status} value={isCompleted ? t.completed : hasStarted ? t.inProgress : t.notStarted} />
            <ProgressMeta label={t.remaining} value={t.remainingItems(Math.max(0, items.length - completedCount))} />
            <ProgressMeta label={t.lastStudied} value={lastStudiedLabel} />
            <ProgressMeta label={t.level} value={level} />
          </div>
        </section>

        <section className="rounded-[18px] border border-zinc-100 bg-white p-5 shadow-sm">
          <h2 className="text-base font-black text-zinc-950">{t.items}</h2>
          <div className="mt-4 max-h-[430px] space-y-1 overflow-y-auto pr-1">
            {items.map((item, index) => {
              const isCurrent = index === currentIndex;
              const isDone = completedItemIds.has(item.id) || index < currentIndex;
              const interaction = interactions.find((entry) => entry.sentence_id === item.sentence_id);

              return (
                <button
                  key={item.id}
                  onClick={() => goToItem(index)}
                  className={`group grid w-full grid-cols-[28px_24px_minmax(0,1fr)_24px] items-center gap-2 rounded-lg px-2 py-2.5 text-left transition ${
                    isCurrent ? 'bg-[#e8f3eb] text-[#16743c]' : 'text-zinc-600 hover:bg-zinc-50'
                  }`}
                >
                  <span className={`flex h-7 w-7 items-center justify-center rounded-full ${isCurrent ? 'bg-[#2f8f53] text-white' : isDone ? 'bg-[#2f8f53] text-white' : 'text-zinc-400'}`}>
                    {isCurrent ? <Play className="h-3.5 w-3.5 fill-current" /> : isDone ? <Check className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                  </span>
                  <span className="text-xs font-semibold text-zinc-500">{index + 1}</span>
                  <span className={`truncate text-sm ${isCurrent ? 'font-black' : 'font-semibold'}`}>{item.sentences?.sentence || '-'}</span>
                  {interaction?.memo && <span className="col-start-3 truncate text-xs font-semibold text-[#2f8f53]">{interaction.memo}</span>}
                  {item.sentence_id && (
                    <span
                      onClick={(event) => handleStartEditMemo(event, item.sentence_id, interaction?.memo)}
                      className="col-start-4 hidden justify-self-end rounded-md p-1 text-zinc-300 transition hover:bg-white hover:text-[#2f8f53] group-hover:inline-flex"
                    >
                      <StickyNote className="h-3.5 w-3.5" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </section>

        <section className="rounded-[18px] border border-zinc-100 bg-white p-5 shadow-sm">
          <h2 className="text-base font-black text-zinc-950">{t.practice}</h2>
          <div className="mt-4 grid grid-cols-3 gap-2">
            <PracticeLink href={`/bundles/${bundle.id}/flashcards`} icon={<BookOpen className="h-5 w-5" />} label={t.flashcards} tone="sky" />
            <PracticeLink href={`/bundles/${bundle.id}/quiz`} icon={<HelpCircle className="h-5 w-5" />} label={t.quickQuiz} tone="violet" />
            <PracticeLink href={`/bundles/${bundle.id}/scramble`} icon={<Shuffle className="h-5 w-5" />} label={t.scramble} tone="orange" />
          </div>
        </section>
      </aside>
    </div>
  );
}

function ProgressMeta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-[#f7f5f1] px-3 py-3">
      <p className="text-[10px] font-black text-zinc-400">{label}</p>
      <p className="mt-1 truncate text-sm font-black text-zinc-900">{value}</p>
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
    sky: 'bg-sky-50 text-sky-600',
    violet: 'bg-violet-50 text-violet-600',
    orange: 'bg-orange-50 text-orange-600',
  };

  return (
    <Link href={href} className="flex min-h-[84px] flex-col items-center justify-center gap-2 rounded-lg border border-zinc-100 bg-white text-center transition hover:-translate-y-0.5 hover:shadow-sm">
      <span className={`flex h-9 w-9 items-center justify-center rounded-full ${tones[tone]}`}>{icon}</span>
      <span className="text-[11px] font-black leading-tight text-zinc-800">{label}</span>
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

function getLevelLabel(level: number | null | undefined) {
  const numericLevel = Number(level || 1);
  if (numericLevel <= 1) return 'A1 Beginner';
  if (numericLevel === 2) return 'A2 Beginner';
  if (numericLevel === 3) return 'B1 Intermediate';
  if (numericLevel === 4) return 'B2 Intermediate';
  return 'C1 Advanced';
}

function getTranslation(item: any, language: 'ko' | 'en') {
  return (language === 'en' ? item?.sentences?.translation_en : item?.sentences?.translation) || item?.sentences?.translation || item?.sentences?.translation_en || '';
}

function getKeywords(item: any, language: 'ko' | 'en'): Keyword[] {
  const metadataKeywords = Array.isArray(item?.metadata?.keywords) ? item.metadata.keywords : [];
  const fromMetadata = metadataKeywords
    .map((keyword: any) => ({
      word: String(keyword.word || keyword.term || '').trim(),
      meaning: String((language === 'en' ? keyword.meaning_en : keyword.meaning_ko) || keyword.meaning || '').trim(),
    }))
    .filter((keyword: Keyword) => keyword.word);

  if (fromMetadata.length > 0) return fromMetadata.slice(0, 6);

  const word = item?.words;
  if (!word?.word) return [];

  const meaning =
    (language === 'en' ? word.meaning_en : word.meaning_ko) ||
    word.meaning ||
    (typeof word.meaning_ko === 'object' ? Object.values(word.meaning_ko || {})[0] : '') ||
    '';

  return [{ word: word.word, meaning: String(meaning || '') }];
}

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) return '0:00';
  const minutes = Math.floor(seconds / 60);
  const rest = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${minutes}:${rest}`;
}

function formatProgressDate(date: string | null | undefined, language: 'ko' | 'en') {
  if (!date) return '';

  return new Date(date).toLocaleDateString(language === 'ko' ? 'ko-KR' : 'en-US', {
    month: 'short',
    day: 'numeric',
  });
}
