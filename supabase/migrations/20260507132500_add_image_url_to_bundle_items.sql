-- bundle_items 테이블에 이미지 URL 컬럼 추가
ALTER TABLE bundle_items ADD COLUMN image_url TEXT;

-- 기존 thumbnail_url 외에 bundle_items 에도 이미지가 들어갈 수 있도록 함
COMMENT ON COLUMN bundle_items.image_url IS '해당 문장/단어가 재생될 때 표시될 이미지 URL';
