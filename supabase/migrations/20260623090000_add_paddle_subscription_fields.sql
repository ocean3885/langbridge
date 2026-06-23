ALTER TABLE public.user_subscriptions
ADD COLUMN IF NOT EXISTS provider_price_id TEXT,
ADD COLUMN IF NOT EXISTS last_event_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_subscriptions_provider_subscription_unique
  ON public.user_subscriptions(provider, provider_subscription_id)
  WHERE provider_subscription_id IS NOT NULL;
