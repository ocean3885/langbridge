// langbridge/app/upload/page.tsx
import { createClient } from '@/lib/supabase/server';
import UploadTabs from './UploadTabs';

export default async function UploadPage() {
  const supabase = await createClient();
  
  // 사용자 인증 확인
  const { data: { user } } = await supabase.auth.getUser();
  
  // 로그인하지 않은 사용자는 로그인 페이지로 리다이렉트
  if (!user) {
    const { redirect } = await import('next/navigation');
    redirect('/auth/login?redirectTo=/upload');
  }
  
  // 카테고리 목록 가져오기 (오디오용 - lang_categories)
  const { data: audioCategories, error: categoryError } = await supabase
    .from('lang_categories')
    .select('*')
    .eq('user_id', user!.id)
    .order('name', { ascending: true });

  if (categoryError) {
    console.error('오디오 카테고리 로드 오류:', categoryError);
  }

  // 비디오용 카테고리 가져오기 (user_categories)
  const { data: videoCategories, error: videoCategoryError } = await supabase
    .from('user_categories')
    .select('id, name, language_id, user_id, created_at')
    .eq('user_id', user!.id)
    .order('name', { ascending: true });

  if (videoCategoryError) {
    console.error('비디오 카테고리 로드 오류:', videoCategoryError);
  }

  // 언어 목록 가져오기
  const { data: languages, error: languagesError } = await supabase
    .from('languages')
    .select('id, name_ko, code')
    .order('name_ko', { ascending: true });

  if (languagesError) {
    console.error('언어 로드 오류:', languagesError);
  }

  return (
    <UploadTabs
      audioCategories={audioCategories || []}
      videoCategories={videoCategories || []}
      initialLanguages={languages || []}
    />
  );
}