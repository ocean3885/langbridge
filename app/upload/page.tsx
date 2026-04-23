// langbridge/app/upload/page.tsx
import { listCategories } from '@/lib/supabase/services/categories';
import { listLanguages } from '@/lib/supabase/services/languages';
import { getAppUserFromServer } from '@/lib/auth/app-user';
import { isSuperAdmin } from '@/lib/auth/super-admin';
import { redirect } from 'next/navigation';
import UploadTabs from './UploadTabs';

export default async function UploadPage() {
  // 사용자 인증 확인
  const user = await getAppUserFromServer();

  // 로그인하지 않은 사용자는 로그인 페이지로 리다이렉트
  if (!user) {
    redirect('/auth/login?redirectTo=/upload');
  }

  const audioCategories = await listCategories('lang_categories', user.id);
  const videoCategories = await listCategories('user_categories', user.id);

  const languages = await listLanguages();
  const isAdminUser = await isSuperAdmin({ userId: user.id, email: user.email ?? null });

  return (
    <UploadTabs
      audioCategories={audioCategories || []}
      videoCategories={videoCategories || []}
      initialLanguages={languages}
      canSelectVideoVisibility={isAdminUser}
      isAdmin={isAdminUser}
    />
  );
}