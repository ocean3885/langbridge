import { getSqliteDb } from './db';

export interface BoardPost {
  id: number;
  user_id: string;
  user_email: string | null;
  title: string;
  content: string;
  file_name: string | null;
  file_path: string | null;
  view_count: number;
  created_at: string;
  updated_at: string;
}

export async function listBoardPostsSqlite(input?: {
  limit?: number;
  offset?: number;
}): Promise<{ posts: BoardPost[]; total: number }> {
  const db = await getSqliteDb();
  const limit = input?.limit ?? 20;
  const offset = input?.offset ?? 0;

  const countRow = await db.get<{ count: number }>('SELECT COUNT(*) as count FROM board_posts');
  const total = countRow?.count ?? 0;

  const posts = await db.all<BoardPost[]>(
    `
      SELECT id, user_id, user_email, title, content, file_name, file_path,
             view_count, created_at, updated_at
      FROM board_posts
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `,
    limit,
    offset
  );

  return { posts, total };
}

export async function getBoardPostSqlite(postId: number): Promise<BoardPost | undefined> {
  const db = await getSqliteDb();
  return db.get<BoardPost>(
    `
      SELECT id, user_id, user_email, title, content, file_name, file_path,
             view_count, created_at, updated_at
      FROM board_posts
      WHERE id = ?
    `,
    postId
  );
}

export async function createBoardPostSqlite(input: {
  userId: string;
  userEmail: string | null;
  title: string;
  content: string;
  fileName: string | null;
  filePath: string | null;
}): Promise<number> {
  const db = await getSqliteDb();
  const result = await db.run(
    `
      INSERT INTO board_posts (user_id, user_email, title, content, file_name, file_path)
      VALUES (?, ?, ?, ?, ?, ?)
    `,
    input.userId,
    input.userEmail,
    input.title,
    input.content,
    input.fileName,
    input.filePath
  );
  return result.lastID;
}

export async function deleteBoardPostSqlite(postId: number): Promise<void> {
  const db = await getSqliteDb();
  await db.run('DELETE FROM board_posts WHERE id = ?', postId);
}

export async function incrementBoardPostViewSqlite(postId: number): Promise<void> {
  const db = await getSqliteDb();
  await db.run('UPDATE board_posts SET view_count = view_count + 1 WHERE id = ?', postId);
}
