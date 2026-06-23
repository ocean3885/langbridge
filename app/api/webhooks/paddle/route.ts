import { createHmac, timingSafeEqual } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import {
  syncPaddleSubscriptionById,
  syncPaddleSubscriptionFromTransaction,
} from '@/lib/paddle/subscription-sync';
import {
  getUserIdByPaddleSubscriptionId,
  registerPaddleWebhookEvent,
  unregisterPaddleWebhookEvent,
  updatePaddleCheckoutAttemptStatus,
} from '@/lib/supabase/services/subscriptions';

export const runtime = 'nodejs';

type PaddleSubscription = {
  id: string;
  status: string;
  customer_id?: string | null;
  custom_data?: Record<string, unknown> | null;
  items?: Array<{ price?: { id?: string } }>;
  current_billing_period?: {
    starts_at?: string | null;
    ends_at?: string | null;
  } | null;
  scheduled_change?: {
    action?: string;
    effective_at?: string;
  } | null;
  subscription_id?: string | null;
};

type PaddleWebhookEvent = {
  event_id: string;
  event_type: string;
  occurred_at?: string;
  data: PaddleSubscription;
};

function verifyPaddleSignature(rawBody: string, signatureHeader: string, secret: string) {
  const parts = signatureHeader.split(';');
  const timestamp = parts.find((part) => part.startsWith('ts='))?.slice(3);
  const signatures = parts
    .filter((part) => part.startsWith('h1='))
    .map((part) => part.slice(3));

  if (!timestamp || signatures.length === 0) return false;

  const timestampSeconds = Number(timestamp);
  if (
    !Number.isFinite(timestampSeconds) ||
    Math.abs(Date.now() / 1000 - timestampSeconds) > 30
  ) {
    return false;
  }

  const expected = createHmac('sha256', secret)
    .update(`${timestamp}:${rawBody}`)
    .digest('hex');

  return signatures.some((signature) => {
    if (!/^[a-f0-9]{64}$/i.test(signature) || signature.length !== expected.length) return false;
    return timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expected, 'hex'));
  });
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get('paddle-signature') || '';
  const webhookSecret = process.env.PADDLE_WEBHOOK_SECRET || '';

  if (!webhookSecret || !signature || !verifyPaddleSignature(rawBody, signature, webhookSecret)) {
    return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 });
  }

  let event: PaddleWebhookEvent;
  try {
    event = JSON.parse(rawBody) as PaddleWebhookEvent;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
  }

  const supportedEvents = new Set([
    'transaction.completed',
    'subscription.created',
    'subscription.updated',
    'subscription.canceled',
    'subscription.paused',
    'subscription.resumed',
  ]);

  if (!supportedEvents.has(event.event_type)) {
    return NextResponse.json({ received: true });
  }

  const isNewEvent = await registerPaddleWebhookEvent({
    eventId: event.event_id,
    eventType: event.event_type,
    occurredAt: event.occurred_at,
  });
  if (!isNewEvent) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  try {
    const checkoutAttemptId = event.data.custom_data?.checkout_attempt_id;
    if (typeof checkoutAttemptId === 'string' && checkoutAttemptId) {
      await updatePaddleCheckoutAttemptStatus(checkoutAttemptId, 'completed');
    }

    if (event.event_type === 'transaction.completed') {
      const syncResult = await syncPaddleSubscriptionFromTransaction({
        transactionId: event.data.id,
      });
      if (!syncResult.synced) {
        throw new Error(`Transaction subscription sync failed: ${syncResult.reason}`);
      }
    } else if (event.event_type.startsWith('subscription.')) {
      const subscription = event.data;
      const customDataUserId = subscription.custom_data?.user_id;
      const userId = typeof customDataUserId === 'string' && customDataUserId
        ? customDataUserId
        : await getUserIdByPaddleSubscriptionId(subscription.id);

      if (!userId) {
        throw new Error(`Paddle webhook ${event.event_id} is missing custom_data.user_id`);
      }

      const syncResult = await syncPaddleSubscriptionById({
        subscriptionId: subscription.id,
        userId,
      });
      if (!syncResult.synced) {
        throw new Error(`Subscription sync failed: ${syncResult.reason}`);
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    await unregisterPaddleWebhookEvent(event.event_id);
    console.error('Paddle webhook processing failed:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
