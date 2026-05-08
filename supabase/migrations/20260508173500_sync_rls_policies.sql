-- 모든 접근을 차단하고 서버(Admin Client)만 허용하는 가장 안전한 설정

-- 1. 사용자 상호작용 테이블 (user_sentence_interactions)
ALTER TABLE public.user_sentence_interactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access" ON public.user_sentence_interactions;
DROP POLICY IF EXISTS "Users can manage their own interactions" ON public.user_sentence_interactions;

-- 2. 번들 관련 테이블 (Bundles)
ALTER TABLE public.bundle_category ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bundle ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bundle_items ENABLE ROW LEVEL SECURITY;

-- 혹시 존재할지 모르는 모든 정책 제거 (Private 상태로 전환)
DROP POLICY IF EXISTS "Allow public read" ON public.bundle_category;
DROP POLICY IF EXISTS "Allow public read" ON public.bundle;
DROP POLICY IF EXISTS "Allow public read" ON public.bundle_items;

-- 3. 설명 추가
COMMENT ON TABLE public.user_sentence_interactions IS '사용자 상호작용 데이터 (RLS 활성화, 정책 없음 = 서버 API 전용)';
