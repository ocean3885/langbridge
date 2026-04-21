import Link from 'next/link';
import Image from 'next/image';
import { Video, Clock, Globe } from 'lucide-react';
import { formatDuration } from '@/lib/utils';

export interface LBVideo {
  id: string;
  title: string;
  youtube_id: string;
  thumbnail_url: string | null;
  duration: number | null;
  created_at: string;
  channel_name: string | null;
  language_name: string | null;
}

interface LBVideoSectionProps {
  videos: LBVideo[];
}

export default function LBVideoSection({ videos }: LBVideoSectionProps) {
  if (videos.length === 0) return null;

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Globe className="w-6 h-6 text-emerald-600" />
          <h2 className="text-2xl font-bold text-gray-900">LB 학습 영상</h2>
        </div>
        <Link
          href="/lb-videos"
          className="text-sm font-semibold text-emerald-600 hover:text-emerald-700 transition flex items-center gap-1"
        >
          전체 보기
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {videos.map((video) => (
          <Link
            key={video.id}
            href={`/lb-videos/${video.id}`}
            className="group bg-white rounded-lg shadow border border-gray-100 hover:shadow-lg transition-all duration-300 overflow-hidden flex flex-col"
          >
            <div className="relative w-full aspect-video bg-gray-200">
              {video.thumbnail_url ? (
                <Image
                  src={video.thumbnail_url}
                  alt={video.title}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Video className="w-16 h-16 text-gray-400" />
                </div>
              )}
              {video.duration !== null && (
                <div className="absolute bottom-2 right-2 bg-black/75 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>{formatDuration(video.duration)}</span>
                </div>
              )}
            </div>

            <div className="p-4 flex flex-col flex-grow">
              <h3 className="font-bold text-gray-900 text-lg mb-2 line-clamp-2 group-hover:text-emerald-600 transition-colors">
                {video.title}
              </h3>

              <div className="flex items-center gap-2 mb-2 flex-wrap">
                {video.channel_name && (
                  <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded border border-emerald-100">
                    {video.channel_name}
                  </span>
                )}
                {video.language_name && (
                  <span className="text-xs font-medium text-gray-600 bg-gray-100 px-2 py-1 rounded border border-gray-200">
                    {video.language_name}
                  </span>
                )}
              </div>

              <div className="mt-auto pt-2 text-xs text-gray-500">
                <span>
                  {new Date(video.created_at).toLocaleDateString('ko-KR', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
