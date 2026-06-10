import { redirect } from 'next/navigation';
import { getAppUserFromServer, getDisplayLanguage } from '@/lib/auth/app-user';
import { getReviewWords } from '@/lib/supabase/services/bundle-progress';
import WordsReviewClient from './WordsReviewClient';

export const dynamic = 'force-dynamic';

export default async function WordsReviewPage() {
  const user = await getAppUserFromServer();
  if (!user) {
    redirect('/auth/sign-in?redirectTo=/learn/review/words');
  }

  const language = await getDisplayLanguage();
  const reviewItems = await getReviewWords(user.id, 40); // Fetch up to 40 candidates for user selection (5, 10, 20)

  return (
    <WordsReviewClient
      initialItems={reviewItems}
      language={language}
    />
  );
}
