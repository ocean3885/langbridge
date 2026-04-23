import { notFound } from 'next/navigation';
import { getVideoWithTranscripts, incrementVideoViewCount, listUserCategoriesForVideo } from '@/lib/supabase/services/videos';
import { getAllUserNotesForVideo } from '@/lib/supabase/services/user-notes';
import VideoLearningClient from '@/components/video/VideoLearningClient';
import { getAppUserFromServer } from '@/lib/auth/app-user';
import { isSuperAdmin } from '@/lib/auth/super-admin';
import { getVideoLearningProgress } from '@/lib/supabase/services/video-learning-progress';
import { getVideoProgress } from '@/lib/supabase/services/video-progress';
import { listCategories, listUserCategoriesWithCount } from '@/lib/supabase/services/categories';

interface SharedVideoDetailsProps {
  id: string;
  backUrl: string;
}

export default async function SharedVideoDetails({ id, backUrl }: SharedVideoDetailsProps) {
  const { video, transcripts } = await getVideoWithTranscripts(id);

  if (!video) {
    notFound();
  }

  const user = await getAppUserFromServer();
  
  let userNotes: Record<string, { id: string; content: string }> = {};
  if (user) {
    userNotes = await getAllUserNotesForVideo(user.id, id);
  }

  try {
    await incrementVideoViewCount(id);
  } catch (err) {
    console.error('Failed to increment view count:', err);
  }

  let isAdmin = false;
  let canEditVisibility = false;
  if (user) {
    const isAdminUser = await isSuperAdmin({ userId: user.id, email: user.email ?? null });
    canEditVisibility = isAdminUser;
    isAdmin = isAdminUser;
  }

  const isOwner = Boolean(user && video.uploader_id && user.id === video.uploader_id);

  // 모든 카테고리 정보와 현재 영상이 담긴 카테고리 ID 목록
  let allCategories: any[] = [];
  let selectedCategoryIds: number[] = [];
  let primaryCategoryName: string | null = null;
  let primaryCategoryId: number | null = null;
  
  if (user) {
    const [catList, mappings] = await Promise.all([
      listUserCategoriesWithCount(user.id),
      listUserCategoriesForVideo({ userId: user.id, videoId: id })
    ]);
    allCategories = catList;
    selectedCategoryIds = mappings.map(m => m.category_id);
    
    if (mappings.length > 0) {
      primaryCategoryName = mappings[0].category_name;
      primaryCategoryId = mappings[0].category_id;
    }
  }

  const progress = user ? await getVideoProgress(user.id, id) : null;

  return (
    <VideoLearningClient
      videoId={video.id}
      youtubeId={video.youtube_id}
      title={video.title}
      description={video.description}
      visibility={video.visibility}
      canEditVisibility={canEditVisibility}
      categoryId={primaryCategoryId}
      categoryName={primaryCategoryName}
      channelName={video.channel_name || null}
      viewCount={video.view_count}
      languageId={video.language_id}
      duration={video.duration ?? null}
      transcripts={transcripts}
      userNotes={userNotes}
      isAdmin={isAdmin || isOwner}
      progress={progress || undefined}
      backUrl={backUrl}
      allCategories={allCategories}
      selectedCategoryIds={selectedCategoryIds}
      enlargeTranscriptTextOnDesktop
    />
  );
}
