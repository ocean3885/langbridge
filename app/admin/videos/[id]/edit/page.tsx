import { redirect } from 'next/navigation';
import { notFound } from 'next/navigation';
import { getAppUserFromServer } from '@/lib/auth/app-user';
import { isSuperAdmin } from '@/lib/auth/super-admin';
import { getEduVideoByIdSqlite } from '@/lib/sqlite/edu-videos';
import { listSqliteLanguages } from '@/lib/sqlite/languages';
import { listSqliteCategories } from '@/lib/sqlite/categories';
import { listSqliteChannels } from '@/lib/sqlite/channels';
import AdminSidebar from '../../../AdminSidebar';
import EditEduVideoForm from './EditEduVideoForm';

interface EditEduVideoPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function EditEduVideoPage({ params }: EditEduVideoPageProps) {
  const user = await getAppUserFromServer();
  if (!user) {
    redirect('/auth/login?redirectTo=/admin/videos');
  }

  const isAdminUser = await isSuperAdmin({ userId: user.id, email: user.email ?? null });
  if (!isAdminUser) {
    redirect('/');
  }

  const { id } = await params;
  const video = await getEduVideoByIdSqlite(id);
  if (!video) {
    notFound();
  }

  const [languages, categories, channels] = await Promise.all([
    listSqliteLanguages(),
    listSqliteCategories('edu_video_categories', user.id),
    listSqliteChannels(),
  ]);

  return (
    <>
      <AdminSidebar userEmail={user.email ?? ''} />
      <EditEduVideoForm video={video} languages={languages} categories={categories} channels={channels} />
    </>
  );
}