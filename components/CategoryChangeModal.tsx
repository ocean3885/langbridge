'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type Category = {
  id: number;
  name: string;
  languageName?: string;
};

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (categoryId: number | null) => void;
  selectedCount: number;
  initialCategories: Category[];
}

export default function CategoryChangeModal({ isOpen, onClose, onConfirm, selectedCount, initialCategories }: Props) {
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setCategories(initialCategories);
    // 모달이 열릴 때 선택 상태 초기화
    if (isOpen) {
      setSelectedCategoryId(null);
      setError('');
      setIsAddingNew(false);
      setNewCategoryName('');
    }
  }, [initialCategories, isOpen]);

  const handleAddNewCategory = async () => {
    if (!newCategoryName.trim()) {
      setError('카테고리 이름을 입력하세요.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCategoryName.trim() })
      });

      if (res.ok) {
        const newCategory = await res.json();
        setCategories([...categories, newCategory]);
        setSelectedCategoryId(newCategory.id);
        setNewCategoryName('');
        setIsAddingNew(false);
      } else {
        const errorData = await res.json();
        setError(errorData.error || '카테고리 추가에 실패했습니다.');
      }
    } catch (err) {
      setError('카테고리 추가 중 오류가 발생했습니다.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirm = () => {
    onConfirm(selectedCategoryId);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md bg-white p-5 sm:p-6 space-y-4 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h2 className="text-lg sm:text-xl font-bold">카테고리 변경</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        <p className="text-xs sm:text-sm text-gray-600">
          선택한 {selectedCount}개 항목의 카테고리를 변경합니다.
        </p>

        {error && (
          <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
            {error}
          </div>
        )}

        <div className="space-y-3">
          <Label className="text-sm">카테고리 선택</Label>
          <div className="space-y-2 max-h-60 overflow-y-auto border rounded p-2">
            <label className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer">
              <input
                type="radio"
                name="category"
                value="uncategorized"
                checked={selectedCategoryId === null}
                onChange={() => setSelectedCategoryId(null)}
                className="w-4 h-4"
              />
              <span className="text-sm">미분류</span>
            </label>
            {categories.map(cat => (
              <label
                key={cat.id}
                className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
              >
                <input
                  type="radio"
                  name="category"
                  value={cat.id}
                  checked={selectedCategoryId === cat.id}
                  onChange={() => setSelectedCategoryId(cat.id)}
                  className="w-4 h-4"
                />
                <span className="text-sm">
                  {cat.name}
                  {cat.languageName && (
                    <span className="ml-1 text-xs text-blue-600">({cat.languageName})</span>
                  )}
                </span>
              </label>
            ))}
          </div>

          {!isAddingNew && (
            <button
              onClick={() => setIsAddingNew(true)}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              + 새 카테고리 추가
            </button>
          )}

          {isAddingNew && (
            <div className="space-y-2 border-t pt-3">
              <Label htmlFor="new-category" className="text-sm">새 카테고리 이름</Label>
              <div className="flex gap-2">
                <Input
                  id="new-category"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="카테고리 이름 입력"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddNewCategory();
                    }
                  }}
                />
                <Button
                  onClick={handleAddNewCategory}
                  disabled={isLoading}
                  size="sm"
                >
                  {isLoading ? '추가 중...' : '추가'}
                </Button>
                <Button
                  onClick={() => {
                    setIsAddingNew(false);
                    setNewCategoryName('');
                    setError('');
                  }}
                  variant="outline"
                  size="sm"
                >
                  취소
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-4">
          <Button
            onClick={handleConfirm}
            className="w-full sm:flex-1 bg-blue-600 hover:bg-blue-700 text-white"
          >
            변경
          </Button>
          <Button
            onClick={onClose}
            variant="outline"
            className="w-full sm:flex-1"
          >
            취소
          </Button>
        </div>
      </Card>
    </div>
  );
}
