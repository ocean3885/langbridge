"use client";

import { useTransition } from 'react';
import type React from 'react';
import { Trash2 } from 'lucide-react';

interface Props {
  onDelete: () => Promise<void>;
}

// 재사용 가능한 삭제 버튼: confirm 후 서버 액션 실행
export default function DeleteAudioButton({ onDelete }: Props) {
  const [isPending, startTransition] = useTransition();

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!confirm('정말 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) return;
    startTransition(async () => {
      try {
        await onDelete();
      } catch (err) {
        const msg = err instanceof Error ? err.message : '알 수 없는 오류 발생';
        alert('삭제 실패: ' + msg);
      }
    });
  };

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-red-400"
      aria-label="오디오 삭제"
    >
      <Trash2 className="w-3 h-3" /> {isPending ? '삭제 중...' : '삭제'}
    </button>
  );
}
