import { NextRequest, NextResponse } from 'next/server';
import { getAppUserFromRequest } from '@/lib/auth/app-user';
import { createOrUpdateSubscription } from '@/lib/supabase/services/subscriptions';

export async function POST(request: NextRequest) {
  try {
    const user = await getAppUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { paymentKey, orderId, amount } = body;

    if (!paymentKey || !orderId || !amount) {
      return NextResponse.json({ message: 'Missing required parameters' }, { status: 400 });
    }

    // Verify that the orderId belongs to the authenticated user to prevent fraudulent confirmation
    if (!orderId.includes(user.id)) {
      return NextResponse.json({ message: 'Forbidden: Order ID mismatch' }, { status: 403 });
    }

    const secretKey = process.env.TOSS_TEST_SECRET_KEY;
    if (!secretKey) {
      console.error('TOSS_TEST_SECRET_KEY is not defined in environment variables');
      return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
    }

    const base64SecretKey = Buffer.from(secretKey + ':').toString('base64');

    const tossResponse = await fetch('https://api.tosspayments.com/v1/payments/confirm', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${base64SecretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        paymentKey,
        orderId,
        amount,
      }),
    });

    const data = await tossResponse.json();

    if (!tossResponse.ok) {
      console.error('Toss Payments confirmation failed:', data);
      return NextResponse.json({ 
        message: data.message || 'Payment confirmation failed',
        code: data.code || 'UNKNOWN_ERROR'
      }, { status: tossResponse.status });
    }

    // Payment is successfully confirmed!
    // Active subscription duration: 30 days.
    const currentPeriodStart = new Date().toISOString();
    const currentPeriodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    await createOrUpdateSubscription({
      userId: user.id,
      provider: 'tosspayments',
      providerCustomerId: data.customerKey || null,
      providerSubscriptionId: paymentKey,
      status: 'active',
      currentPeriodStart,
      currentPeriodEnd,
    });

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Error confirming payment:', error);
    return NextResponse.json({ message: error.message || 'Internal server error' }, { status: 500 });
  }
}
