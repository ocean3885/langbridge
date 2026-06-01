export type Language = 'ko' | 'en';

export type BundleCategoryRow = {
  id: string | number;
  name?: string | null;
  name_en?: string | null;
  description?: string | null;
  description_en?: string | null;
  icon_image_url?: string | null;
  category_image_url?: string | null;
  order_index?: number | null;
};

export type BundleRow = {
  id: string;
  title: string;
  title_en?: string | null;
  description?: string | null;
  description_en?: string | null;
  thumbnail_url?: string | null;
  level?: number | null;
  created_at?: string;
  is_published?: boolean | null;
  bundle_category?: BundleCategoryRow | null;
};

export type BundleCopy = {
  title: string;
  description: string;
  search: string;
  categories: string;
  featured: string;
  start: string;
  preview: string;
  viewAll: string;
  noBundlesTitle: string;
  noBundlesDesc: string;
  bundles: string;
  lessons: string;
  minutes: string;
  beginner: string;
  journey: string;
  journeySub: string;
};
