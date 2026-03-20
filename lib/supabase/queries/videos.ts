import { createClient } from '@/lib/supabase/server';
import { getAllUserNotesForVideoSqlite, getUserNoteForTranscriptSqlite } from '@/lib/sqlite/user-notes';
import { getAppUserFromServer } from '@/lib/auth/app-user';
import { getAllVideosSqlite, getVideoWithTranscriptsSqlite } from '@/lib/sqlite/videos';

export interface TranscriptWithTranslation {
  id: string;
  video_id: string;
  start: number;
  duration: number;
  text_original: string;
  order_index: number;
  translations: {
    id: string;
    lang: string;
    text_translated: string;
  }[];
}

export interface VideoWithTranscripts {
  id: string;
  youtube_id: string;
  title: string;
  description: string | null;
  duration: number | null;
  thumbnail_url: string | null;
  created_at: string;
  language_id: number | null;
  category_id: string | null;
  channel_id: string | null;
  view_count: number;
  uploader_id: string | null;
  user_categories?: { user_id: string; name: string } | { user_id: string; name: string }[] | null;
  video_channels?: { channel_name: string } | { channel_name: string }[] | null;
  transcripts: TranscriptWithTranslation[];
}

/**
 * video_id로 영상 정보와 스크립트, 번역을 한 번에 가져오기
 */
export async function getVideoWithTranscripts(
  videoId: string
): Promise<{ data: VideoWithTranscripts | null; error: string | null }> {
  try {
    const { video, transcripts } = await getVideoWithTranscriptsSqlite(videoId);

    if (!video) {
      return { data: null, error: '영상을 찾을 수 없습니다.' };
    }

    return {
      data: {
        ...video,
        user_categories: null,
        video_channels: null,
        transcripts,
      } as VideoWithTranscripts,
      error: null,
    };
  } catch (error) {
    console.error('getVideoWithTranscripts exception:', error);
    return {
      data: null,
      error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
    };
  }
}

/**
 * 모든 영상 목록 가져오기 (관리자용)
 */
export async function getAllVideos(): Promise<{
  data: {
    id: string;
    youtube_id: string;
    title: string;
    description: string | null;
    duration: number | null;
    thumbnail_url: string | null;
    created_at: string;
    transcript_count?: number;
    language_id: number | null;
    language_name: string | null;
    channel_id: string | null;
    channel_name: string | null;
    uploader_id: string | null;
  }[];
  error: string | null;
}> {
  try {
    const sqliteVideos = await getAllVideosSqlite();
    const videos = sqliteVideos.map((video) => ({
      id: video.id,
      youtube_id: video.youtube_id,
      title: video.title,
      description: video.description,
      duration: video.duration,
      thumbnail_url: video.thumbnail_url,
      created_at: video.created_at,
      language_id: video.language_id,
      language_name: null,
      channel_id: video.channel_id,
      channel_name: null,
      uploader_id: video.uploader_id,
      transcript_count: video.transcript_count,
    }));

    return { data: videos, error: null };
  } catch (error) {
    console.error('getAllVideos exception:', error);
    return {
      data: [],
      error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
    };
  }
}

/**
 * 특정 transcript에 대한 사용자 메모 가져오기
 */
export async function getUserNoteForTranscript(
  videoId: string,
  transcriptId: string
): Promise<{ data: { id: string; content: string } | null; error: string | null }> {
  try {
    const supabase = await createClient();

    const user = await getAppUserFromServer(supabase);
    if (!user) {
      return { data: null, error: '로그인이 필요합니다.' };
    }

    const data = await getUserNoteForTranscriptSqlite(user.id, videoId, transcriptId);
    return { data, error: null };
  } catch (error) {
    console.error('getUserNoteForTranscript exception:', error);
    return {
      data: null,
      error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
    };
  }
}

/**
 * 특정 영상의 모든 사용자 메모 가져오기
 */
export async function getAllUserNotesForVideo(
  videoId: string
): Promise<{ data: Record<string, { id: string; content: string }>; error: string | null }> {
  try {
    const supabase = await createClient();

    const user = await getAppUserFromServer(supabase);
    if (!user) {
      return { data: {}, error: null }; // 로그인 안 된 경우 빈 객체 반환
    }

    const notesMap = await getAllUserNotesForVideoSqlite(user.id, videoId);
    return { data: notesMap, error: null };
  } catch (error) {
    console.error('getAllUserNotesForVideo exception:', error);
    return {
      data: {},
      error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
    };
  }
}
