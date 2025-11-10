import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import WordsManager from './WordsManager';
import AdminSidebar from '../AdminSidebar';

export default async function WordsPage() {
  const supabase = await createClient();
  
  // 인증 확인
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect('/auth/login?redirectTo=/admin/words');
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
  
  // 단어 목록 조회 (언어 정보와 함께)
  const { data: words, error } = await supabase
    .from('words')
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
    console.error('단어 조회 오류:', error);
  }
  
  return (
    <>
      <AdminSidebar userEmail={user.email ?? ''} />
      <WordsManager initialWords={words || []} languages={languages || []} />
    </>
  );
}
