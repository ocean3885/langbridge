'use server';

import { createClient } from '@/lib/supabase/server';
import { getAppUserFromServer } from '@/lib/auth/app-user';
import { revalidatePath } from 'next/cache';
import { updateVideoSqlite } from '@/lib/sqlite/videos';

export interface UpdateVideoInput {
  videoId: string;
  title: string;
  languageId: number | null;
  categoryId?: string | null;
  description?: string | null;
}

export async function updateVideo(input: UpdateVideoInput) {
  try {
    const supabase = await createClient();

    // 사용자 인증 확인
    const user = await getAppUserFromServer(supabase);
    if (!user) {
      return { success: false, error: '로그인이 필요합니다.' };
    }

    await updateVideoSqlite({
      videoId: input.videoId,
      title: input.title,
      languageId: input.languageId,
      categoryId: input.categoryId ?? null,
      description: input.description ?? null,
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
