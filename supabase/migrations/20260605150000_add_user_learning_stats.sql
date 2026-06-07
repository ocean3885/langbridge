-- Per-user accumulated learning stats for progress summaries and rankings.

CREATE TABLE IF NOT EXISTS public.user_learning_stats (
    user_id TEXT PRIMARY KEY REFERENCES public.auth_users(id) ON DELETE CASCADE,

    completed_sentences INTEGER NOT NULL DEFAULT 0 CHECK (completed_sentences >= 0),
    earned_stars INTEGER NOT NULL DEFAULT 0 CHECK (earned_stars >= 0),
    practiced_words INTEGER NOT NULL DEFAULT 0 CHECK (practiced_words >= 0),

    total_correct_count INTEGER NOT NULL DEFAULT 0 CHECK (total_correct_count >= 0),
    total_incorrect_count INTEGER NOT NULL DEFAULT 0 CHECK (total_incorrect_count >= 0),

    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_user_learning_stats_earned_stars
    ON public.user_learning_stats(earned_stars DESC, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_learning_stats_completed_sentences
    ON public.user_learning_stats(completed_sentences DESC, updated_at DESC);

ALTER TABLE public.user_learning_stats ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS update_user_learning_stats_updated_at ON public.user_learning_stats;
CREATE TRIGGER update_user_learning_stats_updated_at
    BEFORE UPDATE ON public.user_learning_stats
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE public.user_learning_stats IS 'One row per user for accumulated learning progress stats used by dashboards and rankings.';
COMMENT ON COLUMN public.user_learning_stats.completed_sentences IS 'Number of bundle item sentences completed by the user.';
COMMENT ON COLUMN public.user_learning_stats.earned_stars IS 'Total stars earned from practice modes such as quiz and scramble.';
COMMENT ON COLUMN public.user_learning_stats.practiced_words IS 'Number of words the user has practiced or reviewed.';
COMMENT ON COLUMN public.user_learning_stats.total_correct_count IS 'Total correct practice answers across tracked learning activities.';
COMMENT ON COLUMN public.user_learning_stats.total_incorrect_count IS 'Total incorrect practice answers across tracked learning activities.';

CREATE OR REPLACE FUNCTION public.increment_user_learning_stats(
    p_user_id TEXT,
    p_completed_sentences_delta INTEGER DEFAULT 0,
    p_earned_stars_delta INTEGER DEFAULT 0,
    p_practiced_words_delta INTEGER DEFAULT 0,
    p_total_correct_delta INTEGER DEFAULT 0,
    p_total_incorrect_delta INTEGER DEFAULT 0
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO public.user_learning_stats (
        user_id,
        completed_sentences,
        earned_stars,
        practiced_words,
        total_correct_count,
        total_incorrect_count
    )
    VALUES (
        p_user_id,
        GREATEST(p_completed_sentences_delta, 0),
        GREATEST(p_earned_stars_delta, 0),
        GREATEST(p_practiced_words_delta, 0),
        GREATEST(p_total_correct_delta, 0),
        GREATEST(p_total_incorrect_delta, 0)
    )
    ON CONFLICT (user_id) DO UPDATE SET
        completed_sentences = public.user_learning_stats.completed_sentences + GREATEST(p_completed_sentences_delta, 0),
        earned_stars = public.user_learning_stats.earned_stars + GREATEST(p_earned_stars_delta, 0),
        practiced_words = public.user_learning_stats.practiced_words + GREATEST(p_practiced_words_delta, 0),
        total_correct_count = public.user_learning_stats.total_correct_count + GREATEST(p_total_correct_delta, 0),
        total_incorrect_count = public.user_learning_stats.total_incorrect_count + GREATEST(p_total_incorrect_delta, 0),
        updated_at = timezone('utc'::text, now());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION public.increment_user_learning_stats(TEXT, INTEGER, INTEGER, INTEGER, INTEGER, INTEGER)
IS 'Atomically increments accumulated learning stats for a user.';

REVOKE ALL ON FUNCTION public.increment_user_learning_stats(TEXT, INTEGER, INTEGER, INTEGER, INTEGER, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_user_learning_stats(TEXT, INTEGER, INTEGER, INTEGER, INTEGER, INTEGER) TO service_role;
