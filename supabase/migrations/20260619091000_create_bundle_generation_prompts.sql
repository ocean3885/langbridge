CREATE TABLE IF NOT EXISTS public.bundle_generation_prompts (
  category_id UUID PRIMARY KEY REFERENCES public.bundle_category(id) ON DELETE CASCADE,
  prompt TEXT NOT NULL,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.bundle_generation_prompts ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS update_bundle_generation_prompts_updated_at
  ON public.bundle_generation_prompts;
CREATE TRIGGER update_bundle_generation_prompts_updated_at
  BEFORE UPDATE ON public.bundle_generation_prompts
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

COMMENT ON TABLE public.bundle_generation_prompts
  IS 'Admin-only category-specific prompts for AI-assisted bundle generation.';
