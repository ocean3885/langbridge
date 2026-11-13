-- Link a bundle to an optional explanatory blog post by slug.

ALTER TABLE public.bundle
ADD COLUMN IF NOT EXISTS blog_post_slug TEXT REFERENCES public.blog_posts(slug) ON UPDATE CASCADE ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_bundle_blog_post_slug
  ON public.bundle(blog_post_slug);

COMMENT ON COLUMN public.bundle.blog_post_slug IS 'Slug of the blog post providing grammar and sentence explanations for this bundle.';

