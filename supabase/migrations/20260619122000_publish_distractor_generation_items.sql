CREATE OR REPLACE FUNCTION public.publish_distractor_generation_items(
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
  replaced_word_count INTEGER := 0;
  published_distractor_count INTEGER := 0;
  deleted_count INTEGER := 0;
  total_deleted_count INTEGER := 0;
  distractor_count INTEGER := 0;
  distinct_distractor_count INTEGER := 0;
  remaining_count INTEGER := 0;
  batch_completed BOOLEAN := FALSE;
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
    RAISE EXCEPTION '등록할 단어 배열이 필요합니다.';
  END IF;

  IF jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION '등록할 단어 배열이 필요합니다.';
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

    IF target_item.status <> 'generated' THEN
      RAISE EXCEPTION '단어 ID %는 등록 가능한 생성 상태가 아닙니다.', target_item.word_id;
    END IF;

    SELECT
      count(*),
      count(DISTINCT lower(btrim(value->>'word')))
    INTO distractor_count, distinct_distractor_count
    FROM jsonb_array_elements(COALESCE(review_item->'distractors', '[]'::jsonb));

    IF distractor_count <> 6 THEN
      RAISE EXCEPTION '단어 ID %는 정확히 6개의 오답이 필요합니다.', target_item.word_id;
    END IF;

    IF distinct_distractor_count <> 6 THEN
      RAISE EXCEPTION '단어 ID %의 오답에 중복이 있습니다.', target_item.word_id;
    END IF;

    IF EXISTS (
      SELECT 1
      FROM jsonb_array_elements(COALESCE(review_item->'distractors', '[]'::jsonb))
      WHERE
        btrim(COALESCE(value->>'word', '')) = ''
        OR btrim(COALESCE(value->>'meaning_ko', '')) = ''
        OR btrim(COALESCE(value->>'meaning_en', '')) = ''
        OR lower(btrim(value->>'word')) =
          lower(btrim(COALESCE(target_item.source_snapshot->>'word', '')))
    ) THEN
      RAISE EXCEPTION '단어 ID %의 오답에 빈 값 또는 원본 단어와 동일한 값이 있습니다.', target_item.word_id;
    END IF;

    DELETE FROM public.words_distractor
    WHERE word_id = target_item.word_id;

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    total_deleted_count := total_deleted_count + deleted_count;

    FOR distractor_item IN
      SELECT value
      FROM jsonb_array_elements(review_item->'distractors')
    LOOP
      INSERT INTO public.words_distractor (
        word_id,
        distractor,
        meaning_ko,
        meaning_en
      ) VALUES (
        target_item.word_id,
        btrim(distractor_item->>'word'),
        btrim(distractor_item->>'meaning_ko'),
        btrim(distractor_item->>'meaning_en')
      );

      published_distractor_count := published_distractor_count + 1;
    END LOOP;

    UPDATE public.distractor_generation_items
    SET
      status = 'published',
      review_json = jsonb_build_object(
        'decision', 'approved',
        'distractors', review_item->'distractors'
      ),
      reviewed_at = NOW()
    WHERE id = target_item.id;

    replaced_word_count := replaced_word_count + 1;
  END LOOP;

  SELECT count(*)
  INTO remaining_count
  FROM public.distractor_generation_items
  WHERE batch_id = p_batch_id
    AND status = 'generated';

  batch_completed := remaining_count = 0;

  UPDATE public.distractor_generation_batches
  SET
    status = CASE WHEN batch_completed THEN 'published' ELSE 'review_pending' END,
    reviewed_by = p_reviewed_by,
    reviewed_at = CASE WHEN batch_completed THEN NOW() ELSE reviewed_at END,
    report_json = COALESCE(report_json, '{}'::jsonb) || jsonb_build_object(
      'last_replaced_word_count', replaced_word_count,
      'last_deleted_distractor_count', total_deleted_count,
      'last_published_distractor_count', published_distractor_count,
      'remaining_review_count', remaining_count,
      'replacement_count_per_word', 6
    )
  WHERE id = p_batch_id;

  RETURN jsonb_build_object(
    'replacedWordCount', replaced_word_count,
    'deletedDistractorCount', total_deleted_count,
    'publishedDistractorCount', published_distractor_count,
    'remainingCount', remaining_count,
    'batchCompleted', batch_completed,
    'replacementCountPerWord', 6
  );
END;
$$;

REVOKE ALL ON FUNCTION public.publish_distractor_generation_items(UUID, UUID, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.publish_distractor_generation_items(UUID, UUID, JSONB) TO service_role;
