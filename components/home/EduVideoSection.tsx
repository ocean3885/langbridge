import Link from 'next/link';
import Image from 'next/image';
import { Video } from 'lucide-react';

export interface EduVideo {
  id: string;
  title: string;
  youtube_url: string | null;
  thumbnail_url: string | null;
  created_at: string;
  channel_name: string | null;
  language_name: string | null;
}

interface EduVideoSectionProps {
  videos: EduVideo[];
}

export default function EduVideoSection({ videos }: EduVideoSectionProps) {
  if (videos.length === 0) return null;

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Video className="w-6 h-6 text-blue-600" />
          <h2 className="text-2xl font-bold text-gray-900">어학 강의 영상</h2>
        </div>
        <Link 
          href="/videos" 
          className="text-sm font-semibold text-blue-600 hover:text-blue-700 transition flex items-center gap-1"
        >
          전체 보기
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {videos.map((video) => (
          <Link
            key={video.id}
            href={`/videos/${video.id}`}
            className="group bg-white rounded-lg shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden"
          >
            <div className="relative w-full aspect-video bg-gray-200">
              {video.thumbnail_url ? (
                <Image
                  src={video.thumbnail_url}
                  alt={video.title}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Video className="w-16 h-16 text-gray-400" />
                </div>
              )}
            </div>

            <div className="p-4">
              <h3 className="font-bold text-gray-900 text-lg mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">
                {video.title}
              </h3>

              {video.channel_name && (
                <div className="flex items-center gap-1 mb-2">
                  <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded">
                    {video.channel_name}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>
                  {new Date(video.created_at).toLocaleDateString('ko-KR', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
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
