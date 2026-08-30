import { redirect } from 'next/navigation';
import { getAppUserFromServer, getDisplayLanguage } from '@/lib/auth/app-user';
import { getReviewNeededSummary, getReviewSentences } from '@/lib/supabase/services/learning-review';
import SentencesReviewClient from './SentencesReviewClient';

export const dynamic = 'force-dynamic';

export default async function SentencesReviewPage({ searchParams }: { searchParams: Promise<{ scope?: string; returnTo?: string; nextTo?: string }> }) {
  const { scope, returnTo, nextTo } = await searchParams;
  const sessionKind = scope === 'unstarted' ? 'learning' : 'review';
  const safeReturnTo = returnTo === '/learn/progress/sentences' ? returnTo : undefined;
  const safeNextTo = nextTo === '/learn/review/words' ? nextTo : undefined;
  const user = await getAppUserFromServer();
  if (!user) {
    const redirectTo = sessionKind === 'learning' ? '/learn/review/sentences?scope=unstarted' : '/learn/review/sentences';
    redirect(`/auth/sign-in?redirectTo=${encodeURIComponent(redirectTo)}`);
  }

  const [language, reviewNeededSummary] = await Promise.all([
    getDisplayLanguage(),
    getReviewNeededSummary(user.id),
  ]);
  const reviewItems = await getReviewSentences(
    user.id,
    sessionKind === 'learning' ? 40 : Math.min(reviewNeededSummary.availableSentences, 40),
    sessionKind === 'learning' ? 'unstarted' : 'review',
  );

  return (
    <SentencesReviewClient
      initialItems={reviewItems}
      availableReviewCount={sessionKind === 'learning' ? reviewItems.length : reviewNeededSummary.availableSentences}
      language={language}
      sessionKind={sessionKind}
      returnTo={safeReturnTo}
      nextTo={safeNextTo}
    />
  );
}
