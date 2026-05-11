import { getAppUserFromServer } from '@/lib/auth/app-user';
import { isSuperAdmin } from '@/lib/auth/super-admin';
import { redirect, notFound } from 'next/navigation';
import { getWordWithSentences } from '@/lib/supabase/services/words';
import { listLanguages } from '@/lib/supabase/services/languages';
import AdminSidebar from '../../AdminSidebar';
import WordDetail from './WordDetail';

interface WordDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function WordDetailPage({ params }: WordDetailPageProps) {
  const { id } = await params;
  const user = await getAppUserFromServer();
  if (!user) redirect(`/auth/login?redirectTo=/admin/words/${id}`);

  const isAdminUser = await isSuperAdmin({ userId: user.id, email: user.email ?? null });
  if (!isAdminUser) redirect('/');

  const wordId = parseInt(id);
  if (isNaN(wordId)) notFound();

  const [word, languages] = await Promise.all([
    getWordWithSentences(wordId),
    listLanguages()
  ]);

  if (!word) notFound();

  return (
    <>
      <AdminSidebar userEmail={user.email ?? ''} language={user.displayLanguage || 'en'} />
      <div className="min-h-screen bg-gray-50 dark:bg-background md:ml-64 p-4 md:p-6 pt-20 md:pt-6">
        <WordDetail word={word} languages={languages} />
      </div>
    </>
  );
}
