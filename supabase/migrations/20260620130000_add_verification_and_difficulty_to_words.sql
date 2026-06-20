-- Add is_verified and difficulty columns to words table
ALTER TABLE words ADD COLUMN is_verified BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE words ADD COLUMN difficulty INTEGER DEFAULT 1;

-- Add indexes for performance
CREATE INDEX idx_words_is_verified ON words(is_verified);
CREATE INDEX idx_words_difficulty ON words(difficulty);
