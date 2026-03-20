import { notFound } from 'next/navigation';
import { getVideoWithTranscripts, getAllUserNotesForVideo } from '@/lib/supabase/queries/videos';
import VideoLearningClient from '@/components/VideoLearningClient';
import { createClient } from '@/lib/supabase/server';
import { getAppUserFromServer } from '@/lib/auth/app-user';
import { isSuperAdminSqlite } from '@/lib/auth/super-admin';
import { incrementVideoViewCountSqlite } from '@/lib/sqlite/videos';

interface VideoPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function VideoPage({ params }: VideoPageProps) {
  const { id } = await params;

  // 영상 데이터 가져오기
  const { data: video, error } = await getVideoWithTranscripts(id);

  if (error || !video) {
    notFound();
  }

  // 사용자 메모 가져오기
  const { data: userNotes } = await getAllUserNotesForVideo(id);

  // 사용자가 운영자인지 확인
  const supabase = await createClient();
  
  // 조회수 증가
  try {
    await incrementVideoViewCountSqlite(id);
  } catch (err) {
    console.error('Failed to increment view count:', err);
  }

  const user = await getAppUserFromServer(supabase);
  let isAdmin = false;
  if (user) {
    isAdmin = await isSuperAdminSqlite({ userId: user.id, email: user.email ?? null });
  }

  // 업로더(소유자) 여부 확인: uploader_id로 직접 확인
  const isOwner = Boolean(user && video.uploader_id && user.id === video.uploader_id);

  // 채널 및 카테고리 정보 추출
  const channelData = Array.isArray(video.video_channels) ? video.video_channels[0] : video.video_channels;
  const categoryData = Array.isArray(video.user_categories) ? video.user_categories[0] : video.user_categories;

  return (
    <VideoLearningClient
      videoId={video.id}
      youtubeId={video.youtube_id}
      title={video.title}
      description={video.description}
      categoryId={video.category_id ?? null}
      categoryName={categoryData?.name || null}
      channelName={channelData?.channel_name || null}
      viewCount={video.view_count}
      languageId={video.language_id}
      transcripts={video.transcripts}
      userNotes={userNotes}
      isAdmin={isAdmin || isOwner}
    />
  );
}
