'use client';

import { useState } from 'react';
import UploadForm from './UploadForm';

interface Category {
  id: number;
  name: string;
}

interface Props {
  processFileAction: (formData: FormData) => Promise<void>;
  initialCategories: Category[];
}

export default function UploadFormWrapper({ processFileAction, initialCategories }: Props) {
  const [categories, setCategories] = useState<Category[]>(initialCategories);

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
    <UploadForm
      processFileAction={processFileAction}
      categories={categories}
      onCategoryAdded={handleCategoryAdded}
    />
  );
}
