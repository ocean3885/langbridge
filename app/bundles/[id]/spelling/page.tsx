import { notFound, redirect } from 'next/navigation';
import { getAppUserFromServer, getDisplayLanguage } from '@/lib/auth/app-user';
import { getBundleAccess } from '@/lib/bundle-access';
import { getBundleProgressSummary } from '@/lib/supabase/services/bundle-progress';
import { getBundle, listBundleItems, listBundleItemsWithDistractors } from '@/lib/supabase/services/bundles';
import { getPublicUrl } from '@/lib/utils';
import { formatWordMeaning } from '@/lib/word-meaning';
import { getBundleTitle } from '../../bundle-utils';
import PracticeSessionSelector from '../_components/PracticeSessionSelector';
import { filterPracticeItems, getPracticeModeStarProgress, getPracticeSessionCounts, isPracticeSessionMode } from '../practice-session';
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
  const [bundle, items, itemsWithMappings, language, user] = await Promise.all([
    getBundle(id),
    listBundleItems(id),
    listBundleItemsWithDistractors(id),
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

  const spellingItems = getBundleSpellingItems({ items, itemsWithMappings, language });
  const progress = await getBundleProgressSummary(user?.id, bundle.id, items.length);
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
        counts={getPracticeSessionCounts(spellingItems, progress.itemInteractions, 'spelling', progress.currentPracticeItemIds.spelling)}
        starProgress={getPracticeModeStarProgress(spellingItems, progress.itemInteractions, 'spelling')}
      />
    );
  }

  const filteredItems = filterPracticeItems(spellingItems, progress.itemInteractions, effectiveMode, 'spelling');
  const sessionItems = limitPracticeItems(filteredItems, count);
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
      language={language}
      initialItemId={initialItemId}
      isLoggedIn={Boolean(user)}
    />
  );
}

function getBundleSpellingItems({
  items,
  itemsWithMappings,
  language,
}: {
  items: any[];
  itemsWithMappings: any[];
  language: 'ko' | 'en';
}) {
  const byWordId = new Map<number, BundleSpellingItem>();

  for (const item of items) {
    const word = item.words;
    if (!word?.id || !word.word) continue;
    byWordId.set(Number(word.id), {
      id: `${item.id}-${word.id}`,
      progressId: item.id,
      bundleItemId: item.id,
      wordId: Number(word.id),
      word: word.word,
      meaning: getMeaning(word, language),
      langCode: word.lang_code || 'es',
      audioUrl: getPublicUrl(item.audio_url || word.audio_url),
    });
  }

  for (const item of itemsWithMappings) {
    const maps = item.sentences?.word_sentence_map || [];
    for (const map of maps) {
      const word = map.words;
      if (!word?.id || !word.word || byWordId.has(Number(word.id))) continue;
      byWordId.set(Number(word.id), {
        id: `${item.id}-${word.id}`,
        progressId: item.id,
        bundleItemId: item.id,
        wordId: Number(word.id),
        word: word.word,
        meaning: getMeaning(word, language),
        langCode: word.lang_code || 'es',
        audioUrl: getPublicUrl(word.audio_url),
      });
    }
  }

  return Array.from(byWordId.values()).filter((item) => item.meaning);
}

function limitPracticeItems<T>(items: T[], count?: string) {
  const parsedCount = count ? Number.parseInt(count, 10) : NaN;
  return Number.isFinite(parsedCount) && parsedCount > 0 ? items.slice(0, parsedCount) : items;
}

function getMeaning(word: any, language: 'ko' | 'en') {
  return (
    formatWordMeaning(language === 'en' ? word.meaning_en : word.meaning_ko) ||
    formatWordMeaning(word.meaning_ko) ||
    formatWordMeaning(word.meaning_en) ||
    ''
  );
}
