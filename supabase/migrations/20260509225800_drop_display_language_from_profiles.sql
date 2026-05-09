-- Drop display_language column from user_profiles table as language state is now entirely cookie-based
ALTER TABLE public.user_profiles
DROP COLUMN display_language;
