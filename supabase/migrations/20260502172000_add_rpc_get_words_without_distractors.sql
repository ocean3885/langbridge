-- ===================================================================
-- Add RPC function to get words without distractors
-- ===================================================================

CREATE OR REPLACE FUNCTION get_words_without_distractors(limit_count INT DEFAULT 100)
RETURNS TABLE (id BIGINT, word TEXT) AS $$
BEGIN
    RETURN QUERY
    SELECT w.id, w.word
    FROM words w
    LEFT JOIN words_distractor wd ON w.id = wd.word_id
    WHERE wd.id IS NULL
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;
