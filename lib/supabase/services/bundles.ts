'use server';

import { createAdminClient } from '../admin';

export async function listBundles() {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('bundle')
    .select(`
      *,
      bundle_category(id, name)
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching bundles:', error);
    return [];
  }

  return data;
}

export async function listBundleItems(bundleId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('bundle_items')
    .select(`
      *,
      words(id, word, meaning, lang_code),
      sentences(id, sentence, translation)
    `)
    .eq('bundle_id', bundleId)
    .order('order_index', { ascending: true });

  if (error) {
    console.error('Error fetching bundle items:', error);
    return [];
  }

  return data;
}

export async function getBundle(bundleId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('bundle')
    .select(`
      *,
      bundle_category(id, name)
    `)
    .eq('id', bundleId)
    .single();

  if (error) {
    console.error('Error fetching bundle:', error);
    return null;
  }

  return data;
}

export async function listCategories() {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('bundle_category')
    .select('*')
    .order('order_index', { ascending: true });

  if (error) {
    console.error('Error fetching categories:', error);
    return [];
  }

  return data;
}

export async function createCategory(category: { name: string; description?: string; order_index?: number }) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('bundle_category')
    .insert([category])
    .select()
    .single();

  if (error) {
    console.error('Error creating category:', error);
    throw error;
  }

  return data;
}

export async function updateCategory(id: string, updates: { name?: string; description?: string; order_index?: number }) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('bundle_category')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating category:', error);
    throw error;
  }

  return data;
}

export async function deleteCategory(id: string) {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from('bundle_category')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting category:', error);
    throw error;
  }

  return true;
}

export async function updateBundle(id: string, updates: any) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('bundle')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating bundle:', error);
    throw error;
  }

  return data;
}

export async function deleteBundle(id: string) {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from('bundle')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting bundle:', error);
    throw error;
  }

  return true;
}
