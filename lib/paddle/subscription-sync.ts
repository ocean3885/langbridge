import {
  createOrUpdateSubscription,
  updatePaddleCheckoutAttemptStatus,
} from '@/lib/supabase/services/subscriptions';

type PaddleTransaction = {
  id: string;
  status: string;
  customer_id?: string | null;
  subscription_id?: string | null;
  custom_data?: Record<string, unknown> | null;
};

type PaddleSubscription = {
  id: string;
  status: string;
  customer_id?: string | null;
  items?: Array<{ price?: { id?: string } }>;
  current_billing_period?: {
    starts_at?: string | null;
    ends_at?: string | null;
  } | null;
  scheduled_change?: {
    action?: string;
  } | null;
  updated_at?: string;
};

type SyncResult = {
  synced: boolean;
  reason?: string;
  userId?: string;
  subscriptionId?: string;
};

function mapPaddleStatus(status: string) {
  return ['active', 'trialing', 'past_due', 'paused', 'canceled'].includes(status)
    ? status
    : 'expired';
}

function getPaddleApiConfig() {
  const apiKey = process.env.PADDLE_API_KEY;
  if (!apiKey) return null;

  const isSandbox = process.env.NEXT_PUBLIC_PADDLE_ENVIRONMENT === 'sandbox';
  return {
    apiBaseUrl: isSandbox ? 'https://sandbox-api.paddle.com' : 'https://api.paddle.com',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Paddle-Version': '1',
    },
  };
}

export async function syncPaddleSubscriptionFromTransaction({
  transactionId,
  expectedUserId,
}: {
  transactionId: string;
  expectedUserId?: string;
}): Promise<SyncResult> {
  const config = getPaddleApiConfig();
  if (!config) return { synced: false, reason: 'missing_api_key' };

  const transactionResponse = await fetch(
    `${config.apiBaseUrl}/transactions/${transactionId}`,
    { headers: config.headers, cache: 'no-store' }
  );
  if (!transactionResponse.ok) {
    const detail = await transactionResponse.text();
    console.error('Paddle transaction sync failed:', transactionResponse.status, detail);
    return { synced: false, reason: `transaction_${transactionResponse.status}` };
  }

  const transactionResult = await transactionResponse.json() as { data?: PaddleTransaction };
  const transaction = transactionResult.data;
  const userId = transaction?.custom_data?.user_id;

  if (!transaction || typeof userId !== 'string' || !userId) {
    return { synced: false, reason: 'missing_transaction_user_id' };
  }
  if (expectedUserId && userId !== expectedUserId) {
    return { synced: false, reason: 'transaction_user_mismatch' };
  }
  if (transaction.status !== 'completed') {
    return { synced: false, reason: `transaction_${transaction.status}` };
  }
  if (!transaction.subscription_id) {
    return { synced: false, reason: 'missing_subscription_id' };
  }

  const subscriptionResponse = await fetch(
    `${config.apiBaseUrl}/subscriptions/${transaction.subscription_id}`,
    { headers: config.headers, cache: 'no-store' }
  );
  if (!subscriptionResponse.ok) {
    const detail = await subscriptionResponse.text();
    console.error('Paddle subscription sync failed:', subscriptionResponse.status, detail);
    return { synced: false, reason: `subscription_${subscriptionResponse.status}` };
  }

  const subscriptionResult = await subscriptionResponse.json() as { data?: PaddleSubscription };
  const subscription = subscriptionResult.data;
  if (!subscription) return { synced: false, reason: 'missing_subscription' };

  await createOrUpdateSubscription({
    userId,
    provider: 'paddle',
    providerCustomerId: subscription.customer_id || transaction.customer_id || null,
    providerSubscriptionId: subscription.id,
    providerPriceId: subscription.items?.[0]?.price?.id || null,
    status: mapPaddleStatus(subscription.status),
    currentPeriodStart: subscription.current_billing_period?.starts_at || null,
    currentPeriodEnd: subscription.current_billing_period?.ends_at || null,
    cancelAtPeriodEnd: subscription.scheduled_change?.action === 'cancel',
    eventOccurredAt: subscription.updated_at || new Date().toISOString(),
  });

  const checkoutAttemptId = transaction.custom_data?.checkout_attempt_id;
  if (typeof checkoutAttemptId === 'string' && checkoutAttemptId) {
    await updatePaddleCheckoutAttemptStatus(checkoutAttemptId, 'completed');
  }

  return {
    synced: true,
    userId,
    subscriptionId: subscription.id,
  };
}
