import type { SqliteDb } from '../db';

export async function createBoardTables(db: SqliteDb): Promise<void> {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS board_posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      user_email TEXT,
      title TEXT NOT NULL,
      content TEXT NOT NULL DEFAULT '',
      file_name TEXT,
      file_path TEXT,
      view_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_board_posts_created_at
      ON board_posts(created_at DESC);

    CREATE INDEX IF NOT EXISTS idx_board_posts_user_id
      ON board_posts(user_id);
  `);
}
