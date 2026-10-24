import { NextRequest, NextResponse } from 'next/server';
import { getAppUserFromRequest } from '@/lib/auth/app-user';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: NextRequest) {
  const user = await getAppUserFromRequest(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
  const modes = body?.type === 'words' ? ['quiz', 'spelling', 'flashcard'] : body?.type === 'sentences' ? ['quiz', 'scramble', 'wordfill', 'flashcards'] : [];
  if (!body || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.sessionId || '')
    || !modes.includes(body.mode) || !Number.isInteger(body.count) || body.count < 1 || body.count > 40 || typeof body.ended !== 'boolean') {
    return NextResponse.json({ error: 'Invalid session' }, { status: 400 });
  }
  const { error } = await createAdminClient().rpc('record_review_session', {
    p_user_id: user.id, p_session_id: body.sessionId, p_type: body.type, p_mode: body.mode, p_count: body.count, p_ended: body.ended,
  });
  if (error) { console.error('Review session telemetry failed', error.code); return NextResponse.json({ error: 'Unable to record session' }, { status: 503 }); }
  return NextResponse.json({ saved: true });
}
