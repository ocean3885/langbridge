'use server';

import { createClient } from '@/lib/supabase/server';
import { deleteUserNoteSqlite, upsertUserNoteSqlite } from '@/lib/sqlite/user-notes';
import { getAppUserFromServer } from '@/lib/auth/app-user';
import { revalidatePath } from 'next/cache';

export interface SaveNoteInput {
  videoId: string;
  transcriptId: string;
  content: string;
}

export interface SaveNoteResult {
  success: boolean;
  noteId?: string;
  error?: string;
}

/**
 * 메모 저장 (INSERT or UPDATE)
 * - 기존 메모가 있으면 UPDATE, 없으면 INSERT
 * - RLS 정책으로 본인 메모만 수정 가능
 */
export async function saveNote(input: SaveNoteInput): Promise<SaveNoteResult> {
  try {
    const supabase = await createClient();

    const user = await getAppUserFromServer(supabase);
    if (!user) {
      return { success: false, error: '로그인이 필요합니다.' };
    }

    const noteId = await upsertUserNoteSqlite({
      userId: user.id,
      videoId: input.videoId,
      transcriptId: input.transcriptId,
      content: input.content,
    });

    revalidatePath(`/videos/${input.videoId}`);
    return { success: true, noteId };
  } catch (error) {
    console.error('Save note error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
    };
  }
}

/**
 * 메모 삭제
 */
export async function deleteNote(noteId: string, videoId: string): Promise<SaveNoteResult> {
  try {
    const supabase = await createClient();

    const user = await getAppUserFromServer(supabase);
    if (!user) {
      return { success: false, error: '로그인이 필요합니다.' };
    }

    await deleteUserNoteSqlite(noteId, user.id);

    revalidatePath(`/videos/${videoId}`);
    return { success: true };
  } catch (error) {
    console.error('Delete note error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
    };
  }
}
