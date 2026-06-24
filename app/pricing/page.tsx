import { headers } from 'next/headers';
import { getDisplayLanguage, getAppUserFromServer } from '@/lib/auth/app-user';
import {
  getCountryCodeFromHeaders,
  getPaddlePriceIdsForCountry,
  getPricingDisplayPrices,
} from '@/lib/paddle/prices';
import { getUserSubscriptionSummary } from '@/lib/supabase/services/subscriptions';
import { PricingClient } from './_components/PricingClient';

interface PricingPageProps {
  searchParams: Promise<{ billing?: string }>;
}

export default async function PricingPage({ searchParams }: PricingPageProps) {
  const { billing } = await searchParams;
  const requestHeaders = await headers();
  const language = await getDisplayLanguage();
  const user = await getAppUserFromServer();
  const { monthlyPriceId, yearlyPriceId } = getPaddlePriceIdsForCountry(
    getCountryCodeFromHeaders(requestHeaders)
  );
  
  const [subscription, pricing] = await Promise.all([
    user ? getUserSubscriptionSummary(user.id) : null,
    getPricingDisplayPrices({ monthlyPriceId, yearlyPriceId }),
  ]);

  return (
    <PricingClient
      language={language}
      user={user}
      isActiveSubscription={Boolean(subscription?.isActive)}
      subscriptionStatus={subscription?.status || null}
      paddleEnvironment={process.env.NEXT_PUBLIC_PADDLE_ENVIRONMENT === 'sandbox' ? 'sandbox' : 'production'}
      paddleClientToken={process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN || ''}
      monthlyPriceId={monthlyPriceId}
      yearlyPriceId={yearlyPriceId}
      monthlyPrice={pricing.monthlyPrice}
      yearlyPrice={pricing.yearlyPrice}
      initialBillingPeriod={billing === 'monthly' ? 'monthly' : 'annual'}
    />
  );
}
