import { redirect } from 'next/navigation';
import { getAppUserFromServer, getDisplayLanguage } from '@/lib/auth/app-user';
import { getRecentLearningActivities } from '@/lib/supabase/services/bundle-progress';
import ActiveLearningsClient from './_components/ActiveLearningsClient';

export const dynamic = 'force-dynamic';

export default async function ActiveLearningsPage() {
  const user = await getAppUserFromServer();

  if (!user) {
    redirect('/auth/login?redirectTo=/learn/active');
  }

  const language = await getDisplayLanguage();

  // 진행도 집계를 위해 최대 100개까지 조회
  const activities = await getRecentLearningActivities(user.id, {
    limit: 100,
  });

  return (
    <ActiveLearningsClient
      activities={activities}
      language={language}
    />
  );
}
