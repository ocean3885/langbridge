import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getAppUserFromServer } from '@/lib/auth/app-user';
import { isSuperAdminSqlite } from '@/lib/auth/super-admin';
import { listSqliteChannels } from '@/lib/sqlite/channels';
import { listEduVideosSqlite } from '@/lib/sqlite/edu-videos';
import { listSqliteCategories } from '@/lib/sqlite/categories';
import { listSqliteLanguages } from '@/lib/sqlite/languages';
import { Plus, Tag } from 'lucide-react';
import AdminSidebar from '../AdminSidebar';
import EduVideoCategoryManageButton from './EduVideoCategoryManageButton';
import VideoCard from './VideoCard';

export default async function AdminVideosPage() {
  // 인증 확인
  const user = await getAppUserFromServer();
  
  if (!user) {
    redirect('/auth/login?redirectTo=/admin/videos');
  }
  
  // 운영자 확인
  const isSuperAdmin = await isSuperAdminSqlite({ userId: user.id, email: user.email ?? null });
  
  if (!isSuperAdmin) {
    redirect('/');
  }

  const videos = await listEduVideosSqlite({ hasChannel: true });
  const [channels, categories, languages] = await Promise.all([
    listSqliteChannels(),
    listSqliteCategories('edu_video_categories', user.id),
    listSqliteLanguages(),
  ]);

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
              <p className="text-gray-600 mt-2">edu_videos 학습 영상을 관리합니다.</p>
            </div>
            <div className="flex items-center gap-3">
              <EduVideoCategoryManageButton
                initialCategories={categories}
                initialLanguages={languages.map((language) => ({
                  id: language.id,
                  name_ko: language.name_ko,
                  code: language.code,
                }))}
              />
              <Link
                href="/admin/videos/register"
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Plus className="w-4 h-4" />
                영상 등록
              </Link>
            </div>
          </div>

      {videos.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          등록된 edu_videos 영상이 없습니다.
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
                        channels={channels}
                        categories={categories}
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
