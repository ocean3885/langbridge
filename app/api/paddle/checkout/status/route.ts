import { NextRequest, NextResponse } from 'next/server';
import { getAppUserFromRequest } from '@/lib/auth/app-user';
import { syncPaddleSubscriptionFromTransaction } from '@/lib/paddle/subscription-sync';
import {
  failPendingPaddleCheckoutAttempt,
  getPaddleCheckoutStatus,
  getUserSubscriptionSummary,
} from '@/lib/supabase/services/subscriptions';

export async function GET(request: NextRequest) {
  const user = await getAppUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const transactionId = request.nextUrl.searchParams.get('transactionId');
  if (!transactionId) {
    return NextResponse.json({ error: 'Missing transaction ID' }, { status: 400 });
  }

  const checkout = await getPaddleCheckoutStatus(user.id, transactionId);
  if (!checkout) {
    return NextResponse.json({ error: 'Checkout not found' }, { status: 404 });
  }

  let subscription = await getUserSubscriptionSummary(user.id);
  if (!subscription.isActive) {
    try {
      const syncResult = await syncPaddleSubscriptionFromTransaction({
        transactionId,
        expectedUserId: user.id,
      });
      if (!syncResult.synced) {
        console.warn('Paddle checkout was not synchronized:', syncResult.reason);
      }
      subscription = await getUserSubscriptionSummary(user.id);
    } catch (error) {
      console.error('Paddle checkout reconciliation failed:', error);
    }
  }

  return NextResponse.json({
    checkoutStatus: checkout.status,
    billingPeriod: checkout.billing_period,
    isActive: subscription.isActive,
    subscriptionStatus: subscription.status,
    currentPeriodStart: subscription.currentPeriodStart,
    currentPeriodEnd: subscription.currentPeriodEnd,
  });
}

export async function POST(request: NextRequest) {
  const user = await getAppUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => null) as {
    transactionId?: string;
    action?: string;
  } | null;

  if (!body?.transactionId || body.action !== 'abandon') {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  await failPendingPaddleCheckoutAttempt(user.id, body.transactionId);
  return NextResponse.json({ success: true });
}
