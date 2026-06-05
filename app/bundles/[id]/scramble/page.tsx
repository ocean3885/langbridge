import { notFound } from 'next/navigation';
import { getAppUserFromServer, getDisplayLanguage } from '@/lib/auth/app-user';
import { getBundleProgressSummary } from '@/lib/supabase/services/bundle-progress';
import { getBundle, listBundleItems } from '@/lib/supabase/services/bundles';
import { getBundleTitle } from '../../bundle-utils';
import PracticeSessionSelector from '../_components/PracticeSessionSelector';
import { filterPracticeItems, getPracticeModeStarProgress, getPracticeSessionCounts, isPracticeSessionMode } from '../practice-session';
import BundleScrambleClient from './BundleScrambleClient';

interface BundleScramblePageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ mode?: string }>;
}

export default async function BundleScramblePage({ params, searchParams }: BundleScramblePageProps) {
  const { id } = await params;
  const { mode } = await searchParams;
  const [bundle, items, language, user] = await Promise.all([
    getBundle(id),
    listBundleItems(id),
    getDisplayLanguage(),
    getAppUserFromServer(),
  ]);

  if (!bundle) notFound();

  const scrambleItems = items
    .filter((item) => item.sentences?.sentence)
    .map((item) => ({
      id: item.id,
      sentence: item.sentences.sentence,
      translation: (language === 'en' ? item.sentences.translation_en : item.sentences.translation) || item.sentences.translation || '',
    }))
    .filter((item) => item.translation);

  const progress = await getBundleProgressSummary(user?.id, bundle.id, items.length);
  const title = getBundleTitle(bundle, language);

  if (!isPracticeSessionMode(mode)) {
    return (
      <PracticeSessionSelector
        bundleId={bundle.id}
        title={title}
        modeName="Scramble"
        basePath={`/bundles/${bundle.id}/scramble`}
        language={language}
        counts={getPracticeSessionCounts(scrambleItems, progress.itemInteractions, 'scramble')}
        starProgress={getPracticeModeStarProgress(scrambleItems, progress.itemInteractions, 'scramble')}
      />
    );
  }

  const sessionItems = filterPracticeItems(scrambleItems, progress.itemInteractions, mode, 'scramble');
  const initialItemId =
    mode === 'resume' && progress.currentPracticeItemIds.scramble && sessionItems.some((item) => item.id === progress.currentPracticeItemIds.scramble)
      ? progress.currentPracticeItemIds.scramble
      : null;

  return (
    <BundleScrambleClient
      bundleId={bundle.id}
      title={title}
      items={sessionItems}
      language={language}
      initialItemId={initialItemId}
    />
  );
}
