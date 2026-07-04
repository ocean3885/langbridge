import { createAdminClient } from '@/lib/supabase/admin';

export interface UserSentenceInteraction {
  id: string;
  user_id: string;
  sentence_id: number;
  is_pinned: boolean;
  memo: string | null;
  proficiency_level: number;
  correct_count: number;
  incorrect_count: number;
  streak_count: number;
  last_reviewed_at: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface UserWordInteraction {
  id: string;
  user_id: string;
  word_id: number;
  proficiency_level: number;
  correct_count: number;
  incorrect_count: number;
  streak_count: number;
  last_reviewed_at: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

/**
 * 특정 유저의 여러 문장에 대한 상호작용 정보를 가져옵니다.
 */
export async function listUserSentenceInteractions(userId: string, sentenceIds: number[]) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('user_sentence_interactions')
    .select('*')
    .eq('user_id', userId)
    .in('sentence_id', sentenceIds);

  if (error) {
    console.error('Error listing user sentence interactions:', error);
    return [];
  }

  return data as UserSentenceInteraction[];
}

export async function listUserWordInteractions(userId: string, wordIds: number[]) {
  if (wordIds.length === 0) return [];

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('user_word_interactions')
    .select('*')
    .eq('user_id', userId)
    .in('word_id', wordIds);

  if (error) {
    console.error('Error listing user word interactions:', error);
    return [];
  }

  return data as UserWordInteraction[];
}

/**
 * 핀 상태를 토글하거나 메모를 저장합니다. (Upsert)
 * Server-side 전용: createAdminClient를 사용하여 RLS를 우회하므로 
 * 호출 전 반드시 API Layer에서 권한 확인을 수행해야 합니다.
 */
export async function upsertUserSentenceInteraction(
  userId: string, 
  sentenceId: number, 
  updates: Partial<Pick<UserSentenceInteraction, 'is_pinned' | 'memo' | 'proficiency_level'>>
) {
  const supabase = createAdminClient();
  
  const { data, error } = await supabase
    .from('user_sentence_interactions')
    .upsert({
      user_id: userId,
      sentence_id: sentenceId,
      ...updates,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'user_id, sentence_id'
    })
    .select()
    .single();

  if (error) {
    console.error('Error upserting user sentence interaction:', error);
    throw error;
  }

  return data as UserSentenceInteraction;
}
