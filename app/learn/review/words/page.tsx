import ReviewSessionClient from '../_components/ReviewSessionClient';
import { parseReviewSettings, REVIEW_MAX_COUNT } from '@/lib/learning/review-session';
import { redirect } from 'next/navigation';
import { getAppUserFromServer, getDisplayLanguage } from '@/lib/auth/app-user';
import { getBundleReviewSummary, getReviewNeededSummary, getReviewWordOptionPool, getReviewWords } from '@/lib/supabase/services/learning-review';
import { listWordUsageDetails } from '@/lib/supabase/services/word-sentence-map';
import WordsReviewClient from './WordsReviewClient';

export const dynamic = 'force-dynamic';

export default async function WordsReviewPage({ searchParams }: { searchParams: Promise<{ scope?: string; returnTo?: string; nextTo?: string; mode?: string; count?: string; start?: string; bundleId?: string }> }) {
  const params = await searchParams;
  const { scope, returnTo, nextTo, bundleId } = params;
  const settings = parseReviewSettings(params, 'words');
  const sessionKind = scope === 'unstarted' ? 'learning' : 'review';
  const isAllowedReturnTo = (url?: string) => {
    if (!url) return false;
    return url === '/learn/review' ||
      url.startsWith('/learn/review?') ||
      url === '/learn/progress/words' ||
      url.startsWith('/bundles/');
  };
  const safeReturnTo = isAllowedReturnTo(returnTo) ? returnTo : (bundleId ? `/bundles/${bundleId}` : undefined);
  const safeNextTo = nextTo === '/learn/review/sentences' ? nextTo : undefined;
  const user = await getAppUserFromServer();
  if (!user) {
    const query = new URLSearchParams();
    if (sessionKind === 'learning') query.set('scope', 'unstarted');
    if (safeReturnTo) query.set('returnTo', safeReturnTo);
    if (safeNextTo) query.set('nextTo', safeNextTo);
    if (bundleId) query.set('bundleId', bundleId);
    query.set('mode', settings.mode); query.set('count', String(settings.count));
    if (settings.autoStart) query.set('start', '1');
    redirect(`/auth/login?redirectTo=${encodeURIComponent('/learn/review/words?' + query.toString())}`);
  }

  const [language, reviewNeededSummary, optionPool] = await Promise.all([
    getDisplayLanguage(),
    bundleId ? getBundleReviewSummary(user.id, bundleId) : getReviewNeededSummary(user.id),
    getReviewWordOptionPool(user.id, 40),
  ]);
  const reviewItems = await getReviewWords(
    user.id,
    sessionKind === 'learning' ? REVIEW_MAX_COUNT : Math.min(reviewNeededSummary.availableWords, REVIEW_MAX_COUNT),
    sessionKind === 'learning' ? 'unstarted' : 'review',
    bundleId,
  );
  const wordUsageDetails = await listWordUsageDetails(reviewItems.map((item) => item.id));

  if (sessionKind === 'review') {
    return (
      <ReviewSessionClient
        type="words"
        items={reviewItems}
        availableCount={reviewNeededSummary.availableWords}
        language={language}
        settings={settings}
        returnTo={safeReturnTo}
        wordUsageDetails={wordUsageDetails}
        bundleId={bundleId}
        optionPool={optionPool}
      />
    );
  }

  return (
    <WordsReviewClient
      initialItems={reviewItems}
      optionItems={optionPool.length > 0 ? optionPool : reviewItems}
      wordUsageDetails={wordUsageDetails}
      availableReviewCount={sessionKind === 'learning' ? reviewItems.length : reviewNeededSummary.availableWords}
      language={language}
      sessionKind={sessionKind}
      returnTo={safeReturnTo}
      nextTo={safeNextTo}
    />
  );
}
