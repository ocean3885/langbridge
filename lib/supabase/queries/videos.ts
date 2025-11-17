import { createClient } from '@/lib/supabase/server';

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
  transcripts: TranscriptWithTranslation[];
}

/**
 * video_id로 영상 정보와 스크립트, 번역을 한 번에 가져오기
 */
export async function getVideoWithTranscripts(
  videoId: string
): Promise<{ data: VideoWithTranscripts | null; error: string | null }> {
  try {
    const supabase = await createClient();

    // videos + transcripts + translations 조인
    const { data, error } = await supabase
      .from('videos')
      .select(`
        id,
        youtube_id,
        title,
        description,
        duration,
        thumbnail_url,
        created_at,
        language_id,
        transcripts (
          id,
          video_id,
          start,
          duration,
          text_original,
          order_index,
          translations (
            id,
            lang,
            text_translated
          )
        )
      `)
      .eq('id', videoId)
      .single();

    if (error) {
      console.error('getVideoWithTranscripts error:', error);
      return { data: null, error: error.message };
    }

    if (!data) {
      return { data: null, error: '영상을 찾을 수 없습니다.' };
    }

    // transcripts를 order_index 순으로 정렬
    const sortedTranscripts = (data.transcripts || []).sort(
      (a, b) => a.order_index - b.order_index
    );

    return {
      data: {
        ...data,
        transcripts: sortedTranscripts,
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
  }[];
  error: string | null;
}> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('videos')
      .select(`
        id,
        youtube_id,
        title,
        description,
        duration,
        thumbnail_url,
        created_at,
        language_id,
        languages (name_ko),
        transcripts (count)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('getAllVideos error:', error);
      return { data: [], error: error.message };
    }

    // transcript count 추출
    const videos = (data || []).map((video: {
      id: string;
      youtube_id: string;
      title: string;
      description: string | null;
      duration: number | null;
      thumbnail_url: string | null;
      created_at: string;
      language_id: number | null;
      languages?: { name_ko: string } | { name_ko: string }[] | null;
      transcripts?: { count: number }[];
    }) => {
      const languageData = Array.isArray(video.languages) ? video.languages[0] : video.languages;
      return {
        id: video.id,
        youtube_id: video.youtube_id,
        title: video.title,
        description: video.description,
        duration: video.duration,
        thumbnail_url: video.thumbnail_url,
        created_at: video.created_at,
        language_id: video.language_id,
        language_name: languageData?.name_ko || null,
        transcript_count: video.transcripts?.[0]?.count || 0,
      };
    });

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

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { data: null, error: '로그인이 필요합니다.' };
    }

    const { data, error } = await supabase
      .from('user_notes')
      .select('id, content')
      .eq('user_id', user.id)
      .eq('video_id', videoId)
      .eq('transcript_id', transcriptId)
      .maybeSingle();

    if (error) {
      console.error('getUserNoteForTranscript error:', error);
      return { data: null, error: error.message };
    }

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

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { data: {}, error: null }; // 로그인 안 된 경우 빈 객체 반환
    }

    const { data, error } = await supabase
      .from('user_notes')
      .select('id, transcript_id, content')
      .eq('user_id', user.id)
      .eq('video_id', videoId);

    if (error) {
      console.error('getAllUserNotesForVideo error:', error);
      return { data: {}, error: error.message };
    }

    // transcript_id를 키로 하는 객체로 변환
    const notesMap: Record<string, { id: string; content: string }> = {};
    (data || []).forEach((note) => {
      if (note.transcript_id) {
        notesMap[note.transcript_id] = {
          id: note.id,
          content: note.content,
        };
      }
    });

    return { data: notesMap, error: null };
  } catch (error) {
    console.error('getAllUserNotesForVideo exception:', error);
    return {
      data: {},
      error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
    };
  }
}
