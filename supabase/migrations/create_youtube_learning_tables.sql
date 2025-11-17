-- YouTube 영상 학습 기능을 위한 테이블 생성

-- 1. videos 테이블: 영상 메타데이터
CREATE TABLE IF NOT EXISTS public.videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  youtube_id TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  duration INTEGER, -- 영상 총 길이 (초)
  thumbnail_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. transcripts 테이블: 스크립트 원문
CREATE TABLE IF NOT EXISTS public.transcripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  start NUMERIC(10, 2) NOT NULL, -- 시작 시간 (초)
  duration NUMERIC(10, 2) NOT NULL, -- 지속 시간 (초)
  text_original TEXT NOT NULL, -- 원문 텍스트
  order_index INTEGER NOT NULL, -- 문장 순서
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(video_id, order_index)
);

-- 3. translations 테이블: 스크립트 번역
CREATE TABLE IF NOT EXISTS public.translations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transcript_id UUID NOT NULL REFERENCES public.transcripts(id) ON DELETE CASCADE,
  lang TEXT NOT NULL DEFAULT 'ko', -- 번역 언어 코드
  text_translated TEXT NOT NULL, -- 번역된 텍스트
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(transcript_id, lang)
);

-- 4. user_notes 테이블: 사용자 메모
CREATE TABLE IF NOT EXISTS public.user_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  transcript_id UUID REFERENCES public.transcripts(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, video_id, transcript_id)
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_transcripts_video_id ON public.transcripts(video_id);
CREATE INDEX IF NOT EXISTS idx_transcripts_order ON public.transcripts(video_id, order_index);
CREATE INDEX IF NOT EXISTS idx_translations_transcript_id ON public.translations(transcript_id);
CREATE INDEX IF NOT EXISTS idx_user_notes_user_video ON public.user_notes(user_id, video_id);
CREATE INDEX IF NOT EXISTS idx_user_notes_transcript ON public.user_notes(transcript_id);

-- RLS 정책 설정

-- videos: 모든 사용자 읽기 가능, 관리자만 쓰기 가능
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "videos_select_all" ON public.videos
  FOR SELECT USING (true);

CREATE POLICY "videos_insert_admin" ON public.videos
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.lang_profiles
      WHERE id = auth.uid() AND is_premium = true
    )
  );

CREATE POLICY "videos_update_admin" ON public.videos
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.lang_profiles
      WHERE id = auth.uid() AND is_premium = true
    )
  );

CREATE POLICY "videos_delete_admin" ON public.videos
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.lang_profiles
      WHERE id = auth.uid() AND is_premium = true
    )
  );

-- transcripts: 모든 사용자 읽기 가능, 관리자만 쓰기 가능
ALTER TABLE public.transcripts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "transcripts_select_all" ON public.transcripts
  FOR SELECT USING (true);

CREATE POLICY "transcripts_insert_admin" ON public.transcripts
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.lang_profiles
      WHERE id = auth.uid() AND is_premium = true
    )
  );

CREATE POLICY "transcripts_update_admin" ON public.transcripts
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.lang_profiles
      WHERE id = auth.uid() AND is_premium = true
    )
  );

CREATE POLICY "transcripts_delete_admin" ON public.transcripts
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.lang_profiles
      WHERE id = auth.uid() AND is_premium = true
    )
  );

-- translations: 모든 사용자 읽기 가능, 관리자만 쓰기 가능
ALTER TABLE public.translations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "translations_select_all" ON public.translations
  FOR SELECT USING (true);

CREATE POLICY "translations_insert_admin" ON public.translations
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.lang_profiles
      WHERE id = auth.uid() AND is_premium = true
    )
  );

CREATE POLICY "translations_update_admin" ON public.translations
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.lang_profiles
      WHERE id = auth.uid() AND is_premium = true
    )
  );

CREATE POLICY "translations_delete_admin" ON public.translations
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.lang_profiles
      WHERE id = auth.uid() AND is_premium = true
    )
  );

-- user_notes: 본인 데이터만 CRUD 가능
ALTER TABLE public.user_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_notes_select_own" ON public.user_notes
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "user_notes_insert_own" ON public.user_notes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_notes_update_own" ON public.user_notes
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "user_notes_delete_own" ON public.user_notes
  FOR DELETE USING (auth.uid() = user_id);

-- updated_at 자동 업데이트 트리거 함수
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- videos 테이블 트리거
CREATE TRIGGER update_videos_updated_at
  BEFORE UPDATE ON public.videos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- user_notes 테이블 트리거
CREATE TRIGGER update_user_notes_updated_at
  BEFORE UPDATE ON public.user_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
