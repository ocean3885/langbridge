import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import LanguagesManager from './LanguagesManager';
import AdminSidebar from '../AdminSidebar';

export default async function LanguagesPage() {
  const supabase = await createClient();
  
  // 인증 확인
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect('/auth/login?redirectTo=/admin/languages');
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
