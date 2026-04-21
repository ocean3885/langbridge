import Link from 'next/link';
import { Video, Plus } from 'lucide-react';

interface EmptyVideoStateProps {
  categoryName?: string | null;
}

export default function EmptyVideoState({ categoryName }: EmptyVideoStateProps) {
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-12 text-center">
      <Video className="w-16 h-16 text-gray-400 mx-auto mb-4" />
      <h3 className="text-xl font-semibold text-gray-700 mb-2">
        {categoryName
          ? `${categoryName} 카테고리에 등록된 영상이 없습니다`
          : '아직 등록된 영상이 없습니다'}
      </h3>
      <p className="text-gray-500 mb-4">첫 영상을 등록하여 학습을 시작해보세요.</p>
      <Link
        href="/upload?tab=video"
        className="inline-flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm font-medium"
      >
        <Plus className="w-5 h-5" />
        영상 등록
      </Link>
    </div>
  );
}
