ALTER TABLE public.bundle_category
ADD COLUMN IF NOT EXISTS category_image_url TEXT;

COMMENT ON COLUMN public.bundle_category.category_image_url IS 'Representative hero image URL for the bundle category';
