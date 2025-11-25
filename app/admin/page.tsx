import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import AdminDashboard from './AdminDashboard';
import AdminSidebar from './AdminSidebar';

export default async function AdminPage() {
  const supabase = await createClient();
  
  // 인증 확인
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect('/auth/login?redirectTo=/admin');
  }
  
  // 운영자 확인
  const admin = createAdminClient();
  const { data: isSuperAdmin } = await admin.rpc('get_user_is_super_admin', {
    user_id: user.id
  });
  
  if (!isSuperAdmin) {
    redirect('/');
  }
  
  return (
    <>
      <AdminSidebar userEmail={user.email ?? ''} />
      <AdminDashboard />
    </>
  );
}
