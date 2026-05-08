-- Create admin_drafts table for storing cross-device session data
CREATE TABLE IF NOT EXISTS public.admin_drafts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT REFERENCES public.auth_users(id) ON DELETE CASCADE NOT NULL,
    type TEXT NOT NULL,
    data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS 활성화 (정책은 추가하지 않아 Service Role 전용으로 설정)
ALTER TABLE public.admin_drafts ENABLE ROW LEVEL SECURITY;

-- 인덱스 설정
CREATE INDEX IF NOT EXISTS idx_admin_drafts_user_type ON public.admin_drafts(user_id, type);
