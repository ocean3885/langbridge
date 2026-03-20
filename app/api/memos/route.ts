import { getAppUserFromRequest } from '@/lib/auth/app-user';
import { NextRequest, NextResponse } from 'next/server';
import {
  deleteAudioMemoSqlite,
  insertAudioMemoSqlite,
  listAudioMemosSqlite,
  updateAudioMemoSqlite,
} from '@/lib/sqlite/audio-memos';

// GET: 특정 content_id의 모든 메모 조회
export async function GET(request: NextRequest) {
  const user = await getAppUserFromRequest(request);
  
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const contentId = searchParams.get('content_id');

  if (!contentId) {
    return NextResponse.json({ error: 'content_id is required' }, { status: 400 });
  }

  const data = await listAudioMemosSqlite(contentId, user.id);
  return NextResponse.json(data);
}

// POST: 새 메모 생성
export async function POST(request: NextRequest) {
  const user = await getAppUserFromRequest(request);
  
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { content_id, line_number, memo_text } = body;

    if (!content_id || line_number === undefined || !memo_text?.trim()) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const data = await insertAudioMemoSqlite({
      contentId: String(content_id),
      lineNumber: Number(line_number),
      userId: user.id,
      memoText: memo_text,
    });
    return NextResponse.json(data, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}

// PUT: 메모 수정
export async function PUT(request: NextRequest) {
  const user = await getAppUserFromRequest(request);
  
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { id, memo_text } = body;

    if (!id || !memo_text?.trim()) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const data = await updateAudioMemoSqlite({
      id: Number(id),
      userId: user.id,
      memoText: memo_text,
    });
    if (!data) {
      return NextResponse.json({ error: '메모를 찾을 수 없습니다.' }, { status: 404 });
    }
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}

// DELETE: 메모 삭제
export async function DELETE(request: NextRequest) {
  const user = await getAppUserFromRequest(request);
  
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }

  await deleteAudioMemoSqlite(Number(id), user.id);

  return NextResponse.json({ success: true });
}
