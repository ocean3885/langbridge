-- user_profiles 테이블에 표시 언어 설정 컬럼 추가
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS display_language TEXT DEFAULT 'ko';
