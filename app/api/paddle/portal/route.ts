import { NextRequest, NextResponse } from 'next/server';
import { getAppUserFromRequest } from '@/lib/auth/app-user';
import { getPaddleBillingReference } from '@/lib/supabase/services/subscriptions';

type PortalTarget = 'overview' | 'payment-method' | 'cancel';

type PortalSessionResponse = {
  data?: {
    urls?: {
      general?: {
        overview?: string;
      };
      subscriptions?: Array<{
        id?: string;
        cancel_subscription?: string;
        update_subscription_payment_method?: string;
      }>;
    };
  };
  error?: {
    detail?: string;
  };
};

function redirectToProfile(request: NextRequest, status: string) {
  const url = new URL('/profile', request.url);
  url.searchParams.set('billing', status);
  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest) {
  const target = request.nextUrl.searchParams.get('target') as PortalTarget | null;
  if (!target || !['overview', 'payment-method', 'cancel'].includes(target)) {
    return redirectToProfile(request, 'invalid-action');
  }

  const user = await getAppUserFromRequest(request);
  if (!user) {
    const loginUrl = new URL('/auth/login', request.url);
    loginUrl.searchParams.set('redirectTo', '/profile');
    return NextResponse.redirect(loginUrl);
  }

  try {
    const billingReference = await getPaddleBillingReference(user.id);
    if (!billingReference) {
      return redirectToProfile(request, 'not-found');
    }

    if (
      (target === 'payment-method' || target === 'cancel') &&
      !billingReference.subscriptionId
    ) {
      return redirectToProfile(request, 'subscription-not-found');
    }

    if (
      target === 'payment-method' &&
      !['active', 'trialing', 'past_due'].includes(billingReference.status || '')
    ) {
      return redirectToProfile(request, 'link-unavailable');
    }

    if (
      target === 'cancel' &&
      (
        !['active', 'trialing'].includes(billingReference.status || '') ||
        billingReference.cancelAtPeriodEnd
      )
    ) {
      return redirectToProfile(request, 'link-unavailable');
    }

    const apiKey = process.env.PADDLE_API_KEY;
    if (!apiKey) {
      console.error('PADDLE_API_KEY is not configured.');
      return redirectToProfile(request, 'configuration-error');
    }

    const isSandbox = process.env.NEXT_PUBLIC_PADDLE_ENVIRONMENT === 'sandbox';
    const apiBaseUrl = isSandbox ? 'https://sandbox-api.paddle.com' : 'https://api.paddle.com';
    const response = await fetch(
      `${apiBaseUrl}/customers/${billingReference.customerId}/portal-sessions`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'Paddle-Version': '1',
        },
        body: JSON.stringify(
          billingReference.subscriptionId
            ? { subscription_ids: [billingReference.subscriptionId] }
            : {}
        ),
        cache: 'no-store',
      }
    );

    const result = await response.json().catch(() => null) as PortalSessionResponse | null;
    if (!response.ok || !result?.data?.urls?.general?.overview) {
      console.error('Paddle portal session creation failed:', result);
      return redirectToProfile(request, 'portal-error');
    }

    const subscriptionUrls = result.data.urls.subscriptions?.find(
      (subscription) => subscription.id === billingReference.subscriptionId
    );
    const destination = target === 'cancel'
      ? subscriptionUrls?.cancel_subscription
      : target === 'payment-method'
        ? subscriptionUrls?.update_subscription_payment_method
        : result.data.urls.general.overview;

    if (!destination) {
      return redirectToProfile(request, 'link-unavailable');
    }

    return NextResponse.redirect(destination);
  } catch (error) {
    console.error('Failed to open Paddle customer portal:', error);
    return redirectToProfile(request, 'portal-error');
  }
}
