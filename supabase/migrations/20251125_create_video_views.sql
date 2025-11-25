-- video_views 테이블 생성 (사용자별 영상 시청 기록)

-- 1. video_views 테이블 생성
CREATE TABLE IF NOT EXISTS public.video_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  view_count INTEGER DEFAULT 1 NOT NULL,
  last_viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, video_id)
);

-- 2. 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_video_views_user_id ON public.video_views(user_id);
CREATE INDEX IF NOT EXISTS idx_video_views_video_id ON public.video_views(video_id);
CREATE INDEX IF NOT EXISTS idx_video_views_last_viewed ON public.video_views(last_viewed_at DESC);
CREATE INDEX IF NOT EXISTS idx_video_views_user_last_viewed ON public.video_views(user_id, last_viewed_at DESC);

-- 3. RLS 정책 설정
ALTER TABLE public.video_views ENABLE ROW LEVEL SECURITY;

-- 본인의 시청 기록만 조회
CREATE POLICY "video_views_select_own" ON public.video_views
  FOR SELECT USING (auth.uid() = user_id);

-- 본인의 시청 기록만 생성
CREATE POLICY "video_views_insert_own" ON public.video_views
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 본인의 시청 기록만 수정
CREATE POLICY "video_views_update_own" ON public.video_views
  FOR UPDATE USING (auth.uid() = user_id);

-- 본인의 시청 기록만 삭제
CREATE POLICY "video_views_delete_own" ON public.video_views
  FOR DELETE USING (auth.uid() = user_id);

-- 4. 시청 기록 추가/업데이트 함수 (upsert)
CREATE OR REPLACE FUNCTION public.record_video_view(
  p_user_id UUID,
  p_video_id UUID
)
RETURNS void AS $$
BEGIN
  INSERT INTO public.video_views (user_id, video_id, view_count, last_viewed_at)
  VALUES (p_user_id, p_video_id, 1, NOW())
  ON CONFLICT (user_id, video_id)
  DO UPDATE SET
    view_count = public.video_views.view_count + 1,
    last_viewed_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. 함수 실행 권한 부여
GRANT EXECUTE ON FUNCTION public.record_video_view(UUID, UUID) TO authenticated;

-- 6. 설명 추가
COMMENT ON TABLE public.video_views IS '사용자별 영상 시청 기록 (시청 횟수 및 마지막 시청 시간)';
COMMENT ON COLUMN public.video_views.view_count IS '해당 사용자의 영상 시청 횟수';
COMMENT ON COLUMN public.video_views.last_viewed_at IS '마지막으로 영상을 시청한 시간';
COMMENT ON FUNCTION public.record_video_view IS '영상 시청 기록 추가 또는 업데이트 (시청 횟수 증가)';
