import { redirect } from 'next/navigation';
import { getAppUserFromServer, getDisplayLanguage } from '@/lib/auth/app-user';
import { isSuperAdmin } from '@/lib/auth/super-admin';
import { listSentences } from '@/lib/supabase/services/sentences';
import SentencesManager, { Sentence, Language } from './SentencesManager';
import AdminSidebar from '../AdminSidebar';

export default async function SentencesPage() {
  // 인증 확인
  const user = await getAppUserFromServer();
  const lang = await getDisplayLanguage();
  
  if (!user) {
    redirect('/auth/login?redirectTo=/admin/sentences');
  }
  
  // 운영자 확인
  const isAdminUser = await isSuperAdmin({ userId: user.id, email: user.email ?? null });
  
  if (!isAdminUser) {
    redirect('/');
  }
  
  const sbSentences = await listSentences();
  const sentences: Sentence[] = sbSentences.map((sentence) => ({
    id: sentence.id,
    sentence: sentence.sentence,
    translation: sentence.translation,
    translation_en: sentence.translation_en ?? null,
    audio_url: sentence.audio_url,
    word_count: sentence.word_count,
    bundle_count: sentence.bundle_count,
    languages: undefined,
  }));
  
  return (
    <>
      <AdminSidebar userEmail={user.email ?? ''} language={lang} />
      <SentencesManager initialSentences={sentences} languages={[]} />
    </>
  );
}
