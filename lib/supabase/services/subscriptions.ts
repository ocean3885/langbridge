'use server';

import { createAdminClient } from '../admin';

const ACTIVE_SUBSCRIPTION_STATUSES = ['active', 'trialing', 'past_due'];
const CHECKOUT_BLOCKING_STATUSES = ['active', 'trialing', 'past_due'];

export interface UserSubscriptionSummary {
  status: string | null;
  provider: string | null;
  providerPriceId: string | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  isActive: boolean;
  canManageWithPaddle: boolean;
}

type SubscriptionRow = {
  provider: string | null;
  provider_customer_id: string | null;
  provider_subscription_id: string | null;
  provider_price_id: string | null;
  status: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean | null;
  created_at: string;
  updated_at: string;
};

function selectCurrentSubscription(rows: SubscriptionRow[], now: string) {
  const activeSubscription = rows.find((subscription) => {
    const status = String(subscription.status || '');
    return (
      ACTIVE_SUBSCRIPTION_STATUSES.includes(status) &&
      (!subscription.current_period_end || subscription.current_period_end > now)
    );
  });

  return activeSubscription || rows[0] || null;
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

export async function hasCheckoutBlockingSubscription(userId: string) {
  const supabase = createAdminClient();
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('user_subscriptions')
    .select('status, current_period_end')
    .eq('user_id', userId)
    .in('status', CHECKOUT_BLOCKING_STATUSES)
    .or(`current_period_end.is.null,current_period_end.gt.${now}`)
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) {
    console.error('Error checking checkout-blocking subscription:', error);
    throw error;
  }

  return data?.[0]?.status as string | undefined;
}

export async function getUserSubscriptionSummary(userId: string | null | undefined): Promise<UserSubscriptionSummary> {
  if (!userId) {
    return {
      status: null,
      provider: null,
      providerPriceId: null,
      currentPeriodStart: null,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
      isActive: false,
      canManageWithPaddle: false,
    };
  }

  const supabase = createAdminClient();
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('user_subscriptions')
    .select('provider, provider_customer_id, provider_subscription_id, provider_price_id, status, current_period_start, current_period_end, cancel_at_period_end, created_at, updated_at')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('Error fetching user subscription summary:', error);
    return {
      status: null,
      provider: null,
      providerPriceId: null,
      currentPeriodStart: null,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
      isActive: false,
      canManageWithPaddle: false,
    };
  }

  const subscriptions = (data || []) as SubscriptionRow[];
  const latestSubscription = selectCurrentSubscription(subscriptions, now);

  if (!latestSubscription) {
    return {
      status: null,
      provider: null,
      providerPriceId: null,
      currentPeriodStart: null,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
      isActive: false,
      canManageWithPaddle: false,
    };
  }

  return {
    status: latestSubscription.status || null,
    provider: latestSubscription.provider || null,
    providerPriceId: latestSubscription.provider_price_id || null,
    currentPeriodStart: latestSubscription.current_period_start || null,
    currentPeriodEnd: latestSubscription.current_period_end || null,
    cancelAtPeriodEnd: Boolean(latestSubscription.cancel_at_period_end),
    isActive: ACTIVE_SUBSCRIPTION_STATUSES.includes(String(latestSubscription.status || '')) &&
      (!latestSubscription.current_period_end || latestSubscription.current_period_end > now),
    canManageWithPaddle: Boolean(
      latestSubscription.provider === 'paddle' &&
      latestSubscription.provider_customer_id
    ),
  };
}

export async function getPaddleBillingReference(userId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('user_subscriptions')
    .select('provider, provider_customer_id, provider_subscription_id, provider_price_id, status, current_period_start, current_period_end, cancel_at_period_end, created_at, updated_at')
    .eq('user_id', userId)
    .eq('provider', 'paddle')
    .not('provider_customer_id', 'is', null)
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('Error fetching Paddle billing reference:', error);
    throw error;
  }

  const subscription = selectCurrentSubscription(
    (data || []) as SubscriptionRow[],
    new Date().toISOString()
  );

  if (!subscription?.provider_customer_id) return null;

  return {
    customerId: subscription.provider_customer_id,
    subscriptionId: subscription.provider_subscription_id || null,
    status: subscription.status || null,
    cancelAtPeriodEnd: Boolean(subscription.cancel_at_period_end),
  };
}

export async function createPaddleCheckoutAttempt({
  userId,
  billingPeriod,
  termsVersion,
}: {
  userId: string;
  billingPeriod: 'monthly' | 'annual';
  termsVersion: string;
}) {
  const supabase = createAdminClient();
  const now = new Date();

  await supabase
    .from('paddle_checkout_attempts')
    .update({ status: 'expired', updated_at: now.toISOString() })
    .eq('user_id', userId)
    .eq('status', 'pending')
    .lt('expires_at', now.toISOString());

  const { data, error } = await supabase
    .from('paddle_checkout_attempts')
    .insert({
      user_id: userId,
      billing_period: billingPeriod,
      status: 'pending',
      terms_version: termsVersion,
      terms_accepted_at: now.toISOString(),
      expires_at: new Date(now.getTime() + 20 * 60 * 1000).toISOString(),
    })
    .select('id')
    .single();

  if (!error && data) {
    return { id: data.id as string, existingTransactionId: null, isExisting: false };
  }

  if (error?.code === '23505') {
    const { data: existing } = await supabase
      .from('paddle_checkout_attempts')
      .select('id, paddle_transaction_id, billing_period')
      .eq('user_id', userId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing) {
      return {
        id: existing.id as string,
        existingTransactionId: existing.paddle_transaction_id as string | null,
        existingBillingPeriod: existing.billing_period as 'monthly' | 'annual',
        isExisting: true,
      };
    }
  }

  console.error('Error creating Paddle checkout attempt:', error);
  throw error;
}

