import { randomUUID } from 'crypto';
import { getSqliteDb } from '@/lib/sqlite/db';

export type SqliteVideo = {
  id: string;
  youtube_id: string;
  title: string;
  description: string | null;
  duration: number | null;
  thumbnail_url: string | null;
  created_at: string;
  language_id: number | null;
  category_id: string | null;
  channel_id: string | null;
  view_count: number;
  uploader_id: string | null;
  channel_name?: string | null;
  language_name?: string | null;
};

export type SqliteTranscript = {
  id: string;
  video_id: string;
  start: number;
  duration: number;
  text_original: string;
  order_index: number;
};

export type SqliteTranslation = {
  id: string;
  transcript_id: string;
  lang: string;
  text_translated: string;
};

export async function insertVideoWithTranscriptsSqlite(input: {
  youtubeId: string;
  title: string;
  description?: string | null;
  duration?: number | null;
  thumbnailUrl?: string | null;
  languageId?: number | null;
  categoryId?: string | null;
  channelId?: string | null;
  uploaderId?: string | null;
  transcripts: Array<{ start: number; duration: number; textOriginal: string; orderIndex: number; textTranslated: string; lang: string }>;
}): Promise<string> {
  const db = await getSqliteDb();
  const videoId = randomUUID();

  await db.exec('BEGIN');
  try {
    await db.run(
      `
        INSERT INTO videos (
          id, youtube_id, title, description, duration, thumbnail_url,
          language_id, category_id, channel_id, uploader_id
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      videoId,
      input.youtubeId,
      input.title,
      input.description ?? null,
      input.duration ?? null,
      input.thumbnailUrl ?? null,
      input.languageId ?? null,
      input.categoryId ?? null,
      input.channelId ?? null,
      input.uploaderId ?? null
    );

    for (const item of input.transcripts) {
      const transcriptId = randomUUID();
      await db.run(
        `
          INSERT INTO transcripts (id, video_id, start, duration, text_original, order_index)
          VALUES (?, ?, ?, ?, ?, ?)
        `,
        transcriptId,
        videoId,
        item.start,
        item.duration,
        item.textOriginal,
        item.orderIndex
      );

      await db.run(
        `
          INSERT INTO translations (id, transcript_id, lang, text_translated)
          VALUES (?, ?, ?, ?)
        `,
        randomUUID(),
        transcriptId,
        item.lang,
        item.textTranslated
      );
    }

    await db.exec('COMMIT');
    return videoId;
  } catch (error) {
    await db.exec('ROLLBACK');
    throw error;
  }
}

export async function deleteVideoSqlite(videoId: string): Promise<void> {
  const db = await getSqliteDb();
  await db.exec('BEGIN');
  try {
    await db.run(
      `DELETE FROM translations WHERE transcript_id IN (SELECT id FROM transcripts WHERE video_id = ?)`,
      videoId
    );
    await db.run(`DELETE FROM transcripts WHERE video_id = ?`, videoId);
    await db.run(`DELETE FROM videos WHERE id = ?`, videoId);
    await db.exec('COMMIT');
  } catch (error) {
    await db.exec('ROLLBACK');
    throw error;
  }
}

export async function updateVideoChannelSqlite(videoId: string, channelId: string | null): Promise<void> {
  const db = await getSqliteDb();
  await db.run(`UPDATE videos SET channel_id = ? WHERE id = ?`, channelId ?? null, videoId);
}

export async function incrementVideoViewCountSqlite(videoId: string): Promise<void> {
  const db = await getSqliteDb();
  await db.run(`UPDATE videos SET view_count = COALESCE(view_count, 0) + 1 WHERE id = ?`, videoId);
}

export async function getVideoWithTranscriptsSqlite(videoId: string): Promise<{
  video: SqliteVideo | null;
  transcripts: Array<SqliteTranscript & { translations: SqliteTranslation[] }>;
}> {
  const db = await getSqliteDb();
  const video = await db.get<SqliteVideo>(
    `
      SELECT id, youtube_id, title, description, duration, thumbnail_url,
             created_at, language_id, category_id, channel_id, view_count, uploader_id
      FROM videos
      WHERE id = ?
      LIMIT 1
    `,
    videoId
  );

  if (!video) {
    return { video: null, transcripts: [] };
  }

  const transcripts = await db.all<SqliteTranscript[]>(
    `
      SELECT id, video_id, start, duration, text_original, order_index
      FROM transcripts
      WHERE video_id = ?
      ORDER BY order_index ASC
    `,
    videoId
  );

  if (transcripts.length === 0) {
    return { video, transcripts: [] };
  }

  const transcriptIds = transcripts.map((t) => t.id);
  const placeholders = transcriptIds.map(() => '?').join(',');
  const translations = await db.all<SqliteTranslation[]>(
    `
      SELECT id, transcript_id, lang, text_translated
      FROM translations
      WHERE transcript_id IN (${placeholders})
    `,
    ...transcriptIds
  );

  const translationMap = new Map<string, SqliteTranslation[]>();
  for (const tr of translations) {
    const list = translationMap.get(tr.transcript_id) ?? [];
    list.push(tr);
    translationMap.set(tr.transcript_id, list);
  }

  return {
    video,
    transcripts: transcripts.map((t) => ({
      ...t,
      translations: translationMap.get(t.id) ?? [],
    })),
  };
}

export async function getAllVideosSqlite(): Promise<Array<SqliteVideo & { transcript_count: number }>> {
  const db = await getSqliteDb();
  const videos = await db.all<SqliteVideo[]>(
    `
      SELECT id, youtube_id, title, description, duration, thumbnail_url,
             created_at, language_id, category_id, channel_id, view_count, uploader_id
      FROM videos
      ORDER BY created_at DESC
    `
  );

  const counts = await db.all<Array<{ video_id: string; count: number }>>(
    `
      SELECT video_id, COUNT(*) as count
      FROM transcripts
      GROUP BY video_id
    `
  );

  const countMap = new Map<string, number>();
  for (const row of counts) {
    countMap.set(row.video_id, row.count);
  }

  return videos.map((video) => ({
    ...video,
    transcript_count: countMap.get(video.id) ?? 0,
  }));
}

export async function listVideosSqlite(input?: {
  uploaderId?: string;
  uploaderIds?: string[];
  channelId?: string | null;
  hasChannel?: boolean;
  limit?: number;
}): Promise<Array<SqliteVideo & { transcript_count: number }>> {
  const db = await getSqliteDb();
  const where: string[] = [];
  const params: Array<string | number | null> = [];

  if (input?.uploaderIds && input.uploaderIds.length > 0) {
    const normalizedUploaderIds = input.uploaderIds
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean);

    if (normalizedUploaderIds.length > 0) {
      const placeholders = normalizedUploaderIds.map(() => '?').join(',');
      where.push(`LOWER(uploader_id) IN (${placeholders})`);
      params.push(...normalizedUploaderIds);
    }
  } else if (input?.uploaderId) {
    where.push('uploader_id = ?');
    params.push(input.uploaderId);
  }

  if (input && 'channelId' in input) {
    if (input.channelId === null) {
      where.push('channel_id IS NULL');
    } else if (typeof input.channelId === 'string') {
      where.push('channel_id = ?');
      params.push(input.channelId);
    }
  }

  if (input?.hasChannel) {
    where.push("channel_id IS NOT NULL AND TRIM(channel_id) <> ''");
  }

  const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';
  const limitClause = input?.limit ? `LIMIT ${Math.max(1, Math.floor(input.limit))}` : '';

  const videos = await db.all<SqliteVideo[]>(
    `
      SELECT v.id, v.youtube_id, v.title, v.description, v.duration, v.thumbnail_url,
             v.created_at, v.language_id, v.category_id, v.channel_id, v.view_count, v.uploader_id,
             vc.channel_name AS channel_name,
             l.name_ko AS language_name
      FROM videos v
      LEFT JOIN video_channels vc ON vc.id = v.channel_id
      LEFT JOIN languages l ON l.id = COALESCE(v.language_id, vc.language_id)
      ${whereClause}
      ORDER BY v.created_at DESC
      ${limitClause}
    `,
    ...params
  );

  if (videos.length === 0) return [];

  const ids = videos.map((v) => v.id);
  const placeholders = ids.map(() => '?').join(',');
  const counts = await db.all<Array<{ video_id: string; count: number }>>(
    `
      SELECT video_id, COUNT(*) as count
      FROM transcripts
      WHERE video_id IN (${placeholders})
      GROUP BY video_id
    `,
    ...ids
  );

  const countMap = new Map<string, number>();
  for (const row of counts) countMap.set(row.video_id, row.count);

  return videos.map((video) => ({
    ...video,
    transcript_count: countMap.get(video.id) ?? 0,
  }));
}

export async function updateVideoSqlite(input: {
  videoId: string;
  title: string;
  languageId: number | null;
  categoryId?: string | null;
  description?: string | null;
}): Promise<void> {
  const db = await getSqliteDb();
  await db.run(
    `
      UPDATE videos
      SET title = ?,
          language_id = ?,
          category_id = ?,
          description = ?
      WHERE id = ?
    `,
    input.title,
    input.languageId,
    input.categoryId ?? null,
    input.description ?? null,
    input.videoId
  );
}

export async function updateTranscriptSqlite(input: {
  transcriptId: string;
  start: number;
  duration: number;
  textOriginal: string;
  textTranslated: string;
}): Promise<void> {
  const db = await getSqliteDb();
  await db.exec('BEGIN');
  try {
    await db.run(
      `
        UPDATE transcripts
        SET
          start = ?,
          duration = ?,
          text_original = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      input.start,
      input.duration,
      input.textOriginal,
      input.transcriptId
    );

    const firstTranslation = await db.get<{ id: string }>(
      `
        SELECT id
        FROM translations
        WHERE transcript_id = ?
        ORDER BY created_at ASC, id ASC
        LIMIT 1
      `,
      input.transcriptId
    );

    if (firstTranslation) {
      await db.run(
        `
          UPDATE translations
          SET text_translated = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `,
        input.textTranslated,
        firstTranslation.id
      );
    }

    await db.exec('COMMIT');
  } catch (error) {
    await db.exec('ROLLBACK');
    throw error;
  }
}

export async function countVideosByCategoryForUploaderSqlite(input: {
  uploaderId: string;
  categoryId: number;
}): Promise<number> {
  const db = await getSqliteDb();
  const row = await db.get<{ count: number }>(
    `
      SELECT COUNT(*) as count
      FROM videos
      WHERE uploader_id = ?
        AND category_id = ?
    `,
    input.uploaderId,
    String(input.categoryId)
  );

  return row?.count ?? 0;
}

export async function hasVideosForCategoryByUploaderSqlite(input: {
  uploaderId: string;
  categoryId: number;
}): Promise<boolean> {
  const db = await getSqliteDb();
  const row = await db.get<{ id: string }>(
    `
      SELECT id
      FROM videos
      WHERE uploader_id = ?
        AND category_id = ?
      LIMIT 1
    `,
    input.uploaderId,
    String(input.categoryId)
  );

  return Boolean(row);
}
