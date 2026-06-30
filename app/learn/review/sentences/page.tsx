import { redirect } from 'next/navigation';
import { getAppUserFromServer, getDisplayLanguage } from '@/lib/auth/app-user';
import { getReviewNeededSummary, getReviewSentences } from '@/lib/supabase/services/learning-review';
import SentencesReviewClient from './SentencesReviewClient';

export const dynamic = 'force-dynamic';

export default async function SentencesReviewPage() {
  const user = await getAppUserFromServer();
  if (!user) {
    redirect('/auth/sign-in?redirectTo=/learn/review/sentences');
  }

  const [language, reviewNeededSummary] = await Promise.all([
    getDisplayLanguage(),
    getReviewNeededSummary(user.id),
  ]);
  const reviewItems = await getReviewSentences(user.id, Math.min(reviewNeededSummary.availableSentences, 40));

  return (
    <SentencesReviewClient
      initialItems={reviewItems}
      availableReviewCount={reviewNeededSummary.availableSentences}
      language={language}
    />
  );
}
