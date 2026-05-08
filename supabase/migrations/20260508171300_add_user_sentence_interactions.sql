-- Create user_sentence_interactions table
CREATE TABLE IF NOT EXISTS public.user_sentence_interactions (
    -- 1. 기본 식별자 및 관계
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    -- 프로젝트 커스텀 인증 테이블(auth_users)은 id가 TEXT 타입이므로 동일하게 맞춤
    user_id TEXT REFERENCES public.auth_users(id) ON DELETE CASCADE NOT NULL,
    sentence_id bigint REFERENCES public.sentences(id) ON DELETE CASCADE NOT NULL,

    -- 2. 개인화 기능 (핀 & 메모)
    is_pinned boolean DEFAULT false,
    memo text,

    -- 3. 학습 숙련도 및 통계 (Proficiency)
    -- 0: 미학습, 1: 인지, 2: 단기기억, 3: 중기기억, 4: 장기기억, 5: 마스터
    proficiency_level integer DEFAULT 0 CHECK (proficiency_level >= 0 AND proficiency_level <= 5),
    correct_count integer DEFAULT 0,
    incorrect_count integer DEFAULT 0,
    streak_count integer DEFAULT 0, -- 연속 정답 횟수 (레벨업 판단 근거)
    last_reviewed_at timestamp with time zone,

    -- 4. 메타데이터
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,

    -- 한 사용자가 동일 문장에 대해 중복 레코드를 갖지 않도록 보장
    UNIQUE(user_id, sentence_id)
);

-- 인덱스 설정 (성능 최적화)
-- 핀 고정된 문장 조회용
CREATE INDEX IF NOT EXISTS idx_user_interactions_pinned ON public.user_sentence_interactions(user_id) WHERE is_pinned = true;
-- 유저별 전체 조회용
CREATE INDEX IF NOT EXISTS idx_user_interactions_user_id ON public.user_sentence_interactions(user_id);

-- Row Level Security 설정 (보안 강화)
ALTER TABLE public.user_sentence_interactions ENABLE ROW LEVEL SECURITY;

-- updated_at 자동 업데이트 트리거 함수
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 트리거 적용
DROP TRIGGER IF EXISTS update_user_sentence_interactions_updated_at ON public.user_sentence_interactions;
CREATE TRIGGER update_user_sentence_interactions_updated_at
    BEFORE UPDATE ON public.user_sentence_interactions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 테이블 및 컬럼 설명 추가
COMMENT ON TABLE public.user_sentence_interactions IS '사용자별 문장 학습 상호작용 데이터 (핀, 메모, 숙련도)';
COMMENT ON COLUMN public.user_sentence_interactions.proficiency_level IS '학습 숙련도 (0:미학습 ~ 5:마스터)';
COMMENT ON COLUMN public.user_sentence_interactions.streak_count IS '연속 정답 횟수 (레벨업 판단 기준)';
