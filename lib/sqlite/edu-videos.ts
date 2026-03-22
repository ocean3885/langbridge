import { randomUUID } from 'crypto';
import { getSqliteDb } from '@/lib/sqlite/db';

export type SqliteEduVideo = {
  id: string;
  youtube_url: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  duration_seconds: number | null;
  created_at: string;
  language_id: number | null;
  category_id: string | null;
  channel_id: string | null;
  view_count: number;
  uploader_id: string | null;
  channel_name?: string | null;
  language_name?: string | null;
  category_name?: string | null;
};

export function extractYoutubeIdFromUrl(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/v\/([a-zA-Z0-9_-]{11})/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

export async function insertEduVideoSqlite(input: {
  youtubeUrl: string;
  title: string;
  description?: string | null;
  thumbnailUrl?: string | null;
  languageId?: number | null;
  categoryId?: string | null;
  channelId?: string | null;
  uploaderId?: string | null;
}): Promise<string> {
  const db = await getSqliteDb();
  const id = randomUUID();

  await db.run(
    `
      INSERT INTO edu_videos (
        id, youtube_url, title, description, thumbnail_url, duration_seconds,
        language_id, category_id, channel_id, uploader_id
      )
      VALUES (?, ?, ?, ?, ?, NULL, ?, ?, ?, ?)
    `,
    id,
    input.youtubeUrl,
    input.title,
    input.description ?? null,
    input.thumbnailUrl ?? null,
    input.languageId ?? null,
    input.categoryId ?? null,
    input.channelId ?? null,
    input.uploaderId ?? null
  );

  return id;
}

export async function deleteEduVideoSqlite(videoId: string): Promise<void> {
  const db = await getSqliteDb();
  await db.run(`DELETE FROM edu_videos WHERE id = ?`, videoId);
}

export async function updateEduVideoChannelSqlite(videoId: string, channelId: string | null): Promise<void> {
  const db = await getSqliteDb();
  await db.run(`UPDATE edu_videos SET channel_id = ? WHERE id = ?`, channelId ?? null, videoId);
}

export async function updateEduVideoPlacementSqlite(input: {
  videoId: string;
  channelId: string | null;
  categoryId: string | null;
}): Promise<void> {
  const db = await getSqliteDb();
  await db.run(
    `
      UPDATE edu_videos
      SET channel_id = ?,
          category_id = ?
      WHERE id = ?
    `,
    input.channelId ?? null,
    input.categoryId ?? null,
    input.videoId
  );
}

export async function updateEduVideoSqlite(input: {
  videoId: string;
  youtubeUrl: string;
  title: string;
  description?: string | null;
  languageId?: number | null;
  categoryId?: string | null;
  channelId?: string | null;
  thumbnailUrl?: string | null;
}): Promise<void> {
  const db = await getSqliteDb();
  await db.run(
    `
      UPDATE edu_videos
      SET youtube_url = ?,
          title = ?,
          description = ?,
          language_id = ?,
          category_id = ?,
          channel_id = ?,
          thumbnail_url = ?
      WHERE id = ?
    `,
    input.youtubeUrl,
    input.title,
    input.description ?? null,
    input.languageId ?? null,
    input.categoryId ?? null,
    input.channelId ?? null,
    input.thumbnailUrl ?? null,
    input.videoId
  );
}

export async function incrementEduVideoViewCountSqlite(videoId: string): Promise<void> {
  const db = await getSqliteDb();
  await db.run(`UPDATE edu_videos SET view_count = COALESCE(view_count, 0) + 1 WHERE id = ?`, videoId);
}

export async function updateEduVideoDurationSqlite(videoId: string, durationSeconds: number): Promise<void> {
  const db = await getSqliteDb();
  await db.run(
    `
      UPDATE edu_videos
      SET duration_seconds = ?
      WHERE id = ?
        AND (duration_seconds IS NULL OR duration_seconds <= 0)
    `,
    Math.max(0, Math.floor(durationSeconds)),
    videoId
  );
}

export async function getEduVideoByIdSqlite(videoId: string): Promise<SqliteEduVideo | null> {
  const db = await getSqliteDb();
  const row = await db.get<SqliteEduVideo>(
    `
      SELECT ev.id, ev.youtube_url, ev.title, ev.description, ev.thumbnail_url, ev.duration_seconds,
             ev.created_at, ev.language_id, ev.category_id, ev.channel_id, ev.view_count, ev.uploader_id,
             vc.channel_name AS channel_name,
             l.name_ko AS language_name,
             uc.name AS category_name
      FROM edu_videos ev
      LEFT JOIN video_channels vc ON vc.id = ev.channel_id
      LEFT JOIN languages l ON l.id = COALESCE(ev.language_id, vc.language_id)
      LEFT JOIN edu_video_categories uc ON uc.id = ev.category_id
      WHERE ev.id = ?
      LIMIT 1
    `,
    videoId
  );

  return row ?? null;
}

export async function listEduVideosSqlite(input?: {
  uploaderId?: string;
  uploaderIds?: string[];
  channelId?: string | null;
  hasChannel?: boolean;
  limit?: number;
}): Promise<SqliteEduVideo[]> {
  const db = await getSqliteDb();
  const where: string[] = [];
  const params: Array<string | number | null> = [];

  if (input?.uploaderIds && input.uploaderIds.length > 0) {
    const normalizedUploaderIds = input.uploaderIds
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean);

    if (normalizedUploaderIds.length > 0) {
      const placeholders = normalizedUploaderIds.map(() => '?').join(',');
      where.push(`LOWER(ev.uploader_id) IN (${placeholders})`);
      params.push(...normalizedUploaderIds);
    }
  } else if (input?.uploaderId) {
    where.push('ev.uploader_id = ?');
    params.push(input.uploaderId);
  }

  if (input && 'channelId' in input) {
    if (input.channelId === null) {
      where.push('ev.channel_id IS NULL');
    } else if (typeof input.channelId === 'string') {
      where.push('ev.channel_id = ?');
      params.push(input.channelId);
    }
  }

  if (input?.hasChannel) {
    where.push("ev.channel_id IS NOT NULL AND TRIM(ev.channel_id) <> ''");
  }

  const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';
  const limitClause = input?.limit ? `LIMIT ${Math.max(1, Math.floor(input.limit))}` : '';

  return db.all<SqliteEduVideo[]>(
    `
      SELECT ev.id, ev.youtube_url, ev.title, ev.description, ev.thumbnail_url, ev.duration_seconds,
             ev.created_at, ev.language_id, ev.category_id, ev.channel_id, ev.view_count, ev.uploader_id,
             vc.channel_name AS channel_name,
             l.name_ko AS language_name,
             uc.name AS category_name
      FROM edu_videos ev
      LEFT JOIN video_channels vc ON vc.id = ev.channel_id
      LEFT JOIN languages l ON l.id = COALESCE(ev.language_id, vc.language_id)
      LEFT JOIN edu_video_categories uc ON uc.id = ev.category_id
      ${whereClause}
      ORDER BY ev.created_at DESC
      ${limitClause}
    `,
    ...params
  );
}

export async function countEduVideosByCategoryForUploaderSqlite(input: {
  uploaderId: string;
  categoryId: number;
}): Promise<number> {
  const db = await getSqliteDb();
  const row = await db.get<{ count: number }>(
    `
      SELECT COUNT(*) as count
      FROM edu_videos
      WHERE uploader_id = ?
        AND category_id = ?
    `,
    input.uploaderId,
    String(input.categoryId)
  );

  return row?.count ?? 0;
}

export async function hasEduVideosForCategoryByUploaderSqlite(input: {
  uploaderId: string;
  categoryId: number;
}): Promise<boolean> {
  const db = await getSqliteDb();
  const row = await db.get<{ id: string }>(
    `
      SELECT id
      FROM edu_videos
      WHERE uploader_id = ?
        AND category_id = ?
      LIMIT 1
    `,
    input.uploaderId,
    String(input.categoryId)
  );

  return Boolean(row);
}