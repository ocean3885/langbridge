import { NextRequest, NextResponse } from 'next/server';
import { getAppUserFromRequest } from '@/lib/auth/app-user';
import { isSuperAdmin } from '@/lib/auth/super-admin';
import {
  getBundle,
  getBundleWords,
  getBundleStudyWordIds,
  updateBundleStudyWords,
} from '@/lib/supabase/services/bundles';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAppUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isAdminUser = await isSuperAdmin({ userId: user.id, email: user.email ?? null });
    if (!isAdminUser) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const bundle = await getBundle(id);
    if (!bundle) {
      return NextResponse.json({ error: 'Bundle not found' }, { status: 404 });
    }

    const [candidates, selectedWordIds] = await Promise.all([
      getBundleWords(id),
      getBundleStudyWordIds(id),
    ]);

    return NextResponse.json({
      candidates,
      selectedWordIds,
    });
  } catch (error) {
    console.error('Error in GET /api/admin/bundles/[id]/words:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAppUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isAdminUser = await isSuperAdmin({ userId: user.id, email: user.email ?? null });
    if (!isAdminUser) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const bundle = await getBundle(id);
    if (!bundle) {
      return NextResponse.json({ error: 'Bundle not found' }, { status: 404 });
    }

    const body = await request.json();
    const wordIds = Array.isArray(body.wordIds)
      ? body.wordIds.map((id: unknown) => Number(id)).filter((id: number) => Number.isFinite(id) && id > 0)
      : [];

    await updateBundleStudyWords(id, wordIds);

    return NextResponse.json({
      success: true,
      selectedWordIds: wordIds,
      count: wordIds.length,
    });
  } catch (error) {
    console.error('Error in PUT /api/admin/bundles/[id]/words:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}
