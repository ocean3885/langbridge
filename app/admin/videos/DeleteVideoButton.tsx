'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { deleteVideo } from '@/app/actions/video';
import { Trash2 } from 'lucide-react';

interface DeleteVideoButtonProps {
  videoId: string;
  videoTitle: string;
}

export default function DeleteVideoButton({ videoId, videoTitle }: DeleteVideoButtonProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm(`"${videoTitle}" 영상을 삭제하시겠습니까?\n\n관련된 모든 스크립트와 번역이 함께 삭제됩니다.`)) {
      return;
    }

    setIsDeleting(true);
    try {
      const result = await deleteVideo(videoId);
      if (result.success) {
        router.refresh();
      } else {
        alert(result.error || '영상 삭제에 실패했습니다.');
      }
    } catch (error) {
      console.error('Delete error:', error);
      alert('영상 삭제 중 오류가 발생했습니다.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <button
      onClick={handleDelete}
      disabled={isDeleting}
      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
      title="삭제"
    >
      <Trash2 className="w-4 h-4" />
    </button>
  );
}
