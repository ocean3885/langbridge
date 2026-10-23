export function getBundleListeningState(
  items: { id: string }[],
  interactions: { bundle_item_id: string; play_count?: number | null; last_played_at?: string | null }[],
  currentItemId: string | null,
) {
  const played = interactions.filter(row => Number(row.play_count) > 0 && items.some(item => item.id === row.bundle_item_id));
  const hasListened = played.length > 0;
  const currentIndex = items.findIndex(item => item.id === currentItemId);
  const latest = [...played].sort((a, b) => (Date.parse(b.last_played_at || '') || 0) - (Date.parse(a.last_played_at || '') || 0))[0];
  const index = currentIndex >= 0 ? currentIndex : items.findIndex(item => item.id === latest?.bundle_item_id);
  return { hasListened, currentStep: hasListened && index >= 0 ? index + 1 : null };
}
