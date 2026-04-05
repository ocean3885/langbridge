import { NextRequest, NextResponse } from 'next/server';
import { getAppUserFromServer } from '@/lib/auth/app-user';
import { getBoardPostSqlite } from '@/lib/sqlite/board';
import { createAdminClient } from '@/lib/supabase/admin';
import { getStorageBucket } from '@/lib/supabase/storage';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAppUserFromServer();
  if (!user) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }

  const { id } = await params;
  const postId = Number(id);
  if (!Number.isFinite(postId)) {
    return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 });
  }

  const post = await getBoardPostSqlite(postId);
  if (!post || !post.file_path) {
    return NextResponse.json({ error: '파일을 찾을 수 없습니다.' }, { status: 404 });
  }

  const adminClient = createAdminClient();
  const bucket = getStorageBucket();
  const { data, error } = await adminClient.storage.from(bucket).download(post.file_path);

  if (error || !data) {
    console.error('Board file download error:', error);
    return NextResponse.json({ error: '파일 다운로드에 실패했습니다.' }, { status: 500 });
  }

  const buffer = Buffer.from(await data.arrayBuffer());
  const fileName = post.file_name || 'script.csv';

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName)}"`,
    },
  });
}
