// langbridge/app/upload/page.tsx
import { createClient } from '@/lib/supabase/server';
import { listSqliteCategories } from '@/lib/sqlite/categories';
import { listSqliteLanguages } from '@/lib/sqlite/languages';
import { getAppUserFromServer } from '@/lib/auth/app-user';
import UploadTabs from './UploadTabs';

export default async function UploadPage() {
  const supabase = await createClient();
  
  // 사용자 인증 확인 (Supabase 세션 또는 SQLite 세션 쿠키)
  const user = await getAppUserFromServer(supabase);
  
  // 로그인하지 않은 사용자는 로그인 페이지로 리다이렉트
  if (!user) {
    const { redirect } = await import('next/navigation');
    redirect('/auth/login?redirectTo=/upload');
  }
  
  let audioCategories = await listSqliteCategories('lang_categories', user.id);
  let videoCategories = await listSqliteCategories('user_categories', user.id);

  const languages = await listSqliteLanguages();

  return (
    <UploadTabs
      audioCategories={audioCategories || []}
      videoCategories={videoCategories || []}
      initialLanguages={languages}
    />
  );
}