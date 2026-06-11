import { notFound, redirect } from 'next/navigation';
import { getAppUserFromServer, getDisplayLanguage } from '@/lib/auth/app-user';
import { getBundleAccess } from '@/lib/bundle-access';
import { getBundleProgressSummary, recordBundleStudyAccess } from '@/lib/supabase/services/bundle-progress';
import { getBundle, listBundleItems } from '@/lib/supabase/services/bundles';
import { listWordsForSentences } from '@/lib/supabase/services/word-sentence-map';
import BundlePlayerClient from '../BundlePlayerClient';

interface BundleLearnPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ item?: string }>;
}

export default async function BundleLearnPage({ params, searchParams }: BundleLearnPageProps) {
  const { id } = await params;
  const { item } = await searchParams;
  const [bundle, user, lang] = await Promise.all([
    getBundle(id),
    getAppUserFromServer(),
    getDisplayLanguage(),
  ]);
  if (!bundle) notFound();

  const access = await getBundleAccess(bundle, user);
  if (!access.canView) {
    if (access.reason === 'unpublished') notFound();
    const redirectTo = `/bundles/${bundle.id}/learn`;
    redirect(access.reason === 'login_required' ? `/auth/login?redirectTo=${encodeURIComponent(redirectTo)}` : `/pricing?redirectTo=${encodeURIComponent(redirectTo)}`);
  }

  const items = await listBundleItems(id);
  const sentenceIds = items.filter((bundleItem) => bundleItem.sentence_id).map((bundleItem) => bundleItem.sentence_id as number);
  const [progress, mappedWords] = await Promise.all([
    getBundleProgressSummary(user?.id, bundle.id, items.length),
    listWordsForSentences(sentenceIds),
  ]);
  const wordsBySentenceId = mappedWords.reduce((groups, word) => {
    const words = groups.get(word.sentence_id) || [];
    words.push(word);
    groups.set(word.sentence_id, words);
    return groups;
  }, new Map<number, typeof mappedWords>());
  const playerItems = items.map((bundleItem) => ({
    ...bundleItem,
    mapped_words: bundleItem.sentence_id ? wordsBySentenceId.get(bundleItem.sentence_id) || [] : [],
  }));
  const requestedItemId = item && items.some((bundleItem) => bundleItem.id === item) ? item : null;
  const savedItemId =
    progress.currentBundleItemId && items.some((bundleItem) => bundleItem.id === progress.currentBundleItemId)
      ? progress.currentBundleItemId
      : null;
  const initialItemId = requestedItemId || savedItemId || items[0]?.id || null;

  if (user) {
    await recordBundleStudyAccess(user.id, bundle.id, initialItemId);
  }

  return (
    <div className="min-h-[calc(100vh-5rem)] bg-[#f7f5f0] px-0 py-0 dark:bg-zinc-950 sm:px-3 sm:py-4 md:px-6 md:py-8">
      <BundlePlayerClient
        bundle={bundle}
        items={playerItems}
        language={lang}
        user={user}
        initialItemId={initialItemId}
      />
    </div>
  );
}
