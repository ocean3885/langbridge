import { getAppUserFromServer } from '@/lib/auth/app-user';
import { isSuperAdmin } from '@/lib/auth/super-admin';
import { redirect, notFound } from 'next/navigation';
import { getSentenceWithWords } from '@/lib/supabase/services/sentences';
import { listBundlesForSentence } from '@/lib/supabase/services/bundles';
import AdminSidebar from '../../AdminSidebar';
import SentenceDetailContent from './SentenceDetailContent';

interface SentenceDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function SentenceDetailPage({ params }: SentenceDetailPageProps) {
  const { id } = await params;
  const user = await getAppUserFromServer();
  if (!user) redirect(`/auth/login?redirectTo=/admin/sentences/${id}`);

  const isAdminUser = await isSuperAdmin({ userId: user.id, email: user.email ?? null });
  if (!isAdminUser) redirect('/');

  const sentenceId = parseInt(id);
  if (isNaN(sentenceId)) notFound();

  const sentenceData = await getSentenceWithWords(sentenceId);
  if (!sentenceData) notFound();

  const relatedBundles = await listBundlesForSentence(sentenceId);

  return (
    <>
      <AdminSidebar userEmail={user.email ?? ''} />
      <div className="min-h-screen bg-gray-50 md:ml-64 p-8">
        <SentenceDetailContent sentence={sentenceData} relatedBundles={relatedBundles} />
      </div>
    </>
  );
}
