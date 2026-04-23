import { createAdminClient } from '@/lib/supabase/admin';

export type SupabaseLanguage = {
  id: number;
  name_en: string | null;
  name_ko: string;
  code: string;
  created_at: string;
  updated_at: string;
};

export async function listLanguages(): Promise<SupabaseLanguage[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('languages')
    .select('*')
    .order('name_ko', { ascending: true });

  if (error || !data) return [];
  return data as SupabaseLanguage[];
}

export async function listLanguagesByEnglishName(): Promise<SupabaseLanguage[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('languages')
    .select('*');

  if (error || !data) return [];
  // Sort in memory using COALESCE logic
  return (data as SupabaseLanguage[]).sort((a, b) => {
    const valA = a.name_en ?? a.name_ko;
    const valB = b.name_en ?? b.name_ko;
    return valA.localeCompare(valB);
  });
}

export async function findLanguageByCode(input: {
  code: string;
  excludeId?: number;
}): Promise<SupabaseLanguage | null> {
  const supabase = createAdminClient();
  const normalizedCode = input.code.trim().toLowerCase();
  
  // Note: Since Postgres doesn't easily let us query with LOWER() on the fly without raw SQL/RPC,
  // we assume the code stored in DB is also lowercase (as we save it lowercase).
  let query = supabase
    .from('languages')
    .select('*')
    .eq('code', normalizedCode);

  if (typeof input.excludeId === 'number') {
    query = query.neq('id', input.excludeId);
  }

  const { data, error } = await query.limit(1).maybeSingle();
  if (error || !data) return null;
  return data as SupabaseLanguage;
}

export async function createLanguage(input: {
  nameEn: string;
  nameKo: string;
  code: string;
}): Promise<SupabaseLanguage> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('languages')
    .insert({
      name_en: input.nameEn.trim(),
      name_ko: input.nameKo.trim(),
      code: input.code.trim().toLowerCase()
    })
    .select('*')
    .single();

  if (error) {
    throw new Error(`언어 생성 실패: ${error.message}`);
  }
  return data as SupabaseLanguage;
}

export async function updateLanguage(input: {
  id: number;
  nameEn: string;
  nameKo: string;
  code: string;
}): Promise<SupabaseLanguage | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('languages')
    .update({
      name_en: input.nameEn.trim(),
      name_ko: input.nameKo.trim(),
      code: input.code.trim().toLowerCase(),
      updated_at: new Date().toISOString()
    })
    .eq('id', input.id)
    .select('*')
    .maybeSingle();

  if (error) return null;
  return data as SupabaseLanguage;
}

export async function hasLanguageUsage(languageId: number): Promise<{ used: boolean; reason: string | null }> {
  const supabase = createAdminClient();
  const checks: Array<{ table: string; label: string }> = [
    { table: 'videos', label: '영상' },
    { table: 'lang_categories', label: '오디오 카테고리' },
    { table: 'user_categories', label: '비디오 카테고리' },
    { table: 'edu_video_categories', label: '교육 영상 카테고리' },
    { table: 'video_channels', label: '채널' },
  ];

  for (const check of checks) {
    const { data, error } = await supabase
      .from(check.table)
      .select('id')
      .eq('language_id', languageId)
      .limit(1)
      .maybeSingle();

    if (data && !error) {
      return { used: true, reason: `${check.label}가` };
    }
  }

  return { used: false, reason: null };
}

export async function deleteLanguage(id: number): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase.from('languages').delete().eq('id', id);
  if (error) throw new Error(`Language delete failed: ${error.message}`);
}

export async function upsertLanguage(input: {
  id: number;
  nameEn?: string | null;
  nameKo: string;
  code: string;
  createdAt?: string | null;
}): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from('languages')
    .upsert({
      id: input.id,
      name_en: input.nameEn ?? null,
      name_ko: input.nameKo,
      code: input.code,
      created_at: input.createdAt ?? undefined,
      updated_at: new Date().toISOString()
    }, { onConflict: 'id' });

  if (error) {
    throw new Error(`언어 업서트 실패: ${error.message}`);
  }
}
