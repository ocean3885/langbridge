import { notFound } from 'next/navigation';
import { getVideoWithTranscriptsSqlite } from '@/lib/sqlite/videos';
import { getAllUserNotesForVideo } from '@/lib/supabase/queries/videos';
import VideoLearningClient from '@/components/VideoLearningClient';
import { getAppUserFromServer } from '@/lib/auth/app-user';
import { isSuperAdminSqlite } from '@/lib/auth/super-admin';
import { incrementVideoViewCountSqlite } from '@/lib/sqlite/videos';
import { listUserCategoriesForVideoSqlite } from '@/lib/sqlite/user-category-videos';

interface MyVideoPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function MyVideoPage({ params }: MyVideoPageProps) {
  const { id } = await params;

  const { video, transcripts } = await getVideoWithTranscriptsSqlite(id);

  if (!video) {
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

  // 카테고리 정보는 user_category_videos 기반으로 가져옵니다 (Supabase 참조 방식 탈피)
  let primaryCategoryName: string | null = null;
  if (user) {
    const categories = await listUserCategoriesForVideoSqlite({
      userId: user.id,
      videoId: id,
    });
    if (categories && categories.length > 0) {
      primaryCategoryName = categories[0].category_name;
    }
  }

  return (
    <VideoLearningClient
      videoId={video.id}
      youtubeId={video.youtube_id}
      title={video.title}
      description={video.description}
      visibility={video.visibility}
      canEditVisibility={canEditVisibility}
      categoryId={video.category_id ?? null}
      categoryName={primaryCategoryName}
      channelName={video.channel_name || null}
      viewCount={video.view_count}
      languageId={video.language_id}
      duration={video.duration ?? null}
      transcripts={transcripts}
      userNotes={userNotes}
      isAdmin={isAdmin || isOwner}
      enlargeTranscriptTextOnDesktop
    />
  );
}