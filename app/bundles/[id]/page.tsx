import { getBundle, listBundleItems } from '@/lib/supabase/services/bundles';
import { getBundleProgressSummary } from '@/lib/supabase/services/bundle-progress';
import Link from 'next/link';
import { getAppUserFromServer, getDisplayLanguage } from '@/lib/auth/app-user';
import BundleDetailHubClient from './BundleDetailHubClient';

interface BundleDetailsPageProps {
  params: Promise<{
    id: string;
  }>;
}

const translations = {
  ko: {
    bundleNotFound: '번들을 찾을 수 없습니다.',
    backToList: '목록으로 돌아가기',
    general: '일반',
    noDescription: '이 번들에 대한 설명이 없습니다.',
    totalItems: (count: number) => `총 ${count}개의 항목`,
  },
  en: {
    bundleNotFound: 'Bundle not found.',
    backToList: 'Back to List',
    general: 'General',
    noDescription: 'No description provided for this bundle.',
    totalItems: (count: number) => `Total ${count} items`,
  }
};

export default async function BundleDetailsPage({ params }: BundleDetailsPageProps) {
  const { id } = await params;
  const bundle = await getBundle(id);
  const items = await listBundleItems(id);
  const user = await getAppUserFromServer();
  const lang = await getDisplayLanguage();
  const t = translations[lang];

  if (!bundle) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t.bundleNotFound}</h1>
        <Link href="/bundles" className="text-blue-600 hover:underline mt-4 inline-block">
          {t.backToList}
        </Link>
      </div>
    );
  }

  const progress = await getBundleProgressSummary(user?.id, bundle.id, items.length);

  return <BundleDetailHubClient bundle={bundle} items={items} language={lang} progress={progress} isLoggedIn={Boolean(user)} />;
}
