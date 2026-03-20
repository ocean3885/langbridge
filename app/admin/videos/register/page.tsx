import { redirect } from 'next/navigation';
import { getAppUserFromServer } from '@/lib/auth/app-user';
import { isSuperAdminSqlite } from '@/lib/auth/super-admin';
import AdminSidebar from '../../AdminSidebar';
import RegisterVideoForm from './RegisterVideoForm';

export default async function RegisterVideoPage() {
  // 인증 확인
  const user = await getAppUserFromServer();
  
  if (!user) {
    redirect('/auth/login?redirectTo=/admin/videos/register');
  }
  
  // 운영자 확인
  const isSuperAdmin = await isSuperAdminSqlite({ userId: user.id, email: user.email ?? null });
  
  if (!isSuperAdmin) {
    redirect('/');
  }

  return (
    <>
      <AdminSidebar userEmail={user.email ?? ''} />
      <RegisterVideoForm />
    </>
  );
}
