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

    // my-videos 페이지는 이제 user_category_videos 테이블을 최우선으로 바라보므로
    // 수정 모달에서 변경된 카테고리를 이 테이블에도 동기화해야 합니다. (단일 매핑 교체)
    if (input.categoryId !== undefined) {
      const { getSqliteDb } = await import('@/lib/sqlite/db');
      const { randomUUID } = await import('crypto');
      const db = await getSqliteDb();

      // 기존 나의 매핑 모두 제거 (모달은 단일 선택이므로)
      await db.run(
        `DELETE FROM user_category_videos WHERE user_id = ? AND video_id = ?`,
        user.id,
        input.videoId
      );

      // 새 카테고리 선택 시 추가
      if (input.categoryId !== null) {
        await db.run(
          `
            INSERT INTO user_category_videos (id, user_id, category_id, video_id, created_at, updated_at)
            VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          `,
          randomUUID(),
          user.id,
          Number(input.categoryId),
          input.videoId
        );
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
