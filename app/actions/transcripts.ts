'use server';

import { createClient } from '@/lib/supabase/server';
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
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: '로그인이 필요합니다.' };
    }

    // 관리자 권한 확인 (is_premium 체크)
    const { data: profile } = await supabase
      .from('lang_profiles')
      .select('is_premium')
      .eq('id', user.id)
      .single();

    if (!profile?.is_premium) {
      return { success: false, error: '관리자 권한이 필요합니다.' };
    }

    // 트랜스크립트 업데이트
    const { error: updateError } = await supabase
      .from('transcripts')
      .update({
        start: input.start,
        duration: input.duration,
        text_original: input.textOriginal,
      })
      .eq('id', input.transcriptId);

    if (updateError) {
      console.error('Update transcript error:', updateError);
      return { success: false, error: updateError.message };
    }

    // 번역 업데이트 (첫 번째 번역만 업데이트)
    const { error: translationError } = await supabase
      .from('translations')
      .update({
        text_translated: input.textTranslated,
      })
      .eq('transcript_id', input.transcriptId)
      .limit(1);

    if (translationError) {
      console.error('Update translation error:', translationError);
      return { success: false, error: translationError.message };
    }

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
