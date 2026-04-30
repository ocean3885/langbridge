import { redirect } from 'next/navigation';
import { getAppUserFromServer } from '@/lib/auth/app-user';
import { isSuperAdmin } from '@/lib/auth/super-admin';
import AdminSidebar from '../../AdminSidebar';
import RegisterChannelForm from './RegisterChannelForm';

export default async function RegisterChannelPage() {
  const user = await getAppUserFromServer();
  if (!user) {
    redirect('/auth/login?redirectTo=/admin/channels/register');
  }

  const isAdminUser = await isSuperAdmin({ userId: user.id, email: user.email ?? null });

  if (!isAdminUser) {
    redirect('/');
  }

  return (
    <>
      <AdminSidebar userEmail={user.email ?? ''} />
      <div className="min-h-screen bg-gray-50 md:ml-64 p-8">
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
