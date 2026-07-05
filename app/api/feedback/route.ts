import { NextRequest, NextResponse } from 'next/server';
import { getAppUserFromServer } from '@/lib/auth/app-user';
import { createBoardPost } from '@/lib/supabase/services/board';

const categoryLabels = {
  bug: 'Bug',
  feature: 'Feature',
  content: 'Content',
  other: 'Other',
} as const;

type FeedbackCategory = keyof typeof categoryLabels;

function isFeedbackCategory(value: unknown): value is FeedbackCategory {
  return typeof value === 'string' && value in categoryLabels;
}

export async function POST(request: NextRequest) {
  const user = await getAppUserFromServer();
  if (!user) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const category = body?.category;
  const subject = typeof body?.subject === 'string' ? body.subject.trim() : '';
  const message = typeof body?.message === 'string' ? body.message.trim() : '';

  if (!isFeedbackCategory(category)) {
    return NextResponse.json({ error: '피드백 유형을 선택해주세요.' }, { status: 400 });
  }

  if (!subject) {
    return NextResponse.json({ error: '제목을 입력해주세요.' }, { status: 400 });
  }

  if (!message) {
    return NextResponse.json({ error: '내용을 입력해주세요.' }, { status: 400 });
  }

  const postId = await createBoardPost({
    userId: user.id,
    userEmail: user.email ?? null,
    title: `[Feedback][${categoryLabels[category]}] ${subject.slice(0, 160)}`,
    content: [`Category: ${categoryLabels[category]}`, '', message].join('\n'),
    fileName: null,
    filePath: null,
  });

  return NextResponse.json({ id: postId });
}
