import { getAppUserFromServer } from '@/lib/auth/app-user';
import { listAllAudioContentSqlite } from '@/lib/sqlite/audio-content';
import { listAllSqliteCategories } from '@/lib/sqlite/categories';
import { listSqliteLanguages } from '@/lib/sqlite/languages';
import { DEFAULT_LEARNING_CATEGORY_NAME } from '@/lib/learning-category';
import Link from 'next/link';
import { BookOpen, FolderOpen } from 'lucide-react';
import AudioCard from '@/components/audio/AudioCard';

export const dynamic = 'force-dynamic';

export default async function LBAudioPage() {
  const user = await getAppUserFromServer();
  const isLoggedIn = !!user;

  const audioList = await listAllAudioContentSqlite(200);

  const languages = await listSqliteLanguages();
  const languageNameMap = new Map(languages.map((l) => [l.id, l.name_ko]));

  const categoryRows = await listAllSqliteCategories('lang_categories');
  const categoryMap: Record<number, { name: string; languageName: string }> = {};
  categoryRows.forEach((c) => {
    categoryMap[c.id] = {
      name: c.name,
      languageName: c.language_id ? (languageNameMap.get(c.language_id) ?? '언어 미지정') : '언어 미지정',
    };
  });

  type AudioItem = {
    id: string;
    title: string | null;
    created_at: string;
    category_id: number | null;
  };

  const grouped: Record<string, AudioItem[]> = {};
  audioList.forEach((a) => {
    const key = a.category_id === null ? 'uncategorized' : String(a.category_id);
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push({
      id: a.id,
      title: a.title,
      created_at: a.created_at,
      category_id: a.category_id,
    });
  });

  const groupedCategories = Object.entries(grouped)
    .map(([key, list]) => {
      const catId = key === 'uncategorized' ? null : Number(key);
      return {
        id: catId,
        name: catId === null ? DEFAULT_LEARNING_CATEGORY_NAME : (categoryMap[catId]?.name || '알 수 없는 카테고리'),
        languageName: catId === null ? '' : (categoryMap[catId]?.languageName || ''),
        audioList: list,
      };
    })
    .sort((a, b) => {
      if (a.id === null) return 1;
      if (b.id === null) return -1;
      return a.name.localeCompare(b.name, 'ko');
    });

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      {/* 헤더 */}
      <div className="mb-6 sm:mb-8">
        <div className="flex items-center gap-3 mb-3">
          <BookOpen className="w-8 h-8 text-violet-600" />
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">LB 문장 학습</h1>
        </div>
        <p className="text-sm sm:text-base text-gray-600">
          TTS 기반 문장 학습 오디오입니다. 카드를 클릭하여 반복 학습을 시작하세요.
        </p>
      </div>

      {groupedCategories.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-12 text-center">
          <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-600 mb-2">아직 문장 학습 콘텐츠가 없습니다</h3>
          <p className="text-gray-500 text-sm">운영자가 콘텐츠를 등록하면 이곳에 표시됩니다.</p>
        </div>
      ) : (
        <div className="space-y-10">
          {groupedCategories.map((category) => (
            <section key={category.id ?? 'uncategorized'} className="space-y-4">
              <div className="flex items-center gap-3 border-b-2 border-violet-200 pb-2">
                <FolderOpen className="w-6 h-6 text-violet-600" />
                <h2 className="text-xl font-bold text-gray-800">
                  {category.name}
                  {category.languageName && (
                    <span className="ml-2 text-sm font-medium text-violet-600">({category.languageName})</span>
                  )}
                </h2>
                <span className="text-sm text-gray-500">({category.audioList.length}개)</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {category.audioList.map((audio) => (
                  <AudioCard key={audio.id} audio={audio} isLoggedIn={isLoggedIn} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* 비로그인 안내 */}
      {!isLoggedIn && groupedCategories.length > 0 && (
        <div className="mt-8 bg-violet-50 border border-violet-200 rounded-lg p-6 text-center">
          <p className="text-sm text-violet-800 mb-3">로그인하면 학습 기록을 저장하고 메모를 남길 수 있습니다.</p>
          <Link
            href="/auth/login?redirectTo=/lb-audio"
            className="inline-flex items-center px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition text-sm font-medium"
          >
            로그인
          </Link>
        </div>
      )}
    </div>
  );
}
