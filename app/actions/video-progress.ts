'use server';

import { getAppUserFromServer } from '@/lib/auth/app-user';
import {
  getVideoProgress,
  listVideoProgressByUser,
  listVideoProgressForVideos,
  type SqliteVideoProgress,
} from '@/lib/sqlite/video-progress';

type ActionResult<T = void> = { success: true; data: T } | { success: false; error: string };

/** 단일 영상의 학습 진행률 조회 */
export async function getVideoProgressAction(
  videoId: string,
): Promise<ActionResult<SqliteVideoProgress | null>> {
  const user = await getAppUserFromServer();
  if (!user) return { success: false, error: '로그인이 필요합니다.' };

  const progress = await getVideoProgress(user.id, videoId);
  return { success: true, data: progress };
}

/** 유저의 전체 영상 학습 진행률 목록 */
export async function listVideoProgressAction(
  limit = 100,
): Promise<ActionResult<SqliteVideoProgress[]>> {
  const user = await getAppUserFromServer();
  if (!user) return { success: false, error: '로그인이 필요합니다.' };

  const rows = await listVideoProgressByUser(user.id, limit);
  return { success: true, data: rows };
}

/** 특정 영상 ID 배열에 대한 학습 진행률 조회 */
export async function listVideoProgressForVideosAction(
  videoIds: string[],
): Promise<ActionResult<SqliteVideoProgress[]>> {
  const user = await getAppUserFromServer();
  if (!user) return { success: false, error: '로그인이 필요합니다.' };

  const rows = await listVideoProgressForVideos(user.id, videoIds);
  return { success: true, data: rows };
}
