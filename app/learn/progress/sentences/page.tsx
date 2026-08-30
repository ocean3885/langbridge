import { redirect } from 'next/navigation';
import { getAppUserFromServer, getDisplayLanguage } from '@/lib/auth/app-user';
import { getUserSentences } from '@/lib/supabase/services/user-sentences';
import SentencesProgressClient from './SentencesProgressClient';

export const dynamic = 'force-dynamic';

export default async function SentencesProgressPage() {
  const [user, language] = await Promise.all([getAppUserFromServer(), getDisplayLanguage()]);
  if (!user) redirect('/auth/sign-in?redirectTo=/learn/progress/sentences');
  const data = await getUserSentences(user.id);
  return <SentencesProgressClient initialData={data} language={language} />;
}
