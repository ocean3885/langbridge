'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { X } from 'lucide-react';

type Memo = {
  id?: number;
  memo_text: string;
};

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (memoText: string) => Promise<void>;
  sentenceText: string;
  sentenceTranslation: string;
  existingMemo?: Memo;
}

export default function MemoModal({
  isOpen,
  onClose,
  onSave,
  sentenceText,
  sentenceTranslation,
  existingMemo
}: Props) {
  const [memoText, setMemoText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setMemoText(existingMemo?.memo_text || '');
      setError('');
    }
  }, [isOpen, existingMemo]);

  const handleSave = async () => {
    const trimmed = memoText.trim();
    if (!trimmed) {
      setError('메모 내용을 입력하세요.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await onSave(trimmed);
      onClose();
    } catch (err) {
      setError('메모 저장에 실패했습니다.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl bg-white p-5 sm:p-6 space-y-4 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h2 className="text-lg sm:text-xl font-bold">
            {existingMemo ? '메모 수정' : '메모 추가'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
            disabled={isLoading}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 문장 표시 */}
        <div className="bg-gray-50 p-4 rounded-lg space-y-2">
          <div>
            <Label className="text-sm font-semibold text-gray-700">원문</Label>
            <p className="text-base mt-1">{sentenceText}</p>
          </div>
          <div>
            <Label className="text-sm font-semibold text-gray-700">번역</Label>
            <p className="text-sm text-gray-600 mt-1">{sentenceTranslation}</p>
          </div>
        </div>

        {error && (
          <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
            {error}
          </div>
        )}

        {/* 메모 입력 */}
        <div className="space-y-2">
          <Label htmlFor="memo-text" className="text-sm font-semibold">
            메모
          </Label>
          <textarea
            id="memo-text"
            value={memoText}
            onChange={(e) => setMemoText(e.target.value)}
            placeholder="이 문장에 대한 메모를 입력하세요..."
            className="w-full min-h-[120px] p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
            disabled={isLoading}
          />
        </div>

        {/* 액션 버튼 */}
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-4">
          <Button
            onClick={handleSave}
            disabled={isLoading || !memoText.trim()}
            className="w-full sm:flex-1 bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isLoading ? '저장 중...' : '저장'}
          </Button>
          <Button
            onClick={onClose}
            variant="outline"
            className="w-full sm:flex-1"
            disabled={isLoading}
          >
            취소
          </Button>
        </div>
      </Card>
    </div>
  );
}
