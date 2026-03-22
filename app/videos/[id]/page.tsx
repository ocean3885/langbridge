import { notFound } from 'next/navigation';
import EduVideoLearningClient from '@/components/EduVideoLearningClient';
import { getAppUserFromServer } from '@/lib/auth/app-user';
import { extractYoutubeIdFromUrl, getEduVideoByIdSqlite, incrementEduVideoViewCountSqlite } from '@/lib/sqlite/edu-videos';
import { getVideoLearningProgressSqlite } from '@/lib/sqlite/video-learning-progress';

interface VideoPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function VideoPage({ params }: VideoPageProps) {
  const { id } = await params;

  const video = await getEduVideoByIdSqlite(id);
  if (!video) {
    notFound();
  }

  try {
    await incrementEduVideoViewCountSqlite(id);
  } catch (err) {
    console.error('Failed to increment view count:', err);
  }

  const youtubeId = extractYoutubeIdFromUrl(video.youtube_url);
  if (!youtubeId) {
    notFound();
  }

  const user = await getAppUserFromServer();
  const progress = user
    ? await getVideoLearningProgressSqlite(user.id, id)
    : null;

  return (
    <EduVideoLearningClient
      youtubeId={youtubeId}
      isLoggedIn={Boolean(user)}
      video={video}
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
