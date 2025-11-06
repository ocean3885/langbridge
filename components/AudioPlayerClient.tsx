"use client"; // 이 컴포넌트는 클라이언트에서 실행

import { useState, useRef, useEffect } from 'react';

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

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      const currentTime = audio.currentTime;
      const activeIndex = syncData.findIndex(
        (data) => currentTime >= data.start && currentTime < data.end
      );
      setCurrentSentenceIndex(activeIndex);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
    };
  }, [syncData]);

  return (
    <div className="mt-8">
      <audio ref={audioRef} src={audioUrl} controls className="w-full" />
      
      <div className="mt-6 space-y-4">
        {syncData.map((data, index) => (
          <div 
            key={index} 
            className={`p-4 rounded ${index === currentSentenceIndex ? 'bg-blue-100 border-blue-400 border' : 'bg-gray-50'}`}
          >
            <p className="text-lg font-medium">{data.text}</p>
            <p className="text-gray-600">{data.translation}</p>
          </div>
        ))}
      </div>
    </div>
  );
}