-- ===================================================================
-- Add words_distractor table
-- ===================================================================

CREATE TABLE IF NOT EXISTS words_distractor (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    word_id BIGINT NOT NULL REFERENCES words(id) ON DELETE CASCADE,
    distractor TEXT NOT NULL,
    meaning_ko TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_words_distractor_word_id ON words_distractor(word_id);

-- Updated at trigger
DROP TRIGGER IF EXISTS update_words_distractor_updated_at ON words_distractor;
CREATE TRIGGER update_words_distractor_updated_at 
    BEFORE UPDATE ON words_distractor 
    FOR EACH ROW 
    EXECUTE PROCEDURE update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE words_distractor ENABLE ROW LEVEL SECURITY;

-- RLS Policies (Assuming service role handles insertion as seen in pipeline.py)
-- If public read is needed, uncomment below:
-- CREATE POLICY "Enable read access for all users" ON words_distractor FOR SELECT USING (true);
