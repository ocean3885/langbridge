import { getAppUserFromServer, getDisplayLanguage } from '@/lib/auth/app-user';
import { getRecentStudiedBundle } from '@/lib/supabase/services/bundle-progress';
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
  const [recentBundle, streakSummary, goalSummary] = await Promise.all([
    getRecentStudiedBundle(user.id),
    getLearningStreakSummary(user.id),
    getTodayLearningGoalSummary(user.id),
  ]);

  return (
    <LoggedInLearnPage
      name={toDisplayName(name)}
      recentBundle={recentBundle}
      streakSummary={streakSummary}
      goalSummary={goalSummary}
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
