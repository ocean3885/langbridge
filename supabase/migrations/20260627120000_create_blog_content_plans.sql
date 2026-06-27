-- Create an admin-only planning queue for blog content before publishing.

CREATE TABLE IF NOT EXISTS public.blog_content_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  slug TEXT,
  category_id UUID REFERENCES public.blog_categories(id) ON DELETE SET NULL,
  target_keywords TEXT[] NOT NULL DEFAULT '{}',
  search_intent TEXT,
  content_angle TEXT,
  audience TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  priority INTEGER NOT NULL DEFAULT 0,
  generated_payload JSONB,
  generated_at TIMESTAMPTZ,
  linked_post_id UUID REFERENCES public.blog_posts(id) ON DELETE SET NULL,
  published_at TIMESTAMPTZ,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT blog_content_plans_status_check
    CHECK (status IN ('pending', 'generating', 'ready', 'published', 'paused', 'discarded')),
  CONSTRAINT blog_content_plans_slug_format_check
    CHECK (slug IS NULL OR slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);

CREATE UNIQUE INDEX IF NOT EXISTS unique_blog_content_plans_slug
  ON public.blog_content_plans(slug)
  WHERE slug IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS unique_blog_content_plans_linked_post_id
  ON public.blog_content_plans(linked_post_id)
  WHERE linked_post_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_blog_content_plans_status_priority
  ON public.blog_content_plans(status, priority DESC, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_blog_content_plans_category_id
  ON public.blog_content_plans(category_id);

CREATE INDEX IF NOT EXISTS idx_blog_content_plans_created_by
  ON public.blog_content_plans(created_by);

CREATE INDEX IF NOT EXISTS idx_blog_content_plans_target_keywords
  ON public.blog_content_plans USING GIN(target_keywords);

ALTER TABLE public.blog_content_plans ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS update_blog_content_plans_updated_at
  ON public.blog_content_plans;
CREATE TRIGGER update_blog_content_plans_updated_at
  BEFORE UPDATE ON public.blog_content_plans
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

COMMENT ON TABLE public.blog_content_plans
  IS 'Admin-only blog planning queue used before creating public blog_posts.';

COMMENT ON COLUMN public.blog_content_plans.generated_payload
  IS 'LLM-generated blog JSON awaiting review before it is published into blog_posts.';

COMMENT ON COLUMN public.blog_content_plans.linked_post_id
  IS 'The blog_posts row created from this plan after publishing.';
