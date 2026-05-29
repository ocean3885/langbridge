ALTER TABLE public.bundle_items
ADD COLUMN IF NOT EXISTS speaker_key TEXT,
ADD COLUMN IF NOT EXISTS speaker_name TEXT,
ADD COLUMN IF NOT EXISTS speaker_role TEXT,
ADD COLUMN IF NOT EXISTS audio_url TEXT,
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.bundle_items.speaker_key IS 'Conversation speaker key, such as a, b, or narrator.';
COMMENT ON COLUMN public.bundle_items.speaker_name IS 'Display name for the speaker in conversation-style bundles.';
COMMENT ON COLUMN public.bundle_items.speaker_role IS 'Role label for the speaker, such as customer, staff, friend, or narrator.';
COMMENT ON COLUMN public.bundle_items.audio_url IS 'Bundle item specific audio URL, used before sentences.audio_url when present.';
COMMENT ON COLUMN public.bundle_items.metadata IS 'Additional per-item presentation metadata for bundle layouts.';
