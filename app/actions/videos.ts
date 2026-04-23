'use server';

import { getAppUserFromServer } from '@/lib/auth/app-user';
import { isSuperAdmin } from '@/lib/auth/super-admin';
import { revalidatePath } from 'next/cache';
import { type VideoVisibility, updateVideo as updateVideoService } from '@/lib/supabase/services/videos';
import { createAdminClient } from '@/lib/supabase/admin';
import { randomUUID } from 'crypto';

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

    const isAdminUser = await isSuperAdmin({
      userId: user.id,
      email: user.email ?? null,
    });

    await updateVideoService({
      videoId: input.videoId,
      title: input.title,
      languageId: input.languageId,
      description: input.description ?? null,
      visibility: isAdminUser ? input.visibility : 'private',
    });

    // my-videos 페이지는 이제 user_category_videos 테이블을 최우선으로 바라보므로
    // 수정 모달에서 변경된 카테고리를 이 테이블에도 동기화해야 합니다. (단일 매핑 교체)
    if (input.categoryId !== undefined) {
      const supabase = createAdminClient();

      // 기존 나의 매핑 모두 제거 (모달은 단일 선택이므로)
      await supabase
        .from('user_category_videos')
        .delete()
        .eq('user_id', user.id)
        .eq('video_id', input.videoId);

      // 새 카테고리 선택 시 추가
      if (input.categoryId !== null) {
        await supabase
          .from('user_category_videos')
          .insert({
            id: randomUUID(),
            user_id: user.id,
            category_id: Number(input.categoryId),
            video_id: input.videoId,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
      }
    }

    // 캐시 무효화
    revalidatePath(`/videos/${input.videoId}`);
    revalidatePath(`/my-videos/${input.videoId}`);
    revalidatePath('/my-videos');
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
