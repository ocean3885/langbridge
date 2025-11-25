import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import AdminSidebar from '../../AdminSidebar';
import RegisterVideoForm from './RegisterVideoForm';

export default async function RegisterVideoPage() {
  const supabase = await createClient();
  
  // 인증 확인
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect('/auth/login?redirectTo=/admin/videos/register');
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
      <RegisterVideoForm />
    </>
  );
}
