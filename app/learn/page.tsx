import { getAppUserFromServer } from '@/lib/auth/app-user';
import { getRecentStudiedBundle } from '@/lib/supabase/services/bundle-progress';
import { AnonymousLearnPage } from './_components/AnonymousLearnPage';
import { LoggedInLearnPage } from './_components/LoggedInLearnPage';

export const dynamic = 'force-dynamic';

export default async function LearnPage() {
  const user = await getAppUserFromServer();

  if (!user) return <AnonymousLearnPage />;

  const name = user.email?.split('@')[0] || 'Learner';
  const recentBundle = await getRecentStudiedBundle(user.id);

  return <LoggedInLearnPage name={toDisplayName(name)} recentBundle={recentBundle} />;
}

function toDisplayName(name: string) {
  const normalized = name.replace(/[._-]+/g, ' ').trim();
  if (!normalized) return 'Learner';
  return normalized
    .split(' ')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}
