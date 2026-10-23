/** Only IDs recorded by practice inside this bundle count toward its completion. */
export function getCompletedBundleWordIds(metadata: unknown): number[] {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return [];
  const ids = (metadata as Record<string, unknown>).completed_word_ids;
  if (!Array.isArray(ids)) return [];
  return [...new Set(ids.filter((id): id is number => typeof id === 'number' && Number.isSafeInteger(id) && id > 0))];
}
