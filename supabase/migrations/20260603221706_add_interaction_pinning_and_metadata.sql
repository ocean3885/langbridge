-- Align user interaction tables for pinned bundles, sentence metadata,
-- non-negative sentence counters, and mode-agnostic bundle item practice time.

ALTER TABLE public.user_bundle_interactions
ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_user_bundle_interactions_pinned
ON public.user_bundle_interactions(user_id)
WHERE is_pinned = true;

ALTER TABLE public.user_sentence_interactions
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

ALTER TABLE public.user_bundle_item_interactions
ADD COLUMN IF NOT EXISTS last_practiced_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_user_bundle_item_interactions_last_practiced
ON public.user_bundle_item_interactions(user_id, last_practiced_at DESC);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'user_sentence_correct_count_nonnegative'
      AND conrelid = 'public.user_sentence_interactions'::regclass
  ) THEN
    ALTER TABLE public.user_sentence_interactions
    ADD CONSTRAINT user_sentence_correct_count_nonnegative CHECK (correct_count >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'user_sentence_incorrect_count_nonnegative'
      AND conrelid = 'public.user_sentence_interactions'::regclass
  ) THEN
    ALTER TABLE public.user_sentence_interactions
    ADD CONSTRAINT user_sentence_incorrect_count_nonnegative CHECK (incorrect_count >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'user_sentence_streak_count_nonnegative'
      AND conrelid = 'public.user_sentence_interactions'::regclass
  ) THEN
    ALTER TABLE public.user_sentence_interactions
    ADD CONSTRAINT user_sentence_streak_count_nonnegative CHECK (streak_count >= 0);
  END IF;
END $$;

COMMENT ON COLUMN public.user_bundle_interactions.is_pinned IS 'Whether the user saved or pinned this bundle.';
COMMENT ON COLUMN public.user_sentence_interactions.metadata IS 'Additional per-user sentence interaction metadata.';
COMMENT ON COLUMN public.user_bundle_item_interactions.last_practiced_at IS 'Last time the user practiced this bundle item in any mode.';
