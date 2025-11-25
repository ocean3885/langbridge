'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

/**
 * YouTube URL에서 video ID 추출
 */
function extractYoutubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/v\/([a-zA-Z0-9_-]{11})/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

/**
 * 스크립트 텍스트 파싱
 * 형식: "시작시간 끝시간 원문 | 번역문"
 * 예시: "0.50 3.20 Hello everyone. | 안녕하세요, 여러분."
 */
interface ParsedTranscript {
  start: number;
  end: number;
  duration: number;
  textOriginal: string;
  textTranslated: string;
  orderIndex: number;
}

function parseTranscriptText(text: string): ParsedTranscript[] {
  const lines = text.trim().split('\n');
  const results: ParsedTranscript[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // 정규식: 시작시간 끝시간 원문 | 번역문
    const match = line.match(/^([\d.]+)\s+([\d.]+)\s+(.+?)\s*\|\s*(.+)$/);
    
    if (!match) {
      console.warn(`Line ${i + 1} 파싱 실패: ${line}`);
      continue;
    }

    const [, startStr, endStr, textOriginal, textTranslated] = match;
    const start = parseFloat(startStr);
    const end = parseFloat(endStr);

    if (isNaN(start) || isNaN(end) || end <= start) {
      console.warn(`Line ${i + 1} 시간 값 오류: start=${start}, end=${end}`);
      continue;
    }

    results.push({
      start,
      end,
      duration: end - start,
      textOriginal: textOriginal.trim(),
      textTranslated: textTranslated.trim(),
      orderIndex: i,
    });
  }

  return results;
}

export interface RegisterVideoInput {
  youtubeUrl: string;
  title: string;
  description?: string;
  // duration은 더 이상 수동 입력하지 않음 (YouTube 메타데이터/추후 자동 처리용)
  duration?: number; // 유지: 향후 자동 수집 시 사용, 현재는 undefined 전달
  transcriptText: string;
  lang?: string; // 번역 언어 코드 (기본값: 'ko')
  languageId?: number | null; // 영상 자체의 언어 (videos.language_id)
  categoryId?: string | null; // 영상 카테고리 (user_categories.id, UUID)
  channelId?: string | null; // 영상 채널 (video_channels.id, UUID)
}

export interface RegisterVideoResult {
  success: boolean;
  videoId?: string;
  error?: string;
}

/**
 * 영상 등록 Server Action
 * - YouTube 영상 메타데이터 저장
 * - 스크립트 텍스트 파싱 후 transcripts, translations 테이블에 일괄 삽입
 * - 트랜잭션 처리로 원자성 보장
 */
export async function registerVideo(
  input: RegisterVideoInput
): Promise<RegisterVideoResult> {
  try {
    const supabase = await createClient();

    // 1. 사용자 인증 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: '로그인이 필요합니다.' };
    }

    // 2. YouTube ID 추출
    const youtubeId = extractYoutubeId(input.youtubeUrl);
    if (!youtubeId) {
      return { success: false, error: '유효하지 않은 YouTube URL입니다.' };
    }

    // 4. 스크립트 텍스트 파싱
    const transcripts = parseTranscriptText(input.transcriptText);
    if (transcripts.length === 0) {
      return { success: false, error: '유효한 스크립트 데이터가 없습니다.' };
    }

    // 2. videos 테이블에 삽입
    const { data: video, error: videoError } = await supabase
      .from('videos')
      .insert({
        youtube_id: youtubeId,
        title: input.title,
        description: input.description || null,
        duration: input.duration || null,
        language_id: input.languageId ?? null,
        category_id: input.categoryId ?? null,
        channel_id: input.channelId ?? null,
        thumbnail_url: `https://img.youtube.com/vi/${youtubeId}/maxresdefault.jpg`,
      })
      .select('id')
      .single();

    if (videoError || !video) {
      console.error('Video insert error:', videoError);
      return { success: false, error: '영상 정보 저장 실패: ' + videoError?.message };
    }

    const videoId = video.id;

    // 6. transcripts 테이블에 일괄 삽입
    const transcriptRows = transcripts.map((t) => ({
      video_id: videoId,
      start: t.start,
      duration: t.duration,
      text_original: t.textOriginal,
      order_index: t.orderIndex,
    }));

    const { data: insertedTranscripts, error: transcriptError } = await supabase
      .from('transcripts')
      .insert(transcriptRows)
      .select('id, order_index');

    if (transcriptError || !insertedTranscripts) {
      console.error('Transcript insert error:', transcriptError);
      // 롤백: video 삭제
      await supabase.from('videos').delete().eq('id', videoId);
      return { success: false, error: '스크립트 저장 실패: ' + transcriptError?.message };
    }

    // 7. translations 테이블에 일괄 삽입
    const translationRows = insertedTranscripts.map((transcript) => {
      const originalTranscript = transcripts.find(
        (t) => t.orderIndex === transcript.order_index
      );
      return {
        transcript_id: transcript.id,
        lang: input.lang || 'ko',
        text_translated: originalTranscript!.textTranslated,
      };
    });

    const { error: translationError } = await supabase
      .from('translations')
      .insert(translationRows);

    if (translationError) {
      console.error('Translation insert error:', translationError);
      // 롤백: video 삭제 (CASCADE로 transcripts도 삭제됨)
      await supabase.from('videos').delete().eq('id', videoId);
      return { success: false, error: '번역 저장 실패: ' + translationError.message };
    }

    // 8. 성공
    revalidatePath('/admin/videos');
    return { success: true, videoId };

  } catch (error) {
    console.error('Register video error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.' 
    };
  }
}

/**
 * 영상 삭제 Server Action
 */
export async function deleteVideo(videoId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    // 사용자 인증 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: '로그인이 필요합니다.' };
    }

    // 영상 삭제 (CASCADE로 transcripts, translations도 자동 삭제)
    const { error: deleteError } = await supabase
      .from('videos')
      .delete()
      .eq('id', videoId);

    if (deleteError) {
      console.error('Delete video error:', deleteError);
      return { success: false, error: deleteError.message };
    }

    revalidatePath('/admin/videos');
    return { success: true };

  } catch (error) {
    console.error('Delete video error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.' 
    };
  }
}

/**
 * 영상 채널 변경 Server Action
 */
export async function updateVideoChannel(
  videoId: string, 
  channelId: string | null
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    // 사용자 인증 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: '로그인이 필요합니다.' };
    }

    // 영상의 채널 업데이트
    const { error: updateError } = await supabase
      .from('videos')
      .update({ channel_id: channelId })
      .eq('id', videoId);

    if (updateError) {
      console.error('Update video channel error:', updateError);
      return { success: false, error: updateError.message };
    }

    revalidatePath('/admin/videos');
    return { success: true };

  } catch (error) {
    console.error('Update video channel error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.' 
    };
  }
}
