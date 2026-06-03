import { notFound } from 'next/navigation';
import { getDisplayLanguage } from '@/lib/auth/app-user';
import { getBundle, listBundleItems } from '@/lib/supabase/services/bundles';
import { getBundleTitle } from '../../bundle-utils';
import BundleQuizClient from './BundleQuizClient';

interface BundleQuizPageProps {
  params: Promise<{ id: string }>;
}

export default async function BundleQuizPage({ params }: BundleQuizPageProps) {
  const { id } = await params;
  const [bundle, items, language] = await Promise.all([getBundle(id), listBundleItems(id), getDisplayLanguage()]);

  if (!bundle) notFound();

  const quizItems = items
    .filter((item) => item.sentences?.sentence)
    .map((item) => ({
      id: item.id,
      sentence: item.sentences.sentence,
      translation: (language === 'en' ? item.sentences.translation_en : item.sentences.translation) || item.sentences.translation || '',
    }))
    .filter((item) => item.translation);

  return <BundleQuizClient bundleId={bundle.id} title={getBundleTitle(bundle, language)} items={quizItems} language={language} />;
}
