ALTER TABLE public.user_bundle_interactions
ADD COLUMN IF NOT EXISTS current_practice_item_ids JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.user_bundle_interactions.current_practice_item_ids IS
  'Map of practice mode keys to current bundle item IDs, e.g. {"quiz": "...", "flashcards": "...", "scramble": "..."}.';
