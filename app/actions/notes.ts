'use server';

import { upsertUserNote, deleteUserNote } from '@/lib/supabase/services/user-notes';
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
 */
export async function saveNote(input: SaveNoteInput): Promise<SaveNoteResult> {
  try {
    const user = await getAppUserFromServer();
    if (!user) {
      return { success: false, error: '로그인이 필요합니다.' };
    }

    const noteId = await upsertUserNote({
      userId: user.id,
      videoId: input.videoId,
      transcriptId: input.transcriptId,
      content: input.content,
    });

    revalidatePath(`/videos/${input.videoId}`);
    revalidatePath(`/my-videos/${input.videoId}`);
    revalidatePath(`/lb-videos/${input.videoId}`);
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
    const user = await getAppUserFromServer();
    if (!user) {
      return { success: false, error: '로그인이 필요합니다.' };
    }

    await deleteUserNote(noteId, user.id);

    revalidatePath(`/videos/${videoId}`);
    revalidatePath(`/my-videos/${videoId}`);
    revalidatePath(`/lb-videos/${videoId}`);
    return { success: true };
  } catch (error) {
    console.error('Delete note error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
    };
  }
}
