-- Daily learning activity ledger for streaks, daily goals, and future rankings.

CREATE TABLE IF NOT EXISTS public.user_learning_daily_activity (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT REFERENCES public.auth_users(id) ON DELETE CASCADE NOT NULL,
    activity_date DATE NOT NULL,

    activity_count INTEGER DEFAULT 0 CHECK (activity_count >= 0),
    first_activity_at TIMESTAMPTZ,
    last_activity_at TIMESTAMPTZ,

    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,

    UNIQUE(user_id, activity_date)
);

CREATE INDEX IF NOT EXISTS idx_user_learning_daily_activity_user_date
    ON public.user_learning_daily_activity(user_id, activity_date DESC);

CREATE INDEX IF NOT EXISTS idx_user_learning_daily_activity_last_activity
    ON public.user_learning_daily_activity(user_id, last_activity_at DESC);

ALTER TABLE public.user_learning_daily_activity ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS update_user_learning_daily_activity_updated_at ON public.user_learning_daily_activity;
CREATE TRIGGER update_user_learning_daily_activity_updated_at
    BEFORE UPDATE ON public.user_learning_daily_activity
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE public.user_learning_daily_activity IS 'One row per user per local activity date for streak and daily learning goal calculations.';
COMMENT ON COLUMN public.user_learning_daily_activity.activity_date IS 'The local calendar date that the activity counts toward.';
COMMENT ON COLUMN public.user_learning_daily_activity.activity_count IS 'Number of learning activity events recorded on this date.';
COMMENT ON COLUMN public.user_learning_daily_activity.first_activity_at IS 'First learning activity timestamp for this date.';
COMMENT ON COLUMN public.user_learning_daily_activity.last_activity_at IS 'Most recent learning activity timestamp for this date.';
