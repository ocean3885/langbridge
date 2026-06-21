import { getDisplayLanguage, getAppUserFromServer } from '@/lib/auth/app-user';
import { hasActiveSubscription } from '@/lib/supabase/services/subscriptions';
import { PricingClient } from './_components/PricingClient';

interface PricingPageProps {
  searchParams: Promise<{ billing?: string }>;
}

export default async function PricingPage({ searchParams }: PricingPageProps) {
  const { billing } = await searchParams;
  const language = await getDisplayLanguage();
  const user = await getAppUserFromServer();
  
  // Check subscription status if user is logged in
  const isActiveSubscription = user ? await hasActiveSubscription(user.id) : false;

  // Retrieve test client key from env (falls back to standard test key if not defined)
  const clientKey = process.env.TOSS_TEST_CLIENT_KEY || 'test_ck_QbgMGZzorzwj9ZXKRdk78l5E1em4';

  return (
    <PricingClient
      language={language}
      user={user}
      isActiveSubscription={isActiveSubscription}
      clientKey={clientKey}
      initialBillingPeriod={billing === 'monthly' ? 'monthly' : 'annual'}
    />
  );
}
