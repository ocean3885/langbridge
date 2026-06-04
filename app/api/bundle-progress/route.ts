import { NextRequest, NextResponse } from 'next/server';
import { getAppUserFromRequest } from '@/lib/auth/app-user';
import { isSuperAdmin } from '@/lib/auth/super-admin';
import { getBundle } from '@/lib/supabase/services/bundles';
import {
  type BundlePracticeMode,
  recordBundleItemPractice,
  recordBundlePracticeAccess,
  recordBundleStudyAccess,
  updateBundlePinnedState,
} from '@/lib/supabase/services/bundle-progress';

async function getAccessibleBundle(bundleId: string, user: { id: string; email: string | null }) {
  const bundle = await getBundle(bundleId);
  const isAdminUser = await isSuperAdmin({ userId: user.id, email: user.email });
  return bundle && (bundle.is_published || isAdminUser) ? bundle : null;
}

function isValidPracticeMode(value: unknown): value is BundlePracticeMode {
  return typeof value === 'string' && /^[a-z][a-z0-9_-]{0,63}$/.test(value);
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAppUserFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }

    const body = await request.json();
    const { bundle_id, bundle_item_id, practice_mode, is_correct } = body;

    if (
      !bundle_id ||
      !bundle_item_id ||
      !['quiz', 'scramble'].includes(practice_mode) ||
      typeof is_correct !== 'boolean'
    ) {
      return NextResponse.json({ error: '유효한 Practice 결과가 필요합니다.' }, { status: 400 });
    }

    const bundle = await getAccessibleBundle(String(bundle_id), user);
    if (!bundle) {
      return NextResponse.json({ error: '접근할 수 없는 번들입니다.' }, { status: 404 });
    }

    const progress = await recordBundleItemPractice(
      user.id,
      String(bundle_id),
      String(bundle_item_id),
      practice_mode as 'quiz' | 'scramble',
      is_correct,
    );

    return NextResponse.json(progress);
  } catch (error: any) {
    console.error('API 오류 (bundle-progress):', error);
    return NextResponse.json({ error: error.message || '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await getAppUserFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }

    const body = await request.json();
    const { bundle_id, current_bundle_item_id, current_practice_mode, is_pinned } = body;

    if (!bundle_id || (typeof is_pinned !== 'boolean' && typeof current_bundle_item_id !== 'string')) {
      return NextResponse.json({ error: '유효한 번들 진행 상태가 필요합니다.' }, { status: 400 });
    }

    const bundle = await getAccessibleBundle(String(bundle_id), user);
    if (!bundle) {
      return NextResponse.json({ error: '접근할 수 없는 번들입니다.' }, { status: 404 });
    }

    if (typeof current_bundle_item_id === 'string') {
      if (current_practice_mode !== undefined) {
        if (!isValidPracticeMode(current_practice_mode)) {
          return NextResponse.json({ error: '유효한 Practice mode가 필요합니다.' }, { status: 400 });
        }

        await recordBundlePracticeAccess(
          user.id,
          String(bundle_id),
          current_practice_mode,
          current_bundle_item_id,
        );
        return NextResponse.json({ success: true });
      }

      await recordBundleStudyAccess(user.id, String(bundle_id), current_bundle_item_id);
      return NextResponse.json({ success: true });
    }

    const interaction = await updateBundlePinnedState(user.id, String(bundle_id), is_pinned);
    return NextResponse.json(interaction);
  } catch (error: any) {
    console.error('API 오류 (bundle progress update):', error);
    return NextResponse.json({ error: error.message || '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
