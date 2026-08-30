import { redirect } from 'next/navigation';
import { getAppUserFromServer, getDisplayLanguage } from '@/lib/auth/app-user';
import { getUserBundles } from '@/lib/supabase/services/user-bundles';
import BundlesProgressClient from './BundlesProgressClient';

export const dynamic = 'force-dynamic';

export default async function BundlesProgressPage() {
  const [user, language] = await Promise.all([getAppUserFromServer(), getDisplayLanguage()]);
  if (!user) redirect('/auth/sign-in?redirectTo=/learn/progress/bundles');
  const data = await getUserBundles(user.id);
  return <BundlesProgressClient initialData={data} language={language} />;
}
