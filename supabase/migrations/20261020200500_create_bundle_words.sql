-- Create bundle_words table to manage selected study words for each bundle

CREATE TABLE IF NOT EXISTS public.bundle_words (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bundle_id UUID NOT NULL REFERENCES public.bundle(id) ON DELETE CASCADE,
    word_id BIGINT NOT NULL REFERENCES public.words(id) ON DELETE CASCADE,
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_bundle_words_bundle_word UNIQUE (bundle_id, word_id)
);

CREATE INDEX IF NOT EXISTS idx_bundle_words_bundle_id ON public.bundle_words(bundle_id);
CREATE INDEX IF NOT EXISTS idx_bundle_words_word_id ON public.bundle_words(word_id);

ALTER TABLE public.bundle_words ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to bundle_words"
    ON public.bundle_words FOR SELECT USING (true);

CREATE POLICY "Allow service role full access to bundle_words"
    ON public.bundle_words FOR ALL USING (auth.role() = 'service_role');

COMMENT ON TABLE public.bundle_words
    IS 'Stores curated study words selected by admin for a bundle.';
