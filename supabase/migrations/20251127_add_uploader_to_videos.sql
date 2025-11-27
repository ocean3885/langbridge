-- videos 테이블에 uploader_id 추가

-- 1. uploader_id 컬럼 추가
ALTER TABLE public.videos
ADD COLUMN IF NOT EXISTS uploader_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- 2. 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_videos_uploader_id ON public.videos(uploader_id);

-- 3. RLS 정책 업데이트: 소유자도 수정/삭제 가능하도록 변경
DROP POLICY IF EXISTS "videos_update_admin" ON public.videos;
DROP POLICY IF EXISTS "videos_delete_admin" ON public.videos;

CREATE POLICY "videos_update_owner_or_admin" ON public.videos
  FOR UPDATE USING (
    auth.uid() = uploader_id OR
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid() AND is_super_admin = true
    )
  );

CREATE POLICY "videos_delete_owner_or_admin" ON public.videos
  FOR DELETE USING (
    auth.uid() = uploader_id OR
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid() AND is_super_admin = true
    )
  );

COMMENT ON COLUMN public.videos.uploader_id IS '영상을 업로드한 사용자 ID';
