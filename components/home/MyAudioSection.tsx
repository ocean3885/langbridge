import Link from 'next/link';
import { FolderOpen } from 'lucide-react';
import AudioCard from '@/components/AudioCard';

export interface UserAudio {
  id: string;
  title: string | null;
  created_at: string;
  category_id: number | null;
}

export interface AudioCategory {
  id: number | null;
  name: string;
  languageName: string;
  audioList: UserAudio[];
}

interface MyAudioSectionProps {
  isLoggedIn: boolean;
  categories: AudioCategory[];
}

export default function MyAudioSection({ isLoggedIn, categories }: MyAudioSectionProps) {
  return (
    <div id="audio-list" className="max-w-7xl mx-auto scroll-mt-20">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-bold text-gray-900">내 오디오 목록</h2>
        {isLoggedIn && categories.length > 0 && (
          <Link 
            href="/my-audio" 
            className="text-sm font-semibold text-blue-600 hover:text-blue-700 transition flex items-center gap-1"
          >
            전체 보기
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        )}
      </div>

      {/* 비로그인 */}
      {!isLoggedIn && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-xl p-8 text-center space-y-4">
          <h3 className="text-xl font-bold text-gray-800">나만의 학습 오디오를 만들어 반복 학습을 시작하세요</h3>
          <p className="text-sm text-gray-600 leading-relaxed">
            문장을 입력하면 스페인어 TTS로 자동 변환되고, 맞춤형 반복 패턴으로 청취/그림자 따라하기 학습을 할 수 있습니다.<br/>
            가입 후 직접 문장을 업로드해 나만의 학습 재생 리스트를 구축해 보세요.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/auth/sign-up" className="px-6 py-3 rounded-lg bg-blue-600 text-white font-semibold shadow hover:bg-blue-700 transition">무료로 가입하기</Link>
            <Link href="/upload" className="px-6 py-3 rounded-lg bg-white border border-gray-300 text-gray-800 font-semibold hover:bg-gray-50 transition">문장 업로드 미리보기</Link>
          </div>
        </div>
      )}

      {/* 로그인 + 빈 상태 */}
      {isLoggedIn && categories.length === 0 && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-xl p-8 text-center space-y-6">
          <div className="space-y-2">
            <h3 className="text-xl sm:text-2xl font-bold text-gray-800">첫 오디오를 만들어 학습을 시작해보세요</h3>
            <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
              문장을 입력하면 고품질 TTS로 오디오가 생성되고, 플레이어에서 문장별 반복과 메모로 학습할 수 있어요.
            </p>
          </div>
          <ul className="text-left mx-auto max-w-2xl space-y-2 text-sm sm:text-base">
            <li className="flex items-start gap-2"><span className="mt-0.5">📝</span><span>문장 입력 또는 붙여넣기 (여러 문장도 가능)</span></li>
            <li className="flex items-start gap-2"><span className="mt-0.5">🌐</span><span>언어와 카테고리를 선택해 깔끔하게 정리</span></li>
            <li className="flex items-start gap-2"><span className="mt-0.5">🔁</span><span>생성된 오디오에서 구간 반복과 그림자 따라하기</span></li>
            <li className="flex items-start gap-2"><span className="mt-0.5">🗒️</span><span>문장별 메모로 깨달음과 예문을 기록</span></li>
          </ul>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/upload" className="px-6 py-3 rounded-lg bg-blue-600 text-white font-semibold shadow hover:bg-blue-700 transition">
              지금 업로드
            </Link>
          </div>
          <p className="text-xs text-gray-500">업로드는 언제든 삭제할 수 있어요. 나만의 학습 리듬을 만들어보세요!</p>
        </div>
      )}

      {/* 로그인 + 데이터 있음 */}
      {isLoggedIn && categories.length > 0 && (
        <div className="space-y-10">
          {categories.map(category => (
            <section key={category.id ?? 'uncategorized'} className="space-y-4">
              <div className="flex items-center gap-3 border-b-2 border-gray-200 pb-2">
                <FolderOpen className="w-6 h-6 text-blue-600" />
                  <h3 className="text-xl font-bold text-gray-800">
                    {category.name}
                    {category.languageName && (
                      <span className="ml-2 text-sm font-medium text-blue-600">({category.languageName})</span>
                    )}
                  </h3>
                <span className="text-sm text-gray-500">({category.audioList.length}개)</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {category.audioList.map(audio => (
                  <AudioCard
                    key={audio.id}
                    audio={audio}
                    isLoggedIn={true}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
