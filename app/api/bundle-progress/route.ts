import { NextRequest, NextResponse } from 'next/server';
import { getAppUserFromRequest } from '@/lib/auth/app-user';
import { isSuperAdmin } from '@/lib/auth/super-admin';
import { getBundle } from '@/lib/supabase/services/bundles';
import { recordBundleItemPractice } from '@/lib/supabase/services/bundle-progress';

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

    const bundle = await getBundle(String(bundle_id));
    const isAdminUser = await isSuperAdmin({ userId: user.id, email: user.email });
    if (!bundle || (!bundle.is_published && !isAdminUser)) {
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
