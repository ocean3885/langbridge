import { getAppUserFromServer, getDisplayLanguage } from '@/lib/auth/app-user';
import { getLearningProgressSummary, getRecentLearningActivities, getRecentStudiedBundle } from '@/lib/supabase/services/bundle-progress';
import { getLearningStreakSummary } from '@/lib/supabase/services/learning-daily-activity';
import { getTodayLearningGoalSummary } from '@/lib/supabase/services/learning-goal-preferences';
import { AnonymousLearnPage } from './_components/AnonymousLearnPage';
import { LoggedInLearnPage } from './_components/LoggedInLearnPage';

export const dynamic = 'force-dynamic';

export default async function LearnPage() {
  const user = await getAppUserFromServer();
  const language = await getDisplayLanguage();

  if (!user) return <AnonymousLearnPage language={language} />;

  const name = user.email?.split('@')[0] || 'Learner';
  const [recentBundle, streakSummary, goalSummary, progressSummary] = await Promise.all([
    getRecentStudiedBundle(user.id),
    getLearningStreakSummary(user.id),
    getTodayLearningGoalSummary(user.id),
    getLearningProgressSummary(user.id),
  ]);
  const recentActivities = await getRecentLearningActivities(user.id, {
    excludeBundleId: recentBundle?.bundle.id,
    limit: 4,
  });

  return (
    <LoggedInLearnPage
      name={toDisplayName(name)}
      recentBundle={recentBundle}
      recentActivities={recentActivities}
      streakSummary={streakSummary}
      goalSummary={goalSummary}
      progressSummary={progressSummary}
      language={language}
    />
  );
}

function toDisplayName(name: string) {
  const normalized = name.replace(/[._-]+/g, ' ').trim();
  if (!normalized) return 'Learner';
  return normalized
    .split(' ')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}
