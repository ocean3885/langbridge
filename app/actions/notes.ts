'use server';

import { createClient } from '@/lib/supabase/server';
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

    // 인증 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: '로그인이 필요합니다.' };
    }

    // 기존 메모 확인
    const { data: existingNote } = await supabase
      .from('user_notes')
      .select('id')
      .eq('user_id', user.id)
      .eq('video_id', input.videoId)
      .eq('transcript_id', input.transcriptId)
      .maybeSingle();

    if (existingNote) {
      // UPDATE
      const { error: updateError } = await supabase
        .from('user_notes')
        .update({ content: input.content })
        .eq('id', existingNote.id);

      if (updateError) {
        console.error('Update note error:', updateError);
        return { success: false, error: updateError.message };
      }

      revalidatePath(`/videos/${input.videoId}`);
      return { success: true, noteId: existingNote.id };
    } else {
      // INSERT
      const { data: newNote, error: insertError } = await supabase
        .from('user_notes')
        .insert({
          user_id: user.id,
          video_id: input.videoId,
          transcript_id: input.transcriptId,
          content: input.content,
        })
        .select('id')
        .single();

      if (insertError) {
        console.error('Insert note error:', insertError);
        return { success: false, error: insertError.message };
      }

      revalidatePath(`/videos/${input.videoId}`);
      return { success: true, noteId: newNote.id };
    }
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

    // 인증 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: '로그인이 필요합니다.' };
    }

    // 삭제 (RLS가 본인 메모만 삭제 가능하도록 보장)
    const { error: deleteError } = await supabase
      .from('user_notes')
      .delete()
      .eq('id', noteId)
      .eq('user_id', user.id);

    if (deleteError) {
      console.error('Delete note error:', deleteError);
      return { success: false, error: deleteError.message };
    }

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
