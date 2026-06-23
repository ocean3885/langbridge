CREATE TABLE IF NOT EXISTS public.paddle_checkout_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    billing_period TEXT NOT NULL CHECK (billing_period IN ('monthly', 'annual')),
    paddle_transaction_id TEXT UNIQUE,
    status TEXT NOT NULL DEFAULT 'pending'
      CHECK (status IN ('pending', 'completed', 'failed', 'expired')),
    terms_version TEXT NOT NULL,
    terms_accepted_at TIMESTAMPTZ NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_paddle_checkout_attempts_one_pending_per_user
  ON public.paddle_checkout_attempts(user_id)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_paddle_checkout_attempts_user_created
  ON public.paddle_checkout_attempts(user_id, created_at DESC);

ALTER TABLE public.paddle_checkout_attempts ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.paddle_webhook_events (
    event_id TEXT PRIMARY KEY,
    event_type TEXT NOT NULL,
    occurred_at TIMESTAMPTZ,
    processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.paddle_webhook_events ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.paddle_checkout_attempts IS
  'Server-created Paddle checkout attempts used for duplicate prevention, terms evidence, and success verification.';
COMMENT ON TABLE public.paddle_webhook_events IS
  'Processed Paddle webhook event IDs used for idempotency.';
