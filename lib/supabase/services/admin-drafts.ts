'use server';

import { createAdminClient } from '../admin';

export async function saveAdminDraft(userId: string, type: string, data: any) {
  const supabase = createAdminClient();
  
  const { data: existing } = await supabase
    .from('admin_drafts')
    .select('id')
    .eq('user_id', userId)
    .eq('type', type)
    .maybeSingle();

  if (existing) {
    const { data: updated, error } = await supabase
      .from('admin_drafts')
      .update({ data, updated_at: new Date().toISOString() })
      .eq('id', existing.id)
      .select()
      .single();
    
    if (error) throw error;
    return updated;
  } else {
    const { data: inserted, error } = await supabase
      .from('admin_drafts')
      .insert([{ user_id: userId, type, data }])
      .select()
      .single();
    
    if (error) throw error;
    return inserted;
  }
}

export async function getAdminDraft(userId: string, type: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('admin_drafts')
    .select('*')
    .eq('user_id', userId)
    .eq('type', type)
    .maybeSingle();

  if (error) {
    console.error('Error fetching admin draft:', error);
    return null;
  }

  return data;
}

export async function deleteAdminDraft(userId: string, type: string) {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from('admin_drafts')
    .delete()
    .eq('user_id', userId)
    .eq('type', type);

  if (error) {
    console.error('Error deleting admin draft:', error);
    throw error;
  }

  return true;
}
