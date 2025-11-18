import Link from 'next/link';
import Image from 'next/image';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import AdminSidebar from '../AdminSidebar';
import { Plus, Edit, ImageIcon } from 'lucide-react';

export default async function AdminChannelsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login?redirectTo=/admin/channels');

  const { data: profile } = await supabase
    .from('lang_profiles')
    .select('is_premium')
    .eq('id', user.id)
    .single();
  if (!profile?.is_premium) redirect('/');

  const { data: channels, error } = await supabase
    .from('video_channels')
    .select(`
      id, 
      channel_name, 
      channel_url, 
      channel_description, 
      thumbnail_url, 
      language_id,
      created_at,
      languages:language_id (
        name_ko,
        name_en
      ),
      videos:videos(count)
    `)
    .order('created_at', { ascending: false });

  console.log('Channels data:', JSON.stringify(channels?.slice(0, 1), null, 2));

  return (
    <>
      <AdminSidebar userEmail={user.email ?? ''} />
      <div className="min-h-screen bg-gray-50 ml-64 p-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">채널 관리</h1>
              <p className="text-gray-600 mt-2">언어별 학습 채널을 등록/관리합니다.</p>
            </div>
            <Link
              href="/admin/channels/register"
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" />
              채널 추가
            </Link>
          </div>

          {error && (
            <div className="text-red-600 mb-4">채널 목록을 불러오는데 실패했습니다: {error.message}</div>
          )}

          {!channels || channels.length === 0 ? (
            <div className="text-center py-12 text-gray-500">등록된 채널이 없습니다. 새 채널을 추가해보세요.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {channels.map((ch) => {
                const languageData = ch.languages && !Array.isArray(ch.languages)
                  ? ch.languages as { name_ko: string; name_en: string }
                  : null;
                const languageName = languageData 
                  ? `${languageData.name_ko} (${languageData.name_en})`
                  : '언어 미지정';
                
                const videoCount = Array.isArray(ch.videos) ? ch.videos.length : 0;

                return (
                  <div key={ch.id} className="bg-white border border-gray-200 rounded-lg hover:shadow-lg transition-shadow p-5">
                    {/* 헤더: 썸네일 + 정보 */}
                    <div className="flex items-start gap-4 mb-4">
                      {/* 동그란 썸네일 */}
                      <div className="relative w-16 h-16 flex-shrink-0">
                        {ch.thumbnail_url ? (
                          <Image
                            src={ch.thumbnail_url}
                            alt={ch.channel_name}
                            fill
                            className="object-cover rounded-full"
                          />
                        ) : (
                          <div className="w-full h-full bg-gray-100 rounded-full flex items-center justify-center">
                            <ImageIcon className="w-8 h-8 text-gray-400" />
                          </div>
                        )}
                      </div>

                      {/* 채널명과 언어 */}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold mb-1 truncate">{ch.channel_name}</h3>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-gray-700">언어:</span>
                          <span className="text-sm text-gray-600">{languageName}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-700">영상:</span>
                          <span className="text-sm text-blue-600 font-semibold">{videoCount}개</span>
                        </div>
                      </div>

                      {/* 수정 버튼 */}
                      <Link
                        href={`/admin/channels/edit/${ch.id}`}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex-shrink-0"
                        title="채널 수정"
                      >
                        <Edit className="w-4 h-4" />
                      </Link>
                    </div>

                    {/* 채널 정보 */}
                    <div className="space-y-2">
                      {ch.channel_url && (
                        <a 
                          href={ch.channel_url} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="text-sm text-blue-600 hover:underline block truncate"
                        >
                          {ch.channel_url}
                        </a>
                      )}
                      
                      {ch.channel_description && (
                        <p className="text-sm text-gray-600 line-clamp-2">{ch.channel_description}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
