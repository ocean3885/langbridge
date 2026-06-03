import Link from 'next/link';
import { getAppUserFromServer, getDisplayLanguage } from '@/lib/auth/app-user';
import { getBundle, listBundleItems } from '@/lib/supabase/services/bundles';
import { listUserSentenceInteractions } from '@/lib/supabase/services/user-interactions';
import BundlePlayerClient from '../BundlePlayerClient';

interface BundleLearnPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ item?: string }>;
}

const copy = {
  ko: {
    bundleNotFound: '번들을 찾을 수 없습니다.',
    backToDetail: '상세로 돌아가기',
  },
  en: {
    bundleNotFound: 'Bundle not found.',
    backToDetail: 'Back to Detail',
  },
};

export default async function BundleLearnPage({ params, searchParams }: BundleLearnPageProps) {
  const { id } = await params;
  const { item } = await searchParams;
  const [bundle, items, user, lang] = await Promise.all([
    getBundle(id),
    listBundleItems(id),
    getAppUserFromServer(),
    getDisplayLanguage(),
  ]);
  const t = copy[lang];

  if (!bundle) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t.bundleNotFound}</h1>
        <Link href="/bundles" className="mt-4 inline-block text-blue-600 hover:underline">
          Bundles
        </Link>
      </div>
    );
  }

  let interactions: any[] = [];
  if (user) {
    const sentenceIds = items.filter((bundleItem) => bundleItem.sentence_id).map((bundleItem) => bundleItem.sentence_id as number);
    if (sentenceIds.length > 0) {
      interactions = await listUserSentenceInteractions(user.id, sentenceIds);
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-2 py-4 md:px-4 md:py-8">
      <div className="mb-4 px-2 md:px-0">
        <Link href={`/bundles/${bundle.id}`} className="text-sm font-bold text-zinc-500 transition hover:text-[#2f7d4a]">
          ← {t.backToDetail}
        </Link>
      </div>
      <BundlePlayerClient
        bundle={bundle}
        items={items}
        language={lang}
        initialInteractions={interactions}
        user={user}
        initialItemId={item || null}
      />
    </div>
  );
}
