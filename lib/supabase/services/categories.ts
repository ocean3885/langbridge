import { createAdminClient } from '@/lib/supabase/admin';

type CategoryTable = 'lang_categories' | 'user_categories' | 'edu_video_categories';

export type SupabaseCategory = {
  id: number;
  name: string;
  language_id: number | null;
  user_id: string;
  created_at: string;
  updated_at: string;
};

export async function listCategories(table: CategoryTable, userId: string): Promise<SupabaseCategory[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from(table)
    .select('id, name, language_id, user_id, created_at, updated_at')
    .eq('user_id', userId)
    .order('name', { ascending: true });

  if (error) {
    console.error('listCategories error:', error);
    throw error;
  }
  return data ?? [];
}

export async function listUserCategoriesWithCount(userId: string): Promise<Array<SupabaseCategory & { content_count: number }>> {
  const supabase = createAdminClient();
  
  // We fetch categories and their video mappings
  const { data: categories, error: catError } = await supabase
    .from('user_categories')
    .select('*, user_category_videos(count)')
    .eq('user_id', userId)
    .order('name', { ascending: true });

  if (catError || !categories) {
    console.error('listUserCategoriesWithCount error:', catError);
    return [];
  }

  return categories.map(cat => ({
    ...cat,
    content_count: cat.user_category_videos ? (cat.user_category_videos[0]?.count || 0) : 0
  }));
}

export async function listAllCategories(table: CategoryTable): Promise<SupabaseCategory[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from(table)
    .select('id, name, language_id, user_id, created_at, updated_at')
    .order('name', { ascending: true });

  if (error) {
    console.error('listAllCategories error:', error);
    throw error;
  }
  return data ?? [];
}

export async function findCategoryByName(input: {
  table: CategoryTable;
  userId: string;
  name: string;
  languageId: number | null;
  excludeId?: number;
}): Promise<SupabaseCategory | null> {
  const supabase = createAdminClient();
  let query = supabase
    .from(input.table)
    .select('id, name, language_id, user_id, created_at, updated_at')
    .eq('user_id', input.userId)
    .eq('name', input.name.trim());
    
  if (input.languageId === null) {
    query = query.is('language_id', null);
  } else {
    query = query.eq('language_id', input.languageId);
  }

  if (typeof input.excludeId === 'number') {
    query = query.neq('id', input.excludeId);
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    console.error('findCategoryByName error:', error);
    return null;
  }
  return data;
}

export async function upsertCategory(input: {
  table: CategoryTable;
  id: number;
  name: string;
  languageId: number | null;
  userId: string;
  createdAt?: string;
}): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from(input.table)
    .upsert({
      id: input.id,
      name: input.name.trim(),
      language_id: input.languageId,
      user_id: input.userId,
      created_at: input.createdAt ?? undefined,
      updated_at: new Date().toISOString()
    }, { onConflict: 'id' });

  if (error) {
    throw new Error(`카테고리 업서트 실패: ${error.message}`);
  }
}

export async function createCategory(input: {
  table: CategoryTable;
  userId: string;
  name: string;
  languageId: number | null;
}): Promise<SupabaseCategory> {
  const supabase = createAdminClient();
  // Using default Postgres identity behavior instead of fetching MAX(id)
  const { data, error } = await supabase
    .from(input.table)
    .insert({
      name: input.name.trim(),
      language_id: input.languageId,
      user_id: input.userId
    })
    .select('id, name, language_id, user_id, created_at, updated_at')
    .single();

  if (error) {
    throw new Error(`카테고리 생성 실패: ${error.message}`);
  }
  return data;
}

export async function updateCategory(input: {
  table: CategoryTable;
  id: number;
  userId: string;
  name: string;
}): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from(input.table)
    .update({
      name: input.name.trim(),
      updated_at: new Date().toISOString()
    })
    .eq('id', input.id)
    .eq('user_id', input.userId);

  if (error) {
    throw new Error(`카테고리 업데이트 실패: ${error.message}`);
  }
}

export async function deleteCategory(input: {
  table: CategoryTable;
  id: number;
  userId: string;
}): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from(input.table)
    .delete()
    .eq('id', input.id)
    .eq('user_id', input.userId);

  if (error) {
    throw new Error(`카테고리 삭제 실패: ${error.message}`);
  }
}

export async function resolveLearningCategoryId(input: {
  userId: string;
  rawCategoryId: string | null | undefined;
  defaultCategoryName: string;
}): Promise<number> {
  if (input.rawCategoryId) {
    const parsed = Number(input.rawCategoryId);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  const existing = await findCategoryByName({
    table: 'user_categories',
    userId: input.userId,
    name: input.defaultCategoryName,
    languageId: null,
  });

  if (existing) {
    return existing.id;
  }

  const created = await createCategory({
    table: 'user_categories',
    userId: input.userId,
    name: input.defaultCategoryName,
    languageId: null,
  });

  return created.id;
}
