-- 외래 키 오류 수정을 위한 마이그레이션
-- 기존 마이그레이션이 이미 적용되어 무시되는 문제를 해결하기 위해,
-- 기존 테이블의 구조를 강제로 수정하는 스크립트입니다.

-- 1. 잘못된 외래 키 제약 조건(auth.users를 바라보던 제약) 삭제
ALTER TABLE public.user_sentence_interactions 
DROP CONSTRAINT IF EXISTS user_sentence_interactions_user_id_fkey;

-- 2. user_id의 데이터 타입을 uuid에서 text로 변경
-- 기존 데이터가 있다면 문자열로 변환합니다.
ALTER TABLE public.user_sentence_interactions 
ALTER COLUMN user_id TYPE text USING user_id::text;

-- 3. 올바른 커스텀 인증 테이블(auth_users)을 바라보도록 새 외래 키 설정
ALTER TABLE public.user_sentence_interactions 
ADD CONSTRAINT user_sentence_interactions_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.auth_users(id) ON DELETE CASCADE;
