import { redirect } from 'next/navigation';
import { getAppUserFromServer, getDisplayLanguage } from '@/lib/auth/app-user';
import { getReviewSentences } from '@/lib/supabase/services/bundle-progress';
import SentencesReviewClient from './SentencesReviewClient';

export const dynamic = 'force-dynamic';

export default async function SentencesReviewPage() {
  const user = await getAppUserFromServer();
  if (!user) {
    redirect('/auth/sign-in?redirectTo=/learn/review/sentences');
  }

  const language = await getDisplayLanguage();
  const reviewItems = await getReviewSentences(user.id, 40); // Fetch up to 40 candidates for user selection (5, 10, 20)

  return (
    <SentencesReviewClient
      initialItems={reviewItems}
      language={language}
    />
  );
}
