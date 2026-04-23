'use server';

import { getAppUserFromServer } from '@/lib/auth/app-user';
import { isSuperAdmin } from '@/lib/auth/super-admin';
import { revalidatePath } from 'next/cache';
import { resolveLearningCategoryId } from '@/lib/supabase/services/categories';
import { DEFAULT_LEARNING_CATEGORY_NAME } from '@/lib/learning-category';
import {
  type VideoVisibility,
  deleteVideo as deleteVideoService,
  insertVideoWithTranscripts,
  updateVideoChannel as updateVideoChannelService,
  updateVideoDuration as updateVideoDurationService,
} from '@/lib/supabase/services/videos';

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
  visibility?: VideoVisibility;
  duration?: number;
  transcriptText: string;
  lang?: string; // 번역 언어 코드 (기본값: 'ko')
  languageId?: number | null; // 영상 자체의 언어 (videos.language_id)
  categoryId?: string | null; // 영상 카테고리 (화면에서 넘어오는 값, user_categories.id)
  channelId?: string | null; // 영상 채널 (video_channels.id, UUID)
}

export interface RegisterVideoResult {
  success: boolean;
  videoId?: string;
  error?: string;
}

/**
 * 영상 등록 Server Action
 */
export async function registerVideo(
  input: RegisterVideoInput
): Promise<RegisterVideoResult> {
  try {
    // 1. 사용자 인증 확인
    const user = await getAppUserFromServer();
    if (!user) {
      return { success: false, error: '로그인이 필요합니다.' };
    }

    const isAdminUser = await isSuperAdmin({
      userId: user.id,
      email: user.email ?? null,
    });

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

    const learningCategoryId = await resolveLearningCategoryId({
      userId: user.id,
      rawCategoryId: input.categoryId ?? null,
      defaultCategoryName: DEFAULT_LEARNING_CATEGORY_NAME,
    });

    const videoId = await insertVideoWithTranscripts({
      youtubeId,
      title: input.title,
      description: input.description || null,
      visibility: isAdminUser ? (input.visibility ?? 'private') : 'private',
      duration: input.duration || null,
      thumbnailUrl: `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`,
      languageId: input.languageId ?? null,
      learningCategoryId,
      channelId: input.channelId ?? null,
      uploaderId: user.id,
      transcripts: transcripts.map((t) => ({
        start: t.start,
        duration: t.duration,
        textOriginal: t.textOriginal,
        orderIndex: t.orderIndex,
        textTranslated: t.textTranslated,
        lang: input.lang || 'ko',
      })),
    });

    // 8. 성공
    revalidatePath('/admin/videos');
    revalidatePath('/videos');
    revalidatePath('/my-videos');
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
    // 사용자 인증 확인
    const user = await getAppUserFromServer();
    if (!user) {
      return { success: false, error: '로그인이 필요합니다.' };
    }

    await deleteVideoService(videoId);

    revalidatePath('/admin/videos');
    revalidatePath('/videos');
    revalidatePath('/my-videos');
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
    // 사용자 인증 확인
    const user = await getAppUserFromServer();
    if (!user) {
      return { success: false, error: '로그인이 필요합니다.' };
    }

    await updateVideoChannelService(videoId, channelId);

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

export async function updateVideoDuration(input: {
  videoId: string;
  durationSeconds: number;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await getAppUserFromServer();
    if (!user) {
      return { success: false, error: '로그인이 필요합니다.' };
    }

    await updateVideoDurationService(input.videoId, input.durationSeconds);

    revalidatePath('/my-videos');
    revalidatePath(`/my-videos/${input.videoId}`);
    return { success: true };
  } catch (error) {
    console.error('Update video duration error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
    };
  }
}
