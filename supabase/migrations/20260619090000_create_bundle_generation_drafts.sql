CREATE TABLE IF NOT EXISTS public.bundle_generation_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES public.bundle_category(id) ON DELETE CASCADE,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'ready', 'converted', 'archived')),
  notes TEXT,
  created_by UUID,
  converted_bundle_id UUID REFERENCES public.bundle(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.bundle_generation_drafts
  ADD COLUMN IF NOT EXISTS payload JSONB NOT NULL DEFAULT '{}'::jsonb;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'bundle_generation_drafts'
      AND column_name = 'title_en'
  ) THEN
    EXECUTE $migration$
      UPDATE public.bundle_generation_drafts
      SET payload = jsonb_build_object(
        'title', COALESCE(title, ''),
        'title_en', COALESCE(title_en, ''),
        'description', COALESCE(description, ''),
        'description_en', COALESCE(description_en, ''),
        'items', COALESCE(items, '[]'::jsonb)
      )
      WHERE payload = '{}'::jsonb
    $migration$;
  END IF;
END $$;

ALTER TABLE public.bundle_generation_drafts
  DROP COLUMN IF EXISTS title,
  DROP COLUMN IF EXISTS title_en,
  DROP COLUMN IF EXISTS description,
  DROP COLUMN IF EXISTS description_en,
  DROP COLUMN IF EXISTS items;

CREATE INDEX IF NOT EXISTS idx_bundle_generation_drafts_category
  ON public.bundle_generation_drafts(category_id, updated_at DESC);

ALTER TABLE public.bundle_generation_drafts ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS update_bundle_generation_drafts_updated_at
  ON public.bundle_generation_drafts;
CREATE TRIGGER update_bundle_generation_drafts_updated_at
  BEFORE UPDATE ON public.bundle_generation_drafts
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

COMMENT ON TABLE public.bundle_generation_drafts
  IS 'Admin-only staging area for AI-assisted bundle sentence generation.';

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
