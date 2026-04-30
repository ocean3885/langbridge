import type { SqliteDb } from '../db';

export async function createCategoriesTables(db: SqliteDb): Promise<void> {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS lang_categories (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      language_id INTEGER,
      user_id TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_lang_categories_user
      ON lang_categories(user_id);

    CREATE TABLE IF NOT EXISTS user_categories (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      language_id INTEGER,
      user_id TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_user_categories_user
      ON user_categories(user_id);

    CREATE TABLE IF NOT EXISTS edu_video_categories (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      language_id INTEGER,
      user_id TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_edu_video_categories_user
      ON edu_video_categories(user_id);

    CREATE TABLE IF NOT EXISTS user_category_videos (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      category_id INTEGER NOT NULL,
      video_id TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, category_id, video_id),
      FOREIGN KEY (category_id) REFERENCES user_categories(id) ON DELETE CASCADE,
      FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_user_category_videos_user_category
      ON user_category_videos(user_id, category_id, created_at DESC);

    CREATE INDEX IF NOT EXISTS idx_user_category_videos_user_video
      ON user_category_videos(user_id, video_id);

    CREATE INDEX IF NOT EXISTS idx_user_category_videos_video
      ON user_category_videos(video_id);

    CREATE TRIGGER IF NOT EXISTS trg_user_category_videos_validate_insert
    BEFORE INSERT ON user_category_videos
    FOR EACH ROW
    BEGIN
      SELECT CASE
        WHEN NOT EXISTS (
          SELECT 1
          FROM user_categories uc
          WHERE uc.id = NEW.category_id
            AND uc.user_id = NEW.user_id
        )
        THEN RAISE(ABORT, 'category does not belong to user')
      END;

      SELECT CASE
        WHEN NOT EXISTS (
          SELECT 1
          FROM videos v
          WHERE v.id = NEW.video_id
            AND (v.visibility = 'public' OR v.uploader_id = NEW.user_id)
        )
        THEN RAISE(ABORT, 'video not accessible for this user')
      END;
    END;

    CREATE TRIGGER IF NOT EXISTS trg_user_category_videos_validate_update
    BEFORE UPDATE OF user_id, category_id, video_id ON user_category_videos
    FOR EACH ROW
    BEGIN
      SELECT CASE
        WHEN NOT EXISTS (
          SELECT 1
          FROM user_categories uc
          WHERE uc.id = NEW.category_id
            AND uc.user_id = NEW.user_id
        )
        THEN RAISE(ABORT, 'category does not belong to user')
      END;

      SELECT CASE
        WHEN NOT EXISTS (
          SELECT 1
          FROM videos v
          WHERE v.id = NEW.video_id
            AND (v.visibility = 'public' OR v.uploader_id = NEW.user_id)
        )
        THEN RAISE(ABORT, 'video not accessible for this user')
      END;
    END;

    CREATE TRIGGER IF NOT EXISTS trg_user_category_videos_touch_updated_at
    AFTER UPDATE ON user_category_videos
    FOR EACH ROW
    WHEN NEW.updated_at = OLD.updated_at
    BEGIN
      UPDATE user_category_videos
      SET updated_at = CURRENT_TIMESTAMP
      WHERE id = NEW.id;
    END;

    CREATE TRIGGER IF NOT EXISTS trg_user_category_videos_prune_on_private
    AFTER UPDATE OF visibility ON videos
    FOR EACH ROW
    WHEN NEW.visibility = 'private'
    BEGIN
      DELETE FROM user_category_videos
      WHERE video_id = NEW.id
        AND user_id <> COALESCE(NEW.uploader_id, '');
    END;
  `);
}
