import { redirect } from 'next/navigation';
import { getAppUserFromServer, getDisplayLanguage } from '@/lib/auth/app-user';
import { getReviewNeededSummary, getReviewWords } from '@/lib/supabase/services/bundle-progress';
import WordsReviewClient from './WordsReviewClient';

export const dynamic = 'force-dynamic';

export default async function WordsReviewPage() {
  const user = await getAppUserFromServer();
  if (!user) {
    redirect('/auth/sign-in?redirectTo=/learn/review/words');
  }

  const [language, reviewItems, reviewNeededSummary] = await Promise.all([
    getDisplayLanguage(),
    getReviewWords(user.id, 40), // Fetch up to 40 candidates for user selection (5, 10, 20)
    getReviewNeededSummary(user.id),
  ]);

  return (
    <WordsReviewClient
      initialItems={reviewItems}
      availableReviewCount={reviewNeededSummary.availableWords}
      language={language}
    />
  );
}
