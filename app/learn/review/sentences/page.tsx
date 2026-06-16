import { redirect } from 'next/navigation';
import { getAppUserFromServer, getDisplayLanguage } from '@/lib/auth/app-user';
import { getReviewNeededSummary, getReviewSentences } from '@/lib/supabase/services/bundle-progress';
import SentencesReviewClient from './SentencesReviewClient';

export const dynamic = 'force-dynamic';

export default async function SentencesReviewPage() {
  const user = await getAppUserFromServer();
  if (!user) {
    redirect('/auth/sign-in?redirectTo=/learn/review/sentences');
  }

  const [language, reviewItems, reviewNeededSummary] = await Promise.all([
    getDisplayLanguage(),
    getReviewSentences(user.id, 40), // Fetch up to 40 candidates for user selection (5, 10, 20)
    getReviewNeededSummary(user.id),
  ]);

  return (
    <SentencesReviewClient
      initialItems={reviewItems}
      availableReviewCount={reviewNeededSummary.availableSentences}
      language={language}
    />
  );
}
