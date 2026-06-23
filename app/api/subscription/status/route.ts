import { NextRequest, NextResponse } from 'next/server';
import { getAppUserFromRequest } from '@/lib/auth/app-user';
import { getUserSubscriptionSummary } from '@/lib/supabase/services/subscriptions';

export async function GET(request: NextRequest) {
  const user = await getAppUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json(await getUserSubscriptionSummary(user.id));
}
