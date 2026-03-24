import { notFound } from 'next/navigation';
import { getVideoWithTranscripts, getAllUserNotesForVideo } from '@/lib/supabase/queries/videos';
import VideoLearningClient from '@/components/VideoLearningClient';
import { getAppUserFromServer } from '@/lib/auth/app-user';
import { isSuperAdminSqlite } from '@/lib/auth/super-admin';
import { incrementVideoViewCountSqlite } from '@/lib/sqlite/videos';

interface MyVideoPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function MyVideoPage({ params }: MyVideoPageProps) {
  const { id } = await params;

  const { data: video, error } = await getVideoWithTranscripts(id);

  if (error || !video) {
    notFound();
  }

  const { data: userNotes } = await getAllUserNotesForVideo(id);

  try {
    await incrementVideoViewCountSqlite(id);
  } catch (err) {
    console.error('Failed to increment view count:', err);
  }

  const user = await getAppUserFromServer();
  let isAdmin = false;
  let canEditVisibility = false;
  if (user) {
    canEditVisibility = await isSuperAdminSqlite({ userId: user.id, email: user.email ?? null });
    isAdmin = canEditVisibility;
  }

  const isOwner = Boolean(user && video.uploader_id && user.id === video.uploader_id);

  const channelData = Array.isArray(video.video_channels) ? video.video_channels[0] : video.video_channels;
  const categoryData = Array.isArray(video.user_categories) ? video.user_categories[0] : video.user_categories;

  return (
    <VideoLearningClient
      videoId={video.id}
      youtubeId={video.youtube_id}
      title={video.title}
      description={video.description}
      visibility={video.visibility}
      canEditVisibility={canEditVisibility}
      categoryId={video.category_id ?? null}
      categoryName={categoryData?.name || null}
      channelName={channelData?.channel_name || null}
      viewCount={video.view_count}
      languageId={video.language_id}
      transcripts={video.transcripts}
      userNotes={userNotes}
      isAdmin={isAdmin || isOwner}
      enlargeTranscriptTextOnDesktop
    />
  );
}