import ReviewSessionClient from '../_components/ReviewSessionClient';
import { parseReviewSettings, REVIEW_MAX_COUNT } from '@/lib/learning/review-session';
import { redirect } from 'next/navigation';
import { getAppUserFromServer, getDisplayLanguage } from '@/lib/auth/app-user';
import { getBundleReviewSummary, getReviewNeededSummary, getReviewSentenceOptionPool, getSentenceReviewSession, getReviewSentences } from '@/lib/supabase/services/learning-review';
import SentencesReviewClient from './SentencesReviewClient';

export const dynamic = 'force-dynamic';

export default async function SentencesReviewPage({ searchParams }: { searchParams: Promise<{ scope?: string; returnTo?: string; nextTo?: string; mode?: string; count?: string; start?: string; bundleId?: string }> }) {
  const params = await searchParams;
  const { scope, returnTo, nextTo, bundleId } = params;
  const settings = parseReviewSettings(params, 'sentences');
  const sessionKind = scope === 'unstarted' ? 'learning' : 'review';
  const isAllowedReturnTo = (url?: string) => {
    if (!url) return false;
    return url === '/learn/review' ||
      url.startsWith('/learn/review?') ||
      url === '/learn/progress/sentences' ||
      url === '/learn/progress/words' ||
      url.startsWith('/bundles/');
  };
  const safeReturnTo = isAllowedReturnTo(returnTo) ? returnTo : (bundleId ? `/bundles/${bundleId}` : undefined);
  const safeNextTo = nextTo === '/learn/review/words' ? nextTo : undefined;
  const user = await getAppUserFromServer();
  if (!user) {
    const query = new URLSearchParams();
    if (sessionKind === 'learning') query.set('scope', 'unstarted');
    if (safeReturnTo) query.set('returnTo', safeReturnTo);
    if (safeNextTo) query.set('nextTo', safeNextTo);
    if (bundleId) query.set('bundleId', bundleId);
    query.set('mode', settings.mode); query.set('count', String(settings.count));
    if (settings.autoStart) query.set('start', '1');
    redirect(`/auth/login?redirectTo=${encodeURIComponent('/learn/review/sentences?' + query.toString())}`);
  }

  const [language, reviewNeededSummary, optionPool] = await Promise.all([
    getDisplayLanguage(),
    bundleId ? getBundleReviewSummary(user.id, bundleId) : getReviewNeededSummary(user.id),
    getReviewSentenceOptionPool(user.id, 40),
  ]);
  const session = sessionKind === 'review' ? await getSentenceReviewSession(user.id, language, bundleId, optionPool) : null;
  const reviewItems = session?.items ?? await getReviewSentences(
    user.id,
    sessionKind === 'learning' ? REVIEW_MAX_COUNT : Math.min(reviewNeededSummary.availableSentences, REVIEW_MAX_COUNT),
    sessionKind === 'learning' ? 'unstarted' : 'review',
    true,
    bundleId,
  );

  if (sessionKind === 'review') {
    return (
      <ReviewSessionClient
        type="sentences"
        modeCounts={session?.counts}
        items={reviewItems}
        availableCount={reviewNeededSummary.availableSentences}
        language={language}
        settings={settings}
        returnTo={safeReturnTo}
        bundleId={bundleId}
        optionPool={optionPool}
      />
    );
  }

  return (
    <SentencesReviewClient
      initialItems={reviewItems}
      optionItems={optionPool.length > 0 ? optionPool : reviewItems}
      availableReviewCount={sessionKind === 'learning' ? reviewItems.length : reviewNeededSummary.availableSentences}
      language={language}
      sessionKind={sessionKind}
      returnTo={safeReturnTo}
      nextTo={safeNextTo}
    />
  );
}
