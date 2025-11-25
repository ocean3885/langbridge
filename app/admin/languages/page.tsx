import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import LanguagesManager from './LanguagesManager';
import AdminSidebar from '../AdminSidebar';

export default async function LanguagesPage() {
  const supabase = await createClient();
  
  // 인증 확인
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect('/auth/login?redirectTo=/admin/languages');
  }
  
  // 운영자 확인
  const admin = createAdminClient();
  const { data: isSuperAdmin } = await admin.rpc('get_user_is_super_admin', {
    user_id: user.id
  });
  
  if (!isSuperAdmin) {
    redirect('/');
  }
  
  // 언어 목록 조회
  const { data: languages, error } = await supabase
    .from('languages')
    .select('*')
    .order('name_en', { ascending: true });
  
  if (error) {
    console.error('언어 조회 오류:', error);
  }
  
  return (
    <>
      <AdminSidebar userEmail={user.email ?? ''} />
      <LanguagesManager initialLanguages={languages || []} />
    </>
  );
}
