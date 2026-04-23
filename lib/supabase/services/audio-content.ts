import { createAdminClient } from '@/lib/supabase/admin';

export async function countAudioContentByCategoryForUser(input: {
  userId: string;
  categoryId: number;
}): Promise<number> {
  const supabase = createAdminClient();
  const { count, error } = await supabase
    .from('lang_audio_content')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', input.userId)
    .eq('category_id', input.categoryId);

  if (error) throw new Error(`Count audio content failed: ${error.message}`);
  return count ?? 0;
}

export async function hasAudioContentForCategoryByUser(input: {
  userId: string;
  categoryId: number;
}): Promise<boolean> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('lang_audio_content')
    .select('id')
    .eq('user_id', input.userId)
    .eq('category_id', input.categoryId)
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(`Has audio content check failed: ${error.message}`);
  return !!data;
}

export async function listAllAudioContent(limit = 60): Promise<Array<{
  id: string;
  title: string | null;
  created_at: string;
  category_id: number | null;
}>> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('lang_audio_content')
    .select('id, title, created_at, category_id')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw new Error(`List all audio content failed: ${error.message}`);
  return data || [];
}
