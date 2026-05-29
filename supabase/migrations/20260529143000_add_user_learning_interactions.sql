-- User-level learning interactions for bundles, bundle items, and words.
-- RLS is enabled without client policies so these tables stay server/API only.

CREATE TABLE IF NOT EXISTS public.user_bundle_interactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT REFERENCES public.auth_users(id) ON DELETE CASCADE NOT NULL,
    bundle_id UUID REFERENCES public.bundle(id) ON DELETE CASCADE NOT NULL,

    is_started BOOLEAN DEFAULT false,
    is_completed BOOLEAN DEFAULT false,
    progress_ratio NUMERIC(5, 4) DEFAULT 0 CHECK (progress_ratio >= 0 AND progress_ratio <= 1),
    current_bundle_item_id UUID REFERENCES public.bundle_items(id) ON DELETE SET NULL,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    last_studied_at TIMESTAMPTZ,

    memo TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,

    UNIQUE(user_id, bundle_id)
);

CREATE TABLE IF NOT EXISTS public.user_bundle_item_interactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT REFERENCES public.auth_users(id) ON DELETE CASCADE NOT NULL,
    bundle_id UUID REFERENCES public.bundle(id) ON DELETE CASCADE NOT NULL,
    bundle_item_id UUID REFERENCES public.bundle_items(id) ON DELETE CASCADE NOT NULL,

    is_completed BOOLEAN DEFAULT false,
    play_count INTEGER DEFAULT 0 CHECK (play_count >= 0),
    repeat_count INTEGER DEFAULT 0 CHECK (repeat_count >= 0),
    correct_count INTEGER DEFAULT 0 CHECK (correct_count >= 0),
    incorrect_count INTEGER DEFAULT 0 CHECK (incorrect_count >= 0),
    last_played_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,

    memo TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,

    UNIQUE(user_id, bundle_item_id)
);

CREATE TABLE IF NOT EXISTS public.user_word_interactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT REFERENCES public.auth_users(id) ON DELETE CASCADE NOT NULL,
    word_id BIGINT REFERENCES public.words(id) ON DELETE CASCADE NOT NULL,

    is_pinned BOOLEAN DEFAULT false,
    memo TEXT,
    proficiency_level INTEGER DEFAULT 0 CHECK (proficiency_level >= 0 AND proficiency_level <= 5),
    correct_count INTEGER DEFAULT 0 CHECK (correct_count >= 0),
    incorrect_count INTEGER DEFAULT 0 CHECK (incorrect_count >= 0),
    streak_count INTEGER DEFAULT 0 CHECK (streak_count >= 0),
    last_reviewed_at TIMESTAMPTZ,

    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,

    UNIQUE(user_id, word_id)
);

CREATE INDEX IF NOT EXISTS idx_user_bundle_interactions_user_id
    ON public.user_bundle_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_bundle_interactions_bundle_id
    ON public.user_bundle_interactions(bundle_id);
CREATE INDEX IF NOT EXISTS idx_user_bundle_interactions_last_studied
    ON public.user_bundle_interactions(user_id, last_studied_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_bundle_item_interactions_user_bundle
    ON public.user_bundle_item_interactions(user_id, bundle_id);
CREATE INDEX IF NOT EXISTS idx_user_bundle_item_interactions_item_id
    ON public.user_bundle_item_interactions(bundle_item_id);
CREATE INDEX IF NOT EXISTS idx_user_bundle_item_interactions_last_played
    ON public.user_bundle_item_interactions(user_id, last_played_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_word_interactions_user_id
    ON public.user_word_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_word_interactions_word_id
    ON public.user_word_interactions(word_id);
CREATE INDEX IF NOT EXISTS idx_user_word_interactions_pinned
    ON public.user_word_interactions(user_id) WHERE is_pinned = true;
CREATE INDEX IF NOT EXISTS idx_user_word_interactions_review
    ON public.user_word_interactions(user_id, last_reviewed_at DESC);

ALTER TABLE public.user_bundle_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_bundle_item_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_word_interactions ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_user_bundle_interactions_updated_at ON public.user_bundle_interactions;
CREATE TRIGGER update_user_bundle_interactions_updated_at
    BEFORE UPDATE ON public.user_bundle_interactions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_bundle_item_interactions_updated_at ON public.user_bundle_item_interactions;
CREATE TRIGGER update_user_bundle_item_interactions_updated_at
    BEFORE UPDATE ON public.user_bundle_item_interactions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_word_interactions_updated_at ON public.user_word_interactions;
CREATE TRIGGER update_user_word_interactions_updated_at
    BEFORE UPDATE ON public.user_word_interactions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE public.user_bundle_interactions IS 'User interaction and progress state for a bundle.';
COMMENT ON TABLE public.user_bundle_item_interactions IS 'User interaction and progress state for a specific bundle item.';
COMMENT ON TABLE public.user_word_interactions IS 'User interaction and proficiency state for a word.';
COMMENT ON COLUMN public.user_bundle_interactions.progress_ratio IS 'Bundle completion ratio from 0 to 1.';
COMMENT ON COLUMN public.user_word_interactions.proficiency_level IS 'Learning proficiency level from 0 to 5.';
