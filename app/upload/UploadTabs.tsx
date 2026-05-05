'use client';

import { Video } from 'lucide-react';
import VideoUploadFormWrapper from './VideoUploadFormWrapper';

interface UploadTabsProps {
  videoCategories: Array<{ id: number; name: string; language_id: number | null }>;
  initialLanguages: Array<{ id: number; name_ko: string; code: string }>;
  canSelectVideoVisibility: boolean;
  isAdmin: boolean;
}

export default function UploadTabs({ 
  videoCategories,
  initialLanguages,
  canSelectVideoVisibility,
}: UploadTabsProps) {
  return (
    <div className="max-w-4xl mx-auto">
      {/* 헤더 */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-4">콘텐츠 생성</h1>
        
        <div className="border-b border-gray-200">
          <div className="flex items-center gap-2 px-6 py-3 text-blue-600 border-b-2 border-blue-600 font-medium w-fit">
            <Video className="w-5 h-5" />
            영상 등록
          </div>
        </div>
      </div>

      {/* 컨텐츠 */}
      <div className="mt-6">
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
      </div>
    </div>
  );
}
