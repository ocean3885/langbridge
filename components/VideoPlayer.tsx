'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
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
  const lastStateRef = useRef<{ type: string; index1: number | null; index2: number | null } | null>(null);
  const mountedRef = useRef(true);

  // interval 정리 함수
  const clearExistingInterval = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // youtubeId 변경 시 플레이어 완전 초기화
  useEffect(() => {
    setIsReady(false);
    clearExistingInterval();
    lastStateRef.current = null;
    if (playerRef.current) {
      try {
        playerRef.current.destroy();
      } catch {
        // ignore
      }
      playerRef.current = null;
    }
  }, [youtubeId, clearExistingInterval]);

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      clearExistingInterval();
      if (playerRef.current) {
        try {
          playerRef.current.pauseVideo();
          playerRef.current.destroy();
        } catch {
          // ignore
        }
        playerRef.current = null;
      }
    };
  }, [clearExistingInterval]);

  // 통합된 시간 업데이트 및 반복 로직
  useEffect(() => {
    if (!isReady || !playerRef.current || !mountedRef.current) return;

    // 이전 interval 확실히 정리
    clearExistingInterval();

    // 단일 구간 반복
    if (repeatState.type === 'single' && repeatState.index1 !== null) {
      const t = transcripts[repeatState.index1];
      if (!t) return;
      
      // 이전 상태와 동일하면 seekTo 건너뛰기 (중복 방지)
      const needsSeek = !lastStateRef.current || 
                        lastStateRef.current.type !== 'single' || 
                        lastStateRef.current.index1 !== repeatState.index1;
      
      if (needsSeek) {
        playerRef.current.seekTo(t.start, true);
        playerRef.current.playVideo();
        lastStateRef.current = { ...repeatState };
      }
      
      intervalRef.current = setInterval(async () => {
        if (!playerRef.current || !mountedRef.current) return;
        try {
          // API 호출 전 플레이어 메소드 존재 확인
          if (typeof playerRef.current.getPlayerState !== 'function') return;
          const state = await playerRef.current.getPlayerState();
          // 재생 중일 때만 업데이트 및 반복
          if (state === 1) { // 1 = PLAYING
            if (typeof playerRef.current.getCurrentTime !== 'function') return;
            const currentTime = await playerRef.current.getCurrentTime();
            if (onTimeUpdate && mountedRef.current) onTimeUpdate(currentTime);
            if (currentTime >= t.start + t.duration) {
              playerRef.current.seekTo(t.start, true);
            }
          }
        } catch {
          // ignore
        }
      }, 100);
      
      return clearExistingInterval;
    }

    // 구간 반복
    if (repeatState.type === 'range' && repeatState.index1 !== null && repeatState.index2 !== null) {
      const t1 = transcripts[repeatState.index1];
      const t2 = transcripts[repeatState.index2];
      if (!t1 || !t2) return;
      const start = Math.min(t1.start, t2.start);
      const end = Math.max(t1.start + t1.duration, t2.start + t2.duration);
      
      const needsSeek = !lastStateRef.current || 
                        lastStateRef.current.type !== 'range' || 
                        lastStateRef.current.index1 !== repeatState.index1 ||
                        lastStateRef.current.index2 !== repeatState.index2;
      
      if (needsSeek) {
        playerRef.current.seekTo(start, true);
        playerRef.current.playVideo();
        lastStateRef.current = { ...repeatState };
      }
      
      intervalRef.current = setInterval(async () => {
        if (!playerRef.current || !mountedRef.current) return;
        try {
          if (typeof playerRef.current.getPlayerState !== 'function') return;
          const state = await playerRef.current.getPlayerState();
          if (state === 1) { // PLAYING
            if (typeof playerRef.current.getCurrentTime !== 'function') return;
            const currentTime = await playerRef.current.getCurrentTime();
            if (onTimeUpdate && mountedRef.current) onTimeUpdate(currentTime);
            if (currentTime >= end) {
              playerRef.current.seekTo(start, true);
            }
          }
        } catch {
          // ignore
        }
      }, 100);
      
      return clearExistingInterval;
    }

    // 순차 재생 (스크립트 클릭)
    if (selectedTranscriptIndex !== null) {
      const t = transcripts[selectedTranscriptIndex];
      if (t) {
        playerRef.current.seekTo(t.start, true);
        playerRef.current.playVideo();
        lastStateRef.current = null; // 반복 상태 초기화
      }
    }

    // 기본 시간 업데이트 (재생 중일 때만)
    if (repeatState.type === 'none') {
      lastStateRef.current = null;
      intervalRef.current = setInterval(async () => {
        if (!playerRef.current || !mountedRef.current) return;
        try {
          if (typeof playerRef.current.getPlayerState !== 'function') return;
          const state = await playerRef.current.getPlayerState();
          if (state === 1) { // PLAYING
            if (typeof playerRef.current.getCurrentTime !== 'function') return;
            const currentTime = await playerRef.current.getCurrentTime();
            if (onTimeUpdate && mountedRef.current) onTimeUpdate(currentTime);
          }
        } catch {
          // ignore
        }
      }, 100);
    }

    return clearExistingInterval;
  }, [isReady, selectedTranscriptIndex, transcripts, onTimeUpdate, repeatState, clearExistingInterval]);

  const onReady: YouTubeProps['onReady'] = (event) => {
    // 기존 플레이어가 있으면 먼저 정리
    if (playerRef.current && playerRef.current !== event.target) {
      try {
        playerRef.current.destroy();
      } catch {
        // ignore
      }
    }
    playerRef.current = event.target;
    // DOM에 제대로 부착되었는지 확인
    if (event.target && typeof event.target.getPlayerState === 'function') {
      setIsReady(true);
    }
  };

  const onStateChange: YouTubeProps['onStateChange'] = (event) => {
    // 플레이어 상태 변경 시 추가 검증
    if (!mountedRef.current) {
      try {
        event.target.pauseVideo();
      } catch {
        // ignore
      }
    }
  };

  const opts: YouTubeProps['opts'] = {
    width: '100%',
    height: '100%',
    playerVars: {
      autoplay: 0,
      controls: 1,
      modestbranding: 1,
      rel: 0,
      enablejsapi: 1,
    },
  };

  return (
    <div className="w-full aspect-video bg-black rounded-lg overflow-hidden">
      <YouTube
        key={youtubeId}
        videoId={youtubeId}
        opts={opts}
        onReady={onReady}
        onStateChange={onStateChange}
        className="w-full h-full"
      />
    </div>
  );
}
