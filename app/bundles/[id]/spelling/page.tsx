import { getPracticeWordTargets } from '@/lib/practice/registry';
import { notFound, redirect } from 'next/navigation';
import { getAppUserFromServer, getDisplayLanguage } from '@/lib/auth/app-user';
import { getBundleAccess } from '@/lib/bundle-access';
import { getBundleProgressSummary } from '@/lib/supabase/services/bundle-progress';
import { getBundle, listBundleItems } from '@/lib/supabase/services/bundles';
import { listUserWordInteractions, type UserWordInteraction } from '@/lib/supabase/services/user-interactions';
import { listWordUsageDetails } from '@/lib/supabase/services/word-sentence-map';
import { getPublicUrl } from '@/lib/utils';
import { getBundleTitle } from '../../bundle-utils';
import PracticeSessionSelector from '../_components/PracticeSessionSelector';
import { filterPracticeItems, getPracticeSessionCounts, isPracticeSessionMode } from '../practice-session';
import BundleSpellingClient from './BundleSpellingClient';

interface BundleSpellingItem {
  id: string;
  progressId: string;
  bundleItemId: string;
  wordId: number;
  word: string;
  meaning: string;
  langCode: string;
  audioUrl?: string | null;
}

interface BundleSpellingPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ mode?: string; count?: string }>;
}

export default async function BundleSpellingPage({ params, searchParams }: BundleSpellingPageProps) {
  const { id } = await params;
  const { mode, count } = await searchParams;
  const [bundle, items, language, user] = await Promise.all([
    getBundle(id),
    listBundleItems(id),
    getDisplayLanguage(),
    getAppUserFromServer(),
  ]);

  if (!bundle) notFound();

  const access = await getBundleAccess(bundle, user);
  if (!access.canView) {
    if (access.reason === 'unpublished') notFound();
    const redirectTo = `/bundles/${bundle.id}/spelling`;
    redirect(access.reason === 'login_required' ? `/auth/login?redirectTo=${encodeURIComponent(redirectTo)}` : `/pricing?redirectTo=${encodeURIComponent(redirectTo)}`);
  }

  const spellingItems: BundleSpellingItem[] = getPracticeWordTargets(items, 'spelling', language).map(({ word, bundleItemId, meaning, audioUrl }) => ({
    id: String(word.id), progressId: String(word.id), bundleItemId, wordId: Number(word.id),
    word: word.word, meaning, langCode: word.lang_code || 'es', audioUrl: getPublicUrl(audioUrl),
  }));
  const [progress, wordInteractions] = await Promise.all([
    getBundleProgressSummary(user?.id, bundle.id, items.length),
    user
      ? listUserWordInteractions(user.id, spellingItems.map((item) => item.wordId))
      : Promise.resolve([]),
  ]);
  const practiceSpellingItems = getPrioritizedSpellingItems(spellingItems, wordInteractions);
  const title = getBundleTitle(bundle, language);
  const effectiveMode = !user && !mode ? 'all' : mode;

  if (!isPracticeSessionMode(effectiveMode)) {
    return (
      <PracticeSessionSelector
        bundleId={bundle.id}
        title={title}
        modeName="Spelling Scramble"
        basePath={`/bundles/${bundle.id}/spelling`}
        language={language}
        counts={getPracticeSessionCounts(practiceSpellingItems, wordInteractions, 'spelling', progress.currentPracticeItemIds.spelling)}
        target="word"
      />
    );
  }

  const filteredItems = filterPracticeItems(practiceSpellingItems, wordInteractions, effectiveMode, 'spelling');
  const sessionItems = limitPracticeItems(filteredItems, count);
  const wordUsageDetails = await listWordUsageDetails(sessionItems.map((item) => item.wordId));
  const initialItemId =
    effectiveMode === 'resume' &&
    progress.currentPracticeItemIds.spelling &&
    sessionItems.some((item) => item.progressId === progress.currentPracticeItemIds.spelling)
      ? progress.currentPracticeItemIds.spelling
      : null;

  return (
    <BundleSpellingClient
      bundleId={bundle.id}
      title={title}
      items={sessionItems}
      wordUsageDetails={wordUsageDetails}
      language={language}
      initialItemId={initialItemId}
      isLoggedIn={Boolean(user)}
    />
  );
}

function getPrioritizedSpellingItems(
  items: BundleSpellingItem[],
  wordInteractions: UserWordInteraction[],
) {
  const proficiencyByWordId = new Map(wordInteractions.map(row => [Number(row.word_id), row.proficiency_level]));
  // Keep the complete catalog available for filters and resume; limit only the chosen session.
  return [...items].sort((a, b) => (proficiencyByWordId.get(a.wordId) || 0) - (proficiencyByWordId.get(b.wordId) || 0));
}

function limitPracticeItems<T>(items: T[], count?: string) {
  const parsedCount = count ? Number.parseInt(count, 10) : NaN;
  return Number.isFinite(parsedCount) && parsedCount > 0 ? items.slice(0, parsedCount) : items;
}
