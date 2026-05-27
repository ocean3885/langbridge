ALTER TABLE public.bundle_category
ADD COLUMN IF NOT EXISTS icon_image_url TEXT;

COMMENT ON COLUMN public.bundle_category.icon_image_url IS 'Representative icon image URL for the bundle category';
