-- 1. bundle_type 테이블 생성
CREATE TABLE public.bundle_type (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. bundle 테이블에 type_id 칼럼 추가 및 외래키 설정
ALTER TABLE public.bundle ADD COLUMN type_id UUID REFERENCES public.bundle_type(id) ON DELETE SET NULL;

-- 3. RLS 활성화 (보안 강화)
-- 현재 프로젝트 패턴에 맞춰 정책 없이 RLS만 활성화하여 서버(Service Role) 전용으로 설정
ALTER TABLE public.bundle_type ENABLE ROW LEVEL SECURITY;

-- 4. 기본 타입 데이터 삽입 (초기 데이터)
INSERT INTO public.bundle_type (name, code, description) VALUES 
('문장 학습형', 'sentence_focus', '문장과 번역을 중심으로 학습하는 기본 레이아웃'),
('단어 집중형', 'word_focus', '단어 카드와 뜻풀이를 중심으로 학습하는 레이아웃'),
('회화 실습형', 'conversation', '대화문과 오디오를 중심으로 실습하는 레이아웃');

-- 5. 인덱스 생성
CREATE INDEX idx_bundle_type_id ON public.bundle(type_id);

-- 6. 테이블 설명 추가
COMMENT ON TABLE public.bundle_type IS '번들의 학습 레이아웃 타입을 정의하는 테이블 (RLS 활성화, 서버 전용)';
