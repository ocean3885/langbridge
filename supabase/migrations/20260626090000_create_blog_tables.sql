-- Create database-backed blog tables for public SEO content.

CREATE TABLE IF NOT EXISTS public.blog_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.blog_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  content JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft',
  published_at TIMESTAMPTZ,
  category_id UUID REFERENCES public.blog_categories(id) ON DELETE SET NULL,
  image_url TEXT,
  reading_minutes INTEGER NOT NULL DEFAULT 3,
  seo_title TEXT,
  seo_description TEXT,
  og_image_url TEXT,
  canonical_url TEXT,
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT blog_posts_status_check
    CHECK (status IN ('draft', 'published', 'archived')),
  CONSTRAINT blog_posts_reading_minutes_check
    CHECK (reading_minutes > 0)
);

CREATE TABLE IF NOT EXISTS public.blog_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.blog_post_tags (
  post_id UUID NOT NULL REFERENCES public.blog_posts(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.blog_tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (post_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_blog_categories_sort_order
  ON public.blog_categories(sort_order, name);

CREATE INDEX IF NOT EXISTS idx_blog_posts_status_published_at
  ON public.blog_posts(status, published_at DESC);

CREATE INDEX IF NOT EXISTS idx_blog_posts_category_id
  ON public.blog_posts(category_id);

CREATE INDEX IF NOT EXISTS idx_blog_post_tags_tag_id
  ON public.blog_post_tags(tag_id);

ALTER TABLE public.blog_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_post_tags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read blog categories"
  ON public.blog_categories;
CREATE POLICY "Public can read blog categories"
  ON public.blog_categories
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Public can read published blog posts"
  ON public.blog_posts;
CREATE POLICY "Public can read published blog posts"
  ON public.blog_posts
  FOR SELECT
  USING (status = 'published' AND published_at <= NOW());

DROP POLICY IF EXISTS "Public can read blog tags"
  ON public.blog_tags;
CREATE POLICY "Public can read blog tags"
  ON public.blog_tags
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Public can read published blog post tags"
  ON public.blog_post_tags;
CREATE POLICY "Public can read published blog post tags"
  ON public.blog_post_tags
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.blog_posts
      WHERE blog_posts.id = blog_post_tags.post_id
        AND blog_posts.status = 'published'
        AND blog_posts.published_at <= NOW()
    )
  );

DROP TRIGGER IF EXISTS update_blog_categories_updated_at
  ON public.blog_categories;
CREATE TRIGGER update_blog_categories_updated_at
  BEFORE UPDATE ON public.blog_categories
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_blog_posts_updated_at
  ON public.blog_posts;
CREATE TRIGGER update_blog_posts_updated_at
  BEFORE UPDATE ON public.blog_posts
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

COMMENT ON TABLE public.blog_categories
  IS 'Public blog categories used for grouping published learning articles.';

COMMENT ON TABLE public.blog_posts
  IS 'Database-backed blog articles. Public clients can only read published posts; writes are server-admin only.';

COMMENT ON COLUMN public.blog_posts.content
  IS 'Structured JSON content for intro, sections, CTA, and future renderer blocks.';

COMMENT ON TABLE public.blog_tags
  IS 'Public blog tags used for SEO, discovery, and related content.';

COMMENT ON TABLE public.blog_post_tags
  IS 'Many-to-many relationship between blog posts and blog tags.';
