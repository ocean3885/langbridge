'use server';

import { createAdminClient } from '../admin';

export async function saveAdminDraft(userId: string, type: string, data: any, draftId?: string) {
  const supabase = createAdminClient();
  
  if (draftId) {
    const { data: updated, error } = await supabase
      .from('admin_drafts')
      .update({ data, updated_at: new Date().toISOString() })
      .eq('id', draftId)
      .eq('user_id', userId)
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

export async function listAdminDrafts(userId: string, type: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('admin_drafts')
    .select('*')
    .eq('user_id', userId)
    .eq('type', type)
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('Error listing admin drafts:', error);
    return [];
  }

  return data;
}

export async function getAdminDraft(userId: string, type: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('admin_drafts')
    .select('*')
    .eq('user_id', userId)
    .eq('type', type)
    .order('updated_at', { ascending: false })
    .limit(1)
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

export async function deleteAdminDraftById(id: string, userId: string) {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from('admin_drafts')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);

  if (error) {
    console.error('Error deleting specific admin draft:', error);
    throw error;
  }

  return true;
}
