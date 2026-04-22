'use client';

import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import { CalendarDays, Eye, Globe, Play, StickyNote, Video } from 'lucide-react';
import BackButton from '@/components/common/BackButton';
import VideoPlayer from '@/components/video/VideoPlayer';
import { Button } from '@/components/ui/button';
import { SqliteEduVideo } from '@/lib/sqlite/edu-videos';
import { saveEduVideoSummaryMemo, recordEduVideoStudy } from '@/app/actions/video-learning-progress';
import { updateEduVideoDuration } from '@/app/actions/edu-video';

type VideoMeta = {
  id: string;
  title: string;
  description: string | null;
  created_at: string;
  duration_seconds: number | null;
  view_count: number;
  youtube_url: string;
  language_name: string | null;
  channel_name: string | null;
  category_name: string | null;
};

type LearningProgress = {
  lastStudiedAt: string | null;
  totalStudySeconds: number;
  studySessionCount: number;
  lastPositionSeconds: number | null;
  summaryMemo: string | null;
};

interface EduVideoLearningClientProps {
  youtubeId: string;
  video: SqliteEduVideo;
  isLoggedIn: boolean;
  initialProgress: LearningProgress | null;
}

const FLUSH_INTERVAL_MS = 15000;
const MIN_SESSION_SECONDS = 10;

function formatPosition(seconds: number | null): string {
  if (seconds === null || !Number.isFinite(seconds)) return '0:00';

  const safeSeconds = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const remainingSeconds = safeSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
  }

  return `${minutes}:${String(remainingSeconds).padStart(2, '0')}`;
}

