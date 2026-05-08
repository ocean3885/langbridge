'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { Play, Pause, SkipBack, ChevronLeft, ChevronRight, Repeat, Volume2, Info, ChevronDown, Layers, Bookmark, StickyNote, Save, X } from 'lucide-react';
import { getPublicUrl } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { type UserSentenceInteraction } from '@/lib/supabase/services/user-interactions';

interface BundlePlayerClientProps {
  bundle: any;
  items: any[];
  language?: 'ko' | 'en';
  initialInteractions?: UserSentenceInteraction[];
  user?: any;
}

const REPEAT_OPTIONS = [1, 2, 3, 5, Infinity];

const translations = {
  ko: {
    noItems: '등록된 학습 항목이 없습니다.',
    noImage: '이미지가 없습니다',
    infiniteRepeat: '무한 반복',
    repeatTimes: (n: number) => `${n}번 반복`,
    fullList: '전체 문장 목록',
    memoPlaceholder: '메모를 입력하세요...',
    save: '저장',
    cancel: '취소',
    loginRequired: '로그인이 필요한 기능입니다.',
  },
  en: {
    noItems: 'No learning items registered.',
    noImage: 'No image available',
    infiniteRepeat: 'Infinite repeat',
    repeatTimes: (n: number) => `Repeat ${n} times`,
    fullList: 'Sentence list',
    memoPlaceholder: 'Enter memo...',
    save: 'Save',
    cancel: 'Cancel',
    loginRequired: 'Login required for this feature.',
  }
};

