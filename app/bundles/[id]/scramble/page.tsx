import { notFound } from 'next/navigation';
import { getDisplayLanguage } from '@/lib/auth/app-user';
import { getBundle, listBundleItems } from '@/lib/supabase/services/bundles';
import { getBundleTitle } from '../../bundle-utils';
import BundleScrambleClient from './BundleScrambleClient';

interface BundleScramblePageProps {
  params: Promise<{ id: string }>;
}

export default async function BundleScramblePage({ params }: BundleScramblePageProps) {
  const { id } = await params;
  const [bundle, items, language] = await Promise.all([getBundle(id), listBundleItems(id), getDisplayLanguage()]);

  if (!bundle) notFound();

  const scrambleItems = items
    .filter((item) => item.sentences?.sentence)
    .map((item) => ({
      id: item.id,
      sentence: item.sentences.sentence,
      translation: (language === 'en' ? item.sentences.translation_en : item.sentences.translation) || item.sentences.translation || '',
    }))
    .filter((item) => item.translation);

  return <BundleScrambleClient bundleId={bundle.id} title={getBundleTitle(bundle, language)} items={scrambleItems} language={language} />;
}
