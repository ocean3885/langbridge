-- 1. 번들 카테고리 테이블
CREATE TABLE bundle_category (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 번들 테이블 (특정 동사나 주제 중심의 학습 묶음)
CREATE TABLE bundle (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID REFERENCES bundle_category(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    level INTEGER DEFAULT 1, -- 1: 입문, 2: 초급...
    thumbnail_url TEXT,
    is_published BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. 번들 아이템 매핑 테이블 (N:M 관계 및 학습 순서 관리)
CREATE TABLE bundle_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bundle_id UUID NOT NULL REFERENCES bundle(id) ON DELETE CASCADE,
    word_id UUID REFERENCES words(id) ON DELETE CASCADE,
    sentence_id UUID REFERENCES sentences(id) ON DELETE CASCADE,
    order_index INTEGER NOT NULL DEFAULT 0,
    
    -- 제약 조건: 하나의 아이템은 단어 혹은 문장 중 최소 하나를 가져야 함
    CONSTRAINT item_must_have_content CHECK (
        (word_id IS NOT NULL) OR (sentence_id IS NOT NULL)
    ),
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX idx_bundle_category_id ON bundle(category_id);
CREATE INDEX idx_bundle_items_bundle_id ON bundle_items(bundle_id);
CREATE INDEX idx_bundle_items_order ON bundle_items(order_index);

-- 트리거 적용
-- Note: update_updated_at_column function is assumed to be existing or created here if not exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_bundle_category_modtime 
    BEFORE UPDATE ON bundle_category 
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_bundle_modtime 
    BEFORE UPDATE ON bundle 
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
