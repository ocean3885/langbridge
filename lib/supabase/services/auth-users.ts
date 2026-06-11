import { createAdminClient } from '@/lib/supabase/admin';

export type SupabaseAuthUser = {
  id: string;
  email: string;
  created_at: string;
  updated_at: string;
};

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function upsertAuthUserMirror(input: {
  id: string;
  email: string;
  createdAt?: string | null;
}): Promise<void> {
  const supabase = createAdminClient();
  const now = new Date().toISOString();

  const { error } = await supabase
    .from('auth_users')
    .upsert({
      id: input.id,
      email: normalizeEmail(input.email),
      password_hash: 'supabase-auth',
      password_salt: 'supabase-auth',
      created_at: input.createdAt || now,
      updated_at: now,
    }, { onConflict: 'id' });

  if (error) {
    console.error('upsertAuthUserMirror error:', error);
    throw error;
  }
}

export async function countAuthUsers(): Promise<number> {
  const supabase = createAdminClient();
  const { count, error } = await supabase
    .from('auth_users')
    .select('*', { count: 'exact', head: true });

  if (error) {
    console.error('countAuthUsers error:', error);
    return 0;
  }
  return count ?? 0;
}
