import { createAdminClient } from '@/lib/supabase/admin';
import { calculateBundleCompletion } from '@/lib/practice/bundle-completion';
import { getPracticeWordTargets, type PracticeLanguage } from '@/lib/practice/registry';

// Always derive completion from sentence answers and bundle-local word history; legacy bundle flags are not authoritative.
export async function loadBundleCompletion(userId: string, bundleIds: string[], language: PracticeLanguage = 'ko') {
  const supabase = createAdminClient();
  async function read(query: () => any): Promise<any[]> {
    const rows: any[] = [];
    for (let offset = 0; ; offset += 1000) {
      const { data, error } = await query().range(offset, offset + 999);
      if (error) throw error;
      rows.push(...(data || []));
      if (!data || data.length < 1000) return rows;
    }
  }
  if (!bundleIds.length) return new Map<string, ReturnType<typeof calculateBundleCompletion> & { items: any[]; interactions: any[]; selectedWordIds: number[] }>();
  const [items, interactions, bundles, selections] = await Promise.all([
    read(() => supabase.from('bundle_items').select('id, bundle_id, sentence_id, order_index, words(id, word, meaning_ko, meaning_en), sentences(sentence, translation, translation_en, word_sentence_map(used_as, words(id, word, meaning_ko, meaning_en)))').in('bundle_id', bundleIds).order('id')),
    read(() => supabase.from('user_bundle_item_interactions').select('*').eq('user_id', userId).in('bundle_id', bundleIds).order('bundle_item_id')),
    read(() => supabase.from('user_bundle_interactions').select('bundle_id, metadata').eq('user_id', userId).in('bundle_id', bundleIds).order('bundle_id')),
    read(() => supabase.from('bundle_words').select('bundle_id, word_id').in('bundle_id', bundleIds).order('bundle_id').order('word_id')),
  ]);
  const groupByBundle = (rows: any[]) => {
    const groups = new Map<string, any[]>();
    for (const row of rows) {
      const id = String(row.bundle_id);
      const group = groups.get(id) || [];
      group.push(row);
      groups.set(id, group);
    }
    return groups;
  };
  const itemGroups = groupByBundle(items);
  const interactionGroups = groupByBundle(interactions);
  const selectionGroups = groupByBundle(selections);
  const targetIds = [...new Set(bundleIds.flatMap(id => getPracticeWordTargets(
    itemGroups.get(id) || [], 'spelling', language, (selectionGroups.get(id) || []).map(row => Number(row.word_id)),
  ).map(target => Number(target.word.id))))];
  const words: any[] = [];
  for (let offset = 0; offset < targetIds.length; offset += 200) {
    words.push(...await read(() => supabase.from('user_word_interactions')
      .select('word_id, correct_count, proficiency_level').eq('user_id', userId)
      .in('word_id', targetIds.slice(offset, offset + 200)).order('word_id')));
  }
  return new Map(bundleIds.map(id => {
    const bundleItems = itemGroups.get(id) || [];
    const bundleInteractions = interactionGroups.get(id) || [];
    const selected = (selectionGroups.get(id) || []).map(row => Number(row.word_id));
    return [id, { ...calculateBundleCompletion(bundleItems, bundleInteractions, words, selected, language, bundles.find(row => String(row.bundle_id) === id)?.metadata), items: bundleItems, interactions: bundleInteractions, selectedWordIds: selected }];
  }));
}
