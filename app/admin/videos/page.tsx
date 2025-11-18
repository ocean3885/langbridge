import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getAllVideos } from '@/lib/supabase/queries/videos';
import { Plus, Tag } from 'lucide-react';
import AdminSidebar from '../AdminSidebar';
import VideoCard from './VideoCard';

export default async function AdminVideosPage() {
  const supabase = await createClient();
  
  // 인증 확인
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect('/auth/login?redirectTo=/admin/videos');
  }
  
  // is_premium 확인
  const { data: profile } = await supabase
    .from('lang_profiles')
    .select('is_premium')
    .eq('id', user.id)
    .single();
  
  if (!profile?.is_premium) {
    redirect('/');
  }

  const { data: videos, error } = await getAllVideos();

  // 채널 목록 조회
  const { data: channels } = await supabase
    .from('video_channels')
    .select('id, channel_name, channel_url, language_id')
    .order('channel_name', { ascending: true });

  if (error) {
    return (
      <>
        <AdminSidebar userEmail={user.email ?? ''} />
        <div className="min-h-screen bg-gray-50 ml-64 p-8">
          <div className="max-w-6xl mx-auto">
            <div className="text-red-600">영상 목록을 불러오는데 실패했습니다: {error}</div>
          </div>
        </div>
      </>
    );
  }

  // 언어별 그룹핑
  const groupedByLanguage = videos.reduce((acc, video) => {
    const langKey = video.language_name || '언어 미지정';
    if (!acc[langKey]) {
      acc[langKey] = [];
    }
    acc[langKey].push(video);
    return acc;
  }, {} as Record<string, typeof videos>);

  // 각 언어 내에서 채널별로 그룹핑
  const groupedByLanguageAndChannel = Object.entries(groupedByLanguage).map(([language, vids]) => {
    const byChannel = vids.reduce((acc, video) => {
      const channelKey = video.channel_name || '채널 미지정';
      if (!acc[channelKey]) {
        acc[channelKey] = [];
      }
      acc[channelKey].push(video);
      return acc;
    }, {} as Record<string, typeof vids>);

    return { language, channels: byChannel };
  });

  return (
    <>
      <AdminSidebar userEmail={user.email ?? ''} />
      <div className="min-h-screen bg-gray-50 ml-64 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">영상 관리</h1>
              <p className="text-gray-600 mt-2">YouTube 영상 학습 콘텐츠를 관리합니다.</p>
            </div>
            <Link
              href="/admin/videos/register"
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" />
              영상 등록
            </Link>
          </div>

      {videos.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          등록된 영상이 없습니다. 새로운 영상을 등록해보세요.
        </div>
      ) : (
        <div className="space-y-8">
          {groupedByLanguageAndChannel.map(({ language, channels: channelGroups }) => (
            <div key={language}>
              {/* 언어 헤더 */}
              <div className="mb-4">
                <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                  <Tag className="w-6 h-6 text-blue-600" />
                  {language}
                </h2>
                <div className="h-1 bg-gradient-to-r from-blue-500 to-transparent mt-2 rounded"></div>
              </div>

              {/* 채널별 섹션 */}
              {Object.entries(channelGroups).map(([channelName, channelVideos]) => (
                <div key={channelName} className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-700 mb-3 pl-2 border-l-4 border-blue-400">
                    {channelName} ({channelVideos.length})
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {channelVideos.map((video) => (
                      <VideoCard 
                        key={video.id} 
                        video={video} 
                        channels={channels || []}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
        </div>
      </div>
    </>
  );
}
