import { redirect } from 'next/navigation';
import { getAppUserFromServer, getDisplayLanguage } from '@/lib/auth/app-user';
import { getUserWords } from '@/lib/supabase/services/user-words';
import { listWordUsageDetails } from '@/lib/supabase/services/word-sentence-map';
import WordsProgressClient from './WordsProgressClient';

export const dynamic = 'force-dynamic';

export default async function WordsProgressPage() {
  const [user, language] = await Promise.all([getAppUserFromServer(), getDisplayLanguage()]);
  if (!user) redirect('/auth/sign-in?redirectTo=/learn/progress/words');

  const data = await getUserWords(user.id);
  const usageDetails = await listWordUsageDetails(data.words.map(word => word.wordId));

  return <WordsProgressClient initialData={data} usageDetails={usageDetails} language={language} />;
}
