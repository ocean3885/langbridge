CREATE TABLE IF NOT EXISTS public.distractor_generation_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status TEXT NOT NULL DEFAULT 'generating'
    CHECK (status IN ('generating', 'review_pending', 'published', 'failed')),
  total_count INTEGER NOT NULL DEFAULT 0 CHECK (total_count >= 0),
  success_count INTEGER NOT NULL DEFAULT 0 CHECK (success_count >= 0),
  failed_count INTEGER NOT NULL DEFAULT 0 CHECK (failed_count >= 0),
  report_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID,
  reviewed_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.distractor_generation_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID NOT NULL REFERENCES public.distractor_generation_batches(id) ON DELETE CASCADE,
  word_id BIGINT NOT NULL REFERENCES public.words(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'generated', 'failed', 'published', 'rejected')),
  source_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  generated_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  review_json JSONB,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (batch_id, word_id)
);

CREATE INDEX IF NOT EXISTS idx_distractor_generation_batches_status
  ON public.distractor_generation_batches(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_distractor_generation_items_batch
  ON public.distractor_generation_items(batch_id, status);

ALTER TABLE public.distractor_generation_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.distractor_generation_items ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS update_distractor_generation_batches_updated_at
  ON public.distractor_generation_batches;
CREATE TRIGGER update_distractor_generation_batches_updated_at
  BEFORE UPDATE ON public.distractor_generation_batches
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_distractor_generation_items_updated_at
  ON public.distractor_generation_items;
CREATE TRIGGER update_distractor_generation_items_updated_at
  BEFORE UPDATE ON public.distractor_generation_items
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

COMMENT ON TABLE public.distractor_generation_batches
  IS 'Admin-only AI distractor generation batches awaiting review before publication.';

COMMENT ON TABLE public.distractor_generation_items
  IS 'Per-word generated distractor drafts and their review decisions.';

CREATE OR REPLACE FUNCTION public.publish_distractor_generation_batch(
  p_batch_id UUID,
  p_reviewed_by UUID,
  p_items JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  batch_row public.distractor_generation_batches%ROWTYPE;
  review_item JSONB;
  distractor_item JSONB;
  target_item public.distractor_generation_items%ROWTYPE;
  published_count INTEGER := 0;
  replaced_word_count INTEGER := 0;
  deleted_count INTEGER := 0;
  total_deleted_count INTEGER := 0;
  approved_distractor_count INTEGER := 0;
  distinct_distractor_count INTEGER := 0;
  decision TEXT;
BEGIN
  SELECT *
  INTO batch_row
  FROM public.distractor_generation_batches
  WHERE id = p_batch_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION '생성 배치를 찾을 수 없습니다.';
  END IF;

  IF batch_row.status <> 'review_pending' THEN
    RAISE EXCEPTION '검수 대기 상태의 배치만 반영할 수 있습니다.';
  END IF;

  IF jsonb_typeof(p_items) <> 'array' THEN
    RAISE EXCEPTION '검수 항목 배열이 필요합니다.';
  END IF;

  FOR review_item IN SELECT value FROM jsonb_array_elements(p_items)
  LOOP
    SELECT *
    INTO target_item
    FROM public.distractor_generation_items
    WHERE id = (review_item->>'item_id')::UUID
      AND batch_id = p_batch_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION '배치에 속하지 않은 검수 항목입니다.';
    END IF;

    decision := COALESCE(review_item->>'decision', 'rejected');

    IF decision = 'approved' AND target_item.status = 'generated' THEN
      SELECT
        count(*),
        count(DISTINCT lower(btrim(value->>'word')))
      INTO approved_distractor_count, distinct_distractor_count
      FROM jsonb_array_elements(COALESCE(review_item->'distractors', '[]'::jsonb))
      WHERE COALESCE((value->>'approved')::BOOLEAN, FALSE) = TRUE;

      IF approved_distractor_count <> 6 THEN
        RAISE EXCEPTION '단어 ID %는 정확히 6개의 오답을 승인해야 합니다.', target_item.word_id;
      END IF;

      IF distinct_distractor_count <> 6 THEN
        RAISE EXCEPTION '단어 ID %의 승인 오답에 중복이 있습니다.', target_item.word_id;
      END IF;

      IF EXISTS (
        SELECT 1
        FROM jsonb_array_elements(COALESCE(review_item->'distractors', '[]'::jsonb))
        WHERE COALESCE((value->>'approved')::BOOLEAN, FALSE) = TRUE
          AND (
            btrim(COALESCE(value->>'word', '')) = ''
            OR btrim(COALESCE(value->>'meaning_ko', '')) = ''
            OR btrim(COALESCE(value->>'meaning_en', '')) = ''
            OR lower(btrim(value->>'word')) =
              lower(btrim(COALESCE(target_item.source_snapshot->>'word', '')))
          )
      ) THEN
        RAISE EXCEPTION '단어 ID %의 승인 오답에 빈 값 또는 원본 단어와 동일한 값이 있습니다.', target_item.word_id;
      END IF;

      DELETE FROM public.words_distractor
      WHERE word_id = target_item.word_id;

      GET DIAGNOSTICS deleted_count = ROW_COUNT;
      total_deleted_count := total_deleted_count + deleted_count;

      FOR distractor_item IN
        SELECT value
        FROM jsonb_array_elements(COALESCE(review_item->'distractors', '[]'::jsonb))
      LOOP
        IF COALESCE((distractor_item->>'approved')::BOOLEAN, FALSE) = FALSE THEN
          CONTINUE;
        END IF;

        INSERT INTO public.words_distractor (
          word_id,
          distractor,
          meaning_ko,
          meaning_en
        ) VALUES (
          target_item.word_id,
          btrim(distractor_item->>'word'),
          NULLIF(btrim(distractor_item->>'meaning_ko'), ''),
          NULLIF(btrim(distractor_item->>'meaning_en'), '')
        );

        published_count := published_count + 1;
      END LOOP;

      replaced_word_count := replaced_word_count + 1;

      UPDATE public.distractor_generation_items
      SET
        status = 'published',
        review_json = review_item,
        reviewed_at = NOW()
      WHERE id = target_item.id;
    ELSE
      UPDATE public.distractor_generation_items
      SET
        status = CASE WHEN target_item.status = 'failed' THEN 'failed' ELSE 'rejected' END,
        review_json = review_item,
        reviewed_at = NOW()
      WHERE id = target_item.id;
    END IF;
  END LOOP;

  IF replaced_word_count = 0 THEN
    RAISE EXCEPTION '교체할 승인 단어가 없습니다.';
  END IF;

  UPDATE public.distractor_generation_batches
  SET
    status = 'published',
    reviewed_by = p_reviewed_by,
    reviewed_at = NOW(),
    report_json = jsonb_build_object(
      'replaced_word_count', replaced_word_count,
      'deleted_distractor_count', total_deleted_count,
      'published_distractor_count', published_count,
      'replacement_count_per_word', 6
    )
  WHERE id = p_batch_id;

  RETURN jsonb_build_object(
    'replacedWordCount', replaced_word_count,
    'deletedDistractorCount', total_deleted_count,
    'publishedDistractorCount', published_count,
    'replacementCountPerWord', 6
  );
END;
$$;

REVOKE ALL ON FUNCTION public.publish_distractor_generation_batch(UUID, UUID, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.publish_distractor_generation_batch(UUID, UUID, JSONB) TO service_role;
