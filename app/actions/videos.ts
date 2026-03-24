'use server';

import { getAppUserFromServer } from '@/lib/auth/app-user';
import { isSuperAdminSqlite } from '@/lib/auth/super-admin';
import { revalidatePath } from 'next/cache';
import { type VideoVisibility, updateVideoSqlite } from '@/lib/sqlite/videos';

export interface UpdateVideoInput {
  videoId: string;
  title: string;
  languageId: number | null;
  categoryId?: string | null;
  description?: string | null;
  visibility: VideoVisibility;
}

export async function updateVideo(input: UpdateVideoInput) {
  try {
    // 사용자 인증 확인
    const user = await getAppUserFromServer();
    if (!user) {
      return { success: false, error: '로그인이 필요합니다.' };
    }

    const isSuperAdmin = await isSuperAdminSqlite({
      userId: user.id,
      email: user.email ?? null,
    });

    await updateVideoSqlite({
      videoId: input.videoId,
      title: input.title,
      languageId: input.languageId,
      categoryId: input.categoryId ?? null,
      description: input.description ?? null,
      visibility: isSuperAdmin ? input.visibility : 'private',
    });

    // 캐시 무효화
    revalidatePath(`/videos/${input.videoId}`);
    revalidatePath('/videos');
    revalidatePath('/');

    return { success: true, error: null };
  } catch (error) {
    console.error('updateVideo exception:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
    };
  }
}
