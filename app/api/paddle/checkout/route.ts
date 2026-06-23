import { NextRequest, NextResponse } from 'next/server';
import { getAppUserFromRequest } from '@/lib/auth/app-user';
import {
  createPaddleCheckoutAttempt,
  getPaddleBillingReference,
  hasCheckoutBlockingSubscription,
  setPaddleCheckoutTransaction,
  updatePaddleCheckoutAttemptStatus,
} from '@/lib/supabase/services/subscriptions';

type BillingPeriod = 'monthly' | 'annual';
const TERMS_VERSION = '2026-06-23';

export async function POST(request: NextRequest) {
  const user = await getAppUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const blockingStatus = await hasCheckoutBlockingSubscription(user.id);
  if (blockingStatus) {
    return NextResponse.json(
      {
        error: blockingStatus === 'past_due'
          ? 'Payment method update required'
          : 'Subscription already active',
        code: blockingStatus === 'past_due'
          ? 'PAYMENT_METHOD_UPDATE_REQUIRED'
          : 'SUBSCRIPTION_ALREADY_ACTIVE',
      },
      { status: 409 }
    );
  }

  const body = await request.json().catch(() => null) as {
    billingPeriod?: BillingPeriod;
    termsAccepted?: boolean;
  } | null;
  const billingPeriod = body?.billingPeriod;
  if (billingPeriod !== 'monthly' && billingPeriod !== 'annual') {
    return NextResponse.json({ error: 'Invalid billing period' }, { status: 400 });
  }
  if (body?.termsAccepted !== true) {
    return NextResponse.json({ error: 'Terms acceptance is required' }, { status: 400 });
  }

  const apiKey = process.env.PADDLE_API_KEY;
  const priceId = billingPeriod === 'annual'
    ? process.env.NEXT_PUBLIC_PADDLE_PRICE_YEARLY
    : process.env.NEXT_PUBLIC_PADDLE_PRICE_MONTHLY;

  if (!apiKey || !priceId) {
    console.error('Paddle server environment variables are not configured.');
    return NextResponse.json({ error: 'Payment service is not configured' }, { status: 500 });
  }

  const attempt = await createPaddleCheckoutAttempt({
    userId: user.id,
    billingPeriod,
    termsVersion: TERMS_VERSION,
  });
  if (attempt.existingTransactionId) {
    if (attempt.existingBillingPeriod !== billingPeriod) {
      return NextResponse.json(
        { error: 'Another checkout is already in progress', code: 'CHECKOUT_IN_PROGRESS' },
        { status: 409 }
      );
    }
    return NextResponse.json({ transactionId: attempt.existingTransactionId });
  }
  if (attempt.isExisting) {
    return NextResponse.json(
      { error: 'Checkout is already being prepared', code: 'CHECKOUT_IN_PROGRESS' },
      { status: 409 }
    );
  }

  const isSandbox = process.env.NEXT_PUBLIC_PADDLE_ENVIRONMENT === 'sandbox';
  const apiBaseUrl = isSandbox ? 'https://sandbox-api.paddle.com' : 'https://api.paddle.com';
  const billingReference = await getPaddleBillingReference(user.id);
  const paddleHeaders = {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    'Paddle-Version': '1',
  };

  try {
    const priceResponse = await fetch(`${apiBaseUrl}/prices/${priceId}`, {
      headers: paddleHeaders,
      cache: 'no-store',
    });
    const priceResult = await priceResponse.json().catch(() => null) as {
      data?: {
        unit_price?: { amount?: string; currency_code?: string };
        billing_cycle?: { interval?: string; frequency?: number } | null;
        status?: string;
      };
    } | null;
    const expectedAmount = billingPeriod === 'annual' ? '4000' : '400';
    const expectedInterval = billingPeriod === 'annual' ? 'year' : 'month';
    if (
      !priceResponse.ok ||
      priceResult?.data?.unit_price?.currency_code !== 'USD' ||
      priceResult?.data?.unit_price?.amount !== expectedAmount ||
      priceResult?.data?.billing_cycle?.interval !== expectedInterval ||
      priceResult?.data?.billing_cycle?.frequency !== 1 ||
      priceResult?.data?.status !== 'active'
    ) {
      console.error('Paddle price configuration mismatch:', priceResult);
      await updatePaddleCheckoutAttemptStatus(attempt.id, 'failed');
      return NextResponse.json(
        { error: 'Paddle price configuration does not match the displayed price' },
        { status: 500 }
      );
    }

    const paddleResponse = await fetch(`${apiBaseUrl}/transactions`, {
      method: 'POST',
      headers: paddleHeaders,
      body: JSON.stringify({
        items: [{ price_id: priceId, quantity: 1 }],
        collection_mode: 'automatic',
        ...(billingReference?.customerId ? { customer_id: billingReference.customerId } : {}),
        custom_data: {
          user_id: user.id,
          billing_period: billingPeriod,
          checkout_attempt_id: attempt.id,
          terms_version: TERMS_VERSION,
        },
      }),
      cache: 'no-store',
    });

    const result = await paddleResponse.json().catch(() => null) as {
      data?: { id?: string };
      error?: { detail?: string };
    } | null;

    if (!paddleResponse.ok || !result?.data?.id) {
      console.error('Paddle transaction creation failed:', result);
      await updatePaddleCheckoutAttemptStatus(attempt.id, 'failed');
      return NextResponse.json(
        { error: result?.error?.detail || 'Could not create Paddle transaction' },
        { status: 502 }
      );
    }

    await setPaddleCheckoutTransaction(attempt.id, result.data.id);
    return NextResponse.json({ transactionId: result.data.id });
  } catch (error) {
    console.error('Paddle checkout preparation failed:', error);
    await updatePaddleCheckoutAttemptStatus(attempt.id, 'failed');
    return NextResponse.json({ error: 'Could not prepare Paddle checkout' }, { status: 502 });
  }
}
