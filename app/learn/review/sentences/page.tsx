import ReviewSessionClient from '../_components/ReviewSessionClient';
import { parseReviewSettings, REVIEW_MAX_COUNT } from '@/lib/learning/review-session';
import { redirect } from 'next/navigation';
import { getAppUserFromServer, getDisplayLanguage } from '@/lib/auth/app-user';
import { getReviewNeededSummary, getReviewSentences } from '@/lib/supabase/services/learning-review';
import SentencesReviewClient from './SentencesReviewClient';

export const dynamic = 'force-dynamic';

export default async function SentencesReviewPage({ searchParams }: { searchParams: Promise<{ scope?: string; returnTo?: string; nextTo?: string; mode?: string; count?: string; start?: string }> }) {
  const params = await searchParams;
  const { scope, returnTo, nextTo } = params;
  const settings = parseReviewSettings(params, 'sentences');
  const sessionKind = scope === 'unstarted' ? 'learning' : 'review';
  const safeReturnTo = returnTo === '/learn/progress/sentences' ? returnTo : undefined;
  const safeNextTo = nextTo === '/learn/review/words' ? nextTo : undefined;
  const user = await getAppUserFromServer();
  if (!user) {
    const query = new URLSearchParams();
    if (sessionKind === 'learning') query.set('scope', 'unstarted');
    if (safeReturnTo) query.set('returnTo', safeReturnTo);
    if (safeNextTo) query.set('nextTo', safeNextTo);
    query.set('mode', settings.mode); query.set('count', String(settings.count));
    if (settings.autoStart) query.set('start', '1');
    redirect(`/auth/login?redirectTo=${encodeURIComponent('/learn/review/sentences?' + query.toString())}`);
  }

  const [language, reviewNeededSummary] = await Promise.all([
    getDisplayLanguage(),
    getReviewNeededSummary(user.id),
  ]);
  const reviewItems = await getReviewSentences(
    user.id,
    sessionKind === 'learning' ? REVIEW_MAX_COUNT : Math.min(reviewNeededSummary.availableSentences, REVIEW_MAX_COUNT),
    sessionKind === 'learning' ? 'unstarted' : 'review',
  );

  if (sessionKind === 'review') return <ReviewSessionClient type="sentences" items={reviewItems} availableCount={reviewNeededSummary.availableSentences} language={language} settings={settings} returnTo={safeReturnTo} />;

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
