'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Play, Save, Loader2 } from 'lucide-react';
import { updateVideoChannel } from '@/app/actions/video';
import DeleteVideoButton from './DeleteVideoButton';

interface Channel {
  id: string;
  channel_name: string;
  channel_url: string | null;
  language_id: number;
}

interface VideoCardProps {
  video: {
    id: string;
    title: string;
    description: string | null;
    thumbnail_url: string | null;
    duration: number | null;
    transcript_count: number;
    channel_id: string | null;
  };
  channels: Channel[];
}

export default function VideoCard({ video, channels }: VideoCardProps) {
  const [selectedChannelId, setSelectedChannelId] = useState<string>(video.channel_id || '');
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const hasChanges = selectedChannelId !== (video.channel_id || '');

  const handleSave = async () => {
    if (!hasChanges) return;

    setIsSaving(true);
    setMessage(null);

    const result = await updateVideoChannel(
      video.id, 
      selectedChannelId === '' ? null : selectedChannelId
    );

    setIsSaving(false);

    if (result.success) {
      setMessage({ type: 'success', text: '채널이 저장되었습니다.' });
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
          <span>스크립트: {video.transcript_count || 0}개</span>
          {video.duration && <span>{Math.floor(video.duration / 60)}분</span>}
        </div>

        {/* 채널 선택 */}
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

        {/* 액션 버튼 */}
        <div className="flex gap-2">
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
