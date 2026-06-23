import { getDisplayLanguage, getAppUserFromServer } from '@/lib/auth/app-user';
import { getUserSubscriptionSummary } from '@/lib/supabase/services/subscriptions';
import { PricingClient } from './_components/PricingClient';

interface PricingPageProps {
  searchParams: Promise<{ billing?: string }>;
}

export default async function PricingPage({ searchParams }: PricingPageProps) {
  const { billing } = await searchParams;
  const language = await getDisplayLanguage();
  const user = await getAppUserFromServer();
  
  const subscription = user ? await getUserSubscriptionSummary(user.id) : null;

  return (
    <PricingClient
      language={language}
      user={user}
      isActiveSubscription={Boolean(subscription?.isActive)}
      subscriptionStatus={subscription?.status || null}
      paddleEnvironment={process.env.NEXT_PUBLIC_PADDLE_ENVIRONMENT === 'sandbox' ? 'sandbox' : 'production'}
      paddleClientToken={process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN || ''}
      monthlyPriceId={process.env.NEXT_PUBLIC_PADDLE_PRICE_MONTHLY || ''}
      yearlyPriceId={process.env.NEXT_PUBLIC_PADDLE_PRICE_YEARLY || ''}
      initialBillingPeriod={billing === 'monthly' ? 'monthly' : 'annual'}
    />
  );
}
