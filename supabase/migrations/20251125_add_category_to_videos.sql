-- videos 테이블에 category_id 컬럼 추가

-- 1. videos 테이블에 category_id 컬럼 추가
ALTER TABLE public.videos
ADD COLUMN IF NOT EXISTS category_id INTEGER REFERENCES public.lang_categories(id) ON DELETE SET NULL;

-- 2. 인덱스 생성 (카테고리별 영상 조회 성능 향상)
CREATE INDEX IF NOT EXISTS idx_videos_category_id ON public.videos(category_id);

-- 3. 기존 channel_id 컬럼 제거 (옵션 - 필요시 주석 해제)
-- ALTER TABLE public.videos DROP COLUMN IF EXISTS channel_id;

COMMENT ON COLUMN public.videos.category_id IS '영상이 속한 카테고리 (user_categories 테이블 참조)';
