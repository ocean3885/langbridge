'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { Play, Pause, SkipBack, ChevronLeft, ChevronRight, Repeat, Volume2, Info, ChevronDown, Layers } from 'lucide-react';
import { getPublicUrl } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface BundlePlayerClientProps {
  bundle: any;
  items: any[];
  language?: 'ko' | 'en';
}

const REPEAT_OPTIONS = [1, 2, 3, 5, Infinity];

const translations = {
  ko: {
    noItems: '등록된 학습 항목이 없습니다.',
    noImage: '이미지가 없습니다',
    infiniteRepeat: '무한 반복',
    repeatTimes: (n: number) => `${n}번 반복`,
    fullList: '전체 문장 목록',
  },
  en: {
    noItems: 'No learning items registered.',
    noImage: 'No image available',
    infiniteRepeat: 'Infinite repeat',
    repeatTimes: (n: number) => `Repeat ${n} times`,
    fullList: 'Full sentence list',
  }
};

export default function BundlePlayerClient({ bundle, items, language = 'ko' }: BundlePlayerClientProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [repeatCount, setRepeatCount] = useState(1);
  const [currentRepeat, setCurrentRepeat] = useState(0);
  const [showEs, setShowEs] = useState(true);
  const [showKo, setShowKo] = useState(true);
  const [showEn, setShowEn] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  // Use a ref to synchronously track playing state for timeouts and callbacks
  const isPlayingRef = useRef(false);

  const t = translations[language] || translations['ko'];
  const currentItem = items[currentIndex];

  const updateIsPlaying = (playing: boolean) => {
    setIsPlaying(playing);
    isPlayingRef.current = playing;
  };

  useEffect(() => {
    // When current item changes, reset repeat and auto-play if it was playing
    setCurrentRepeat(0);
    if (isPlayingRef.current && currentItem) {
      // Small delay to ensure audio element is ready
      setTimeout(() => playAudio(), 50);
    }
  }, [currentIndex]);

  useEffect(() => {
    // Scroll active item into view within the window
    const activeItem = document.getElementById(`playlist-item-${currentIndex}`);
    
    if (activeItem) {
      activeItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [currentIndex]);

  const playAudio = () => {
    if (audioRef.current) {
      updateIsPlaying(true);
      audioRef.current.play().catch((err) => {
        console.error("Audio play error:", err);
        updateIsPlaying(false);
      });
    }
  };

  const pauseAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      updateIsPlaying(false);
    }
  };

  const togglePlay = () => {
    if (isPlaying) {
      pauseAudio();
    } else {
      playAudio();
    }
  };

  const handleNext = () => {
    if (currentIndex < items.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      updateIsPlaying(false);
      setCurrentIndex(0);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleAudioEnded = () => {
    if (currentRepeat + 1 < repeatCount) {
      setCurrentRepeat((prev) => prev + 1);
      // Short delay before repeating
      setTimeout(() => {
        if (isPlayingRef.current) {
          playAudio();
        }
      }, 500);
    } else {
      // Move to next item
      if (currentIndex < items.length - 1) {
        setCurrentIndex((prev) => prev + 1);
      } else {
        updateIsPlaying(false);
      }
    }
  };

  if (!items || items.length === 0) {
    return (
      <div className="text-center py-20 bg-gray-50 rounded-3xl border border-dashed border-gray-200 mt-8">
        <Info className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500 font-bold">{t.noItems}</p>
      </div>
    );
  }

  const audioSrc = getPublicUrl(currentItem?.sentences?.audio_url);

  return (
    <div className="flex flex-col md:flex-row items-start gap-4 md:gap-6 lg:gap-8">
      {/* Hidden Audio Element */}
      {audioSrc && (
        <audio 
          ref={audioRef} 
          src={audioSrc} 
          onEnded={handleAudioEnded}
          // Remove onPlay and onPause to prevent browser native events from overriding our state
        />
      )}

      {/* Left Column: Player Main Section */}
      <div className="w-full md:w-1/2 lg:w-[45%] shrink-0 bg-white rounded-3xl shadow-2xl md:shadow-lg border border-gray-100 overflow-hidden sticky top-2 sm:top-20 md:top-24 z-40 md:z-10 transition-shadow">
        
        {/* Video-like Area */}
        <div className="relative w-full aspect-[4/3] sm:aspect-video bg-black flex flex-col justify-end overflow-hidden group">
          {currentItem?.image_url ? (
            <Image
              src={currentItem.image_url}
              alt={currentItem.sentences?.sentence || 'Item Image'}
              fill
              className="object-cover opacity-80"
              sizes="(max-width: 1024px) 100vw, 1024px"
              priority
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-gray-500 absolute inset-0">
              <Layers className="w-20 h-20 mb-4 opacity-20" />
              <span className="text-sm font-medium">{t.noImage}</span>
            </div>
          )}
          
          {/* Overlay Progress Info & Toggles */}
          <div className="absolute top-4 left-4 z-20 flex flex-wrap items-center gap-2">
            <div className="bg-black/60 backdrop-blur-md text-white text-[10px] sm:text-xs font-bold px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full shadow-sm">
              {currentIndex + 1} / {items.length}
            </div>
            
            {/* Language Toggles */}
            <div className="flex gap-1 bg-black/40 backdrop-blur-md rounded-full p-1 shadow-sm">
              <button 
                onClick={() => setShowEs(!showEs)}
                className={`text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded-full transition-colors ${showEs ? 'bg-white text-black shadow-sm' : 'text-white/60 hover:text-white hover:bg-white/20'}`}
              >
                ES
              </button>
              {language === 'ko' && (
                <button 
                  onClick={() => setShowKo(!showKo)}
                  className={`text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded-full transition-colors ${showKo ? 'bg-amber-300 text-black shadow-sm' : 'text-white/60 hover:text-white hover:bg-white/20'}`}
                >
                  KO
                </button>
              )}
              <button 
                onClick={() => setShowEn(!showEn)}
                className={`text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded-full transition-colors ${showEn ? (language === 'ko' ? 'bg-gray-200 text-black shadow-sm' : 'bg-amber-300 text-black shadow-sm') : 'text-white/60 hover:text-white hover:bg-white/20'}`}
              >
                EN
              </button>
            </div>
          </div>

          <div className="absolute top-4 right-4 z-20">
            {repeatCount !== 1 && (
              <div className="bg-blue-600/90 backdrop-blur-md text-white text-[10px] sm:text-xs font-bold px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full flex items-center gap-1 shadow-sm">
                <Repeat className="w-3 h-3" />
                {currentRepeat + 1} / {repeatCount === Infinity ? '∞' : repeatCount}
              </div>
            )}
          </div>

          {/* Subtitles Area */}
          <div className="relative z-10 w-full px-3 py-4 sm:p-6 md:p-8 bg-gradient-to-t from-black/90 via-black/60 to-transparent flex flex-col items-center text-center mt-12 min-h-[100px] justify-end">
            {showEs && (
              <h2 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-black text-white leading-tight mb-2 drop-shadow-lg max-w-4xl">
                {currentItem?.sentences?.sentence}
              </h2>
            )}
            
            {language === 'en' ? (
              showEn && (
                <p className="text-sm sm:text-base md:text-lg text-amber-300 font-bold drop-shadow-md">
                  {currentItem?.sentences?.translation_en}
                </p>
              )
            ) : (
              showKo && (
                <p className="text-sm sm:text-base md:text-lg text-amber-300 font-bold drop-shadow-md">
                  {currentItem?.sentences?.translation}
                </p>
              )
            )}

            {language === 'ko' && showEn && currentItem?.sentences?.translation_en && (
              <p className="text-xs sm:text-sm text-gray-300 font-medium italic mt-1 drop-shadow-md line-clamp-2 md:line-clamp-none">
                {currentItem?.sentences?.translation_en}
              </p>
            )}
          </div>
        </div>

        {/* Controls Area */}
        <div className="p-4 md:p-8 bg-white relative">
          {/* Progress Bar */}
          <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden mb-6">
            <div 
              className="h-full bg-blue-600 transition-all duration-300 ease-out"
              style={{ width: `${((currentIndex + 1) / items.length) * 100}%` }}
            />
          </div>

          <div className="flex items-center justify-center gap-4 sm:gap-6 md:gap-8">
            {/* 제일 앞 이동 */}
            <button 
              onClick={() => {
                setCurrentIndex(0);
                updateIsPlaying(true);
              }}
              disabled={currentIndex === 0}
              className="p-2 text-gray-400 hover:text-blue-600 disabled:opacity-30 transition-colors"
              aria-label="최처음으로"
            >
              <SkipBack className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>

            {/* 이전 문장 */}
            <button 
              onClick={handlePrev}
              disabled={currentIndex === 0}
              className="p-2 text-gray-400 hover:text-blue-600 disabled:opacity-30 transition-colors"
              aria-label="이전 문장"
            >
              <ChevronLeft className="w-6 h-6 sm:w-7 sm:h-7" />
            </button>

            {/* 재생 / 일시정지 */}
            <button 
              onClick={togglePlay}
              className="p-2 text-gray-800 hover:text-blue-600 transition-colors active:scale-95"
              aria-label="재생/일시정지"
            >
              {isPlaying ? (
                <Pause className="w-8 h-8 sm:w-9 sm:h-9 fill-current" />
              ) : (
                <Play className="w-8 h-8 sm:w-9 sm:h-9 fill-current" />
              )}
            </button>

            {/* 다음 문장 */}
            <button 
              onClick={handleNext}
              disabled={currentIndex === items.length - 1}
              className="p-2 text-gray-400 hover:text-blue-600 disabled:opacity-30 transition-colors"
              aria-label="다음 문장"
            >
              <ChevronRight className="w-6 h-6 sm:w-7 sm:h-7" />
            </button>

            {/* 반복 설정 */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-1 p-2 text-gray-400 hover:text-blue-600 transition-colors">
                  <Repeat className="w-5 h-5 sm:w-6 sm:h-6" />
                  <span className="text-xs sm:text-sm font-bold w-4 text-center">{repeatCount === Infinity ? '∞' : repeatCount}</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {REPEAT_OPTIONS.map((count) => (
                  <DropdownMenuItem 
                    key={count} 
                    onClick={() => {
                      setRepeatCount(count);
                      setCurrentRepeat(0);
                    }}
                    className={repeatCount === count ? 'text-blue-600 font-bold bg-blue-50' : ''}
                  >
                    {count === Infinity ? t.infiniteRepeat : t.repeatTimes(count)}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Right Column: Playlist Section */}
      <div className="w-full md:w-1/2 lg:w-[55%] flex-grow bg-white rounded-3xl shadow-sm border border-gray-100 p-4 md:p-6 lg:p-8">
        <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-4 md:mb-6 flex items-center gap-2">
          <Layers className="w-5 h-5 text-blue-500" />
          {t.fullList} ({items.length})
        </h3>
        <div className="space-y-2">
          {items.map((item, index) => {
            const isCurrent = index === currentIndex;
            return (
              <button
                key={item.id}
                id={`playlist-item-${index}`}
                onClick={() => {
                  setCurrentIndex(index);
                  updateIsPlaying(true);
                }}
                className={`w-full flex items-start gap-3 p-3 md:gap-4 md:p-4 rounded-2xl transition-all text-left ${
                  isCurrent 
                    ? 'bg-blue-50 border border-blue-100 shadow-sm' 
                    : 'bg-white border border-transparent hover:bg-gray-50'
                }`}
              >
                <div className={`w-8 h-8 mt-0.5 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm ${
                  isCurrent ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'
                }`}>
                  {isCurrent && isPlaying ? (
                    <Volume2 className="w-4 h-4" />
                  ) : (
                    index + 1
                  )}
                </div>
                <div className="flex-grow min-w-0">
                  <p className={`font-bold leading-relaxed ${isCurrent ? 'text-blue-900' : 'text-gray-900'}`}>
                    {item.sentences?.sentence}
                  </p>
                  <p className="text-sm text-gray-500 mt-1.5 leading-relaxed break-words">
                    {language === 'en' ? item.sentences?.translation_en : item.sentences?.translation}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
