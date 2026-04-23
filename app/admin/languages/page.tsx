import { redirect } from 'next/navigation';
import { getAppUserFromServer } from '@/lib/auth/app-user';
import { isSuperAdmin } from '@/lib/auth/super-admin';
import { listLanguagesByEnglishName } from '@/lib/supabase/services/languages';
import LanguagesManager from './LanguagesManager';
import AdminSidebar from '../AdminSidebar';

export default async function LanguagesPage() {
  // 인증 확인
  const user = await getAppUserFromServer();
  
  if (!user) {
    redirect('/auth/login?redirectTo=/admin/languages');
  }
  
  // 운영자 확인
  const isAdminUser = await isSuperAdmin({ userId: user.id, email: user.email ?? null });
  
  if (!isAdminUser) {
    redirect('/');
  }
  
  const languages = await listLanguagesByEnglishName();
  
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
