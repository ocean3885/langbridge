import ReviewSessionClient from '../_components/ReviewSessionClient';
import { parseReviewSettings, REVIEW_MAX_COUNT } from '@/lib/learning/review-session';
import { redirect } from 'next/navigation';
import { getAppUserFromServer, getDisplayLanguage } from '@/lib/auth/app-user';
import { getReviewNeededSummary, getReviewWords } from '@/lib/supabase/services/learning-review';
import { listWordUsageDetails } from '@/lib/supabase/services/word-sentence-map';
import WordsReviewClient from './WordsReviewClient';

export const dynamic = 'force-dynamic';

export default async function WordsReviewPage({ searchParams }: { searchParams: Promise<{ scope?: string; returnTo?: string; nextTo?: string; mode?: string; count?: string; start?: string }> }) {
  const params = await searchParams;
  const { scope, returnTo, nextTo } = params;
  const settings = parseReviewSettings(params, 'words');
  const sessionKind = scope === 'unstarted' ? 'learning' : 'review';
  const safeReturnTo = returnTo === '/learn/progress/words' ? returnTo : undefined;
  const safeNextTo = nextTo === '/learn/review/sentences' ? nextTo : undefined;
  const user = await getAppUserFromServer();
  if (!user) {
    const query = new URLSearchParams();
    if (sessionKind === 'learning') query.set('scope', 'unstarted');
    if (safeReturnTo) query.set('returnTo', safeReturnTo);
    if (safeNextTo) query.set('nextTo', safeNextTo);
    query.set('mode', settings.mode); query.set('count', String(settings.count));
    if (settings.autoStart) query.set('start', '1');
    redirect(`/auth/login?redirectTo=${encodeURIComponent('/learn/review/words?' + query.toString())}`);
  }

  const [language, reviewNeededSummary] = await Promise.all([
    getDisplayLanguage(),
    getReviewNeededSummary(user.id),
  ]);
  const reviewItems = await getReviewWords(
    user.id,
    sessionKind === 'learning' ? REVIEW_MAX_COUNT : Math.min(reviewNeededSummary.availableWords, REVIEW_MAX_COUNT),
    sessionKind === 'learning' ? 'unstarted' : 'review',
  );
  const wordUsageDetails = await listWordUsageDetails(reviewItems.map((item) => item.id));

  if (sessionKind === 'review') return <ReviewSessionClient type="words" items={reviewItems} availableCount={reviewNeededSummary.availableWords} language={language} settings={settings} returnTo={safeReturnTo} wordUsageDetails={wordUsageDetails} />;

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
