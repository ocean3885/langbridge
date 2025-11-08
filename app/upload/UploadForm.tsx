'use client';

import { useState } from 'react';

interface Category {
  id: number;
  name: string;
}

interface Props {
  processFileAction: (formData: FormData) => Promise<void>;
  categories: Category[];
  onCategoryAdded?: () => void;
}

export default function UploadForm({ processFileAction, categories, onCategoryAdded }: Props) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isAddingCategory, setIsAddingCategory] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData(e.currentTarget);
      await processFileAction(formData);
    } catch (err) {
      setError(err instanceof Error ? err.message : '업로드 중 오류가 발생했습니다.');
    } finally {
      setIsUploading(false);
    }
  }

  async function handleAddCategory() {
    if (!newCategoryName.trim()) {
      setError('카테고리 이름을 입력하세요.');
      return;
    }

    setIsAddingCategory(true);
    setError(null);

    try {
      const response = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCategoryName.trim() })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || '카테고리 추가에 실패했습니다.');
      }

      setNewCategoryName('');
      setShowAddCategory(false);
      
      // 부모 컴포넌트에 카테고리가 추가되었음을 알림
      if (onCategoryAdded) {
        onCategoryAdded();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '카테고리 추가 중 오류가 발생했습니다.');
    } finally {
      setIsAddingCategory(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-white shadow-md rounded-lg p-6">
      <div>
        <label htmlFor="title" className="block text-sm font-semibold text-gray-700 mb-2">
          제목 <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          name="title"
          id="title"
          required
          disabled={isUploading}
          className="w-full border border-gray-300 rounded-md p-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
          placeholder="예: 스페인어 기초 회화"
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label htmlFor="category" className="block text-sm font-semibold text-gray-700">
            카테고리
          </label>
          <button
            type="button"
            onClick={() => setShowAddCategory(!showAddCategory)}
            disabled={isUploading}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium disabled:text-gray-400"
          >
            {showAddCategory ? '취소' : '+ 새 카테고리'}
          </button>
        </div>

        {showAddCategory ? (
          <div className="space-y-2">
            <div className="flex gap-2">
              <input
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="새 카테고리 이름"
                disabled={isAddingCategory}
                className="flex-1 border border-gray-300 rounded-md p-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
              />
              <button
                type="button"
                onClick={handleAddCategory}
                disabled={isAddingCategory || !newCategoryName.trim()}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {isAddingCategory ? '추가 중...' : '추가'}
              </button>
            </div>
          </div>
        ) : (
          <select
            name="category"
            id="category"
            disabled={isUploading}
            className="w-full border border-gray-300 rounded-md p-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
          >
            <option value="">선택 안 함</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        )}
      </div>

      <div>
        <label htmlFor="input_file" className="block text-sm font-semibold text-gray-700 mb-2">
          TXT 파일 <span className="text-red-500">*</span>
        </label>
        <input
          type="file"
          name="input_file"
          id="input_file"
          accept=".txt"
          required
          disabled={isUploading}
          className="w-full border border-gray-300 rounded-md p-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
        />
        <p className="mt-2 text-sm text-gray-500">
          스페인어와 한국어가 번갈아 나오는 TXT 파일을 업로드하세요
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-800 text-sm">❌ {error}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={isUploading}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
      >
        {isUploading ? (
          <span className="flex items-center justify-center">
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            처리 중... (수 분 소요될 수 있습니다)
          </span>
        ) : (
          '업로드 및 처리 시작'
        )}
      </button>
    </form>
  );
}
