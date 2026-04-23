import { NextRequest, NextResponse } from 'next/server';
import { getAppUserFromServer } from '@/lib/auth/app-user';
import { createBoardPost } from '@/lib/supabase/services/board';
import { createAdminClient } from '@/lib/supabase/admin';
import { getStorageBucket } from '@/lib/supabase/storage';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_EXTENSIONS = ['.csv', '.txt'];

export async function POST(request: NextRequest) {
  const user = await getAppUserFromServer();
  if (!user) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }

  const formData = await request.formData();
  const title = formData.get('title') as string | null;
  const content = formData.get('content') as string | null;
  const file = formData.get('file') as File | null;

  if (!title || !title.trim()) {
    return NextResponse.json({ error: '제목을 입력해주세요.' }, { status: 400 });
  }

  let fileName: string | null = null;
  let filePath: string | null = null;

  if (file && file.size > 0) {
    // 파일 크기 검증
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: '파일 크기는 5MB 이하만 가능합니다.' }, { status: 400 });
    }

    // 확장자 검증
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return NextResponse.json({ error: 'CSV 또는 TXT 파일만 업로드 가능합니다.' }, { status: 400 });
    }

    // Supabase Storage에 업로드
    const buffer = Buffer.from(await file.arrayBuffer());
    const storagePath = `board/${user.id}/${Date.now()}-${file.name}`;

    const adminClient = createAdminClient();
    const bucket = getStorageBucket();
    const { error: uploadError } = await adminClient.storage
      .from(bucket)
      .upload(storagePath, buffer, { contentType: file.type || 'text/csv' });

    if (uploadError) {
      console.error('Board file upload error:', uploadError);
      return NextResponse.json({ error: '파일 업로드에 실패했습니다.' }, { status: 500 });
    }

    fileName = file.name;
    filePath = storagePath;
  }

  const postId = await createBoardPost({
    userId: user.id,
    userEmail: user.email ?? null,
    title: title.trim(),
    content: (content || '').trim(),
    fileName,
    filePath,
  });

  return NextResponse.json({ id: postId });
}
