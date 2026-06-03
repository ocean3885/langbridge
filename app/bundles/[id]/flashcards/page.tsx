import { notFound } from 'next/navigation';
import { getDisplayLanguage } from '@/lib/auth/app-user';
import { getBundle, listBundleItems } from '@/lib/supabase/services/bundles';
import { getPublicUrl } from '@/lib/utils';
import { getBundleTitle } from '../../bundle-utils';
import BundleFlashcardsClient from './BundleFlashcardsClient';

interface BundleFlashcardsPageProps {
  params: Promise<{ id: string }>;
}

export default async function BundleFlashcardsPage({ params }: BundleFlashcardsPageProps) {
  const { id } = await params;
  const [bundle, items, language] = await Promise.all([getBundle(id), listBundleItems(id), getDisplayLanguage()]);

  if (!bundle) notFound();

  const cardItems = items
    .filter((item) => item.sentences?.sentence)
    .map((item) => ({
      id: item.id,
      sentence: item.sentences.sentence,
      translation: (language === 'en' ? item.sentences.translation_en : item.sentences.translation) || item.sentences.translation || '',
      audioUrl: getPublicUrl(item.audio_url || item.sentences.audio_url),
    }));

  return <BundleFlashcardsClient bundleId={bundle.id} title={getBundleTitle(bundle, language)} items={cardItems} language={language} />;
}
