-- Restructure sentences and word_sentence_map tables
-- words table is already restructured in the previous migration (20260424000002_restructure_words_table.sql).

-- 1. Drop existing word_sentence_map (created with old schema)
DROP TABLE IF EXISTS word_sentence_map;

-- 2. Restructure sentences table
DROP TABLE IF EXISTS sentences;

CREATE TABLE sentences (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  sentence TEXT NOT NULL,
  translation TEXT NOT NULL,
  audio_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sentences_sentence ON sentences(sentence);

DROP TRIGGER IF EXISTS update_sentences_updated_at ON sentences;
CREATE TRIGGER update_sentences_updated_at BEFORE UPDATE ON sentences FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- 3. Restructure word_sentence_map table with new columns
CREATE TABLE word_sentence_map (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  word_id BIGINT NOT NULL,
  sentence_id BIGINT NOT NULL,
  used_as TEXT,
  pos_key TEXT,
  grammar_info JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (word_id) REFERENCES words(id) ON DELETE CASCADE,
  FOREIGN KEY (sentence_id) REFERENCES sentences(id) ON DELETE CASCADE
);

CREATE INDEX idx_wsm_word_id ON word_sentence_map(word_id);
CREATE INDEX idx_wsm_sentence_id ON word_sentence_map(sentence_id);

-- 4. Enable RLS
ALTER TABLE sentences ENABLE ROW LEVEL SECURITY;
ALTER TABLE word_sentence_map ENABLE ROW LEVEL SECURITY;
