import { redirect } from 'next/navigation';
import { getAppUserFromServer, getDisplayLanguage } from '@/lib/auth/app-user';
import { getReviewNeededSummary, getReviewWords } from '@/lib/supabase/services/bundle-progress';
import { listWordUsageDetails } from '@/lib/supabase/services/word-sentence-map';
import WordsReviewClient from './WordsReviewClient';

export const dynamic = 'force-dynamic';

export default async function WordsReviewPage() {
  const user = await getAppUserFromServer();
  if (!user) {
    redirect('/auth/sign-in?redirectTo=/learn/review/words');
  }

  const [language, reviewNeededSummary] = await Promise.all([
    getDisplayLanguage(),
    getReviewNeededSummary(user.id),
  ]);
  const reviewItems = await getReviewWords(user.id, Math.min(reviewNeededSummary.availableWords, 40));
  const wordUsageDetails = await listWordUsageDetails(reviewItems.map((item) => item.id));

  return (
    <WordsReviewClient
      initialItems={reviewItems}
      wordUsageDetails={wordUsageDetails}
      availableReviewCount={reviewNeededSummary.availableWords}
      language={language}
    />
  );
}
