'use client';

import { 
  Users, 
  AudioLines, 
  FolderTree, 
  Settings
} from 'lucide-react';

export default function AdminDashboard() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* 메인 콘텐츠 영역 */}
      <div className="ml-64 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">관리자 대시보드</h1>
            <p className="text-gray-600 mt-2">시스템 현황을 확인하고 관리할 수 있습니다.</p>
          </div>

          {/* 통계 카드 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">전체 사용자</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">-</p>
                </div>
                <Users className="w-10 h-10 text-blue-500" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">전체 오디오</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">-</p>
                </div>
                <AudioLines className="w-10 h-10 text-green-500" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">카테고리</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">-</p>
                </div>
                <FolderTree className="w-10 h-10 text-purple-500" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">프리미엄 사용자</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">-</p>
                </div>
                <Settings className="w-10 h-10 text-orange-500" />
              </div>
            </div>
          </div>

          {/* 최근 활동 */}
          <div className="bg-white rounded-lg shadow border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">최근 활동</h2>
            </div>
            <div className="p-6">
              <p className="text-gray-500 text-center py-8">
                기능을 하나씩 추가할 예정입니다.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
