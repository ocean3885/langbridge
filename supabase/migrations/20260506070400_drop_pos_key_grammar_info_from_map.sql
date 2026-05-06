-- word_sentence_map 테이블에서 pos_key, grammar_info 컬럼 삭제
ALTER TABLE word_sentence_map DROP COLUMN pos_key;
ALTER TABLE word_sentence_map DROP COLUMN grammar_info;
