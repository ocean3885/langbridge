"use server";

import { getAppUserFromServer } from '@/lib/auth/app-user';
import { insertSqliteChannel, updateSqliteChannel } from '@/lib/sqlite/channels';
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
    const user = await getAppUserFromServer();
    if (!user) {
      return { success: false, error: '로그인이 필요합니다.' };
    }

    await insertSqliteChannel({
      channelName: input.channelName,
      channelUrl: input.channelUrl ?? null,
      channelDescription: input.channelDescription ?? null,
      thumbnailUrl: input.thumbnailUrl ?? null,
      languageId: input.languageId ?? null,
    });

    revalidatePath('/admin/channels');
    return { success: true };
  } catch (error) {
    console.error('registerChannel exception:', error);
    return { success: false, error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.' };
  }
}

export async function updateChannel(channelId: string, input: RegisterChannelInput) {
  try {
    const user = await getAppUserFromServer();
    if (!user) {
      return { success: false, error: '로그인이 필요합니다.' };
    }

    const updated = await updateSqliteChannel({
      channelId,
      channelName: input.channelName,
      channelUrl: input.channelUrl ?? null,
      channelDescription: input.channelDescription ?? null,
      thumbnailUrl: input.thumbnailUrl ?? null,
      languageId: input.languageId ?? null,
    });

    if (!updated) {
      return { success: false, error: '채널을 찾을 수 없습니다.' };
    }

    revalidatePath('/admin/channels');
    revalidatePath('/admin/videos');
    return { success: true };
  } catch (error) {
    console.error('updateChannel exception:', error);
    return { success: false, error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.' };
  }
}
