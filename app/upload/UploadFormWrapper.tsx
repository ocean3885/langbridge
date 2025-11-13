'use client';

import { useState } from 'react';
import { Settings } from 'lucide-react';
import UploadForm from './UploadForm';
import CategoryManageModal from '@/components/CategoryManageModal';

interface Category {
  id: number;
  name: string;
  language_id?: number | null;
}

interface Language {
  id: number;
  name_ko: string;
  code: string;
}

interface Props {
  processFileAction: (formData: FormData) => Promise<void>;
  initialCategories: Category[];
  initialLanguages: Language[];
  showManageButton?: boolean;
}

export default function UploadFormWrapper({ processFileAction, initialCategories, initialLanguages, showManageButton }: Props) {
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [languages] = useState<Language[]>(initialLanguages);
  const [showManageModal, setShowManageModal] = useState(false);

  async function handleCategoryAdded() {
    // 카테고리 목록 다시 불러오기
    try {
      const response = await fetch('/api/categories');
      if (response.ok) {
        const data = await response.json();
        setCategories(data);
      }
    } catch (error) {
      console.error('카테고리 목록 새로고침 실패:', error);
    }
  }

  return (
    <>
      {showManageButton && (
        <div className="mb-4 flex justify-end">
          <button
            onClick={() => setShowManageModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md font-medium transition-colors"
          >
            <Settings className="w-4 h-4" />
            카테고리 관리
          </button>
        </div>
      )}

      <UploadForm
        processFileAction={processFileAction}
        categories={categories}
        languages={languages}
        onCategoryAdded={handleCategoryAdded}
      />

      <CategoryManageModal
        isOpen={showManageModal}
        onClose={() => setShowManageModal(false)}
        onCategoryChanged={handleCategoryAdded}
      />
    </>
  );
}
