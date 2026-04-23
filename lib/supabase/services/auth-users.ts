import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'crypto';
import { createAdminClient } from '@/lib/supabase/admin';

export type SupabaseAuthUser = {
  id: string;
  email: string;
  password_hash: string;
  password_salt: string;
  created_at: string;
  updated_at: string;
};

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function hashPassword(password: string, salt: string): string {
  return scryptSync(password, salt, 64).toString('hex');
}

export async function getAuthUserByEmail(email: string): Promise<SupabaseAuthUser | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('auth_users')
    .select('id, email, password_hash, password_salt, created_at, updated_at')
    .eq('email', normalizeEmail(email))
    .maybeSingle();

  if (error) {
    console.error('getAuthUserByEmail error:', error);
    return null;
  }
  return data;
}

export async function createAuthUser(input: {
  email: string;
  password: string;
}): Promise<Pick<SupabaseAuthUser, 'id' | 'email' | 'created_at'>> {
  const supabase = createAdminClient();
  const email = normalizeEmail(input.email);
  const salt = randomBytes(16).toString('hex');
  const passwordHash = hashPassword(input.password, salt);
  const id = randomUUID();

  const { data, error } = await supabase
    .from('auth_users')
    .insert({
      id,
      email,
      password_hash: passwordHash,
      password_salt: salt
    })
    .select('id, email, created_at')
    .single();

  if (error) {
    throw new Error(`사용자 생성 실패: ${error.message}`);
  }

  return data;
}

export async function verifyAuthUserPassword(input: {
  email: string;
  password: string;
}): Promise<Pick<SupabaseAuthUser, 'id' | 'email' | 'created_at'> | null> {
  const user = await getAuthUserByEmail(input.email);
  if (!user) return null;

  const computedHash = hashPassword(input.password, user.password_salt);
  const stored = Buffer.from(user.password_hash, 'hex');
  const computed = Buffer.from(computedHash, 'hex');

  if (stored.length !== computed.length) return null;
  if (!timingSafeEqual(stored, computed)) return null;

  return {
    id: user.id,
    email: user.email,
    created_at: user.created_at,
  };
}

export async function updateAuthUserPasswordById(input: {
  userId: string;
  newPassword: string;
}): Promise<boolean> {
  const supabase = createAdminClient();
  const salt = randomBytes(16).toString('hex');
  const passwordHash = hashPassword(input.newPassword, salt);

  const { error } = await supabase
    .from('auth_users')
    .update({
      password_hash: passwordHash,
      password_salt: salt,
      updated_at: new Date().toISOString()
    })
    .eq('id', input.userId);

  return !error;
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
