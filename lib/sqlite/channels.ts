import { randomUUID } from 'crypto';
import { getSqliteDb } from '@/lib/sqlite/db';

export type SqliteVideoChannel = {
  id: string;
  channel_name: string;
  channel_url: string | null;
  channel_description: string | null;
  thumbnail_url: string | null;
  language_id: number | null;
  created_at: string;
  updated_at: string;
};

export async function listSqliteChannels(): Promise<SqliteVideoChannel[]> {
  const db = await getSqliteDb();
  return db.all<SqliteVideoChannel[]>(
    `
      SELECT
        id,
        channel_name,
        channel_url,
        channel_description,
        thumbnail_url,
        language_id,
        created_at,
        updated_at
      FROM video_channels
      ORDER BY channel_name ASC
    `
  );
}

export async function listSqliteChannelsWithVideoCount(): Promise<Array<SqliteVideoChannel & { video_count: number }>> {
  const db = await getSqliteDb();
  return db.all<Array<SqliteVideoChannel & { video_count: number }>>(
    `
      SELECT
        vc.id,
        vc.channel_name,
        vc.channel_url,
        vc.channel_description,
        vc.thumbnail_url,
        vc.language_id,
        vc.created_at,
        vc.updated_at,
        COUNT(v.id) as video_count
      FROM video_channels vc
      LEFT JOIN videos v ON v.channel_id = vc.id
      GROUP BY vc.id
      ORDER BY vc.created_at DESC
    `
  );
}

export async function getSqliteChannelById(channelId: string): Promise<SqliteVideoChannel | null> {
  const db = await getSqliteDb();
  const row = await db.get<SqliteVideoChannel>(
    `
      SELECT
        id,
        channel_name,
        channel_url,
        channel_description,
        thumbnail_url,
        language_id,
        created_at,
        updated_at
      FROM video_channels
      WHERE id = ?
      LIMIT 1
    `,
    channelId
  );

  return row ?? null;
}

export async function insertSqliteChannel(input: {
  channelName: string;
  channelUrl?: string | null;
  channelDescription?: string | null;
  thumbnailUrl?: string | null;
  languageId?: number | null;
}): Promise<string> {
  const db = await getSqliteDb();
  const id = randomUUID();

  await db.run(
    `
      INSERT INTO video_channels (
        id,
        channel_name,
        channel_url,
        channel_description,
        thumbnail_url,
        language_id
      )
      VALUES (?, ?, ?, ?, ?, ?)
    `,
    id,
    input.channelName,
    input.channelUrl ?? null,
    input.channelDescription ?? null,
    input.thumbnailUrl ?? null,
    input.languageId ?? null
  );

  return id;
}

export async function updateSqliteChannel(input: {
  channelId: string;
  channelName: string;
  channelUrl?: string | null;
  channelDescription?: string | null;
  thumbnailUrl?: string | null;
  languageId?: number | null;
}): Promise<boolean> {
  const db = await getSqliteDb();
  const result = await db.run(
    `
      UPDATE video_channels
      SET
        channel_name = ?,
        channel_url = ?,
        channel_description = ?,
        thumbnail_url = ?,
        language_id = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `,
    input.channelName,
    input.channelUrl ?? null,
    input.channelDescription ?? null,
    input.thumbnailUrl ?? null,
    input.languageId ?? null,
    input.channelId
  );

  return (result.changes ?? 0) > 0;
}
