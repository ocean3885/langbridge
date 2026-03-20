import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getAppUserFromServer } from '@/lib/auth/app-user';
import { isSuperAdminSqlite } from '@/lib/auth/super-admin';
import { listSqliteLanguagesByEnglishName } from '@/lib/sqlite/languages';
import LanguagesManager from './LanguagesManager';
import AdminSidebar from '../AdminSidebar';

export default async function LanguagesPage() {
  const supabase = await createClient();
  
  // 인증 확인
  const user = await getAppUserFromServer(supabase);
  
  if (!user) {
    redirect('/auth/login?redirectTo=/admin/languages');
  }
  
  // 운영자 확인
  const isSuperAdmin = await isSuperAdminSqlite({ userId: user.id, email: user.email ?? null });
  
  if (!isSuperAdmin) {
    redirect('/');
  }
  
  const languages = await listSqliteLanguagesByEnglishName();
  
  return (
    <>
      <AdminSidebar userEmail={user.email ?? ''} />
      <LanguagesManager initialLanguages={languages.map((language) => ({
        id: language.id,
        name_en: language.name_en ?? '',
        name_ko: language.name_ko,
        code: language.code,
      }))} />
    </>
  );
}
