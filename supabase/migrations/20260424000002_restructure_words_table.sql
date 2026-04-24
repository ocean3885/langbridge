-- Restructure words table
-- Note: Recreating the table to match the new schema exactly.

-- 1. Drop dependent tables first
DROP TABLE IF EXISTS word_sentence_map;

-- 2. Drop existing words table
DROP TABLE IF EXISTS words;

-- 3. Create words table with the new structure
CREATE TABLE words (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  word TEXT NOT NULL,
  lang_code VARCHAR(5) NOT NULL,
  pos TEXT[] NOT NULL DEFAULT '{}',
  meaning JSONB NOT NULL DEFAULT '{}',
  gender CHAR(1),
  declensions JSONB NOT NULL DEFAULT '{}',
  conjugations JSONB NOT NULL DEFAULT '{}',
  audio_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Create indexes for performance
CREATE INDEX idx_words_word ON words(word);
CREATE INDEX idx_words_lang_code ON words(lang_code);

-- 5. Add updated_at trigger
DROP TRIGGER IF EXISTS update_words_updated_at ON words;
CREATE TRIGGER update_words_updated_at BEFORE UPDATE ON words FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- 6. Recreate word_sentence_map with correct reference
CREATE TABLE word_sentence_map (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  word_id BIGINT NOT NULL,
  sentence_id BIGINT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (word_id) REFERENCES words(id) ON DELETE CASCADE,
  FOREIGN KEY (sentence_id) REFERENCES sentences(id) ON DELETE CASCADE
);

CREATE INDEX idx_word_sentence_map_word ON word_sentence_map(word_id);
CREATE INDEX idx_word_sentence_map_sentence ON word_sentence_map(sentence_id);

-- 7. Enable RLS (as per project standard in schema.sql)
ALTER TABLE words ENABLE ROW LEVEL SECURITY;
ALTER TABLE word_sentence_map ENABLE ROW LEVEL SECURITY;
