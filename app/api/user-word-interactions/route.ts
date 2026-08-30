import { NextRequest, NextResponse } from 'next/server';
import { getAppUserFromRequest } from '@/lib/auth/app-user';
import { upsertUserWordInteraction } from '@/lib/supabase/services/user-interactions';

export async function POST(request: NextRequest) {
  try {
    const user = await getAppUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });

    const body = await request.json();
    const wordId = Number(body.word_id);
    if (!Number.isInteger(wordId) || wordId <= 0) {
      return NextResponse.json({ error: 'A valid word_id is required.' }, { status: 400 });
    }

    const updates: { is_pinned?: boolean; memo?: string | null } = {};
    if (typeof body.is_pinned === 'boolean') updates.is_pinned = body.is_pinned;
    if (body.memo === null || typeof body.memo === 'string') {
      const memo = typeof body.memo === 'string' ? body.memo.trim() : null;
      if (memo && memo.length > 1000) {
        return NextResponse.json({ error: 'Memo must be 1,000 characters or fewer.' }, { status: 400 });
      }
      updates.memo = memo || null;
    }
    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No supported update was provided.' }, { status: 400 });
    }

    const updated = await upsertUserWordInteraction(user.id, wordId, updates);
    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('API error (user-word-interactions):', error);
    return NextResponse.json({ error: error.message || 'Unable to update word.' }, { status: 500 });
  }
}
