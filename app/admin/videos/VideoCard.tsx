'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Play, Save, Loader2, Pencil } from 'lucide-react';
import { updateEduVideoPlacement } from '@/app/actions/edu-video';
import DeleteVideoButton from './DeleteVideoButton';

interface Channel {
  id: string;
  channel_name: string;
  channel_url: string | null;
  language_id: number | null;
}

interface VideoCardProps {
  video: {
    id: string;
    title: string;
    description: string | null;
    thumbnail_url: string | null;
    channel_id: string | null;
    category_id: string | null;
    created_at?: string;
  };
  channels: Channel[];
  categories: Array<{
    id: number;
    name: string;
  }>;
}

export default function VideoCard({ video, channels, categories }: VideoCardProps) {
  const [selectedChannelId, setSelectedChannelId] = useState<string>(video.channel_id || '');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(video.category_id || '');
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const hasChanges =
    selectedChannelId !== (video.channel_id || '') ||
    selectedCategoryId !== (video.category_id || '');

  const handleSave = async () => {
    if (!hasChanges) return;

    setIsSaving(true);
    setMessage(null);

    const result = await updateEduVideoPlacement({
      videoId: video.id,
      channelId: selectedChannelId || null,
      categoryId: selectedCategoryId || null,
    });

    setIsSaving(false);

    if (result.success) {
      setMessage({ type: 'success', text: '채널과 카테고리가 저장되었습니다.' });
      setTimeout(() => setMessage(null), 3000);
    } else {
      setMessage({ type: 'error', text: result.error || '저장에 실패했습니다.' });
    }
  };

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden hover:shadow-lg transition-shadow bg-white">
      {/* 썸네일 */}
      <div className="relative aspect-video bg-gray-900">
        {video.thumbnail_url ? (
          <Image
            src={video.thumbnail_url}
            alt={video.title}
            fill
            className="object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Play className="w-16 h-16 text-gray-600" />
          </div>
        )}
      </div>

      {/* 정보 */}
      <div className="p-4">
        <h4 className="font-semibold text-base mb-2 line-clamp-2">{video.title}</h4>
        {video.description && (
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">
            {video.description}
          </p>
        )}
        <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
          <span>교육 영상</span>
          {video.created_at && <span>{new Date(video.created_at).toLocaleDateString('ko-KR')}</span>}
        </div>

        {/* 채널/카테고리 선택 */}
        <div className="mb-3">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            채널
          </label>
          <div className="flex gap-2">
            <select
              value={selectedChannelId}
              onChange={(e) => setSelectedChannelId(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isSaving}
            >
                <option value="">채널 미지정</option>
              {channels.map((channel) => (
                <option key={channel.id} value={channel.id}>
                  {channel.channel_name}
                </option>
              ))}
            </select>
            <button
              onClick={handleSave}
              disabled={!hasChanges || isSaving}
              className="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-1 text-sm"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
            </button>
          </div>
          {message && (
            <p className={`text-xs mt-1 ${message.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
              {message.text}
            </p>
          )}
        </div>

        <div className="mb-3">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            카테고리
          </label>
          <select
            value={selectedCategoryId}
            onChange={(e) => setSelectedCategoryId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isSaving}
          >
            <option value="">카테고리 미지정</option>
            {categories.map((category) => (
              <option key={category.id} value={String(category.id)}>
                {category.name}
              </option>
            ))}
          </select>
        </div>

        {/* 액션 버튼 */}
        <div className="flex gap-2">
          <Link
            href={`/admin/videos/${video.id}/edit`}
            className="px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-center text-sm font-medium inline-flex items-center justify-center"
            title="영상 수정"
          >
            <Pencil className="w-4 h-4" />
          </Link>
          <Link
            href={`/videos/${video.id}`}
            className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-center text-sm font-medium"
          >
            학습하기
          </Link>
          <DeleteVideoButton videoId={video.id} videoTitle={video.title} />
        </div>
      </div>
    </div>
  );
}
