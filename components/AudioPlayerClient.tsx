"use client"; // 이 컴포넌트는 클라이언트에서 실행

import { useState, useRef, useEffect } from 'react';
import { Repeat, RotateCw } from 'lucide-react';

type SyncData = {
  text: string;
  translation: string;
  start: number;
  end: number;
};

interface Props {
  audioUrl: string;
  syncData: SyncData[];
}

export default function AudioPlayerClient({ audioUrl, syncData }: Props) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(-1);
  const [error, setError] = useState<string | null>(null);
  const [repeatingSentenceIndex, setRepeatingSentenceIndex] = useState<number | null>(null);
  const [isLoopingAll, setIsLoopingAll] = useState(false);
  const repeatTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 문장 클릭 시 해당 시간으로 이동하는 핸들러
  const handleSentenceClick = (startTime: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    
    // 반복 재생 중이면 해제
    if (repeatingSentenceIndex !== null) {
      setRepeatingSentenceIndex(null);
      if (repeatTimeoutRef.current) {
        clearTimeout(repeatTimeoutRef.current);
        repeatTimeoutRef.current = null;
      }
    }
    
    audio.currentTime = startTime;
    
    // 오디오가 일시정지 상태면 자동 재생
    if (audio.paused) {
      audio.play().catch(err => {
        console.error('Auto-play failed:', err);
      });
    }
  };

  // 전체 반복 재생 토글 핸들러
  const handleLoopAllToggle = () => {
    const audio = audioRef.current;
    if (!audio) return;

    const newLoopState = !isLoopingAll;
    setIsLoopingAll(newLoopState);
    audio.loop = newLoopState;

    // 전체 반복 시작 시
    if (newLoopState) {
      // 개별 문장 반복 중지
      if (repeatingSentenceIndex !== null) {
        setRepeatingSentenceIndex(null);
        if (repeatTimeoutRef.current) {
          clearTimeout(repeatTimeoutRef.current);
          repeatTimeoutRef.current = null;
        }
      }
      
      // 오디오가 일시정지 상태면 자동 재생
      if (audio.paused) {
        audio.play().catch(err => {
          console.error('Auto-play failed:', err);
        });
      }
    }
  };

  // 반복 재생 토글 핸들러
  const handleRepeatToggle = (e: React.MouseEvent, index: number) => {
    e.stopPropagation(); // 부모 div 클릭 이벤트 방지
    
    const audio = audioRef.current;
    if (!audio) return;

    if (repeatingSentenceIndex === index) {
      // 반복 중지
      setRepeatingSentenceIndex(null);
      if (repeatTimeoutRef.current) {
        clearTimeout(repeatTimeoutRef.current);
        repeatTimeoutRef.current = null;
      }
    } else {
      // 반복 시작 - 전체 반복 중이면 먼저 해제
      if (isLoopingAll) {
        setIsLoopingAll(false);
        audio.loop = false;
      }
      
      setRepeatingSentenceIndex(index);
      const data = syncData[index];
      audio.currentTime = data.start;
      if (audio.paused) {
        audio.play().catch(err => console.error('Auto-play failed:', err));
      }
    }
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      const currentTime = audio.currentTime;
      const activeIndex = syncData.findIndex(
        (data) => currentTime >= data.start && currentTime < data.end
      );
      setCurrentSentenceIndex(activeIndex);

      // 반복 재생 중인 문장의 끝에 도달하면 다시 시작
      if (repeatingSentenceIndex !== null) {
        const repeatData = syncData[repeatingSentenceIndex];
        if (currentTime >= repeatData.end) {
          audio.currentTime = repeatData.start;
        }
      }
    };

    const handleEnded = () => {
      // 오디오가 끝났을 때 반복 재생 중이면 해당 문장으로 돌아가서 재생
      if (repeatingSentenceIndex !== null) {
        const repeatData = syncData[repeatingSentenceIndex];
        audio.currentTime = repeatData.start;
        audio.play().catch(err => {
          console.error('Repeat playback failed:', err);
        });
      }
    };

    const handleError = (e: Event) => {
      console.error('Audio playback error:', e);
      const audioElement = e.target as HTMLAudioElement;
      if (audioElement.error) {
        setError(`오디오 재생 오류: ${audioElement.error.message} (코드: ${audioElement.error.code})`);
      }
    };

    const handleCanPlay = () => {
      console.log('Audio is ready to play');
      setError(null);
      // 오디오가 로드되면 자동 재생
      audio.play().catch(err => {
        console.error('Auto-play failed:', err);
        // 브라우저 정책상 자동 재생이 차단될 수 있음
      });
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);
    audio.addEventListener('canplay', handleCanPlay);
    
    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('canplay', handleCanPlay);
      
      // 컴포넌트 언마운트 시 반복 타임아웃 정리
      if (repeatTimeoutRef.current) {
        clearTimeout(repeatTimeoutRef.current);
      }
    };
  }, [syncData, repeatingSentenceIndex]);

  return (
    <div className="mt-8">
      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}
      
      {/* 전체 반복 재생 버튼 */}
      <div className="mb-4 flex justify-end">
        <button
          onClick={handleLoopAllToggle}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
            isLoopingAll
              ? 'bg-purple-500 text-white hover:bg-purple-600 shadow-md'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
          title={isLoopingAll ? '전체 반복 중지' : '전체 반복 재생'}
        >
          <RotateCw className={`w-5 h-5 ${isLoopingAll ? 'animate-spin' : ''}`} style={{ animationDuration: '3s' }} />
          <span className="font-medium">{isLoopingAll ? '전체 반복 중' : '전체 반복'}</span>
        </button>
      </div>
      
      <audio ref={audioRef} src={audioUrl} controls className="w-full" preload="metadata" />
      
      <div className="mt-6 space-y-4">
        {syncData.map((data, index) => (
          <div 
            key={index}
            onClick={() => handleSentenceClick(data.start)}
            className={`p-4 rounded cursor-pointer transition-all duration-200 ${
              index === currentSentenceIndex 
                ? 'bg-blue-100 border-blue-400 border-2 shadow-md' 
                : 'bg-gray-50 hover:bg-gray-100 hover:shadow-sm border border-transparent'
            } ${
              repeatingSentenceIndex === index ? 'ring-2 ring-green-500' : ''
            }`}
            title="클릭하여 이 문장으로 이동"
          >
            <div className="flex justify-between items-start gap-2">
              <div className="flex-1">
                <p className="text-lg font-medium">{data.text}</p>
                <p className="text-gray-600">{data.translation}</p>
                <p className="text-xs text-gray-400 mt-1">
                  {Math.floor(data.start / 60)}:{String(Math.floor(data.start % 60)).padStart(2, '0')} - {Math.floor(data.end / 60)}:{String(Math.floor(data.end % 60)).padStart(2, '0')}
                </p>
              </div>
              <button
                onClick={(e) => handleRepeatToggle(e, index)}
                className={`p-2 rounded-full transition-colors ${
                  repeatingSentenceIndex === index
                    ? 'bg-green-500 text-white hover:bg-green-600'
                    : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                }`}
                title={repeatingSentenceIndex === index ? '반복 중지' : '이 문장 반복'}
              >
                <Repeat className="w-5 h-5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}