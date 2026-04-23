import { createAdminClient } from '@/lib/supabase/admin';

export type SupabaseUserProfile = {
  id: string;
  email: string | null;
  created_at: string | null;
  updated_at: string;
};

export async function upsertUserProfile(input: {
  id: string;
  email?: string | null;
  createdAt?: string | null;
}): Promise<void> {
  const supabase = createAdminClient();
  
  const { error } = await supabase
    .from('user_profiles')
    .upsert({
      id: input.id,
      email: input.email ?? undefined,
      created_at: input.createdAt ?? undefined,
      updated_at: new Date().toISOString()
    }, { onConflict: 'id' });

  if (error) {
    throw new Error(`사용자 프로필 업서트 실패: ${error.message}`);
  }
}

export async function getUserProfileById(userId: string): Promise<SupabaseUserProfile | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('user_profiles')
    .select('id, email, created_at, updated_at')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    console.error('getUserProfileById error:', error);
    return null;
  }
  return data;
}
