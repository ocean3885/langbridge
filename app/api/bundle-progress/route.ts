import { NextRequest, NextResponse } from 'next/server';
import { getAppUserFromRequest } from '@/lib/auth/app-user';
import { markBundleItemCompleted } from '@/lib/supabase/services/bundle-progress';

export async function POST(request: NextRequest) {
  try {
    const user = await getAppUserFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }

    const body = await request.json();
    const { bundle_id, bundle_item_id } = body;

    if (!bundle_id || !bundle_item_id) {
      return NextResponse.json({ error: 'bundle_id와 bundle_item_id가 필요합니다.' }, { status: 400 });
    }

    const progress = await markBundleItemCompleted(user.id, String(bundle_id), String(bundle_item_id));

    return NextResponse.json(progress);
  } catch (error: any) {
    console.error('API 오류 (bundle-progress):', error);
    return NextResponse.json({ error: error.message || '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
