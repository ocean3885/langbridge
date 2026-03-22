'use server';

import { revalidatePath } from 'next/cache';
import { getAppUserFromServer } from '@/lib/auth/app-user';
import {
  recordVideoStudySqlite,
  updateVideoSummaryMemoSqlite,
} from '@/lib/sqlite/video-learning-progress';

export interface RecordEduVideoStudyInput {
  videoId: string;
  playedSeconds: number;
  lastPositionSeconds: number | null;
  incrementSession?: boolean;
}

export async function recordEduVideoStudy(input: RecordEduVideoStudyInput) {
  try {
    const user = await getAppUserFromServer();
    if (!user) {
      return { success: false, error: '로그인이 필요합니다.' };
    }

    const progress = await recordVideoStudySqlite({
      userId: user.id,
      videoId: input.videoId,
      playedSeconds: input.playedSeconds,
      lastPositionSeconds: input.lastPositionSeconds,
      incrementSession: Boolean(input.incrementSession),
      nowIso: new Date().toISOString(),
    });

    revalidatePath(`/videos/${input.videoId}`);
    return { success: true, progress };
  } catch (error) {
    console.error('Record edu video study error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
    };
  }
}

export interface SaveEduVideoSummaryMemoInput {
  videoId: string;
  summaryMemo: string;
}

export async function saveEduVideoSummaryMemo(input: SaveEduVideoSummaryMemoInput) {
  try {
    const user = await getAppUserFromServer();
    if (!user) {
      return { success: false, error: '로그인이 필요합니다.' };
    }

    const progress = await updateVideoSummaryMemoSqlite({
      userId: user.id,
      videoId: input.videoId,
      summaryMemo: input.summaryMemo.trim() ? input.summaryMemo.trim() : null,
    });

    revalidatePath(`/videos/${input.videoId}`);
    return { success: true, progress };
  } catch (error) {
    console.error('Save edu video summary memo error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
    };
  }
}