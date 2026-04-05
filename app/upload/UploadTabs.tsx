'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { AudioLines, Video } from 'lucide-react';
import UploadFormWrapper from './UploadFormWrapper';
import VideoUploadFormWrapper from './VideoUploadFormWrapper';
import { processFileAction } from './actions';

type TabType = 'audio' | 'video';

interface UploadTabsProps {
  audioCategories: Array<{ id: number; name: string; language_id: number | null }>;
  videoCategories: Array<{ id: number; name: string; language_id: number | null }>;
  initialLanguages: Array<{ id: number; name_ko: string; code: string }>;
  canSelectVideoVisibility: boolean;
  isAdmin: boolean;
}

export default function UploadTabs({ 
  audioCategories,
  videoCategories,
  initialLanguages,
  canSelectVideoVisibility,
  isAdmin,
}: UploadTabsProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tabParam = searchParams.get('tab') as TabType | null;
  const [activeTab, setActiveTab] = useState<TabType>(
    isAdmin ? (tabParam || 'audio') : 'video'
  );

  useEffect(() => {
    if (tabParam && (tabParam === 'audio' || tabParam === 'video')) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    router.push(`/upload?tab=${tab}`, { scroll: false });
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* 탭 헤더 */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-4">콘텐츠 생성</h1>
        
        {/* 탭 버튼 */}
        {isAdmin ? (
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => handleTabChange('audio')}
              className={`flex items-center gap-2 px-6 py-3 font-medium transition-colors ${
                activeTab === 'audio'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <AudioLines className="w-5 h-5" />
              오디오 생성
            </button>
            <button
              onClick={() => handleTabChange('video')}
              className={`flex items-center gap-2 px-6 py-3 font-medium transition-colors ${
                activeTab === 'video'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Video className="w-5 h-5" />
              영상 등록
            </button>
          </div>
        ) : (
          <div className="border-b border-gray-200">
            <div className="flex items-center gap-2 px-6 py-3 text-blue-600 border-b-2 border-blue-600 font-medium w-fit">
              <Video className="w-5 h-5" />
              영상 등록
            </div>
          </div>
        )}
      </div>

      {/* 탭 컨텐츠 */}
      <div className="mt-6">
        {activeTab === 'audio' && isAdmin && (
          <div>
            {/* 안내 메시지 */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <h2 className="font-semibold text-blue-900 mb-2">📝 업로드 가이드</h2>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• 입력 방식: TXT 파일 업로드 또는 텍스트 직접 입력</li>
                <li>• 형식: 외국어 문장과 한국어 번역을 한 줄씩 번갈아 입력</li>
                <li>• 예시: &ldquo;Hola&rdquo; (첫 줄) → &ldquo;안녕하세요&rdquo; (둘째 줄)</li>
                <li>• 처리 시간은 문장 수에 따라 다를 수 있습니다</li>
              </ul>
            </div>

            <UploadFormWrapper 
              processFileAction={processFileAction} 
              initialCategories={audioCategories} 
              initialLanguages={initialLanguages}
              showManageButton={true}
            />
          </div>
        )}

        {activeTab === 'video' && (
          <div>
            {/* 안내 메시지 */}
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
              <h2 className="font-semibold text-purple-900 mb-2">🎥 영상 등록 가이드</h2>
              <ul className="text-sm text-purple-800 space-y-1">
                <li>• YouTube 영상 URL을 입력하세요</li>
                <li>• CSV 파일 형식: 시작시간,원문,번역</li>
                <li>• 예시: 0:00:10,good afternoon,좋은 오후입니다</li>
              </ul>
            </div>

            <VideoUploadFormWrapper
              initialCategories={videoCategories}
              initialLanguages={initialLanguages}
              canSelectVisibility={canSelectVideoVisibility}
            />
          </div>
        )}
      </div>
    </div>
  );
}