export async function setPaddleCheckoutTransaction(attemptId: string, transactionId: string) {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from('paddle_checkout_attempts')
    .update({
      paddle_transaction_id: transactionId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', attemptId)
    .eq('status', 'pending');

  if (error) throw error;
}

export async function updatePaddleCheckoutAttemptStatus(
  attemptId: string,
  status: 'completed' | 'failed'
) {
  const supabase = createAdminClient();
  const now = new Date().toISOString();
  const { error } = await supabase
    .from('paddle_checkout_attempts')
    .update({
      status,
      completed_at: status === 'completed' ? now : null,
      updated_at: now,
    })
    .eq('id', attemptId);

  if (error) throw error;
}

export async function failPendingPaddleCheckoutAttempt(userId: string, transactionId: string) {
  const supabase = createAdminClient();
  const now = new Date().toISOString();
  const { error } = await supabase
    .from('paddle_checkout_attempts')
    .update({
      status: 'failed',
      updated_at: now,
    })
    .eq('user_id', userId)
    .eq('paddle_transaction_id', transactionId)
    .eq('status', 'pending');

  if (error) throw error;
}

export async function getPaddleCheckoutStatus(userId: string, transactionId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('paddle_checkout_attempts')
    .select('status, billing_period, expires_at')
    .eq('user_id', userId)
    .eq('paddle_transaction_id', transactionId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function registerPaddleWebhookEvent({
  eventId,
  eventType,
  occurredAt,
}: {
  eventId: string;
  eventType: string;
  occurredAt?: string | null;
}) {
  const supabase = createAdminClient();
  const { error } = await supabase.from('paddle_webhook_events').insert({
    event_id: eventId,
    event_type: eventType,
    occurred_at: occurredAt || null,
  });

  if (!error) return true;
  if (error.code === '23505') return false;
  throw error;
}

export async function unregisterPaddleWebhookEvent(eventId: string) {
  const supabase = createAdminClient();
  await supabase.from('paddle_webhook_events').delete().eq('event_id', eventId);
}

export async function createOrUpdateSubscription({
  userId,
  provider,
  providerCustomerId,
  providerSubscriptionId,
  providerPriceId,
  status,
  currentPeriodStart,
  currentPeriodEnd,
  cancelAtPeriodEnd = false,
  eventOccurredAt,
}: {
  userId: string;
  provider: string;
  providerCustomerId?: string | null;
  providerSubscriptionId?: string | null;
  providerPriceId?: string | null;
  status: string;
  currentPeriodStart?: string | null;
  currentPeriodEnd?: string | null;
  cancelAtPeriodEnd?: boolean;
  eventOccurredAt?: string | null;
}) {
  const supabase = createAdminClient();

  let existingQuery = supabase
    .from('user_subscriptions')
    .select('id, last_event_at');

  existingQuery = providerSubscriptionId
    ? existingQuery.eq('provider', provider).eq('provider_subscription_id', providerSubscriptionId)
    : existingQuery.eq('user_id', userId);

  const { data: existing, error: fetchError } = await existingQuery
    .limit(1);

  if (fetchError) {
    console.error('Error fetching existing subscription:', fetchError);
  }

  if (existing && existing.length > 0) {
    const previousEventAt = existing[0].last_event_at as string | null;
    if (eventOccurredAt && previousEventAt && eventOccurredAt < previousEventAt) {
      return;
    }

    const { error } = await supabase
      .from('user_subscriptions')
      .update({
        user_id: userId,
        provider,
        provider_customer_id: providerCustomerId || null,
        provider_subscription_id: providerSubscriptionId || null,
        provider_price_id: providerPriceId || null,
        status,
        current_period_start: currentPeriodStart || null,
        current_period_end: currentPeriodEnd || null,
        cancel_at_period_end: cancelAtPeriodEnd,
        last_event_at: eventOccurredAt || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing[0].id);

    if (error) {
      console.error('Error updating user subscription:', error);
      throw error;
    }
  } else {
    const { error } = await supabase
      .from('user_subscriptions')
      .insert({
        user_id: userId,
        provider,
        provider_customer_id: providerCustomerId || null,
        provider_subscription_id: providerSubscriptionId || null,
        provider_price_id: providerPriceId || null,
        status,
        current_period_start: currentPeriodStart || null,
        current_period_end: currentPeriodEnd || null,
        cancel_at_period_end: cancelAtPeriodEnd,
        last_event_at: eventOccurredAt || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

    if (error) {
      console.error('Error inserting user subscription:', error);
      throw error;
    }
  }
}
