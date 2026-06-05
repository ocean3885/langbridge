-- Per-user learning settings for daily goal display and editing.

CREATE TABLE IF NOT EXISTS public.user_learning_preferences (
    user_id TEXT PRIMARY KEY REFERENCES public.auth_users(id) ON DELETE CASCADE,

    daily_goal_count INTEGER NOT NULL DEFAULT 20 CHECK (daily_goal_count BETWEEN 1 AND 100),
    daily_goal_metric TEXT NOT NULL DEFAULT 'activity_count' CHECK (daily_goal_metric = 'activity_count'),

    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.user_learning_preferences ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS update_user_learning_preferences_updated_at ON public.user_learning_preferences;
CREATE TRIGGER update_user_learning_preferences_updated_at
    BEFORE UPDATE ON public.user_learning_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE public.user_learning_preferences IS 'Per-user learning preferences such as daily learning goal settings.';
COMMENT ON COLUMN public.user_learning_preferences.daily_goal_count IS 'Target number of learning sessions for the daily goal card.';
COMMENT ON COLUMN public.user_learning_preferences.daily_goal_metric IS 'Metric used to calculate the daily goal. Currently activity_count.';
