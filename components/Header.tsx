import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import HeaderClient from '@/components/HeaderClient';

export default async function Header() {
  const supabase = await createClient();

  // SSR에서 사용자와 프로필을 조회해 깜빡임 없이 상태 고정
  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user ?? null;

  // 운영자 여부: auth.users 테이블의 is_super_admin 컬럼 사용
  let isSuperAdmin = false;
  if (user) {
    try {
      const admin = createAdminClient();
      const { data, error } = await admin.rpc('get_user_is_super_admin', {
        user_id: user.id
      });
      
      if (!error && data) {
        isSuperAdmin = true;
      }
    } catch (e) {
      console.error('Failed to check admin status:', e);
    }
  }

  return (
    <HeaderClient
      isLoggedIn={!!user}
      userEmail={user?.email ?? null}
      // HeaderClient는 기존 prop 이름을 사용하므로 그대로 전달
      isAdmin={isSuperAdmin}
    />
  );
}