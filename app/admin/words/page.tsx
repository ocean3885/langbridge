import { redirect } from 'next/navigation';
import { getAppUserFromServer } from '@/lib/auth/app-user';
import { isSuperAdmin } from '@/lib/auth/super-admin';
import { listLanguages } from '@/lib/supabase/services/languages';
import { listWords } from '@/lib/supabase/services/words';
import WordsManager, { Word, Language } from './WordsManager';
import AdminSidebar from '../AdminSidebar';

export default async function WordsPage() {
  // 인증 확인
  const user = await getAppUserFromServer();
  
  if (!user) {
    redirect('/auth/login?redirectTo=/admin/words');
  }
  
  // 운영자 확인
  const isAdminUser = await isSuperAdmin({ userId: user.id, email: user.email ?? null });
  
  if (!isAdminUser) {
    redirect('/');
  }
  
  const sbLanguages = await listLanguages();
  const languages: Language[] = sbLanguages.map((language) => ({
    id: language.id,
    name_en: language.name_en ?? '',
    name_ko: language.name_ko,
    code: language.code,
  }));

  const languageMap = new Map(languages.map((l) => [l.code, l]));
  const sbWords = await listWords();
  const words: Word[] = sbWords.map((word) => ({
    ...word,
    languages: languageMap.get(word.lang_code),
  }));
  
  return (
    <>
      <AdminSidebar userEmail={user.email ?? ''} />
      <WordsManager initialWords={words} languages={languages} />
    </>
  );
}
