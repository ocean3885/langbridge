import { createAdminClient } from '@/lib/supabase/admin';
import { getCompletedBundleWordIds } from '@/lib/practice/bundle-word-progress';

// Compare-and-swap the full JSON value: concurrent answers retry against the latest
// metadata rather than overwriting another answer or an unrelated metadata key.
export async function recordCompletedBundleWord(userId: string, bundleId: string, wordId: number) {
  const supabase = createAdminClient();
  for (let attempt = 0; attempt < 8; attempt++) {
    const { data: row, error } = await supabase.from('user_bundle_interactions')
      .select('metadata').eq('user_id', userId).eq('bundle_id', bundleId).maybeSingle();
    if (error) throw error;
    if (!row) throw new Error('Bundle practice must be started before recording a completed word.');
    const ids = getCompletedBundleWordIds(row.metadata);
    if (ids.includes(wordId)) return;
    const metadata = row.metadata && typeof row.metadata === 'object' && !Array.isArray(row.metadata) ? row.metadata : {};
    let update = supabase.from('user_bundle_interactions')
      .update({ metadata: { ...metadata, completed_word_ids: [...ids, wordId] } })
      .eq('user_id', userId).eq('bundle_id', bundleId);
    update = row.metadata == null ? update.is('metadata', null) : update.eq('metadata', JSON.stringify(row.metadata));
    const { data: updated, error: updateError } = await update.select('bundle_id');
    if (updateError) throw updateError;
    if (updated?.length) return;
  }
  throw new Error('Concurrent bundle updates prevented saving the completed word. Please retry.');
}