export default function EduVideoLearningClient({
  youtubeId,
  video,
  isLoggedIn,
  initialProgress,
}: EduVideoLearningClientProps) {
  const [progress, setProgress] = useState<LearningProgress>({
    lastStudiedAt: initialProgress?.lastStudiedAt ?? null,
    totalStudySeconds: initialProgress?.totalStudySeconds ?? 0,
    studySessionCount: initialProgress?.studySessionCount ?? 0,
    lastPositionSeconds: initialProgress?.lastPositionSeconds ?? null,
    summaryMemo: initialProgress?.summaryMemo ?? null,
  });
  const [memoDraft, setMemoDraft] = useState(initialProgress?.summaryMemo ?? '');
  const [memoMessage, setMemoMessage] = useState<string | null>(null);
  const [isSavingMemo, startSavingMemo] = useTransition();
  const [seekRequestToken, setSeekRequestToken] = useState(0);
  const [requestedSeekSeconds, setRequestedSeekSeconds] = useState<number | null>(null);
  const durationReportedRef = useRef(false);

  const currentTimeRef = useRef(0);
  const previousTimeRef = useRef<number | null>(null);
  const accumulatedSecondsRef = useRef(0);
  const sessionRecordedRef = useRef(false);
  const flushInFlightRef = useRef(false);

  useEffect(() => {
    setMemoDraft(initialProgress?.summaryMemo ?? '');
  }, [initialProgress?.summaryMemo]);

  const handleTimeUpdate = useCallback((currentTime: number) => {
    currentTimeRef.current = currentTime;

    if (previousTimeRef.current !== null) {
      const delta = currentTime - previousTimeRef.current;
      if (delta > 0 && delta < 5) {
        accumulatedSecondsRef.current += delta;
      }
    }

    previousTimeRef.current = currentTime;
  }, []);

  const flushStudyProgress = useCallback(async (force = false) => {
    if (!isLoggedIn || flushInFlightRef.current) return;

    const playedSeconds = Math.floor(accumulatedSecondsRef.current);
    const lastPositionSeconds = currentTimeRef.current;

    if (!force && playedSeconds < MIN_SESSION_SECONDS) {
      return;
    }

    if (playedSeconds <= 0) {
      return;
    }

    const incrementSession = !sessionRecordedRef.current && playedSeconds >= MIN_SESSION_SECONDS;
    flushInFlightRef.current = true;

    const result = await recordEduVideoStudy({
      videoId: video.id,
      playedSeconds,
      lastPositionSeconds,
      incrementSession,
    });

    flushInFlightRef.current = false;

    if (!result.success || !result.progress) {
      return;
    }

    accumulatedSecondsRef.current = 0;
    sessionRecordedRef.current = sessionRecordedRef.current || incrementSession;
    setProgress({
      lastStudiedAt: result.progress.last_studied_at,
      totalStudySeconds: result.progress.total_study_seconds,
      studySessionCount: result.progress.study_session_count,
      lastPositionSeconds: result.progress.last_position_seconds,
      summaryMemo: result.progress.summary_memo,
    });
  }, [isLoggedIn, video.id]);

  useEffect(() => {
    if (!isLoggedIn) return;

    const timer = window.setInterval(() => {
      void flushStudyProgress(false);
    }, FLUSH_INTERVAL_MS);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        void flushStudyProgress(true);
      }
    };

    const handlePageHide = () => {
      void flushStudyProgress(true);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', handlePageHide);

    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', handlePageHide);
      void flushStudyProgress(true);
    };
  }, [flushStudyProgress, isLoggedIn]);

  const handleSaveMemo = () => {
    startSavingMemo(async () => {
      const result = await saveEduVideoSummaryMemo({
        videoId: video.id,
        summaryMemo: memoDraft,
      });

      if (!result.success || !result.progress) {
        setMemoMessage(result.error ?? '메모 저장에 실패했습니다.');
        return;
      }

      setProgress((prev) => ({
        ...prev,
        summaryMemo: result.progress.summary_memo,
      }));
      setMemoDraft(result.progress.summary_memo ?? '');
      setMemoMessage('메모를 저장했습니다.');
    });
  };

  const handleResumePlayback = () => {
    if (!progress.lastPositionSeconds || progress.lastPositionSeconds <= 0) {
      return;
    }

    setRequestedSeekSeconds(progress.lastPositionSeconds);
    setSeekRequestToken((current) => current + 1);
  };

  const handleDurationReady = useCallback(async (durationSeconds: number) => {
    if (durationReportedRef.current || video.duration_seconds) {
      return;
    }

    durationReportedRef.current = true;
    await updateEduVideoDuration({
      videoId: video.id,
      durationSeconds,
    });
  }, [video.duration_seconds, video.id]);

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <BackButton />

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.6fr)_minmax(360px,1.1fr)] lg:items-stretch xl:grid-cols-[minmax(0,1.5fr)_minmax(420px,1.1fr)]">
        <div className="space-y-4">
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-black shadow-sm aspect-video">
            <VideoPlayer
              youtubeId={youtubeId}
              selectedTranscriptIndex={null}
              seekToSeconds={requestedSeekSeconds}
              seekRequestToken={seekRequestToken}
              onDurationReady={handleDurationReady}
              transcripts={[]}
              onTimeUpdate={handleTimeUpdate}
              repeatState={{ type: 'none', index1: null, index2: null }}
            />
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h1 className="text-2xl font-bold text-gray-900">{video.title}</h1>
            <div className="mt-4 flex flex-wrap gap-2 text-sm text-gray-600">
              {video.language_name && (
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1 text-blue-700">
                  <Globe className="h-4 w-4" />
                  {video.language_name}
                </span>
              )}
              {video.channel_name && (
                <span className="inline-flex items-center gap-1 rounded-full bg-cyan-50 px-3 py-1 text-cyan-700">
                  <Video className="h-4 w-4" />
                  {video.channel_name}
                </span>
              )}
              <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-gray-700">
                <Eye className="h-4 w-4" />
                {video.view_count.toLocaleString()}회
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-gray-700">
                <CalendarDays className="h-4 w-4" />
                {new Date(video.created_at).toLocaleDateString('ko-KR', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
            </div>
            {video.description && (
              <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-gray-700">{video.description}</p>
            )}
          </div>
        </div>

        <aside className="lg:flex lg:h-full lg:flex-col">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm lg:flex lg:h-full lg:flex-col">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <StickyNote className="h-5 w-5 text-amber-600" />
                  <h2 className="text-lg font-semibold text-gray-900">영상 메모</h2>
                </div>
                <p className="mt-2 text-sm text-gray-500">
                  이 영상을 보며 정리한 요점을 기록합니다.
                </p>
              </div>
              {isLoggedIn && progress.lastPositionSeconds !== null && progress.lastPositionSeconds > 0 && (
                <Button variant="outline" onClick={handleResumePlayback}>
                  <Play className="h-4 w-4" />
                  {`이어보기 ${formatPosition(progress.lastPositionSeconds)}`}
                </Button>
              )}
            </div>
            <textarea
              value={memoDraft}
              onChange={(event) => setMemoDraft(event.target.value)}
              disabled={!isLoggedIn || isSavingMemo}
              spellCheck={false}
              autoCorrect="off"
              autoCapitalize="off"
              placeholder={isLoggedIn ? '표현, 문장, 핵심 포인트를 정리해보세요.' : '로그인 후 메모를 저장할 수 있습니다.'}
              className="mt-4 min-h-56 w-full rounded-md border border-gray-300 px-4 py-3 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500 lg:flex-1 lg:min-h-0"
            />
            <div className="mt-3 flex items-center justify-between gap-3">
              <span className="text-xs text-gray-500">
                {memoMessage ?? (progress.summaryMemo ? '저장된 메모가 있습니다.' : '아직 저장된 메모가 없습니다.')}
              </span>
              <Button onClick={handleSaveMemo} disabled={!isLoggedIn || isSavingMemo}>
                {isSavingMemo ? '저장 중...' : '메모 저장'}
              </Button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}