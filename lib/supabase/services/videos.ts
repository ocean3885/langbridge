import { randomUUID } from 'crypto';
import { createAdminClient } from '@/lib/supabase/admin';

export type VideoVisibility = 'public' | 'private' | 'members_only';

export type SupabaseVideo = {
  id: string;
  youtube_id: string;
  title: string;
  description: string | null;
  visibility: VideoVisibility;
  duration: number | null;
  thumbnail_url: string | null;
  created_at: string;
  language_id: number | null;
  channel_id: string | null;
  view_count: number;
  uploader_id: string | null;
  channel_name?: string | null;
  language_name?: string | null;
};

export type SupabaseTranscript = {
  id: string;
  video_id: string;
  start: number;
  duration: number;
  text_original: string;
  order_index: number;
};

export type SupabaseTranslation = {
  id: string;
  transcript_id: string;
  lang: string;
  text_translated: string;
};

export async function insertVideoWithTranscripts(input: {
  youtubeId: string;
  title: string;
  description?: string | null;
  visibility?: VideoVisibility;
  duration?: number | null;
  thumbnailUrl?: string | null;
  languageId?: number | null;
  learningCategoryId?: number | null;
  channelId?: string | null;
  uploaderId?: string | null;
  transcripts: Array<{ start: number; duration: number; textOriginal: string; orderIndex: number; textTranslated: string; lang: string }>;
}): Promise<string> {
  const supabase = createAdminClient();
  const videoId = randomUUID();

  // 1. Insert Video
  const { error: videoError } = await supabase.from('videos').insert({
    id: videoId,
    youtube_id: input.youtubeId,
    title: input.title,
    description: input.description ?? null,
    visibility: input.visibility ?? 'private',
    duration: input.duration ?? null,
    thumbnail_url: input.thumbnailUrl ?? null,
    language_id: input.languageId ?? null,
    channel_id: input.channelId ?? null,
    uploader_id: input.uploaderId ?? null
  });

  if (videoError) throw new Error(`Video insert failed: ${videoError.message}`);

  // 2. Insert Transcripts & Translations
  if (input.transcripts.length > 0) {
    const transcriptsData = input.transcripts.map((t) => ({
      id: randomUUID(),
      video_id: videoId,
      start: t.start,
      duration: t.duration,
      text_original: t.textOriginal,
      order_index: t.orderIndex
    }));

    const { error: tsError } = await supabase.from('transcripts').insert(transcriptsData);
    if (tsError) throw new Error(`Transcripts insert failed: ${tsError.message}`);

    const translationsData = input.transcripts.map((t, index) => ({
      id: randomUUID(),
      transcript_id: transcriptsData[index].id,
      lang: t.lang,
      text_translated: t.textTranslated
    }));

    const { error: trError } = await supabase.from('translations').insert(translationsData);
    if (trError) throw new Error(`Translations insert failed: ${trError.message}`);
  }

  // 3. Insert Category mapping if exists
  if (typeof input.learningCategoryId === 'number' && input.uploaderId) {
    const { error: catError } = await supabase.from('user_category_videos').upsert({
      id: randomUUID(),
      user_id: input.uploaderId,
      category_id: input.learningCategoryId,
      video_id: videoId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id, category_id, video_id' });

    if (catError) throw new Error(`Category mapping failed: ${catError.message}`);
  }

  return videoId;
}

export async function deleteVideo(videoId: string): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase.from('videos').delete().eq('id', videoId);
  if (error) throw new Error(`Video delete failed: ${error.message}`);
  // Cascade deletes will handle transcripts and translations
}

export async function updateVideoChannel(videoId: string, channelId: string | null): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase.from('videos').update({ channel_id: channelId }).eq('id', videoId);
  if (error) throw new Error(`Update channel failed: ${error.message}`);
}

export async function incrementVideoViewCount(videoId: string): Promise<void> {
  const supabase = createAdminClient();
  // Using RPC would be better for atomic increment, but this is a fallback
  const { data } = await supabase.from('videos').select('view_count').eq('id', videoId).single();
  if (data) {
    await supabase.from('videos').update({ view_count: (data.view_count || 0) + 1 }).eq('id', videoId);
  }
}

