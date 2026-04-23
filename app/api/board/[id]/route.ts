import { NextRequest, NextResponse } from 'next/server';
import { getAppUserFromServer } from '@/lib/auth/app-user';
import { getBoardPost, deleteBoardPost } from '@/lib/supabase/services/board';
import { isSuperAdmin } from '@/lib/auth/super-admin';
import { createAdminClient } from '@/lib/supabase/admin';
import { getStorageBucket } from '@/lib/supabase/storage';

export async function DELETE(
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

  const post = await getBoardPost(postId);
  if (!post) {
    return NextResponse.json({ error: '게시글을 찾을 수 없습니다.' }, { status: 404 });
  }

  const isAdmin = await isSuperAdmin({ userId: user.id, email: user.email ?? null });
  if (post.user_id !== user.id && !isAdmin) {
    return NextResponse.json({ error: '삭제 권한이 없습니다.' }, { status: 403 });
  }

  // 첨부 파일이 있으면 스토리지에서 삭제
  if (post.file_path) {
    try {
      const adminClient = createAdminClient();
      const bucket = getStorageBucket();
      await adminClient.storage.from(bucket).remove([post.file_path]);
    } catch (err) {
      console.error('Failed to delete board file from storage:', err);
    }
  }

  await deleteBoardPost(postId);
  return NextResponse.json({ success: true });
}
