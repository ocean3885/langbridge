import { NextRequest, NextResponse } from 'next/server';
import { getAppUserFromRequest } from '@/lib/auth/app-user';
import { getBundleReviewSummary, getReviewNeededSummary, getSentenceReviewSession, getReviewSentenceOptionPool } from '@/lib/supabase/services/learning-review';
export async function GET(request: NextRequest) {
  const user = await getAppUserFromRequest(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const bundleId = request.nextUrl.searchParams.get('bundleId');
  try {
    const summary = bundleId ? await getBundleReviewSummary(user.id, bundleId) : await getReviewNeededSummary(user.id);
    if (request.nextUrl.searchParams.get('type') === 'sentences') {
      const language = request.nextUrl.searchParams.get('language') === 'en' ? 'en' : 'ko';
      const pool = await getReviewSentenceOptionPool(user.id, 40);
      const session = await getSentenceReviewSession(user.id, language, bundleId || undefined, pool);
      return NextResponse.json({ ...summary, modeCounts: session.counts }, { headers: { 'Cache-Control': 'private, no-store' } });
    }
    return NextResponse.json(summary, { headers: { 'Cache-Control': 'private, no-store' } });
  }
  catch { return NextResponse.json({ error: 'Unable to load review queue.' }, { status: 503 }); }
}