export async function updateVideoDuration(videoId: string, durationSeconds: number): Promise<void> {
  const supabase = createAdminClient();
  const { data } = await supabase.from('videos').select('duration').eq('id', videoId).single();
  if (data && (data.duration === null || data.duration <= 0)) {
    await supabase.from('videos').update({ duration: Math.max(0, Math.floor(durationSeconds)) }).eq('id', videoId);
  }
}

export async function getVideoWithTranscripts(videoId: string): Promise<{
  video: SupabaseVideo | null;
  transcripts: Array<SupabaseTranscript & { translations: SupabaseTranslation[] }>;
}> {
  const supabase = createAdminClient();
  
  const { data: videoData, error: videoError } = await supabase
    .from('videos')
    .select(`
      *,
      languages(name_ko)
    `)
    .eq('id', videoId)
    .maybeSingle();

  if (videoError || !videoData) return { video: null, transcripts: [] };

  const video = {
    ...videoData,
    language_name: videoData.languages?.name_ko
  } as SupabaseVideo;

  const { data: transcriptsData, error: tsError } = await supabase
    .from('transcripts')
    .select(`
      *,
      translations(*)
    `)
    .eq('video_id', videoId)
    .order('order_index', { ascending: true });

  if (tsError || !transcriptsData) return { video, transcripts: [] };

  return {
    video,
    transcripts: transcriptsData as Array<SupabaseTranscript & { translations: SupabaseTranslation[] }>
  };
}

export async function getAllVideos(): Promise<Array<SupabaseVideo & { transcript_count: number }>> {
  const supabase = createAdminClient();
  const { data: videos, error } = await supabase
    .from('videos')
    .select(`*, transcripts(id)`)
    .order('created_at', { ascending: false });

  if (error || !videos) return [];

  return videos.map(v => ({
    ...v,
    transcript_count: v.transcripts?.length || 0
  })) as Array<SupabaseVideo & { transcript_count: number }>;
}

export async function listVideos(input?: {
  uploaderId?: string;
  uploaderIds?: string[];
  channelId?: string | null;
  hasChannel?: boolean;
  visibility?: VideoVisibility;
  limit?: number;
  videoIds?: string[];
}): Promise<Array<SupabaseVideo & { transcript_count: number }>> {
  const supabase = createAdminClient();
  let query = supabase
    .from('videos')
    .select(`
      *,
      edu_video_channels(channel_name),
      languages(name_ko),
      transcripts(id)
    `);

  if (input?.videoIds && input.videoIds.length > 0) {
    query = query.in('id', input.videoIds);
  }

  if (input?.uploaderIds && input.uploaderIds.length > 0) {
    query = query.in('uploader_id', input.uploaderIds);
  } else if (input?.uploaderId) {
    query = query.eq('uploader_id', input.uploaderId);
  }

  if (input && 'channelId' in input) {
    if (input.channelId === null) {
      query = query.is('channel_id', null);
    } else if (typeof input.channelId === 'string') {
      query = query.eq('channel_id', input.channelId);
    }
  }

  if (input?.hasChannel) {
    query = query.not('channel_id', 'is', null);
  }

  if (input?.visibility) {
    query = query.eq('visibility', input.visibility);
  }

  query = query.order('created_at', { ascending: false });

  if (input?.limit) {
    query = query.limit(Math.max(1, Math.floor(input.limit)));
  }

  const { data: videos, error } = await query;
  if (error) {
    console.error('listVideos error:', error);
    return [];
  }
  if (!videos) return [];

  return videos.map(v => ({
    ...v,
    channel_name: v.edu_video_channels?.channel_name,
    language_name: v.languages?.name_ko,
    transcript_count: v.transcripts?.length || 0
  })) as Array<SupabaseVideo & { transcript_count: number }>;
}

export async function updateVideo(input: {
  videoId: string;
  title: string;
  languageId: number | null;
  description?: string | null;
  visibility: VideoVisibility;
}): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase.from('videos').update({
    title: input.title,
    language_id: input.languageId,
    description: input.description ?? null,
    visibility: input.visibility
  }).eq('id', input.videoId);

  if (error) throw new Error(`Update video failed: ${error.message}`);
}

