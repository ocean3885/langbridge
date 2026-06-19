DO $$
DECLARE
  constraint_name TEXT;
BEGIN
  SELECT conname
  INTO constraint_name
  FROM pg_constraint
  WHERE conrelid = 'public.distractor_generation_batches'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) ILIKE '%status%'
  LIMIT 1;

  IF constraint_name IS NOT NULL THEN
    EXECUTE format(
      'ALTER TABLE public.distractor_generation_batches DROP CONSTRAINT %I',
      constraint_name
    );
  END IF;
END $$;

ALTER TABLE public.distractor_generation_batches
  ADD CONSTRAINT distractor_generation_batches_status_check
  CHECK (status IN ('generating', 'review_pending', 'published', 'failed', 'discarded'));

CREATE OR REPLACE FUNCTION public.discard_distractor_generation_batch(
  p_batch_id UUID,
  p_reviewed_by UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  batch_row public.distractor_generation_batches%ROWTYPE;
  discarded_item_count INTEGER := 0;
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
    RAISE EXCEPTION '검수 대기 상태의 배치만 폐기할 수 있습니다.';
  END IF;

  UPDATE public.distractor_generation_items
  SET
    status = 'rejected',
    review_json = jsonb_build_object(
      'decision', 'discarded',
      'discarded_at', NOW()
    ),
    reviewed_at = NOW()
  WHERE batch_id = p_batch_id
    AND status = 'generated';

  GET DIAGNOSTICS discarded_item_count = ROW_COUNT;

  UPDATE public.distractor_generation_batches
  SET
    status = 'discarded',
    reviewed_by = p_reviewed_by,
    reviewed_at = NOW(),
    report_json = COALESCE(report_json, '{}'::jsonb) || jsonb_build_object(
      'discarded', TRUE,
      'discarded_item_count', discarded_item_count
    )
  WHERE id = p_batch_id;

  RETURN jsonb_build_object(
    'batchId', p_batch_id,
    'discardedItemCount', discarded_item_count,
    'status', 'discarded'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.discard_distractor_generation_batch(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.discard_distractor_generation_batch(UUID, UUID) TO service_role;
