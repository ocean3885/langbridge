export type BundleSortKey = 'recent' | 'oldest' | 'achievement-desc' | 'achievement-asc';

type SortableBundle = {
  bundleId: string;
  lastStudiedAt: string | null;
  earnedStars: number;
  maxStars: number;
};

export function compareBundleProgress(a: SortableBundle, b: SortableBundle, sort: BundleSortKey) {
  const aDate = a.lastStudiedAt ? Date.parse(a.lastStudiedAt) || 0 : 0;
  const bDate = b.lastStudiedAt ? Date.parse(b.lastStudiedAt) || 0 : 0;
  const recent = bDate - aDate;
  const tie = a.bundleId.localeCompare(b.bundleId);
  if (sort === 'recent') return recent || tie;
  if (sort === 'oldest') {
    if (!aDate || !bDate) return Number(!aDate) - Number(!bDate) || tie;
    return aDate - bDate || tie;
  }
  // Bundles without star targets have no achievement rate in either direction.
  if (a.maxStars <= 0 || b.maxStars <= 0) {
    return Number(a.maxStars <= 0) - Number(b.maxStars <= 0) || recent || tie;
  }
  const difference = a.earnedStars / a.maxStars - b.earnedStars / b.maxStars;
  return (sort === 'achievement-asc' ? difference : -difference) || recent || tie;
}
