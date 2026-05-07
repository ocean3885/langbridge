-- words 테이블의 gender 컬럼 타입을 CHAR(1)에서 TEXT로 변경
-- 'mf'와 같은 다중 성별 표시나 기타 유연한 값을 허용하기 위함
ALTER TABLE words ALTER COLUMN gender TYPE TEXT;

COMMENT ON COLUMN words.gender IS '단어의 성별 (m, f, mf 등)';
