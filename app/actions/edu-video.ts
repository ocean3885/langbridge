'use server';

import { getAppUserFromServer } from '@/lib/auth/app-user';
import { revalidatePath } from 'next/cache';
import {
  deleteEduVideo as deleteEduVideoService,
  insertEduVideo as insertEduVideoService,
  updateEduVideoChannel as updateEduVideoChannelService,
  updateEduVideoDuration as updateEduVideoDurationService,
  updateEduVideoPlacement as updateEduVideoPlacementService,
  updateEduVideo as updateEduVideoService,
} from '@/lib/supabase/services/edu-videos';

/**
 * YouTube URL에서 video ID 추출
 */
function extractYoutubeIdFromUrl(url: string): string | null {
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

export interface RegisterEduVideoInput {
  youtubeUrl: string;
  title: string;
  description?: string;
  languageId?: number | null;
  categoryId?: string | null;
  channelId?: string | null;
}

export interface RegisterEduVideoResult {
  success: boolean;
  videoId?: string;
  error?: string;
}

export async function registerEduVideo(
  input: RegisterEduVideoInput
): Promise<RegisterEduVideoResult> {
  try {
    const user = await getAppUserFromServer();
    if (!user) {
      return { success: false, error: '로그인이 필요합니다.' };
    }

    const youtubeId = extractYoutubeIdFromUrl(input.youtubeUrl);
    if (!youtubeId) {
      return { success: false, error: '유효하지 않은 YouTube URL입니다.' };
    }

    const videoId = await insertEduVideoService({
      youtubeUrl: input.youtubeUrl,
      title: input.title,
      description: input.description || null,
      thumbnailUrl: `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`,
      languageId: input.languageId ?? null,
      categoryId: input.categoryId ?? null,
      channelId: input.channelId ?? null,
      uploaderId: user.id,
    });

    revalidatePath('/admin/videos');
    revalidatePath('/videos');
    return { success: true, videoId };
  } catch (error) {
    console.error('Register edu video error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
    };
  }
}

export async function deleteEduVideo(videoId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await getAppUserFromServer();
    if (!user) {
      return { success: false, error: '로그인이 필요합니다.' };
    }

    await deleteEduVideoService(videoId);

    revalidatePath('/admin/videos');
    revalidatePath('/videos');
    return { success: true };
  } catch (error) {
    console.error('Delete edu video error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
    };
  }
}

export async function updateEduVideoChannel(
  videoId: string,
  channelId: string | null
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await getAppUserFromServer();
    if (!user) {
      return { success: false, error: '로그인이 필요합니다.' };
    }

    await updateEduVideoChannelService(videoId, channelId);

    revalidatePath('/admin/videos');
    revalidatePath('/videos');
    revalidatePath(`/videos/${videoId}`);
    return { success: true };
  } catch (error) {
    console.error('Update edu video channel error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
    };
  }
}

export async function updateEduVideoPlacement(input: {
  videoId: string;
  channelId: string | null;
  categoryId: string | null;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await getAppUserFromServer();
    if (!user) {
      return { success: false, error: '로그인이 필요합니다.' };
    }

    await updateEduVideoPlacementService(input);

    revalidatePath('/admin/videos');
    revalidatePath('/videos');
    revalidatePath(`/videos/${input.videoId}`);
    return { success: true };
  } catch (error) {
    console.error('Update edu video placement error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
    };
  }
}

export async function updateEduVideo(input: {
  videoId: string;
  youtubeUrl: string;
  title: string;
  description?: string | null;
  languageId?: number | null;
  categoryId?: string | null;
  channelId?: string | null;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await getAppUserFromServer();
    if (!user) {
      return { success: false, error: '로그인이 필요합니다.' };
    }

    const youtubeId = extractYoutubeIdFromUrl(input.youtubeUrl);
    if (!youtubeId) {
      return { success: false, error: '유효하지 않은 YouTube URL입니다.' };
    }

    await updateEduVideoService({
      videoId: input.videoId,
      youtubeUrl: input.youtubeUrl,
      title: input.title,
      description: input.description ?? null,
      languageId: input.languageId ?? null,
      categoryId: input.categoryId ?? null,
      channelId: input.channelId ?? null,
      thumbnailUrl: `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`,
    });

    revalidatePath('/admin/videos');
    revalidatePath(`/admin/videos/${input.videoId}/edit`);
    revalidatePath('/videos');
    revalidatePath(`/videos/${input.videoId}`);
    return { success: true };
  } catch (error) {
    console.error('Update edu video error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
    };
  }
}

export async function updateEduVideoDuration(input: {
  videoId: string;
  durationSeconds: number;
}): Promise<{ success: boolean; error?: string }> {
  try {
    await updateEduVideoDurationService(input.videoId, input.durationSeconds);
    revalidatePath('/videos');
    revalidatePath(`/videos/${input.videoId}`);
    return { success: true };
  } catch (error) {
    console.error('Update edu video duration error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
    };
  }
}