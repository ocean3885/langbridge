'use client';

import { useState } from 'react';
import { Settings } from 'lucide-react';
import CategoryManageModal from '@/components/common/CategoryManageModal';
import { useRouter } from 'next/navigation';

interface Category {
  id: number;
  name: string;
  language_id?: number | null;
  content_count?: number;
}

interface Language {
  id: number;
  name_ko: string;
  code: string;
}

interface Props {
  initialCategories: Category[];
  initialLanguages: Language[];
}

export default function CategoryManageButton({ initialCategories, initialLanguages }: Props) {
  const [showManageModal, setShowManageModal] = useState(false);
  const router = useRouter();

  async function handleCategoryChanged() {
    // 카테고리가 변경되면 페이지를 새로고침하여 서버 컴포넌트의 데이터를 업데이트합니다.
    router.refresh();
  }

  return (
    <>
      <button
        onClick={() => setShowManageModal(true)}
        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
      >
        <Settings className="w-5 h-5" />
        카테고리 관리
      </button>

      <CategoryManageModal
        isOpen={showManageModal}
        onClose={() => setShowManageModal(false)}
        onCategoryChanged={handleCategoryChanged}
        initialCategories={initialCategories}
        initialLanguages={initialLanguages}
        apiEndpoint="/api/user-categories"
        contentType="비디오"
      />
    </>
  );
}
