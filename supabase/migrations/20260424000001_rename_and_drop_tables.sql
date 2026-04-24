-- Rename video_learning_progress to edu_video_progress
ALTER TABLE video_learning_progress RENAME TO edu_video_progress;

-- Rename video_channels to edu_video_channels
ALTER TABLE video_channels RENAME TO edu_video_channels;

-- Drop verb_conjugations table
DROP TABLE IF EXISTS verb_conjugations;

-- Update foreign key references and indexes if necessary
-- Note: RENAME TO in PostgreSQL also updates indexes and triggers that are attached to the table.
-- However, we should check if any triggers or functions need manual updates.

-- 1. Update trigger on edu_video_progress (formerly video_learning_progress)
DROP TRIGGER IF EXISTS update_video_learning_progress_updated_at ON edu_video_progress;
CREATE TRIGGER update_edu_video_progress_updated_at BEFORE UPDATE ON edu_video_progress FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- 2. Update trigger on edu_video_channels (formerly video_channels)
DROP TRIGGER IF EXISTS update_video_channels_updated_at ON edu_video_channels;
CREATE TRIGGER update_edu_video_channels_updated_at BEFORE UPDATE ON edu_video_channels FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- 3. Update foreign key names if they include the old table name (optional but good for consistency)
-- This depends on how Supabase/Postgres named them. Usually they are named like 'table_column_fkey'.
-- Since we are doing a manual migration, we'll focus on the table names first.
