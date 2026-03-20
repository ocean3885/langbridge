import { redirect } from 'next/navigation';
import { getAppUserFromServer } from '@/lib/auth/app-user';
import { isSuperAdminSqlite } from '@/lib/auth/super-admin';
import { listSqliteLanguagesByEnglishName } from '@/lib/sqlite/languages';
import { listSentencesSqlite } from '@/lib/sqlite/sentences';
import SentencesManager from './SentencesManager';
import AdminSidebar from '../AdminSidebar';

function safeParseMappingDetails(raw: string | null): Record<string, unknown> | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed === 'object' && parsed !== null) {
      return parsed as Record<string, unknown>;
    }
    return null;
  } catch {
    return null;
  }
}

export default async function SentencesPage() {
  // 인증 확인
  const user = await getAppUserFromServer();
  
  if (!user) {
    redirect('/auth/login?redirectTo=/admin/sentences');
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
  const sqliteSentences = await listSentencesSqlite();
  const sentences = sqliteSentences.map((sentence) => ({
    id: sentence.id,
    language_id: sentence.language_id,
    text: sentence.text,
    translation_ko: sentence.translation_ko,
    audio_path: sentence.audio_path,
    context_category: sentence.context_category,
    mapping_details: safeParseMappingDetails(sentence.mapping_details),
    languages: languageMap.get(sentence.language_id),
  }));
  
  return (
    <>
      <AdminSidebar userEmail={user.email ?? ''} />
      <SentencesManager initialSentences={sentences} languages={languages} />
    </>
  );
}
