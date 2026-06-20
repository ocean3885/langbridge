import { getAppUserFromRequest } from '@/lib/auth/app-user';
import { isSuperAdmin } from '@/lib/auth/super-admin';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';

async function requireAdmin(request: NextRequest) {
  const user = await getAppUserFromRequest(request);
  if (!user) {
    return { response: NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 }) };
  }

  const allowed = await isSuperAdmin({ userId: user.id, email: user.email ?? null });
  if (!allowed) {
    return { response: NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 }) };
  }

  return { user };
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin(request);
    if ('response' in auth) return auth.response;

    const { searchParams } = new URL(request.url);
    const batchId = searchParams.get('batchId');
    const scope = searchParams.get('scope');
    const supabase = createAdminClient();

    if (scope === 'counts') {
      const [pendingResult, incompleteResult] = await Promise.all([
        supabase
          .from('distractor_generation_batches')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'review_pending'),
        supabase
          .from('distractor_generation_batches')
          .select('id', { count: 'exact', head: true })
          .in('status', ['generating', 'review_pending']),
      ]);

      if (pendingResult.error) {
        throw new Error(`검수 대기 배치 개수 조회 실패: ${pendingResult.error.message}`);
      }
      if (incompleteResult.error) {
        throw new Error(`미완료 생성 배치 개수 조회 실패: ${incompleteResult.error.message}`);
      }

      return NextResponse.json({
        pendingCount: pendingResult.count ?? 0,
        incompleteCount: incompleteResult.count ?? 0,
      });
    }

    if (scope === 'incomplete') {
      const { data, error } = await supabase
        .from('distractor_generation_batches')
        .select('id, status, created_at')
        .in('status', ['generating', 'review_pending'])
        .order('created_at', { ascending: false });

      if (error) throw new Error(`미완료 생성 배치 조회 실패: ${error.message}`);
      return NextResponse.json(data || []);
    }

    let query = supabase
      .from('distractor_generation_batches')
      .select('*, distractor_generation_items(*)')
      .eq('status', 'review_pending')
      .order('created_at', { ascending: false });

    if (batchId) {
      query = query.eq('id', batchId).limit(1);
    } else {
      query = query.limit(20);
    }

    const { data, error } = await query;
    if (error) throw new Error(`검수 대기 배치 조회 실패: ${error.message}`);

    return NextResponse.json(data || []);
  } catch (error) {
    console.error('오답 생성 배치 API 오류:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin(request);
    if ('response' in auth) return auth.response;

    const { totalCount } = await request.json();
    const normalizedTotal = Number(totalCount);
    if (!Number.isInteger(normalizedTotal) || normalizedTotal <= 0) {
      return NextResponse.json({ error: '생성 대상 개수가 올바르지 않습니다.' }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { data: incompleteBatch, error: incompleteBatchError } = await supabase
      .from('distractor_generation_batches')
      .select('id, status')
      .in('status', ['generating', 'review_pending'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (incompleteBatchError) {
      throw new Error(`미완료 생성 배치 조회 실패: ${incompleteBatchError.message}`);
    }
    if (incompleteBatch) {
      const message = incompleteBatch.status === 'review_pending'
        ? '검수 대기 중인 오답 생성 배치를 먼저 승인·반영해주세요.'
        : '진행 중인 오답 생성 배치가 있습니다. 완료 후 다시 시도해주세요.';
      return NextResponse.json({
        error: message,
        batchId: incompleteBatch.id,
        status: incompleteBatch.status,
      }, { status: 409 });
    }

    const { data, error } = await supabase
      .from('distractor_generation_batches')
      .insert({
        total_count: normalizedTotal,
        created_by: auth.user.id,
        status: 'generating',
      })
      .select()
      .single();

    if (error) throw new Error(`생성 배치 저장 실패: ${error.message}`);
    return NextResponse.json(data);
  } catch (error) {
    console.error('오답 생성 배치 API 오류:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireAdmin(request);
    if ('response' in auth) return auth.response;

    const body = await request.json();
    const batchId = typeof body.batchId === 'string' ? body.batchId : '';
    const action = body.action;
    if (!batchId) {
      return NextResponse.json({ error: '생성 배치 ID가 필요합니다.' }, { status: 400 });
    }

    const supabase = createAdminClient();

    if (action === 'finalize') {
      const { data: batch, error: batchError } = await supabase
        .from('distractor_generation_batches')
        .select('id, status, created_by')
        .eq('id', batchId)
        .maybeSingle();

      if (batchError) throw new Error(`생성 배치 조회 실패: ${batchError.message}`);
      if (!batch || batch.created_by !== auth.user.id) {
        return NextResponse.json({ error: '생성 배치를 찾을 수 없습니다.' }, { status: 404 });
      }
      if (batch.status !== 'generating') {
        return NextResponse.json({ error: '이미 종료된 생성 배치입니다.' }, { status: 409 });
      }

      const { data: items, error: itemError } = await supabase
        .from('distractor_generation_items')
        .select('status')
        .eq('batch_id', batchId);

      if (itemError) throw new Error(`생성 항목 조회 실패: ${itemError.message}`);

      const successCount = (items || []).filter(item => item.status === 'generated').length;
      const failedCount = (items || []).filter(item => item.status === 'failed').length;
      const { data, error } = await supabase
        .from('distractor_generation_batches')
        .update({
          status: 'review_pending',
          success_count: successCount,
          failed_count: failedCount,
          completed_at: new Date().toISOString(),
        })
        .eq('id', batchId)
        .eq('status', 'generating')
        .select()
        .single();

      if (error) throw new Error(`생성 배치 완료 처리 실패: ${error.message}`);
      return NextResponse.json(data);
    }

    if (action === 'publish_items') {
      if (!Array.isArray(body.items)) {
        return NextResponse.json({ error: '검수 항목 배열이 필요합니다.' }, { status: 400 });
      }

      const { data: batch, error: batchError } = await supabase
        .from('distractor_generation_batches')
        .select('id, status')
        .eq('id', batchId)
        .maybeSingle();

      if (batchError) throw new Error(`생성 배치 조회 실패: ${batchError.message}`);
      if (!batch) {
        return NextResponse.json({ error: '생성 배치를 찾을 수 없습니다.' }, { status: 404 });
      }
      if (batch.status !== 'review_pending') {
        return NextResponse.json({ error: '검수 대기 상태의 배치만 반영할 수 있습니다.' }, { status: 409 });
      }

      const { data, error } = await supabase.rpc('publish_distractor_generation_items', {
        p_batch_id: batchId,
        p_reviewed_by: auth.user.id,
        p_items: body.items,
      });

      if (error) throw new Error(`검수 완료 단어 등록 실패: ${error.message}`);
      return NextResponse.json(data);
    }

    if (action === 'save_review') {
      if (!Array.isArray(body.items)) {
        return NextResponse.json({ error: '검수 항목 배열이 필요합니다.' }, { status: 400 });
      }

      const { data: batch, error: batchError } = await supabase
        .from('distractor_generation_batches')
        .select('id, status')
        .eq('id', batchId)
        .maybeSingle();

      if (batchError) throw new Error(`생성 배치 조회 실패: ${batchError.message}`);
      if (!batch || batch.status !== 'review_pending') {
        return NextResponse.json({ error: '검수 대기 상태의 배치를 찾을 수 없습니다.' }, { status: 409 });
      }

      for (const item of body.items) {
        if (!item || typeof item.item_id !== 'string') continue;
        const { error } = await supabase
          .from('distractor_generation_items')
          .update({ review_json: item })
          .eq('id', item.item_id)
          .eq('batch_id', batchId);

        if (error) throw new Error(`검수 내용 저장 실패: ${error.message}`);
      }

      return NextResponse.json({ message: '검수 내용을 저장했습니다.' });
    }

    if (action === 'discard') {
      const { data, error } = await supabase.rpc('discard_distractor_generation_batch', {
        p_batch_id: batchId,
        p_reviewed_by: auth.user.id,
      });

      if (error) throw new Error(`생성 배치 폐기 실패: ${error.message}`);
      return NextResponse.json(data);
    }

    return NextResponse.json({ error: '지원하지 않는 작업입니다.' }, { status: 400 });
  } catch (error) {
    console.error('오답 생성 배치 API 오류:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
