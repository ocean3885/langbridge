'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export interface UpdateVideoInput {
  videoId: string;
  title: string;
  languageId: number | null;
}

export async function updateVideo(input: UpdateVideoInput) {
  try {
    const supabase = await createClient();

    // 사용자 인증 확인
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: '로그인이 필요합니다.' };
    }

    // 운영자 권한 확인
    const { data: profile } = await supabase
      .from('lang_profiles')
      .select('is_premium')
      .eq('id', user.id)
      .single();

    if (!profile?.is_premium) {
      return { success: false, error: '운영자 권한이 필요합니다.' };
    }

    // 비디오 정보 업데이트
    const { error: updateError } = await supabase
      .from('videos')
      .update({
        title: input.title,
        language_id: input.languageId,
      })
      .eq('id', input.videoId);

    if (updateError) {
      console.error('updateVideo error:', updateError);
      return { success: false, error: updateError.message };
    }

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
