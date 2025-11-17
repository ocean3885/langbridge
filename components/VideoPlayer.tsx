'use client';

import { useEffect, useRef, useState } from 'react';
import YouTube, { YouTubeProps, YouTubePlayer } from 'react-youtube';

interface VideoPlayerProps {
  youtubeId: string;
  selectedTranscriptIndex: number | null;
  transcripts: {
    start: number;
    duration: number;
  }[];
  onTimeUpdate?: (currentTime: number) => void;
  repeatState: { type: 'none' | 'single' | 'range', index1: number | null, index2: number | null };
}

export default function VideoPlayer({
  youtubeId,
  selectedTranscriptIndex,
  transcripts,
  onTimeUpdate,
  repeatState,
}: VideoPlayerProps) {
  const playerRef = useRef<YouTubePlayer | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const [isReady, setIsReady] = useState(false);

  // 반복/구간 반복/순차 재생 로직
  useEffect(() => {
    if (!isReady || !playerRef.current) return;

    // 반복 구간
    if (repeatState.type === 'single' && repeatState.index1 !== null) {
      const t = transcripts[repeatState.index1];
      if (!t) return;
      playerRef.current.seekTo(t.start, true);
      playerRef.current.playVideo();
      // 반복 구간 체크
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = setInterval(async () => {
        if (!playerRef.current) return;
        const currentTime = await playerRef.current.getCurrentTime();
        if (onTimeUpdate) onTimeUpdate(currentTime);
        if (currentTime >= t.start + t.duration) {
          playerRef.current.seekTo(t.start, true);
        }
      }, 100);
      return () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
      };
    }
    if (repeatState.type === 'range' && repeatState.index1 !== null && repeatState.index2 !== null) {
      const t1 = transcripts[repeatState.index1];
      const t2 = transcripts[repeatState.index2];
      if (!t1 || !t2) return;
      const start = Math.min(t1.start, t2.start);
      const end = Math.max(t1.start + t1.duration, t2.start + t2.duration);
      playerRef.current.seekTo(start, true);
      playerRef.current.playVideo();
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = setInterval(async () => {
        if (!playerRef.current) return;
        const currentTime = await playerRef.current.getCurrentTime();
        if (onTimeUpdate) onTimeUpdate(currentTime);
        if (currentTime >= end) {
          playerRef.current.seekTo(start, true);
        }
      }, 100);
      return () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
      };
    }
    // 순차 재생
    if (selectedTranscriptIndex !== null) {
      const t = transcripts[selectedTranscriptIndex];
      if (!t) return;
      playerRef.current.seekTo(t.start, true);
      playerRef.current.playVideo();
    }
    // 기본 시간 업데이트
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(async () => {
      if (!playerRef.current) return;
      const currentTime = await playerRef.current.getCurrentTime();
      if (onTimeUpdate) onTimeUpdate(currentTime);
    }, 100);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isReady, selectedTranscriptIndex, transcripts, onTimeUpdate, repeatState]);

  // 현재 재생 시간 추적 (하이라이트용)
  useEffect(() => {
    if (!isReady || !playerRef.current) {
      return;
    }

    const timeUpdateInterval = setInterval(async () => {
      if (!playerRef.current) return;
      try {
        const currentTime = await playerRef.current.getCurrentTime();
        if (onTimeUpdate) {
          onTimeUpdate(currentTime);
        }
      } catch {
        // ignore
      }
    }, 100);

    return () => {
      clearInterval(timeUpdateInterval);
    };
  }, [isReady, onTimeUpdate]);

  const onReady: YouTubeProps['onReady'] = (event) => {
    playerRef.current = event.target;
    setIsReady(true);
  };

  const opts: YouTubeProps['opts'] = {
    width: '100%',
    height: '100%',
    playerVars: {
      autoplay: 0,
      controls: 1,
      modestbranding: 1,
      rel: 0,
    },
  };

  return (
    <div className="w-full aspect-video bg-black rounded-lg overflow-hidden">
      <YouTube
        videoId={youtubeId}
        opts={opts}
        onReady={onReady}
        className="w-full h-full"
      />
    </div>
  );
}
