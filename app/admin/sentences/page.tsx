import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import SentencesManager from './SentencesManager';
import AdminSidebar from '../AdminSidebar';

export default async function SentencesPage() {
  const supabase = await createClient();
  
  // 인증 확인
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect('/auth/login?redirectTo=/admin/sentences');
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
  
  // 문장 목록 조회 (언어 정보와 함께)
  const { data: sentences, error } = await supabase
    .from('sentences')
    .select(`
      *,
      languages:language_id (
        id,
        name_en,
        name_ko,
        code
      )
    `)
    .order('id', { ascending: false });
  
  // 언어 목록 조회
  const { data: languages } = await supabase
    .from('languages')
    .select('*')
    .order('name_en', { ascending: true });
  
  if (error) {
    console.error('문장 조회 오류:', error);
  }
  
  return (
    <>
      <AdminSidebar userEmail={user.email ?? ''} />
      <SentencesManager initialSentences={sentences || []} languages={languages || []} />
    </>
  );
}
