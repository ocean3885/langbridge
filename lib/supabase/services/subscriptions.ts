'use server';

import { createAdminClient } from '../admin';

const ACTIVE_SUBSCRIPTION_STATUSES = ['active', 'trialing'];

export interface UserSubscriptionSummary {
  status: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  isActive: boolean;
}

export async function hasActiveSubscription(userId: string | null | undefined) {
  if (!userId) return false;

  const supabase = createAdminClient();
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('user_subscriptions')
    .select('id')
    .eq('user_id', userId)
    .in('status', ACTIVE_SUBSCRIPTION_STATUSES)
    .or(`current_period_end.is.null,current_period_end.gt.${now}`)
    .limit(1);

  if (error) {
    console.error('Error checking active subscription:', error);
    return false;
  }

  return Boolean(data?.length);
}

export async function getUserSubscriptionSummary(userId: string | null | undefined): Promise<UserSubscriptionSummary> {
  if (!userId) {
    return {
      status: null,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
      isActive: false,
    };
  }

  const supabase = createAdminClient();
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('user_subscriptions')
    .select('status, current_period_end, cancel_at_period_end, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) {
    console.error('Error fetching user subscription summary:', error);
    return {
      status: null,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
      isActive: false,
    };
  }

  const subscriptions = data || [];
  const activeSubscription = subscriptions.find((subscription) => {
    const status = String(subscription.status || '');
    const currentPeriodEnd = subscription.current_period_end as string | null;
    return ACTIVE_SUBSCRIPTION_STATUSES.includes(status) && (!currentPeriodEnd || currentPeriodEnd > now);
  });
  const latestSubscription = activeSubscription || subscriptions[0];

  if (!latestSubscription) {
    return {
      status: null,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
      isActive: false,
    };
  }

  return {
    status: latestSubscription.status || null,
    currentPeriodEnd: latestSubscription.current_period_end || null,
    cancelAtPeriodEnd: Boolean(latestSubscription.cancel_at_period_end),
    isActive: Boolean(activeSubscription),
  };
}
