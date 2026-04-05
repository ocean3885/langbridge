import Link from 'next/link';
import { FolderOpen, BookOpen } from 'lucide-react';
import AudioCard from '@/components/AudioCard';

export interface LBAudio {
  id: string;
  title: string | null;
  created_at: string;
  category_id: number | null;
}

export interface LBAudioCategory {
  id: number | null;
  name: string;
  languageName: string;
  audioList: LBAudio[];
}

interface LBAudioSectionProps {
  isLoggedIn: boolean;
  categories: LBAudioCategory[];
}

export default function LBAudioSection({ isLoggedIn, categories }: LBAudioSectionProps) {
  return (
    <div id="audio-list" className="max-w-7xl mx-auto scroll-mt-20">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <BookOpen className="w-6 h-6 text-violet-600" />
          <h2 className="text-2xl font-bold text-gray-900">LB 문장 학습</h2>
        </div>
        {categories.length > 0 && (
          <Link
            href="/lb-audio"
            className="text-sm font-semibold text-violet-600 hover:text-violet-700 transition flex items-center gap-1"
          >
            전체 보기
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        )}
      </div>

      {/* 데이터 없음 */}
      {categories.length === 0 && (
        <div className="bg-gradient-to-r from-violet-50 to-indigo-50 border border-violet-100 rounded-xl p-8 text-center space-y-4">
          <h3 className="text-xl font-bold text-gray-800">문장 학습 콘텐츠가 준비 중입니다</h3>
          <p className="text-sm text-gray-600 leading-relaxed">
            운영자가 업로드한 문장 학습 오디오가 이곳에 표시됩니다.<br />
            TTS 기반 반복 학습으로 실전 표현력을 키워보세요.
          </p>
        </div>
      )}

      {/* 데이터 있음 */}
      {categories.length > 0 && (
        <div className="space-y-10">
          {categories.map((category) => (
            <section key={category.id ?? 'uncategorized'} className="space-y-4">
              <div className="flex items-center gap-3 border-b-2 border-gray-200 pb-2">
                <FolderOpen className="w-6 h-6 text-violet-600" />
                <h3 className="text-xl font-bold text-gray-800">
                  {category.name}
                  {category.languageName && (
                    <span className="ml-2 text-sm font-medium text-violet-600">({category.languageName})</span>
                  )}
                </h3>
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
    </div>
  );
}
