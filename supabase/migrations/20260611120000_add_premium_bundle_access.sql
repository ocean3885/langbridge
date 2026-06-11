-- Add bundle access tiers and user subscription state for premium content.

ALTER TABLE public.bundle
ADD COLUMN IF NOT EXISTS access_level TEXT NOT NULL DEFAULT 'free';

ALTER TABLE public.bundle
ADD CONSTRAINT bundle_access_level_check
CHECK (access_level IN ('free', 'premium'));

CREATE INDEX IF NOT EXISTS idx_bundle_access_level ON public.bundle(access_level);

CREATE TABLE IF NOT EXISTS public.user_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    provider TEXT NOT NULL DEFAULT 'manual',
    provider_customer_id TEXT,
    provider_subscription_id TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    current_period_start TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT user_subscriptions_status_check
      CHECK (status IN ('active', 'trialing', 'past_due', 'canceled', 'expired'))
);

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON public.user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_provider_subscription_id
  ON public.user_subscriptions(provider_subscription_id)
  WHERE provider_subscription_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_active_lookup
  ON public.user_subscriptions(user_id, status, current_period_end);

ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;

COMMENT ON COLUMN public.bundle.access_level IS 'Access tier for bundle learning content. free is public; premium requires an active subscription.';
COMMENT ON TABLE public.user_subscriptions IS 'Subscription state used to determine premium bundle access.';
