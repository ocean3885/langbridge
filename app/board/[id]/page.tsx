import { notFound } from 'next/navigation';
import { getBoardPostSqlite, incrementBoardPostViewSqlite } from '@/lib/sqlite/board';
import { getAppUserFromServer } from '@/lib/auth/app-user';
import { isSuperAdminSqlite } from '@/lib/auth/super-admin';
import BoardDetailClient from './BoardDetailClient';

export const dynamic = 'force-dynamic';

interface BoardDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function BoardDetailPage({ params }: BoardDetailPageProps) {
  const { id } = await params;
  const postId = Number(id);

  if (!Number.isFinite(postId)) {
    notFound();
  }

  const post = await getBoardPostSqlite(postId);
  if (!post) {
    notFound();
  }

  await incrementBoardPostViewSqlite(postId);

  const user = await getAppUserFromServer();
  const isAdmin = user
    ? await isSuperAdminSqlite({ userId: user.id, email: user.email ?? null })
    : false;
  const canDelete = Boolean(user && (user.id === post.user_id || isAdmin));

  return (
    <BoardDetailClient
      post={{
        id: post.id,
        title: post.title,
        content: post.content,
        userName: post.user_email ? post.user_email.split('@')[0] : '익명',
        fileName: post.file_name,
        viewCount: post.view_count + 1,
        createdAt: post.created_at,
      }}
      canDelete={canDelete}
    />
  );
}
