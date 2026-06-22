-- Keep the oldest mapping when historical duplicates exist.
DELETE FROM word_sentence_map duplicate
USING word_sentence_map original
WHERE duplicate.word_id = original.word_id
  AND duplicate.sentence_id = original.sentence_id
  AND duplicate.id > original.id;

CREATE UNIQUE INDEX IF NOT EXISTS idx_word_sentence_map_unique_word_sentence
  ON word_sentence_map(word_id, sentence_id);
