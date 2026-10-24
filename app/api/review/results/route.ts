import { NextRequest, NextResponse } from 'next/server';
import { getAppUserFromRequest } from '@/lib/auth/app-user';
import { validReviewResult } from '@/lib/learning/review-result';
import { ReviewWriteError, saveReviewResult } from '@/lib/supabase/services/review-results';

export async function POST(request: NextRequest) {
  const user = await getAppUserFromRequest(request);
  if (!user) return NextResponse.json({ error: 'Please sign in again.' }, { status: 401 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 }); }
  if (!validReviewResult(body)) return NextResponse.json({ error: 'Invalid review answer.' }, { status: 400 });
  try { return NextResponse.json(await saveReviewResult(user, body)); }
  catch (error) {
    if (error instanceof ReviewWriteError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error('Review save failed', error);
    return NextResponse.json({ error: 'Unable to save this answer.' }, { status: 503 });
  }
}
