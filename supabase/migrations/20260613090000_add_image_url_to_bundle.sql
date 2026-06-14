-- Add a default learning-player image for bundles.

ALTER TABLE public.bundle
ADD COLUMN IF NOT EXISTS image_url TEXT;

COMMENT ON COLUMN public.bundle.image_url IS 'Default image URL used in the bundle learning player when a bundle item has no image.';
