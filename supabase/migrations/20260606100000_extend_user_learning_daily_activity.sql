-- Migration to extend user_learning_daily_activity with ranking & mastery metrics

ALTER TABLE public.user_learning_daily_activity 
ADD COLUMN IF NOT EXISTS earned_stars INTEGER NOT NULL DEFAULT 0 CHECK (earned_stars >= 0),
ADD COLUMN IF NOT EXISTS completed_sentences INTEGER NOT NULL DEFAULT 0 CHECK (completed_sentences >= 0),
ADD COLUMN IF NOT EXISTS practiced_words INTEGER NOT NULL DEFAULT 0 CHECK (practiced_words >= 0),
ADD COLUMN IF NOT EXISTS mastered_sentences INTEGER NOT NULL DEFAULT 0 CHECK (mastered_sentences >= 0),
ADD COLUMN IF NOT EXISTS mastered_words INTEGER NOT NULL DEFAULT 0 CHECK (mastered_words >= 0),
ADD COLUMN IF NOT EXISTS total_correct_count INTEGER NOT NULL DEFAULT 0 CHECK (total_correct_count >= 0),
ADD COLUMN IF NOT EXISTS total_incorrect_count INTEGER NOT NULL DEFAULT 0 CHECK (total_incorrect_count >= 0),
ADD COLUMN IF NOT EXISTS study_seconds INTEGER NOT NULL DEFAULT 0 CHECK (study_seconds >= 0);

CREATE INDEX IF NOT EXISTS idx_daily_activity_ranking_stars
    ON public.user_learning_daily_activity(activity_date, earned_stars DESC);

CREATE INDEX IF NOT EXISTS idx_daily_activity_ranking_sentences
    ON public.user_learning_daily_activity(activity_date, mastered_sentences DESC);

CREATE INDEX IF NOT EXISTS idx_daily_activity_ranking_words
    ON public.user_learning_daily_activity(activity_date, mastered_words DESC);

CREATE OR REPLACE FUNCTION public.increment_user_learning_daily_activity(
    p_user_id TEXT,
    p_activity_date DATE,
    p_earned_stars_delta INTEGER DEFAULT 0,
    p_completed_sentences_delta INTEGER DEFAULT 0,
    p_practiced_words_delta INTEGER DEFAULT 0,
    p_mastered_sentences_delta INTEGER DEFAULT 0,
    p_mastered_words_delta INTEGER DEFAULT 0,
    p_total_correct_delta INTEGER DEFAULT 0,
    p_total_incorrect_delta INTEGER DEFAULT 0,
    p_study_seconds_delta INTEGER DEFAULT 0
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO public.user_learning_daily_activity (
        user_id,
        activity_date,
        activity_count,
        first_activity_at,
        last_activity_at,
        earned_stars,
        completed_sentences,
        practiced_words,
        mastered_sentences,
        mastered_words,
        total_correct_count,
        total_incorrect_count,
        study_seconds
    )
    VALUES (
        p_user_id,
        p_activity_date,
        1,
        timezone('utc'::text, now()),
        timezone('utc'::text, now()),
        GREATEST(p_earned_stars_delta, 0),
        GREATEST(p_completed_sentences_delta, 0),
        GREATEST(p_practiced_words_delta, 0),
        GREATEST(p_mastered_sentences_delta, 0),
        GREATEST(p_mastered_words_delta, 0),
        GREATEST(p_total_correct_delta, 0),
        GREATEST(p_total_incorrect_delta, 0),
        GREATEST(p_study_seconds_delta, 0)
    )
    ON CONFLICT (user_id, activity_date) DO UPDATE SET
        activity_count = public.user_learning_daily_activity.activity_count + 1,
        last_activity_at = timezone('utc'::text, now()),
        earned_stars = public.user_learning_daily_activity.earned_stars + GREATEST(p_earned_stars_delta, 0),
        completed_sentences = public.user_learning_daily_activity.completed_sentences + GREATEST(p_completed_sentences_delta, 0),
        practiced_words = public.user_learning_daily_activity.practiced_words + GREATEST(p_practiced_words_delta, 0),
        mastered_sentences = public.user_learning_daily_activity.mastered_sentences + GREATEST(p_mastered_sentences_delta, 0),
        mastered_words = public.user_learning_daily_activity.mastered_words + GREATEST(p_mastered_words_delta, 0),
        total_correct_count = public.user_learning_daily_activity.total_correct_count + GREATEST(p_total_correct_delta, 0),
        total_incorrect_count = public.user_learning_daily_activity.total_incorrect_count + GREATEST(p_total_incorrect_delta, 0),
        study_seconds = public.user_learning_daily_activity.study_seconds + GREATEST(p_study_seconds_delta, 0),
        updated_at = timezone('utc'::text, now());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION public.increment_user_learning_daily_activity(TEXT, DATE, INTEGER, INTEGER, INTEGER, INTEGER, INTEGER, INTEGER, INTEGER, INTEGER)
IS 'Atomically increments daily activity stats for leaderboard and streak calculations.';

REVOKE ALL ON FUNCTION public.increment_user_learning_daily_activity(TEXT, DATE, INTEGER, INTEGER, INTEGER, INTEGER, INTEGER, INTEGER, INTEGER, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_user_learning_daily_activity(TEXT, DATE, INTEGER, INTEGER, INTEGER, INTEGER, INTEGER, INTEGER, INTEGER, INTEGER) TO service_role;
