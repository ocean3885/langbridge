import { notFound } from 'next/navigation';
import { getAppUserFromServer, getDisplayLanguage } from '@/lib/auth/app-user';
import { getBundleProgressSummary } from '@/lib/supabase/services/bundle-progress';
import { getBundle, listBundleItems } from '@/lib/supabase/services/bundles';
import { getBundleTitle } from '../../bundle-utils';
import PracticeSessionSelector from '../_components/PracticeSessionSelector';
import { filterPracticeItems, getPracticeModeStarProgress, getPracticeSessionCounts, isPracticeSessionMode } from '../practice-session';
import BundleQuizClient from './BundleQuizClient';

interface BundleQuizPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ mode?: string }>;
}

export default async function BundleQuizPage({ params, searchParams }: BundleQuizPageProps) {
  const { id } = await params;
  const { mode } = await searchParams;
  const [bundle, items, language, user] = await Promise.all([
    getBundle(id),
    listBundleItems(id),
    getDisplayLanguage(),
    getAppUserFromServer(),
  ]);

  if (!bundle) notFound();

  const quizItems = items
    .filter((item) => item.sentences?.sentence)
    .map((item) => ({
      id: item.id,
      sentence: item.sentences.sentence,
      translation: (language === 'en' ? item.sentences.translation_en : item.sentences.translation) || item.sentences.translation || '',
    }))
    .filter((item) => item.translation);

  const progress = await getBundleProgressSummary(user?.id, bundle.id, items.length);
  const title = getBundleTitle(bundle, language);
  const effectiveMode = !user && !mode ? 'all' : mode;

  if (!isPracticeSessionMode(effectiveMode)) {
    return (
      <PracticeSessionSelector
        bundleId={bundle.id}
        title={title}
        modeName="Quick Quiz"
        basePath={`/bundles/${bundle.id}/quiz`}
        language={language}
        counts={getPracticeSessionCounts(quizItems, progress.itemInteractions, 'quiz')}
        starProgress={getPracticeModeStarProgress(quizItems, progress.itemInteractions, 'quiz')}
      />
    );
  }

  const sessionItems = filterPracticeItems(quizItems, progress.itemInteractions, effectiveMode, 'quiz');
  const initialItemId =
    effectiveMode === 'resume' && progress.currentPracticeItemIds.quiz && sessionItems.some((item) => item.id === progress.currentPracticeItemIds.quiz)
      ? progress.currentPracticeItemIds.quiz
      : null;

  return (
    <BundleQuizClient
      bundleId={bundle.id}
      title={title}
      items={sessionItems}
      optionItems={quizItems}
      language={language}
      initialItemId={initialItemId}
      isLoggedIn={Boolean(user)}
    />
  );
}