export async function updateTranscript(input: {
  transcriptId: string;
  start: number;
  duration: number;
  textOriginal: string;
  textTranslated: string;
}): Promise<void> {
  const supabase = createAdminClient();
  const { error: tsError } = await supabase.from('transcripts').update({
    start: input.start,
    duration: input.duration,
    text_original: input.textOriginal,
    updated_at: new Date().toISOString()
  }).eq('id', input.transcriptId);

  if (tsError) throw new Error(`Update transcript failed: ${tsError.message}`);

  const { data: firstTranslation } = await supabase
    .from('translations')
    .select('id')
    .eq('transcript_id', input.transcriptId)
    .order('created_at', { ascending: true })
    .limit(1)
    .single();

  if (firstTranslation) {
    await supabase.from('translations').update({
      text_translated: input.textTranslated,
      updated_at: new Date().toISOString()
    }).eq('id', firstTranslation.id);
  }
}

export async function countVideosByCategoryForUploader(input: {
  uploaderId: string;
  categoryId: number;
}): Promise<number> {
  const supabase = createAdminClient();
  const { count, error } = await supabase
    .from('user_category_videos')
    .select('video_id', { count: 'exact', head: true })
    .eq('user_id', input.uploaderId)
    .eq('category_id', input.categoryId);

  if (error) throw new Error(`Count videos failed: ${error.message}`);
  return count ?? 0;
}

export async function hasVideosForCategoryByUploader(input: {
  uploaderId: string;
  categoryId: number;
}): Promise<boolean> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('user_category_videos')
    .select('video_id')
    .eq('user_id', input.uploaderId)
    .eq('category_id', input.categoryId)
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(`Has videos check failed: ${error.message}`);
  return !!data;
}

export async function listVideosByUserCategory(input: {
  userId: string;
  categoryId: number;
}): Promise<Array<SupabaseVideo & { transcript_count: number; category_id: number }>> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('user_category_videos')
    .select(`
      category_id,
      video_id,
      videos (
        *,
        edu_video_channels(channel_name),
        languages(name_ko),
        transcripts(id)
      )
    `)
    .eq('user_id', input.userId)
    .eq('category_id', input.categoryId);

  if (error || !data) return [];

  return data.map((row: any) => ({
    ...row.videos,
    category_id: row.category_id,
    channel_name: row.videos.edu_video_channels?.channel_name,
    language_name: row.videos.languages?.name_ko,
    transcript_count: row.videos.transcripts?.length || 0
  }));
}

export async function listAllUserCategoryVideos(userId: string): Promise<Array<{
  video_id: string;
  category_id: number;
  category_name: string;
}>> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('user_category_videos')
    .select(`
      video_id,
      category_id,
      user_categories (name)
    `)
    .eq('user_id', userId);

  if (error || !data) return [];

  return data.map((row: any) => ({
    video_id: row.video_id,
    category_id: row.category_id,
    category_name: row.user_categories?.name || ''
  }));
}

export async function addVideoToUserCategory(input: {
  userId: string;
  videoId: string;
  categoryId: number;
}): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from('user_category_videos')
    .upsert({
      id: randomUUID(),
      user_id: input.userId,
      video_id: input.videoId,
      category_id: input.categoryId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id, video_id, category_id' });

  if (error) throw new Error(`영상 담기 실패: ${error.message}`);
}

export async function removeVideoFromUserCategory(input: {
  userId: string;
  videoId: string;
  categoryId: number;
}): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from('user_category_videos')
    .delete()
    .eq('user_id', input.userId)
    .eq('video_id', input.videoId)
    .eq('category_id', input.categoryId);

  if (error) throw new Error(`영상 제외 실패: ${error.message}`);
}

export async function listUserCategoriesForVideo(input: {
  userId: string;
  videoId: string;
}): Promise<Array<{
  category_id: number;
  category_name: string;
}>> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('user_category_videos')
    .select(`
      category_id,
      user_categories (name)
    `)
    .eq('user_id', input.userId)
    .eq('video_id', input.videoId);

  if (error || !data) return [];

  return data.map((row: any) => ({
    category_id: row.category_id,
    category_name: row.user_categories?.name || ''
  }));
}
