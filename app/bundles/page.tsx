import { listBundles } from '@/lib/supabase/services/bundles';
import Link from 'next/link';
import Image from 'next/image';
import { Layers, Bookmark, Clock, ChevronRight } from 'lucide-react';
import { getAppUserFromServer, getDisplayLanguage } from '@/lib/auth/app-user';

export const dynamic = 'force-dynamic';

const translations = {
  ko: {
    title: '학습 번들',
    description: '엄선된 문장과 단어 세트로 구성된 번들로 효율적으로 학습해보세요. 주제별, 난이도별로 정리된 다양한 콘텐츠가 준비되어 있습니다.',
    noBundlesTitle: '공개된 번들이 없습니다',
    noBundlesDesc: '새로운 학습 번들이 준비 중입니다. 잠시만 기다려주세요!',
    general: '일반',
    noBundleDescription: '이 번들에 대한 설명이 없습니다.',
  },
  en: {
    title: 'Learning Bundles',
    description: 'Learn efficiently with bundles of carefully selected sentences and words. Various contents are organized by topic and difficulty level.',
    noBundlesTitle: 'No published bundles',
    noBundlesDesc: 'New learning bundles are being prepared. Please wait!',
    general: 'General',
    noBundleDescription: 'No description provided for this bundle.',
  }
};

export default async function BundlesPage() {
  const allBundles = await listBundles();
  const publishedBundles = allBundles.filter((b: any) => b.is_published);
  
  const user = await getAppUserFromServer();
  const lang = await getDisplayLanguage();
  const t = translations[lang];

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      {/* 헤더 섹션 */}
      <div className="mb-12 text-center sm:text-left">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-4 justify-center sm:justify-start">
          <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200 mx-auto sm:mx-0">
            <Layers className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight">{t.title}</h1>
        </div>
        <p className="text-lg text-gray-600 max-w-2xl">
          {t.description}
        </p>
      </div>

      {/* 번들 그리드 */}
      {publishedBundles.length === 0 ? (
        <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-3xl p-20 text-center">
          <Layers className="w-20 h-20 text-gray-300 mx-auto mb-6" />
          <h3 className="text-2xl font-bold text-gray-700 mb-2">{t.noBundlesTitle}</h3>
          <p className="text-gray-500">{t.noBundlesDesc}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {publishedBundles.map((bundle: any) => (
            <Link
              key={bundle.id}
              href={`/bundles/${bundle.id}`}
              className="group bg-white rounded-3xl shadow-sm border border-gray-100 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 overflow-hidden flex flex-col"
            >
              {/* 썸네일 영역 */}
              <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
                {bundle.thumbnail_url ? (
                  <Image
                    src={bundle.thumbnail_url}
                    alt={bundle.title}
                    fill
                    className="object-cover group-hover:scale-110 transition-transform duration-700"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-300">
                    <Layers className="w-16 h-16 opacity-20" />
                  </div>
                )}
                <div className="absolute top-4 left-4">
                  <span className="px-3 py-1 bg-white/90 backdrop-blur-sm text-blue-600 text-xs font-black rounded-full shadow-sm uppercase tracking-wider">
                    Level {bundle.level || 1}
                  </span>
                </div>
              </div>

              {/* 정보 영역 */}
              <div className="p-6 flex flex-col flex-grow">
                <div className="mb-3">
                  <span className="text-[11px] font-black text-blue-500 uppercase tracking-widest mb-1 block">
                    {(lang === 'en' ? bundle.bundle_category?.name_en : bundle.bundle_category?.name) || bundle.bundle_category?.name || t.general}
                  </span>
                  <h3 className="text-xl font-bold text-gray-900 leading-tight group-hover:text-blue-600 transition-colors line-clamp-2 min-h-[3.5rem]">
                    {(lang === 'en' ? bundle.title_en : bundle.title) || bundle.title}
                  </h3>
                </div>
                
                <p className="text-sm text-gray-500 line-clamp-2 mb-6 flex-grow">
                  {(lang === 'en' ? bundle.description_en : bundle.description) || bundle.description || t.noBundleDescription}
                </p>

                <div className="flex items-center justify-between pt-4 border-t border-gray-50 mt-auto">
                  <div className="flex items-center gap-1.5 text-xs text-gray-400 font-medium">
                    <Clock className="w-3.5 h-3.5" />
                    {new Date(bundle.created_at).toLocaleDateString(lang === 'ko' ? 'ko-KR' : 'en-US')}
                  </div>
                  <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-blue-600 transition-colors">
                    <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-white transition-colors" />
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
