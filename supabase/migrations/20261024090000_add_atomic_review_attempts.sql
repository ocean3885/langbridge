-- Server-only atomic review writes. Existing interaction tables remain authoritative.
CREATE TABLE public.user_review_attempts (
  user_id text NOT NULL REFERENCES public.auth_users(id) ON DELETE CASCADE,
  attempt_id uuid NOT NULL,
  session_id uuid NOT NULL,
  target_type text NOT NULL CHECK (target_type IN ('words', 'sentences')),
  target_id text NOT NULL,
  payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, attempt_id),
  UNIQUE (user_id, session_id, target_type, target_id)
);
ALTER TABLE public.user_review_attempts ENABLE ROW LEVEL SECURITY;

-- The API validates content/access and computes changes using the existing TS
-- completion rules. Compare snapshots while locked, then commit all effects.
-- A stale snapshot raises 40001; the API reloads and recomputes, never overwrites.
CREATE FUNCTION public.commit_review_attempt(
  p_user_id text, p_payload jsonb, p_changes jsonb, p_deltas jsonb
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  previous public.user_review_attempts;
  change jsonb;
  tbl text;
  key_name text;
  key_value text;
  current_row jsonb;
  cols text;
  assignments text;
  activity_day date := (now() AT TIME ZONE 'Asia/Seoul')::date;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended('review:' || p_user_id, 0));
  SELECT * INTO previous FROM public.user_review_attempts
    WHERE user_id = p_user_id AND (attempt_id = (p_payload->>'attemptId')::uuid
      OR (session_id = (p_payload->>'sessionId')::uuid AND target_type = p_payload->>'type' AND target_id = p_payload->>'targetId'));
  IF FOUND THEN
    IF previous.payload <> p_payload THEN RAISE EXCEPTION 'Review attempt conflict' USING ERRCODE = '23505'; END IF;
    RETURN jsonb_build_object('saved', true, 'duplicate', true);
  END IF;
  IF jsonb_typeof(p_changes) <> 'array' OR jsonb_array_length(p_changes) = 0 THEN
    RAISE EXCEPTION 'Missing review changes';
  END IF;

  -- Validate every snapshot before any mutation, with row locks also protecting
  -- against ordinary UPDATEs between this comparison and the commit.
  FOR change IN SELECT value FROM jsonb_array_elements(p_changes) LOOP
    tbl := change->>'table';
    key_name := CASE tbl
      WHEN 'user_word_interactions' THEN 'word_id'
      WHEN 'user_sentence_interactions' THEN 'sentence_id'
      WHEN 'user_bundle_item_interactions' THEN 'bundle_item_id'
      WHEN 'user_bundle_interactions' THEN 'bundle_id' ELSE NULL END;
    IF key_name IS NULL THEN RAISE EXCEPTION 'Invalid review table'; END IF;
    key_value := change->>'key';
    EXECUTE format('SELECT to_jsonb(t) FROM public.%I t WHERE user_id = $1 AND %I::text = $2 FOR UPDATE', tbl, key_name)
      INTO current_row USING p_user_id, key_value;
    IF COALESCE(current_row, 'null'::jsonb) IS DISTINCT FROM change->'before' THEN
      RAISE EXCEPTION 'Review snapshot changed' USING ERRCODE = '40001';
    END IF;
  END LOOP;

  -- Seed a complete historical baseline only if absent, before applying deltas.
  INSERT INTO public.user_learning_stats(user_id, completed_sentences, earned_stars, practiced_words, total_correct_count, total_incorrect_count, metadata)
  SELECT p_user_id,
    (SELECT count(*) FROM public.user_bundle_item_interactions WHERE user_id=p_user_id AND is_completed),
    (SELECT count(*) FROM public.user_bundle_item_interactions i CROSS JOIN (VALUES ('quiz'),('scramble'),('wordfill')) m(mode)
      WHERE i.user_id=p_user_id AND (COALESCE((i.metadata->'practice_modes'->m.mode->>'correct_count')::int,0)>0 OR NULLIF(i.metadata->'practice_modes'->m.mode->>'first_correct_at','') IS NOT NULL)),
    (SELECT count(*) FROM public.user_word_interactions WHERE user_id=p_user_id AND last_reviewed_at IS NOT NULL),
    COALESCE((SELECT sum(correct_count) FROM public.user_bundle_item_interactions WHERE user_id=p_user_id),0)
      + COALESCE((SELECT sum(COALESCE((metadata->>'standalone_correct_count')::int,0)) FROM public.user_word_interactions WHERE user_id=p_user_id AND last_reviewed_at IS NOT NULL),0),
    COALESCE((SELECT sum(incorrect_count) FROM public.user_bundle_item_interactions WHERE user_id=p_user_id),0)
      + COALESCE((SELECT sum(COALESCE((metadata->>'standalone_incorrect_count')::int,0)) FROM public.user_word_interactions WHERE user_id=p_user_id AND last_reviewed_at IS NOT NULL),0),
    jsonb_build_object('seeded_from_interactions_at', now())
  ON CONFLICT(user_id) DO NOTHING;

  FOR change IN SELECT value FROM jsonb_array_elements(p_changes) LOOP
    IF change->'values' = '{}'::jsonb THEN CONTINUE; END IF;
    tbl := change->>'table';
    key_name := CASE tbl WHEN 'user_word_interactions' THEN 'word_id' WHEN 'user_sentence_interactions' THEN 'sentence_id'
      WHEN 'user_bundle_item_interactions' THEN 'bundle_item_id' ELSE 'bundle_id' END;
    IF (change->'values') ?| ARRAY['id','user_id','created_at', key_name] THEN RAISE EXCEPTION 'Invalid review fields'; END IF;
    SELECT string_agg(format('%I', k), ', '), string_agg(format('%I = EXCLUDED.%I', k, k), ', ')
      INTO cols, assignments FROM jsonb_object_keys(change->'values') k;
    EXECUTE format('INSERT INTO public.%I (user_id, %I, %s) SELECT user_id, %I, %s FROM jsonb_populate_record(NULL::public.%I, $1) ON CONFLICT (user_id, %I) DO UPDATE SET %s',
      tbl, key_name, cols, key_name, cols, tbl, key_name, assignments)
      USING (change->'values') || jsonb_build_object('user_id', p_user_id, key_name, change->>'key');
  END LOOP;

  PERFORM public.increment_user_learning_stats(p_user_id,
    COALESCE((p_deltas->>'sentences')::int,0), COALESCE((p_deltas->>'stars')::int,0), COALESCE((p_deltas->>'words')::int,0),
    (p_payload->>'correct')::boolean::int, (NOT (p_payload->>'correct')::boolean)::int);
  PERFORM public.increment_user_learning_daily_activity(p_user_id, activity_day,
    COALESCE((p_deltas->>'stars')::int,0), COALESCE((p_deltas->>'sentences')::int,0), COALESCE((p_deltas->>'dailyWords')::int,0),
    COALESCE((p_deltas->>'masteredSentences')::int,0), COALESCE((p_deltas->>'masteredWords')::int,0),
    (p_payload->>'correct')::boolean::int, (NOT (p_payload->>'correct')::boolean)::int, 0);
  UPDATE public.user_learning_daily_activity SET metadata = COALESCE(metadata,'{}'::jsonb) || jsonb_build_object(
    'last_activity_type','practice_result','last_practice_mode',p_payload->>'mode','last_is_correct',(p_payload->>'correct')::boolean,
    'time_zone','Asia/Seoul','activity_types', COALESCE(metadata->'activity_types','{}'::jsonb) || jsonb_build_object('practice_result',COALESCE((metadata->'activity_types'->>'practice_result')::int,0)+1))
    WHERE user_id=p_user_id AND activity_date=activity_day;
  INSERT INTO public.user_review_attempts(user_id, attempt_id, session_id, target_type, target_id, payload)
    VALUES(p_user_id, (p_payload->>'attemptId')::uuid, (p_payload->>'sessionId')::uuid, p_payload->>'type', p_payload->>'targetId', p_payload);
  RETURN jsonb_build_object('saved',true,'duplicate',false);
