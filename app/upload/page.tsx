// langbridge/app/upload/page.tsx
import { listSqliteCategories } from '@/lib/sqlite/categories';
import { listSqliteLanguages } from '@/lib/sqlite/languages';
import { getAppUserFromServer } from '@/lib/auth/app-user';
import { isSuperAdminSqlite } from '@/lib/auth/super-admin';
import { redirect } from 'next/navigation';
import UploadTabs from './UploadTabs';

export default async function UploadPage() {
  // 사용자 인증 확인 (SQLite 세션 쿠키)
  const user = await getAppUserFromServer();

  // 로그인하지 않은 사용자는 로그인 페이지로 리다이렉트
  if (!user) {
    redirect('/auth/login?redirectTo=/upload');
  }

  const audioCategories = await listSqliteCategories('lang_categories', user.id);
  const videoCategories = await listSqliteCategories('user_categories', user.id);

  const languages = await listSqliteLanguages();
  const isSuperAdmin = await isSuperAdminSqlite({ userId: user.id, email: user.email ?? null });

  return (
    <UploadTabs
      audioCategories={audioCategories || []}
      videoCategories={videoCategories || []}
      initialLanguages={languages}
      canSelectVideoVisibility={isSuperAdmin}
      isAdmin={isSuperAdmin}
    />
  );
}