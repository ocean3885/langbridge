-- Add meaning_en column to words table
ALTER TABLE words ADD COLUMN IF NOT EXISTS meaning_en JSONB DEFAULT '{}'::jsonb;
