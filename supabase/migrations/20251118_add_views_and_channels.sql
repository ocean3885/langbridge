-- 조회수 및 채널 기능 추가 마이그레이션

-- 1. videos 테이블에 조회수 컬럼 추가
ALTER TABLE public.videos
ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0 NOT NULL;

-- 2. video_channels 테이블 생성
CREATE TABLE IF NOT EXISTS public.video_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_name TEXT NOT NULL,
  channel_url TEXT,
  channel_description TEXT,
  thumbnail_url TEXT,
  language_id INTEGER REFERENCES public.languages(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(channel_name, language_id)
);

-- 3. videos 테이블에 channel_id 추가
ALTER TABLE public.videos
ADD COLUMN IF NOT EXISTS channel_id UUID REFERENCES public.video_channels(id) ON DELETE SET NULL;

-- 4. 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_videos_view_count ON public.videos(view_count DESC);
CREATE INDEX IF NOT EXISTS idx_videos_channel_id ON public.videos(channel_id);
CREATE INDEX IF NOT EXISTS idx_video_channels_language_id ON public.video_channels(language_id);
CREATE INDEX IF NOT EXISTS idx_videos_channel_language ON public.videos(channel_id, language_id);

-- 5. RLS 정책 설정 - video_channels
ALTER TABLE public.video_channels ENABLE ROW LEVEL SECURITY;

-- 모든 사용자 읽기 가능
CREATE POLICY "video_channels_select_all" ON public.video_channels
  FOR SELECT USING (true);

-- 관리자만 생성
CREATE POLICY "video_channels_insert_admin" ON public.video_channels
  FOR INSERT WITH CHECK (
    EXISTS (
    SELECT 1 FROM public.lang_profiles
    WHERE id = auth.uid() AND is_premium = true
    )
  );

-- 관리자만 수정
CREATE POLICY "video_channels_update_admin" ON public.video_channels
  FOR UPDATE USING (
    EXISTS (
    SELECT 1 FROM public.lang_profiles
    WHERE id = auth.uid() AND is_premium = true
    )
  );

-- 관리자만 삭제
CREATE POLICY "video_channels_delete_admin" ON public.video_channels
  FOR DELETE USING (
    EXISTS (
    SELECT 1 FROM public.lang_profiles
    WHERE id = auth.uid() AND is_premium = true
    )
  );

-- 6. video_channels updated_at 트리거
CREATE TRIGGER update_video_channels_updated_at
  BEFORE UPDATE ON public.video_channels
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 7. 조회수 증가 함수 생성
CREATE OR REPLACE FUNCTION public.increment_video_view_count(video_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.videos
  SET view_count = view_count + 1
  WHERE id = video_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. 조회수 증가 함수에 대한 실행 권한 부여
GRANT EXECUTE ON FUNCTION public.increment_video_view_count(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_video_view_count(UUID) TO anon;

-- 9. 언어별 채널별 영상 목록 조회 뷰 (선택사항 - 성능 최적화)
CREATE OR REPLACE VIEW public.videos_by_channel_language AS
SELECT 
  v.id as video_id,
  v.youtube_id,
  v.title,
  v.description,
  v.duration,
  v.thumbnail_url,
  v.view_count,
  v.language_id,
  v.channel_id,
  v.created_at,
  v.updated_at,
  vc.channel_name,
  vc.channel_description,
  l.name_ko as language_name_ko,
  l.name_en as language_name_en,
  (SELECT COUNT(*) FROM public.transcripts WHERE video_id = v.id) as transcript_count
FROM public.videos v
LEFT JOIN public.video_channels vc ON v.channel_id = vc.id
LEFT JOIN public.languages l ON v.language_id = l.id
ORDER BY v.created_at DESC;

-- 뷰에 대한 SELECT 권한 부여
GRANT SELECT ON public.videos_by_channel_language TO authenticated;
GRANT SELECT ON public.videos_by_channel_language TO anon;

COMMENT ON TABLE public.video_channels IS '영상 채널 정보 (언어별 채널 관리)';
COMMENT ON COLUMN public.video_channels.channel_url IS '채널 URL (YouTube 채널 링크 등)';
COMMENT ON COLUMN public.videos.view_count IS '영상 조회수';
COMMENT ON COLUMN public.videos.channel_id IS '영상이 속한 채널';
COMMENT ON FUNCTION public.increment_video_view_count IS '영상 조회수 증가 (공개 호출 가능)';
COMMENT ON VIEW public.videos_by_channel_language IS '언어별 채널별 영상 목록 조회용 뷰';
