import { redirect } from 'next/navigation';
import { notFound } from 'next/navigation';
import { getAppUserFromServer } from '@/lib/auth/app-user';
import { isSuperAdmin } from '@/lib/auth/super-admin';
import { getEduVideoById } from '@/lib/supabase/services/edu-videos';
import { listLanguages } from '@/lib/supabase/services/languages';
import { listAllCategories } from '@/lib/supabase/services/categories';
import { listEduVideoChannels } from '@/lib/supabase/services/edu-video-channels';
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
  const video = await getEduVideoById(id);
  if (!video) {
    notFound();
  }

  const [languages, categories, channels] = await Promise.all([
    listLanguages(),
    listAllCategories('edu_video_categories'),
    listEduVideoChannels(),
  ]);

  return (
    <>
      <AdminSidebar userEmail={user.email ?? ''} />
      <EditEduVideoForm video={video} languages={languages} categories={categories} channels={channels} />
    </>
  );
}