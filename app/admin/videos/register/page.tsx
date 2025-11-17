import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import AdminSidebar from '../../AdminSidebar';
import RegisterVideoForm from './RegisterVideoForm';

export default async function RegisterVideoPage() {
  const supabase = await createClient();
  
  // 인증 확인
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect('/auth/login?redirectTo=/admin/videos/register');
  }
  
  // is_premium 확인
  const { data: profile } = await supabase
    .from('lang_profiles')
    .select('is_premium')
    .eq('id', user.id)
    .single();
  
  if (!profile?.is_premium) {
    redirect('/');
  }

  return (
    <>
      <AdminSidebar userEmail={user.email ?? ''} />
      <RegisterVideoForm />
    </>
  );
}
