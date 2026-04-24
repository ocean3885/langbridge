import { notFound } from 'next/navigation';
import EduVideoLearningClient from '@/components/edu-video/EduVideoLearningClient';
import { getAppUserFromServer } from '@/lib/auth/app-user';
import { getVideoWithTranscripts, incrementVideoViewCount } from '@/lib/supabase/services/videos';
import { getEduVideoProgress } from '@/lib/supabase/services/edu-video-progress';

interface VideoPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function VideoPage({ params }: VideoPageProps) {
  const { id } = await params;

  const { video, transcripts } = await getVideoWithTranscripts(id);
  if (!video) {
    notFound();
  }

  try {
    await incrementVideoViewCount(id);
  } catch (err) {
    console.error('Failed to increment view count:', err);
  }

  const youtubeId = video.youtube_id;
  if (!youtubeId) {
    notFound();
  }

  const user = await getAppUserFromServer();
  const progress = user
    ? await getEduVideoProgress(user.id, id)
    : null;

  return (
    <EduVideoLearningClient
      youtubeId={youtubeId}
      isLoggedIn={Boolean(user)}
      video={video as any}
      initialProgress={progress ? {
        lastStudiedAt: progress.last_studied_at,
        totalStudySeconds: progress.total_study_seconds,
        studySessionCount: progress.study_session_count,
        lastPositionSeconds: progress.last_position_seconds,
        summaryMemo: progress.summary_memo,
      } : null}
    />
  );
}
