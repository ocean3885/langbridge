import { fallbackImages } from './bundle-data';
import type { BundleCategoryRow, BundleRow, Language } from './types';

export function groupBundlesByCategory(bundles: BundleRow[]) {
  return bundles.reduce<Record<string, BundleRow[]>>((groups, bundle) => {
    const key = getCategoryKey(bundle.bundle_category);
    if (!key) return groups;
    if (!groups[key]) groups[key] = [];
    groups[key].push(bundle);
    return groups;
  }, {});
}

export function getCategoryKey(category?: BundleCategoryRow | null) {
  return category?.id == null ? '' : String(category.id);
}

export function getCategoryAnchorId(category: BundleCategoryRow) {
  return `category-${getCategoryKey(category)}`;
}

export function getCategoryTitle(category: BundleCategoryRow, language: Language) {
  return (language === 'en' ? category.name_en : category.name) || category.name || category.name_en || 'Untitled Category';
}

export function getCategoryDescription(category: BundleCategoryRow, language: Language) {
  return (
    (language === 'en' ? category.description_en : category.description) ||
    category.description ||
    category.description_en ||
    'Explore bundles in this category.'
  );
}

export function getBundleTitle(bundle: BundleRow, language: Language) {
  return (language === 'en' ? bundle.title_en : bundle.title) || bundle.title || bundle.title_en || 'Untitled Bundle';
}

export function getBundleDescription(bundle: BundleRow, language: Language) {
  return (
    (language === 'en' ? bundle.description_en : bundle.description) ||
    bundle.description ||
    bundle.description_en ||
    'Learn naturally with short lessons, questions, and practical review.'
  );
}

export function getCategoryName(bundle: BundleRow, language: Language) {
  return (
    (language === 'en' ? bundle.bundle_category?.name_en : bundle.bundle_category?.name) ||
    bundle.bundle_category?.name ||
    bundle.bundle_category?.name_en ||
    'Hola Start'
  );
}

export function getBundleImage(bundle: BundleRow, index: number) {
  return bundle.thumbnail_url || fallbackImages[index % fallbackImages.length];
}

export function lessonCount(bundle: BundleRow) {
  const level = Number(bundle.level || 1);
  return Math.max(5, Math.min(8, level + 5));
}
