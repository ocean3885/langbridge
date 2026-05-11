import { getBundle, listBundleItems } from '@/lib/supabase/services/bundles';
import { listUserSentenceInteractions } from '@/lib/supabase/services/user-interactions';
import { getPublicUrl, formatDate } from '@/lib/utils';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Layers, Bookmark, Volume2, MessageSquare, Info } from 'lucide-react';
import AudioButton from '@/components/AudioButton';
import BackButton from '@/components/common/BackButton';
import BundlePlayerClient from './BundlePlayerClient';
import BundleHeaderClient from './BundleHeaderClient';
import { getAppUserFromServer, getDisplayLanguage } from '@/lib/auth/app-user';

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
  
  // 유저 상호작용 정보 가져오기 (문장 아이템에 대해서만)
  let interactions: any[] = [];
  if (user) {
    const sentenceIds = items
      .filter(item => item.sentence_id)
      .map(item => item.sentence_id as number);
    
    if (sentenceIds.length > 0) {
      interactions = await listUserSentenceInteractions(user.id, sentenceIds);
    }
  }

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

  return (
    <div className="max-w-7xl mx-auto px-2 md:px-4 py-4 md:py-8">
      <div className="mb-4 md:mb-8 px-2 md:px-0">
        <BackButton language={lang} />
      </div>

      {/* 번들 헤더 */}
      <BundleHeaderClient bundle={bundle} itemsCount={items.length} language={lang} />

      {/* 학습 플레이어 영역 */}
      <BundlePlayerClient 
        bundle={bundle} 
        items={items} 
        language={lang} 
        initialInteractions={interactions}
        user={user}
      />
    </div>
  );
}
