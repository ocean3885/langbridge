import { redirect } from 'next/navigation';
import { getAppUserFromServer } from '@/lib/auth/app-user';
import { isSuperAdminSqlite } from '@/lib/auth/super-admin';
import { listSqliteLanguagesByEnglishName } from '@/lib/sqlite/languages';
import { listWordsSqlite } from '@/lib/sqlite/words';
import WordsManager from './WordsManager';
import AdminSidebar from '../AdminSidebar';

export default async function WordsPage() {
  // 인증 확인
  const user = await getAppUserFromServer();
  
  if (!user) {
    redirect('/auth/login?redirectTo=/admin/words');
  }
  
  // 운영자 확인
  const isSuperAdmin = await isSuperAdminSqlite({ userId: user.id, email: user.email ?? null });
  
  if (!isSuperAdmin) {
    redirect('/');
  }
  
  const sqliteLanguages = await listSqliteLanguagesByEnglishName();
  const languages = sqliteLanguages.map((language) => ({
    id: language.id,
    name_en: language.name_en ?? '',
    name_ko: language.name_ko,
    code: language.code,
  }));

  const languageMap = new Map(languages.map((l) => [l.id, l]));
  const sqliteWords = await listWordsSqlite();
  const words = sqliteWords.map((word) => ({
    id: word.id,
    language_id: word.language_id,
    text: word.text,
    meaning_ko: word.meaning_ko,
    level: word.level,
    part_of_speech: word.part_of_speech,
    languages: languageMap.get(word.language_id),
  }));
  
  return (
    <>
      <AdminSidebar userEmail={user.email ?? ''} />
      <WordsManager initialWords={words} languages={languages} />
    </>
  );
}
