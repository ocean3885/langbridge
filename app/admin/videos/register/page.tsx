import { redirect } from 'next/navigation';
import { getAppUserFromServer } from '@/lib/auth/app-user';
import { isSuperAdmin } from '@/lib/auth/super-admin';
import AdminSidebar from '../../AdminSidebar';
import RegisterVideoForm from './RegisterVideoForm';

export default async function RegisterVideoPage() {
  // 인증 확인
  const user = await getAppUserFromServer();
  
  if (!user) {
    redirect('/auth/login?redirectTo=/admin/videos/register');
  }
  
  // 운영자 확인
  const isAdminUser = await isSuperAdmin({ userId: user.id, email: user.email ?? null });
  
  if (!isAdminUser) {
    redirect('/');
  }

  return (
    <>
      <AdminSidebar userEmail={user.email ?? ''} />
      <RegisterVideoForm />
    </>
  );
}
