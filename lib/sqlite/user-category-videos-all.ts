import { getSqliteDb } from '@/lib/sqlite/db';

export type SqliteUserVideoMapping = {
  video_id: string;
  category_id: number;
  category_name: string;
};

/**
 * 특정 사용자의 모든 비디오-카테고리 매핑 정보를 가져옵니다.
 */
export async function listAllUserCategoryVideosSqlite(userId: string): Promise<SqliteUserVideoMapping[]> {
  const db = await getSqliteDb();
  return db.all<SqliteUserVideoMapping[]>(
    `
      SELECT 
        ucv.video_id,
        ucv.category_id,
        uc.name as category_name
      FROM user_category_videos ucv
      JOIN user_categories uc ON uc.id = ucv.category_id
      WHERE ucv.user_id = ?
    `,
    userId
  );
}
