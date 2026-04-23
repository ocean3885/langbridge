import Link from 'next/link';
import Image from 'next/image';
import { Video, Clock, Tag } from 'lucide-react';
import { formatDuration, relativeFromNowKo } from '@/lib/utils';
import type { VideoItem } from './types';
import type { SqliteVideoProgress } from '@/lib/sqlite/video-progress';

interface VideoCardProps {
  video: VideoItem;
  progress?: SqliteVideoProgress;
  priority?: boolean;
}

export default function VideoCard({ video, progress, priority = false }: VideoCardProps) {
  return (
    <Link
      href={`/my-videos/${video.id}`}
      className="group flex flex-col bg-white rounded-2xl shadow-sm border border-gray-200 hover:shadow-lg transition-all duration-300 overflow-hidden"
    >
      <div className="flex flex-col h-full">
        {/* 썸네일 */}
        <div className="relative w-full aspect-video flex-shrink-0 bg-gray-100 rounded-t-2xl overflow-hidden">
          {video.thumbnail_url ? (
            <Image
              src={video.thumbnail_url}
              alt={video.title}
              fill
              sizes="(max-width: 640px) 100vw, 160px"
              className="object-cover"
              priority={priority}
            />
          ) : (
            <div className="flex items-center justify-center w-full h-full">
              <Video className="w-10 h-10 text-gray-400" />
            </div>
          )}

          {/* 시간 배지 */}
          {video.duration !== null && (
            <div className="absolute bottom-1 right-1 bg-black/75 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>{formatDuration(video.duration)}</span>
            </div>
          )}
        </div>

        {/* 비디오 정보 */}
        <div className="p-4 flex flex-col flex-grow">
          {/* 카테고리 배지 */}
          <div className="flex items-center mb-2">
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] sm:text-[11px] font-bold rounded-full border ${
                video.category_name
                  ? 'bg-blue-50 text-blue-700 border-blue-100'
                  : 'bg-gray-50 text-gray-500 border-gray-200'
              }`}
            >
              <Tag className="w-3 h-3" />
              {video.category_name || '미지정'}
            </span>
          </div>

          <div className="flex items-center justify-between gap-2 mb-2">
            <h3 className="font-bold text-gray-900 text-base line-clamp-2 group-hover:text-blue-600 transition-colors">
              {video.title}
            </h3>
          </div>

          {/* 학습 진행 바 (수치) */}
          {(() => {
            if (!progress || progress.total_scripts === 0) return <div className="mt-auto" />;
            const pct = progress.mastery_pct;
            const barColor =
              pct >= 100 ? 'bg-emerald-500' : pct > 0 ? 'bg-blue-500' : 'bg-gray-300';
            return (
              <div className="flex flex-col gap-1 mb-3 mt-auto">
                <div className="flex items-center justify-between text-[10px] font-semibold">
                  <span
                    className={
                      pct >= 100 ? 'text-emerald-600' : pct > 0 ? 'text-blue-600' : 'text-gray-500'
                    }
                  >
                    {pct >= 100 ? '학습 완료' : `${pct}% 진행`}
                  </span>
                  <span className="text-gray-500 tabular-nums">
                    {progress.mastered_scripts} / {progress.total_scripts}
                  </span>
                </div>
                <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${barColor}`}
                    style={{ width: `${Math.min(pct, 100)}%` }}
                  />
                </div>
              </div>
            );
          })()}

          <div className="mt-auto pt-3 border-t border-gray-100 text-[11px] text-gray-500 flex flex-wrap gap-2 items-center justify-between">
            <div className="flex gap-2 items-center">
              {video.language_name && <span>🌐 {video.language_name}</span>}
              <span>📝 {video.transcript_count}문장</span>
            </div>
            <span>
              {(() => {
                const lastStudied = progress?.last_studied_at;
                if (lastStudied) {
                  return `📖 ${relativeFromNowKo(lastStudied)}`;
                }
                return relativeFromNowKo(video.created_at);
              })()}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
