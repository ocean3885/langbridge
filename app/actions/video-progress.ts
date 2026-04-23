'use server';

import { getAppUserFromServer } from '@/lib/auth/app-user';
import {
  getVideoProgress,
  listVideoProgressByUser,
  listVideoProgressForVideos,
  type SupabaseVideoProgress,
} from '@/lib/supabase/services/video-progress';

type ActionResult<T = void> = { success: true; data: T } | { success: false; error: string };

/** 단일 영상의 학습 진행률 조회 */
export async function getVideoProgressAction(
  videoId: string,
): Promise<ActionResult<SupabaseVideoProgress | null>> {
  try {
    const user = await getAppUserFromServer();
    if (!user) return { success: false, error: '로그인이 필요합니다.' };

    const progress = await getVideoProgress(user.id, videoId);
    return { success: true, data: progress };
  } catch (error) {
    console.error('Get video progress error:', error);
    return { success: false, error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.' };
  }
}

/** 유저의 전체 영상 학습 진행률 목록 */
export async function listVideoProgressAction(
  _limit = 100, // Supabase service doesn't use limit yet, but we keep the signature
): Promise<ActionResult<SupabaseVideoProgress[]>> {
  try {
    const user = await getAppUserFromServer();
    if (!user) return { success: false, error: '로그인이 필요합니다.' };

    const rows = await listVideoProgressByUser(user.id, _limit);
    return { success: true, data: rows };
  } catch (error) {
    return { success: false, error: '학습 진행률 목록 조회 실패' };
  }
}

/** 특정 영상 ID 배열에 대한 학습 진행률 조회 */
export async function listVideoProgressForVideosAction(
  videoIds: string[],
): Promise<ActionResult<SupabaseVideoProgress[]>> {
  try {
    const user = await getAppUserFromServer();
    if (!user) return { success: false, error: '로그인이 필요합니다.' };

    const rows = await listVideoProgressForVideos(user.id, videoIds);
    return { success: true, data: rows };
  } catch (error) {
    console.error('List video progress for videos error:', error);
    return { success: false, error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.' };
  }
}
