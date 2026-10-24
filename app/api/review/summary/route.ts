import { NextRequest, NextResponse } from 'next/server';
import { getAppUserFromRequest } from '@/lib/auth/app-user';
import { getReviewNeededSummary } from '@/lib/supabase/services/learning-review';
export async function GET(request: NextRequest) {
  const user = await getAppUserFromRequest(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try { return NextResponse.json(await getReviewNeededSummary(user.id), { headers: { 'Cache-Control': 'private, no-store' } }); }
  catch { return NextResponse.json({ error: 'Unable to load review queue.' }, { status: 503 }); }
}
