'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Settings } from 'lucide-react';
import CategoryManageModal from '@/components/common/CategoryManageModal';

interface Category {
  id: number;
  name: string;
  language_id: number | null;
}

interface Language {
  id: number;
  name_ko: string;
  code: string;
}

interface EduVideoCategoryManageButtonProps {
  initialCategories: Category[];
  initialLanguages: Language[];
}

export default function EduVideoCategoryManageButton({
  initialCategories,
  initialLanguages,
}: EduVideoCategoryManageButtonProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [categories, setCategories] = useState(initialCategories);

  async function handleCategoryChanged() {
    try {
      const response = await fetch('/api/edu-video-categories');
      if (response.ok) {
        const data = await response.json();
        setCategories(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('교육 영상 카테고리 목록 새로고침 실패:', error);
    }

    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
      >
        <Settings className="h-4 w-4" />
        카테고리 관리
      </button>

      <CategoryManageModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onCategoryChanged={handleCategoryChanged}
        initialCategories={categories}
        initialLanguages={initialLanguages}
        apiEndpoint="/api/edu-video-categories"
        contentType="교육 영상"
      />
    </>
  );
}