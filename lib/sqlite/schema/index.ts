import type { SqliteDb } from '../db';
import { createUsersTables } from './users.sql';
import { createVideosTables } from './videos.sql';
import { createCategoriesTables } from './categories.sql';
import { createEduVideosTables } from './edu-videos.sql';
import { createLearningTables } from './learning.sql';
import { createAudioTables } from './audio.sql';
import { createLanguagesTables } from './languages.sql';
import { runMigrations } from './migrations';

export async function initializeSchema(db: SqliteDb): Promise<void> {
  // 1. 테이블 생성 (FK 의존 순서)
  await createUsersTables(db);       // auth_users, user_profiles, super_admin_users, user_notes
  await createVideosTables(db);      // videos, video_channels, transcripts, translations
  await createCategoriesTables(db);  // lang/user/edu_video categories, user_category_videos + triggers
  await createEduVideosTables(db);   // edu_videos, video_learning_progress
  await createLearningTables(db);    // script_progress, script_progress_attempts, video_progress
  await createAudioTables(db);       // lang_audio_content, lang_audio_memos
  await createLanguagesTables(db);   // languages, words, sentences, word_sentence_map, verb_conjugations

  // 2. 마이그레이션 (컬럼 추가, FK 보정, 레거시 데이터 변환)
  await runMigrations(db);
}
