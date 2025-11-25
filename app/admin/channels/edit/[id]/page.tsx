import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import AdminSidebar from '@/app/admin/AdminSidebar';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import EditChannelForm from './EditChannelForm';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditChannelPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login?redirectTo=/admin/channels');

  const admin = createAdminClient();
  const { data: isSuperAdmin } = await admin.rpc('get_user_is_super_admin', {
    user_id: user.id
  });
  if (!isSuperAdmin) redirect('/');

  // 채널 정보 조회
  const { data: channel, error } = await supabase
    .from('video_channels')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !channel) {
    return (
      <>
        <AdminSidebar userEmail={user.email ?? ''} />
        <div className="min-h-screen bg-gray-50 ml-64 p-8">
          <div className="max-w-3xl mx-auto">
            <div className="text-red-600">채널을 찾을 수 없습니다.</div>
            <Link href="/admin/channels" className="text-blue-600 hover:underline mt-4 inline-block">
              채널 목록으로 돌아가기
            </Link>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <AdminSidebar userEmail={user.email ?? ''} />
      <div className="min-h-screen bg-gray-50 ml-64 p-8">
        <div className="max-w-3xl mx-auto">
          <Link
            href="/admin/channels"
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 w-fit"
          >
            <ArrowLeft className="w-4 h-4" />
            채널 목록으로
          </Link>
          
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900">채널 수정</h1>
            <p className="text-gray-600 mt-2">채널 정보를 수정합니다.</p>
          </div>

          <EditChannelForm channel={channel} />
        </div>
      </div>
    </>
  );
}
