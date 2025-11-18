import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import AdminSidebar from '../../AdminSidebar';
import RegisterChannelForm from './RegisterChannelForm';

export default async function RegisterChannelPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/auth/login?redirectTo=/admin/channels/register');
  }

  const { data: profile } = await supabase
    .from('lang_profiles')
    .select('is_premium')
    .eq('id', user.id)
    .single();

  if (!profile?.is_premium) {
    redirect('/');
  }

  return (
    <>
      <AdminSidebar userEmail={user.email ?? ''} />
      <div className="min-h-screen bg-gray-50 ml-64 p-8">
        <div className="max-w-3xl mx-auto">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900">채널 추가</h1>
            <p className="text-gray-600 mt-2">언어별 학습 채널 정보를 등록합니다.</p>
          </div>

          <RegisterChannelForm />
        </div>
      </div>
    </>
  );
}
