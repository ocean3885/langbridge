-- Super Admin 확인 함수 생성

-- get_user_is_super_admin 함수 생성
-- auth.users.is_super_admin 컬럼을 확인하여 운영자 여부를 반환
CREATE OR REPLACE FUNCTION public.get_user_is_super_admin(user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  is_admin BOOLEAN;
BEGIN
  -- auth.users 테이블에서 is_super_admin 컬럼 조회
  SELECT is_super_admin INTO is_admin
  FROM auth.users
  WHERE id = user_id;
  
  -- NULL인 경우 FALSE 반환
  RETURN COALESCE(is_admin, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 함수 실행 권한 부여
GRANT EXECUTE ON FUNCTION public.get_user_is_super_admin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_is_super_admin(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_user_is_super_admin(UUID) TO anon;

-- 함수에 대한 설명 추가
COMMENT ON FUNCTION public.get_user_is_super_admin IS 'auth.users.is_super_admin 값을 확인하여 사용자가 super admin인지 여부를 반환';
