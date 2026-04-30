import { randomUUID } from 'crypto';
import { getSqliteDb } from '@/lib/sqlite/db';

export type SqliteUserCategoryVideo = {
  id: string;
  user_id: string;
  category_id: number;
  video_id: string;
  created_at: string;
  updated_at: string;
};

export type SqliteCategoryVideoListItem = {
  id: string;
  user_id: string;
  category_id: number;
  video_id: string;
  created_at: string;
  updated_at: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  youtube_id: string;
  visibility: 'public' | 'private' | 'members_only';
  uploader_id: string | null;
  duration: number | null;
  transcript_count: number;
};

export type SqliteVideoCategoryListItem = {
  id: string;
  user_id: string;
  category_id: number;
  video_id: string;
  created_at: string;
  updated_at: string;
  category_name: string;
  language_id: number | null;
};

export async function addUserCategoryVideoSqlite(input: {
  userId: string;
  categoryId: number;
  videoId: string;
}): Promise<SqliteUserCategoryVideo> {
  const db = await getSqliteDb();
  const id = randomUUID();

  await db.run(
    `
      INSERT INTO user_category_videos (
        id,
        user_id,
        category_id,
        video_id,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT(user_id, category_id, video_id) DO UPDATE SET
        updated_at = CURRENT_TIMESTAMP
    `,
    id,
    input.userId,
    input.categoryId,
    input.videoId
  );

  const row = await db.get<SqliteUserCategoryVideo>(
    `
      SELECT id, user_id, category_id, video_id, created_at, updated_at
      FROM user_category_videos
      WHERE user_id = ? AND category_id = ? AND video_id = ?
      LIMIT 1
    `,
    input.userId,
    input.categoryId,
    input.videoId
  );

  if (!row) {
    throw new Error('카테고리 비디오 매핑 저장 후 조회에 실패했습니다.');
  }

  return row;
}

export async function removeUserCategoryVideoSqlite(input: {
  userId: string;
  categoryId: number;
  videoId: string;
}): Promise<void> {
  const db = await getSqliteDb();
  await db.run(
    `
      DELETE FROM user_category_videos
      WHERE user_id = ?
        AND category_id = ?
        AND video_id = ?
    `,
    input.userId,
    input.categoryId,
    input.videoId
  );
}

export async function listVideosByUserCategorySqlite(input: {
  userId: string;
  categoryId: number;
}): Promise<SqliteCategoryVideoListItem[]> {
  const db = await getSqliteDb();
  return db.all<SqliteCategoryVideoListItem[]>(
    `
      SELECT
        ucv.id,
        ucv.user_id,
        ucv.category_id,
        ucv.video_id,
        ucv.created_at,
        ucv.updated_at,
        v.title,
        v.description,
        v.thumbnail_url,
        v.youtube_id,
        v.visibility,
        v.uploader_id,
        v.duration,
        (
          SELECT COUNT(*)
          FROM transcripts t
          WHERE t.video_id = v.id
        ) AS transcript_count
      FROM user_category_videos ucv
      INNER JOIN videos v ON v.id = ucv.video_id
      WHERE ucv.user_id = ?
        AND ucv.category_id = ?
      ORDER BY ucv.created_at DESC
    `,
    input.userId,
    input.categoryId
  );
}

export async function listUserCategoriesForVideoSqlite(input: {
  userId: string;
  videoId: string;
}): Promise<SqliteVideoCategoryListItem[]> {
  const db = await getSqliteDb();
  return db.all<SqliteVideoCategoryListItem[]>(
    `
      SELECT
        ucv.id,
        ucv.user_id,
        ucv.category_id,
        ucv.video_id,
        ucv.created_at,
        ucv.updated_at,
        uc.name AS category_name,
        uc.language_id
      FROM user_category_videos ucv
      INNER JOIN user_categories uc
        ON uc.id = ucv.category_id
       AND uc.user_id = ucv.user_id
      WHERE ucv.user_id = ?
        AND ucv.video_id = ?
      ORDER BY uc.name ASC
    `,
    input.userId,
    input.videoId
  );
}
