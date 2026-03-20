'use server';

import { createClient } from '@/lib/supabase/server';
import { getAppUserFromServer } from '@/lib/auth/app-user';
import { updateTranscriptSqlite } from '@/lib/sqlite/videos';
import { revalidatePath } from 'next/cache';

export interface UpdateTranscriptInput {
  transcriptId: string;
  videoId: string;
  start: number;
  duration: number;
  textOriginal: string;
  textTranslated: string;
}

export interface UpdateTranscriptResult {
  success: boolean;
  error?: string;
}

/**
 * 스크립트 수정 (시간, 원문, 번역)
 */
export async function updateTranscript(input: UpdateTranscriptInput): Promise<UpdateTranscriptResult> {
  try {
    const supabase = await createClient();

    // 인증 확인
    const user = await getAppUserFromServer(supabase);
    if (!user) {
      return { success: false, error: '로그인이 필요합니다.' };
    }

    await updateTranscriptSqlite({
      transcriptId: input.transcriptId,
      start: input.start,
      duration: input.duration,
      textOriginal: input.textOriginal,
      textTranslated: input.textTranslated,
    });

    revalidatePath(`/videos/${input.videoId}`);
    return { success: true };
  } catch (error) {
    console.error('Update transcript error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
    };
  }
}
