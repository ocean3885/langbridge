import { notFound } from 'next/navigation';
import { getVideoWithTranscripts, getAllUserNotesForVideo } from '@/lib/supabase/queries/videos';
import VideoLearningClient from '@/components/VideoLearningClient';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

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
    await supabase.rpc('increment_video_view_count', { video_id: id });
  } catch (err) {
    console.error('Failed to increment view count:', err);
  }

  const { data: { user } } = await supabase.auth.getUser();
  let isAdmin = false;
  if (user) {
    const admin = createAdminClient();
    const { data: isSuperAdmin } = await admin.rpc('get_user_is_super_admin', { user_id: user.id });
    isAdmin = Boolean(isSuperAdmin);
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
      channelId={video.channel_id ?? null}
      channelName={channelData?.channel_name || null}
      viewCount={video.view_count}
      languageId={video.language_id}
      transcripts={video.transcripts}
      userNotes={userNotes}
      isAdmin={isAdmin || isOwner}
    />
  );
}
