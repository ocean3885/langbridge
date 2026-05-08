-- Add English columns to bundle table
ALTER TABLE public.bundle 
ADD COLUMN title_en TEXT,
ADD COLUMN description_en TEXT;

-- Add English columns to bundle_category table
ALTER TABLE public.bundle_category 
ADD COLUMN name_en TEXT,
ADD COLUMN description_en TEXT;

-- Comment for documentation
COMMENT ON COLUMN public.bundle.title_en IS 'English title for the bundle';
COMMENT ON COLUMN public.bundle.description_en IS 'English description for the bundle';
COMMENT ON COLUMN public.bundle_category.name_en IS 'English name for the category';
COMMENT ON COLUMN public.bundle_category.description_en IS 'English description for the category';
