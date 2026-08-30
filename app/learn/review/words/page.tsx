import { redirect } from 'next/navigation';
import { getAppUserFromServer, getDisplayLanguage } from '@/lib/auth/app-user';
import { getReviewNeededSummary, getReviewWords } from '@/lib/supabase/services/learning-review';
import { listWordUsageDetails } from '@/lib/supabase/services/word-sentence-map';
import WordsReviewClient from './WordsReviewClient';

export const dynamic = 'force-dynamic';

export default async function WordsReviewPage({ searchParams }: { searchParams: Promise<{ scope?: string; returnTo?: string; nextTo?: string }> }) {
  const { scope, returnTo, nextTo } = await searchParams;
  const sessionKind = scope === 'unstarted' ? 'learning' : 'review';
  const safeReturnTo = returnTo === '/learn/progress/words' ? returnTo : undefined;
  const safeNextTo = nextTo === '/learn/review/sentences' ? nextTo : undefined;
  const user = await getAppUserFromServer();
  if (!user) {
    const redirectTo = sessionKind === 'learning' ? '/learn/review/words?scope=unstarted' : '/learn/review/words';
    redirect(`/auth/sign-in?redirectTo=${encodeURIComponent(redirectTo)}`);
  }

  const [language, reviewNeededSummary] = await Promise.all([
    getDisplayLanguage(),
    getReviewNeededSummary(user.id),
  ]);
  const reviewItems = await getReviewWords(
    user.id,
    sessionKind === 'learning' ? 40 : Math.min(reviewNeededSummary.availableWords, 40),
    sessionKind === 'learning' ? 'unstarted' : 'review',
  );
  const wordUsageDetails = await listWordUsageDetails(reviewItems.map((item) => item.id));

  return (
    <WordsReviewClient
      initialItems={reviewItems}
      wordUsageDetails={wordUsageDetails}
      availableReviewCount={sessionKind === 'learning' ? reviewItems.length : reviewNeededSummary.availableWords}
      language={language}
      sessionKind={sessionKind}
      returnTo={safeReturnTo}
      nextTo={safeNextTo}
    />
  );
}
