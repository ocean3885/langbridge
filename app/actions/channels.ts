"use server";

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export interface RegisterChannelInput {
  channelName: string;
  channelUrl?: string | null;
  channelDescription?: string | null;
  thumbnailUrl?: string | null;
  languageId?: number | null;
}

export async function registerChannel(input: RegisterChannelInput) {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: '로그인이 필요합니다.' };
    }

    const { error: insertError } = await supabase
      .from('video_channels')
      .insert({
        channel_name: input.channelName,
        channel_url: input.channelUrl ?? null,
        channel_description: input.channelDescription ?? null,
        thumbnail_url: input.thumbnailUrl ?? null,
        language_id: input.languageId ?? null,
      });

    if (insertError) {
      console.error('registerChannel error:', insertError);
      return { success: false, error: insertError.message };
    }

    revalidatePath('/admin/channels');
    return { success: true };
  } catch (error) {
    console.error('registerChannel exception:', error);
    return { success: false, error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.' };
  }
}

export async function updateChannel(channelId: string, input: RegisterChannelInput) {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: '로그인이 필요합니다.' };
    }

    const { error: updateError } = await supabase
      .from('video_channels')
      .update({
        channel_name: input.channelName,
        channel_url: input.channelUrl ?? null,
        channel_description: input.channelDescription ?? null,
        thumbnail_url: input.thumbnailUrl ?? null,
        language_id: input.languageId ?? null,
      })
      .eq('id', channelId);

    if (updateError) {
      console.error('updateChannel error:', updateError);
      return { success: false, error: updateError.message };
    }

    revalidatePath('/admin/channels');
    revalidatePath('/admin/videos');
    return { success: true };
  } catch (error) {
    console.error('updateChannel exception:', error);
    return { success: false, error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.' };
  }
}