END;
$$;
REVOKE ALL ON FUNCTION public.commit_review_attempt(text,jsonb,jsonb,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.commit_review_attempt(text,jsonb,jsonb,jsonb) TO service_role;

-- Minimal session telemetry; no question text, answers, or translated content.
CREATE TABLE public.user_review_sessions (
  user_id text NOT NULL REFERENCES public.auth_users(id) ON DELETE CASCADE,
  session_id uuid NOT NULL,
  target_type text NOT NULL CHECK (target_type IN ('words','sentences')),
  mode text NOT NULL,
  selected_count integer NOT NULL CHECK (selected_count BETWEEN 1 AND 40),
  assessed_count integer NOT NULL DEFAULT 0,
  correct_count integer NOT NULL DEFAULT 0,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  PRIMARY KEY(user_id, session_id)
);
ALTER TABLE public.user_review_sessions ENABLE ROW LEVEL SECURITY;
CREATE FUNCTION public.record_review_session(p_user_id text, p_session_id uuid, p_type text, p_mode text, p_count integer, p_ended boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE existing public.user_review_sessions;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended('review:' || p_user_id, 0));
  INSERT INTO public.user_review_sessions(user_id,session_id,target_type,mode,selected_count)
    VALUES(p_user_id,p_session_id,p_type,p_mode,p_count) ON CONFLICT DO NOTHING;
  SELECT * INTO existing FROM public.user_review_sessions WHERE user_id=p_user_id AND session_id=p_session_id;
  IF existing.target_type<>p_type OR existing.mode<>p_mode OR existing.selected_count<>p_count THEN
    RAISE EXCEPTION 'Session conflict' USING ERRCODE='23505';
  END IF;
  IF p_ended THEN
    UPDATE public.user_review_sessions SET ended_at=COALESCE(ended_at,now()),
      assessed_count=(SELECT count(*) FROM public.user_review_attempts WHERE user_id=p_user_id AND session_id=p_session_id),
      correct_count=(SELECT count(*) FROM public.user_review_attempts WHERE user_id=p_user_id AND session_id=p_session_id AND (payload->>'correct')::boolean)
      WHERE user_id=p_user_id AND session_id=p_session_id;
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.record_review_session(text,uuid,text,text,integer,boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_review_session(text,uuid,text,text,integer,boolean) TO service_role;
