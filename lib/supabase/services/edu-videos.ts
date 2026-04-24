import { createAdminClient } from '@/lib/supabase/admin';
import { randomUUID } from 'crypto';

export type SupabaseEduVideo = {
  id: string;
  youtube_url: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  duration_seconds: number | null;
  created_at: string;
  language_id: number | null;
  category_id: string | null;
  channel_id: string | null;
  view_count: number;
  uploader_id: string | null;
  channel_name?: string | null;
  language_name?: string | null;
  category_name?: string | null;
};

export async function listEduVideos(): Promise<SupabaseEduVideo[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('edu_videos')
    .select(`
      *,
      edu_video_channels(channel_name),
      languages(name_ko),
      edu_video_categories(name)
    `)
    .order('created_at', { ascending: false });

  if (error || !data) return [];

  return data.map((row: any) => ({
    ...row,
    channel_name: row.edu_video_channels?.channel_name,
    language_name: row.languages?.name_ko,
    category_name: row.edu_video_categories?.name
  }));
}

export async function getEduVideoById(id: string): Promise<SupabaseEduVideo | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('edu_videos')
    .select(`
      *,
      edu_video_channels(channel_name),
      languages(name_ko),
      edu_video_categories(name)
    `)
    .eq('id', id)
    .maybeSingle();

  if (error || !data) return null;

  return {
    ...data,
    channel_name: data.edu_video_channels?.channel_name,
    language_name: data.languages?.name_ko,
    category_name: data.edu_video_categories?.name
  };
}

export async function insertEduVideo(input: {
  youtubeUrl: string;
  title: string;
  description: string | null;
  thumbnailUrl: string | null;
  languageId: number | null;
  categoryId: string | null;
  channelId: string | null;
  uploaderId: string;
}): Promise<string> {
  const supabase = createAdminClient();
  const id = randomUUID();
  const { error } = await supabase
    .from('edu_videos')
    .insert({
      id,
      youtube_url: input.youtubeUrl,
      title: input.title,
      description: input.description,
      thumbnail_url: input.thumbnailUrl,
      language_id: input.languageId,
      category_id: input.categoryId,
      channel_id: input.channelId,
      uploader_id: input.uploaderId,
      created_at: new Date().toISOString()
    });

  if (error) throw new Error(`교육용 영상 등록 실패: ${error.message}`);
  return id;
}

export async function updateEduVideo(input: {
  videoId: string;
  youtubeUrl: string;
  title: string;
  description: string | null;
  languageId: number | null;
  categoryId: string | null;
  channelId: string | null;
  thumbnailUrl: string | null;
}): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from('edu_videos')
    .update({
      youtube_url: input.youtubeUrl,
      title: input.title,
      description: input.description,
      language_id: input.languageId,
      category_id: input.categoryId,
      channel_id: input.channelId,
      thumbnail_url: input.thumbnailUrl
    })
    .eq('id', input.videoId);

  if (error) throw new Error(`교육용 영상 수정 실패: ${error.message}`);
}

export async function deleteEduVideo(videoId: string): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from('edu_videos')
    .delete()
    .eq('id', videoId);

  if (error) throw new Error(`교육용 영상 삭제 실패: ${error.message}`);
}

export async function incrementEduVideoViewCount(videoId: string): Promise<void> {
  const supabase = createAdminClient();
  // We can't easily increment in JS client without RPC.
  // But we can do a simple select-then-update for now or use a raw SQL if we had it.
  // Actually, we can use a dedicated RPC or just select-update.
  const { data } = await supabase.from('edu_videos').select('view_count').eq('id', videoId).single();
  if (data) {
    await supabase.from('edu_videos').update({ view_count: (data.view_count || 0) + 1 }).eq('id', videoId);
  }
}

export async function updateEduVideoDuration(videoId: string, durationSeconds: number): Promise<void> {
  const supabase = createAdminClient();
  await supabase
    .from('edu_videos')
    .update({ duration_seconds: durationSeconds })
    .eq('id', videoId);
}

export async function updateEduVideoChannel(videoId: string, channelId: string | null): Promise<void> {
  const supabase = createAdminClient();
  await supabase
    .from('edu_videos')
    .update({ channel_id: channelId })
    .eq('id', videoId);
}

export async function updateEduVideoPlacement(input: {
  videoId: string;
  channelId: string | null;
  categoryId: string | null;
}): Promise<void> {
  const supabase = createAdminClient();
  await supabase
    .from('edu_videos')
    .update({
      channel_id: input.channelId,
      category_id: input.categoryId
    })
    .eq('id', input.videoId);
}
