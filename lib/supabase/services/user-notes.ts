import { randomUUID } from 'crypto';
import { createAdminClient } from '@/lib/supabase/admin';

export async function getUserNoteForTranscript(
  userId: string,
  videoId: string,
  transcriptId: string
): Promise<{ id: string; content: string } | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('user_notes')
    .select('id, content')
    .eq('user_id', userId)
    .eq('video_id', videoId)
    .eq('transcript_id', transcriptId)
    .maybeSingle();

  if (error || !data) return null;
  return { id: data.id, content: data.content };
}

export async function getAllUserNotesForVideo(
  userId: string,
  videoId: string
): Promise<Record<string, { id: string; content: string }>> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('user_notes')
    .select('id, transcript_id, content')
    .eq('user_id', userId)
    .eq('video_id', videoId);

  const result: Record<string, { id: string; content: string }> = {};
  
  if (error || !data) return result;

  for (const row of data) {
    if (row.transcript_id) {
      result[row.transcript_id] = {
        id: row.id,
        content: row.content,
      };
    }
  }

  return result;
}

export async function upsertUserNote(input: {
  userId: string;
  videoId: string;
  transcriptId: string;
  content: string;
}): Promise<string> {
  const supabase = createAdminClient();
  
  // Since we have a UNIQUE constraint on (user_id, video_id, transcript_id),
  // we can just use upsert. But we need an ID for new rows.
  // Let's first check if it exists so we can reuse the ID, or just use upsert with a new random UUID.
  // Wait, if it exists, upsert with a new UUID will fail if the UNIQUE constraint hits.
  // Actually, Supabase upsert matches on the UNIQUE constraint if we specify `onConflict`.
  // Wait, `onConflict: 'user_id, video_id, transcript_id'` works if we omit `id` in the insert?
  // `id` is primary key. If we generate a new `id` and there's a conflict on `user_id, video_id, transcript_id`, 
  // Postgres might complain if we try to change the primary key or it will just update the other fields.
  // Let's do a select then insert/update to be safe.
  
  const { data: existing } = await supabase
    .from('user_notes')
    .select('id')
    .eq('user_id', input.userId)
    .eq('video_id', input.videoId)
    .eq('transcript_id', input.transcriptId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from('user_notes')
      .update({ content: input.content, updated_at: new Date().toISOString() })
      .eq('id', existing.id);
    
    if (error) throw new Error(`노트 업데이트 실패: ${error.message}`);
    return existing.id;
  }

  const newId = randomUUID();
  const { error } = await supabase
    .from('user_notes')
    .insert({
      id: newId,
      user_id: input.userId,
      video_id: input.videoId,
      transcript_id: input.transcriptId,
      content: input.content
    });

  if (error) throw new Error(`노트 생성 실패: ${error.message}`);
  return newId;
}

export async function deleteUserNote(noteId: string, userId: string): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from('user_notes')
    .delete()
    .eq('id', noteId)
    .eq('user_id', userId);

  if (error) {
    throw new Error(`노트 삭제 실패: ${error.message}`);
  }
}