export default function BundlePlayerClient({ 
  bundle, 
  items, 
  language = 'ko',
  initialInteractions = [],
  user
}: BundlePlayerClientProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [repeatCount, setRepeatCount] = useState(1);
  const [currentRepeat, setCurrentRepeat] = useState(0);
  const [showEs, setShowEs] = useState(true);
  const [showKo, setShowKo] = useState(true);
  const [showEn, setShowEn] = useState(true);
  
  // Interactions state
  const [interactions, setInteractions] = useState<UserSentenceInteraction[]>(initialInteractions);
  const [editingMemoId, setEditingMemoId] = useState<number | null>(null);
  const [tempMemo, setTempMemo] = useState('');

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isPlayingRef = useRef(false);

  const t = translations[language] || translations['ko'];
  const currentItem = items[currentIndex];
  
  const currentInteraction = interactions.find(i => i.sentence_id === currentItem?.sentence_id);

  const updateIsPlaying = (playing: boolean) => {
    setIsPlaying(playing);
    isPlayingRef.current = playing;
  };

  useEffect(() => {
    setCurrentRepeat(0);
    setEditingMemoId(null);
    if (isPlayingRef.current && currentItem) {
      setTimeout(() => playAudio(), 1000);
    }
  }, [currentIndex]);

  useEffect(() => {
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
      setTimeout(() => {
        if (isPlayingRef.current) {
          playAudio();
        }
      }, 1000);
    } else {
      if (currentIndex < items.length - 1) {
        setCurrentIndex((prev) => prev + 1);
      } else {
        updateIsPlaying(false);
      }
    }
  };

  // Interaction handlers
  const handleTogglePin = async (e: React.MouseEvent, sentenceId: number) => {
    e.stopPropagation();
    if (!user) {
      alert(t.loginRequired);
      return;
    }

    const interaction = interactions.find(i => i.sentence_id === sentenceId);
    const newIsPinned = !interaction?.is_pinned;

    try {
      const response = await fetch('/api/user-interactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sentence_id: sentenceId,
          is_pinned: newIsPinned
        })
      });

      if (!response.ok) throw new Error('Failed to update pin');
      const updated = await response.json();

      setInteractions(prev => {
        const filtered = prev.filter(i => i.sentence_id !== sentenceId);
        return [...filtered, updated];
      });
    } catch (err) {
      alert('Failed to update pin status.');
    }
  };

  const handleStartEditMemo = (e: React.MouseEvent, index: number, sentenceId: number, memo?: string | null) => {
    e.stopPropagation();
    if (!user) {
      alert(t.loginRequired);
      return;
    }
    
    // 리스트에서 클릭한 경우 해당 문장을 활성화
    setCurrentIndex(index);
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
          memo: tempMemo.trim() || null
        })
      });

      if (!response.ok) throw new Error('Failed to save memo');
      const updated = await response.json();

      setInteractions(prev => {
        const filtered = prev.filter(i => i.sentence_id !== sentenceId);
        return [...filtered, updated];
      });
      setEditingMemoId(null);
    } catch (err) {
      alert('Failed to save memo.');
    }
  };

  if (!items || items.length === 0) {
    return (
      <div className="text-center py-20 bg-gray-50 dark:bg-gray-900 rounded-3xl border border-dashed border-gray-200 dark:border-gray-800 mt-8">
        <Info className="w-12 h-12 text-gray-300 dark:text-gray-700 mx-auto mb-4" />
        <p className="text-gray-500 dark:text-gray-400 font-bold">{t.noItems}</p>
      </div>
    );
  }

  const audioSrc = getPublicUrl(currentItem?.sentences?.audio_url);

  return (
    <div className="flex flex-col md:flex-row items-start gap-4 md:gap-6 lg:gap-8">
      <audio 
        ref={audioRef} 
        src={audioSrc || ''} 
        onEnded={handleAudioEnded}
      />

      {/* Left Column: Player Main Section */}
      <div className="w-full md:w-1/2 lg:w-[45%] shrink-0 bg-white dark:bg-gray-900 rounded-3xl shadow-2xl md:shadow-lg border border-gray-100 dark:border-gray-800 overflow-hidden sticky top-2 sm:top-20 md:top-24 z-40 md:z-10 transition-shadow">
        
        {/* Video Area */}
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
          
          {/* Overlay Progress Info */}
          <div className="absolute top-4 left-4 z-20 flex items-center gap-2">
            <div className="bg-black/60 backdrop-blur-md text-white text-[10px] sm:text-xs font-bold px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full shadow-sm">
              {currentIndex + 1} / {items.length}
            </div>
          </div>

          <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
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
              <h2 className="text-lg sm:text-xl font-black text-white leading-tight mb-2 drop-shadow-lg max-w-4xl">
                {currentItem?.sentences?.sentence}
              </h2>
            )}
            
            {language === 'en' ? (
              showEn && (
                <p className="text-sm sm:text-base text-amber-300 font-bold drop-shadow-md">
                  {currentItem?.sentences?.translation_en}
                </p>
              )
            ) : (
              showKo && (
                <p className="text-sm sm:text-base text-amber-300 font-bold drop-shadow-md">
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
        <div className="p-4 md:p-6 lg:p-8 bg-white dark:bg-gray-900 relative">
          {/* Progress Bar */}
          <div className="w-full h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden mb-6">
            <div 
              className="h-full bg-blue-600 transition-all duration-300 ease-out"
              style={{ width: `${((currentIndex + 1) / items.length) * 100}%` }}
            />
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 sm:gap-0">
            {/* Language Toggles */}
            <div className="hidden sm:flex flex-1 justify-start">
              <div className="flex gap-1 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-full p-1 shadow-sm">
                <button onClick={() => setShowEs(!showEs)} className={`text-[10px] font-bold px-3 py-1.5 rounded-full transition-all ${showEs ? 'bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 shadow-sm' : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400'}`}>ES</button>
                {language === 'ko' && <button onClick={() => setShowKo(!showKo)} className={`text-[10px] font-bold px-3 py-1.5 rounded-full transition-all ${showKo ? 'bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 shadow-sm' : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400'}`}>KO</button>}
                <button onClick={() => setShowEn(!showEn)} className={`text-[10px] font-bold px-3 py-1.5 rounded-full transition-all ${showEn ? 'bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 shadow-sm' : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400'}`}>EN</button>
              </div>
            </div>

            {/* Play Controls */}
            <div className="flex items-center justify-center gap-4 sm:gap-6 shrink-0">
              <button onClick={() => {setCurrentIndex(0); updateIsPlaying(true);}} disabled={currentIndex === 0} className="p-2 text-gray-400 dark:text-gray-600 hover:text-blue-600 dark:hover:text-blue-400 disabled:opacity-30 transition-colors"><SkipBack className="w-5 h-5 sm:w-6 sm:h-6" /></button>
              <button onClick={handlePrev} disabled={currentIndex === 0} className="p-2 text-gray-400 dark:text-gray-600 hover:text-blue-600 dark:hover:text-blue-400 disabled:opacity-30 transition-colors"><ChevronLeft className="w-6 h-6 sm:w-7 sm:h-7" /></button>
              <button onClick={togglePlay} className="p-2 text-gray-800 dark:text-gray-200 hover:text-blue-600 dark:hover:text-blue-400 transition-colors active:scale-95">
                {isPlaying ? <Pause className="w-8 h-8 sm:w-9 sm:h-9 fill-current" /> : <Play className="w-8 h-8 sm:w-9 sm:h-9 fill-current" />}
              </button>
              <button onClick={handleNext} disabled={currentIndex === items.length - 1} className="p-2 text-gray-400 dark:text-gray-600 hover:text-blue-600 dark:hover:text-blue-400 disabled:opacity-30 transition-colors"><ChevronRight className="w-6 h-6 sm:w-7 sm:h-7" /></button>
            </div>

            {/* Repeat Settings */}
            <div className="hidden sm:flex flex-1 justify-end">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-1.5 p-2 px-3 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full border border-gray-100 dark:border-gray-700 shadow-sm">
                    <Repeat className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span className="text-xs sm:text-sm font-bold w-4 text-center">{repeatCount === Infinity ? '∞' : repeatCount}</span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="dark:bg-gray-800 dark:border-gray-700">
                  {REPEAT_OPTIONS.map((count) => (
                    <DropdownMenuItem key={count} onClick={() => {setRepeatCount(count); setCurrentRepeat(0);}} className={repeatCount === count ? 'text-blue-600 dark:text-blue-400 font-bold bg-blue-50 dark:bg-blue-900/30' : 'dark:text-gray-200 dark:hover:bg-gray-700'}>
                      {count === Infinity ? t.infiniteRepeat : t.repeatTimes(count)}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>

      {/* Right Column: Playlist Section */}
      <div className="w-full md:w-1/2 lg:w-[55%] flex-grow bg-white dark:bg-gray-900 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 p-4 md:p-6 lg:p-8">
        <h3 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white mb-4 md:mb-6 flex items-center gap-2">
          <Layers className="w-5 h-5 text-blue-500 dark:text-blue-400" />
          {t.fullList} ({items.length})
        </h3>
        <div className="space-y-3">
          {items.map((item, index) => {
            const isCurrent = index === currentIndex;
            const interaction = interactions.find(i => i.sentence_id === item.sentence_id);
            const isEditingThisMemo = editingMemoId === item.sentence_id;

            return (
              <div
                key={item.id}
                id={`playlist-item-${index}`}
                onClick={() => {setCurrentIndex(index); updateIsPlaying(true);}}
                className={`group w-full flex flex-col p-3 md:p-4 rounded-2xl transition-all text-left cursor-pointer border ${
                  isCurrent 
                    ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-900/30 shadow-sm' 
                    : 'bg-white dark:bg-gray-900 border-transparent hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                <div className="flex items-start gap-3 md:gap-4 w-full">
                  <div className={`w-8 h-8 mt-0.5 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm ${
                    isCurrent ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                  }`}>
                    {isCurrent && isPlaying ? <Volume2 className="w-4 h-4" /> : index + 1}
                  </div>
                  <div className="flex-grow min-w-0 relative pr-10">
                    <p className={`font-bold leading-relaxed ${isCurrent ? 'text-blue-900 dark:text-blue-100' : 'text-gray-900 dark:text-gray-100'}`}>
                      {item.sentences?.sentence}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1.5 leading-relaxed break-words">
                      {language === 'en' ? item.sentences?.translation_en : item.sentences?.translation}
                    </p>

                    <div className="absolute top-0 right-0 flex flex-col items-center gap-1 shrink-0">
                      {item.sentence_id && (
                        <>
                          <button 
                            onClick={(e) => handleTogglePin(e, item.sentence_id)}
                            className={`p-1.5 rounded-lg transition-all ${
                              interaction?.is_pinned 
                                ? 'text-amber-500 bg-amber-50 dark:bg-amber-900/20' 
                                : 'text-gray-300 dark:text-gray-600 hover:text-gray-400 dark:hover:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 opacity-100 md:opacity-0 md:group-hover:opacity-100'
                            }`}
                          >
                            <Bookmark className={`w-4 h-4 ${interaction?.is_pinned ? 'fill-current' : ''}`} />
                          </button>
                          
                          <button 
                            onClick={(e) => handleStartEditMemo(e, index, item.sentence_id, interaction?.memo)}
                            className={`p-1.5 rounded-lg transition-all ${
                              interaction?.memo 
                                ? 'text-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                                : 'text-gray-300 dark:text-gray-600 hover:text-gray-400 dark:hover:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 opacity-100 md:opacity-0 md:group-hover:opacity-100'
                            }`}
                          >
                            <StickyNote className={`w-4 h-4 ${interaction?.memo ? 'fill-current' : ''}`} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Memo Editor Form (Inline) */}
                {isEditingThisMemo && item.sentence_id && (
                  <div 
                    className="mt-4 pt-4 border-t border-blue-100/50 w-full"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest flex items-center gap-2">
                        <StickyNote className="w-3 h-3" />
                        Edit Memo
                      </span>
                      <button 
                        onClick={(e) => { e.stopPropagation(); setEditingMemoId(null); }} 
                        className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors"
                      >
                        <X className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                      </button>
                    </div>
                    <textarea 
                      value={tempMemo}
                      onChange={(e) => setTempMemo(e.target.value)}
                      placeholder={t.memoPlaceholder}
                      className="w-full p-3 bg-white dark:bg-gray-800 border border-blue-200 dark:border-blue-900 rounded-xl resize-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/30 focus:border-blue-400 dark:focus:border-blue-700 outline-none text-sm dark:text-gray-100 transition-all shadow-sm"
                      rows={2}
                      autoFocus
                    />
                    <div className="flex justify-end gap-2 mt-3">
                      <button 
                        onClick={(e) => { e.stopPropagation(); setEditingMemoId(null); }}
                        className="px-4 py-1.5 text-xs font-bold text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                      >
                        {t.cancel}
                      </button>
                      <button 
                        onClick={(e) => handleSaveMemo(e, item.sentence_id)}
                        className="px-4 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 transition-all flex items-center gap-1.5 shadow-sm"
                      >
                        <Save className="w-3.5 h-3.5" />
                        {t.save}
                      </button>
                    </div>
                  </div>
                )}

                {/* Display Memo (when not editing) */}
                {!isEditingThisMemo && interaction?.memo && (
                  <div className="mt-3 ml-11 md:ml-12 pl-3 border-l-2 border-blue-200 dark:border-blue-800 py-1">
                    <p className="text-xs text-blue-800/80 dark:text-blue-300/80 leading-relaxed italic whitespace-pre-wrap">
                      {interaction.memo}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
