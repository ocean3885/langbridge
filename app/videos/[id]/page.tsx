import { notFound } from 'next/navigation';
import { getVideoWithTranscripts, getAllUserNotesForVideo } from '@/lib/supabase/queries/videos';
import VideoLearningClient from '@/components/VideoLearningClient';
import { createClient } from '@/lib/supabase/server';

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
  const { data: { user } } = await supabase.auth.getUser();
  let isAdmin = false;
  if (user) {
    const { data: profile } = await supabase
      .from('lang_profiles')
      .select('is_premium')
      .eq('id', user.id)
      .single();
    isAdmin = profile?.is_premium || false;
  }

  return (
    <VideoLearningClient
      videoId={video.id}
      youtubeId={video.youtube_id}
      title={video.title}
      languageId={video.language_id}
      transcripts={video.transcripts}
      userNotes={userNotes}
      isAdmin={isAdmin}
    />
  );
}
