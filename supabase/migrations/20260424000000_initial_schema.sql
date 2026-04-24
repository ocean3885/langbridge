-- ===================================================================
-- Supabase (PostgreSQL) Schema for Langbridge
-- Generated from SQLite schema definitions
-- ===================================================================

-- Enable necessary extensions
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Helper Function for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- ===================================================================
-- Tables & Indexes
-- ===================================================================

-- 2. Users & Profiles
CREATE TABLE auth_users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_auth_users_email ON auth_users(email);
DROP TRIGGER IF EXISTS update_auth_users_updated_at ON auth_users;
CREATE TRIGGER update_auth_users_updated_at BEFORE UPDATE ON auth_users FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TABLE user_profiles (
  id TEXT PRIMARY KEY,
  email TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_user_profiles_email ON user_profiles(email);
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- 3. Videos & Transcripts
CREATE TABLE videos (
  id TEXT PRIMARY KEY,
  youtube_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  visibility TEXT NOT NULL DEFAULT 'private',
  duration INTEGER,
  thumbnail_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  language_id BIGINT,
  channel_id TEXT,
  view_count INTEGER NOT NULL DEFAULT 0,
  uploader_id TEXT,
  FOREIGN KEY (language_id) REFERENCES languages(id),
  FOREIGN KEY (channel_id) REFERENCES video_channels(id)
);
CREATE INDEX idx_videos_created_at ON videos(created_at DESC);

CREATE TABLE video_channels (
  id TEXT PRIMARY KEY,
  channel_name TEXT NOT NULL,
  channel_url TEXT,
  channel_description TEXT,
  thumbnail_url TEXT,
  language_id BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (language_id) REFERENCES languages(id)
);
CREATE INDEX idx_video_channels_name ON video_channels(channel_name);
CREATE INDEX idx_video_channels_language ON video_channels(language_id);
DROP TRIGGER IF EXISTS update_video_channels_updated_at ON video_channels;
CREATE TRIGGER update_video_channels_updated_at BEFORE UPDATE ON video_channels FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TABLE transcripts (
  id TEXT PRIMARY KEY,
  video_id TEXT NOT NULL,
  "start" REAL NOT NULL,
  duration REAL NOT NULL,
  text_original TEXT NOT NULL,
  order_index INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE
);
CREATE INDEX idx_transcripts_video ON transcripts(video_id, order_index);
DROP TRIGGER IF EXISTS update_transcripts_updated_at ON transcripts;
CREATE TRIGGER update_transcripts_updated_at BEFORE UPDATE ON transcripts FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TABLE translations (
  id TEXT PRIMARY KEY,
  transcript_id TEXT NOT NULL,
  lang TEXT NOT NULL,
  text_translated TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (transcript_id) REFERENCES transcripts(id) ON DELETE CASCADE
);
CREATE INDEX idx_translations_transcript ON translations(transcript_id);
DROP TRIGGER IF EXISTS update_translations_updated_at ON translations;
CREATE TRIGGER update_translations_updated_at BEFORE UPDATE ON translations FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TABLE user_notes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  video_id TEXT NOT NULL,
  transcript_id TEXT,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, video_id, transcript_id),
  FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE,
  FOREIGN KEY (transcript_id) REFERENCES transcripts(id) ON DELETE CASCADE
);
CREATE INDEX idx_user_notes_user_video ON user_notes(user_id, video_id);
CREATE INDEX idx_user_notes_transcript ON user_notes(transcript_id);
DROP TRIGGER IF EXISTS update_user_notes_updated_at ON user_notes;
CREATE TRIGGER update_user_notes_updated_at BEFORE UPDATE ON user_notes FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- 4. Categories
CREATE TABLE lang_categories (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  name TEXT NOT NULL,
  language_id BIGINT,
  user_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_lang_categories_user ON lang_categories(user_id);
DROP TRIGGER IF EXISTS update_lang_categories_updated_at ON lang_categories;
CREATE TRIGGER update_lang_categories_updated_at BEFORE UPDATE ON lang_categories FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TABLE user_categories (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  name TEXT NOT NULL,
  language_id BIGINT,
  user_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_user_categories_user ON user_categories(user_id);
DROP TRIGGER IF EXISTS update_user_categories_updated_at ON user_categories;
CREATE TRIGGER update_user_categories_updated_at BEFORE UPDATE ON user_categories FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TABLE edu_video_categories (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  name TEXT NOT NULL,
  language_id BIGINT,
  user_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_edu_video_categories_user ON edu_video_categories(user_id);
DROP TRIGGER IF EXISTS update_edu_video_categories_updated_at ON edu_video_categories;
CREATE TRIGGER update_edu_video_categories_updated_at BEFORE UPDATE ON edu_video_categories FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TABLE user_category_videos (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  category_id BIGINT NOT NULL,
  video_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, category_id, video_id),
  FOREIGN KEY (category_id) REFERENCES user_categories(id) ON DELETE CASCADE,
  FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE
);
CREATE INDEX idx_user_category_videos_user_category ON user_category_videos(user_id, category_id, created_at DESC);
CREATE INDEX idx_user_category_videos_user_video ON user_category_videos(user_id, video_id);
CREATE INDEX idx_user_category_videos_video ON user_category_videos(video_id);
DROP TRIGGER IF EXISTS update_user_category_videos_updated_at ON user_category_videos;
CREATE TRIGGER update_user_category_videos_updated_at BEFORE UPDATE ON user_category_videos FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- 5. Edu Videos & Progress
CREATE TABLE edu_videos (
  id TEXT PRIMARY KEY,
  youtube_url TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  duration_seconds INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  language_id BIGINT,
  category_id TEXT,
  channel_id TEXT,
  view_count INTEGER NOT NULL DEFAULT 0,
  uploader_id TEXT,
  FOREIGN KEY (language_id) REFERENCES languages(id),
  FOREIGN KEY (channel_id) REFERENCES video_channels(id)
);
CREATE INDEX idx_edu_videos_created_at ON edu_videos(created_at DESC);

CREATE TABLE video_learning_progress (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  video_id TEXT NOT NULL,
  last_studied_at TIMESTAMPTZ,
  total_study_seconds INTEGER NOT NULL DEFAULT 0,
  study_session_count INTEGER NOT NULL DEFAULT 0,
  last_position_seconds DOUBLE PRECISION,
  summary_memo TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, video_id)
);
CREATE INDEX idx_video_learning_progress_user_last_studied ON video_learning_progress(user_id, last_studied_at DESC);
CREATE INDEX idx_video_learning_progress_video ON video_learning_progress(video_id);
DROP TRIGGER IF EXISTS update_video_learning_progress_updated_at ON video_learning_progress;
CREATE TRIGGER update_video_learning_progress_updated_at BEFORE UPDATE ON video_learning_progress FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- 6. Learning Progress (Scripts)
CREATE TABLE script_progress (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  video_id TEXT NOT NULL,
  script_id TEXT,
  custom_content TEXT NOT NULL,
  custom_translation TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'learning',
  consecutive_correct INTEGER NOT NULL DEFAULT 0,
  best_tpw DOUBLE PRECISION,
  is_deleted INTEGER NOT NULL DEFAULT 0,
  order_index INTEGER NOT NULL DEFAULT 0,
  total_attempts INTEGER NOT NULL DEFAULT 0,
  correct_count INTEGER NOT NULL DEFAULT 0,
  wrong_count INTEGER NOT NULL DEFAULT 0,
  best_consecutive_correct INTEGER NOT NULL DEFAULT 0,
  last_answer_at TIMESTAMPTZ,
  last_answer_correct INTEGER,
  first_mastered_at TIMESTAMPTZ,
  mastered_count INTEGER NOT NULL DEFAULT 0,
  total_tpw DOUBLE PRECISION NOT NULL DEFAULT 0,
  tpw_sample_count INTEGER NOT NULL DEFAULT 0,
  avg_tpw DOUBLE PRECISION,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE
);
CREATE INDEX idx_script_progress_user_video ON script_progress(user_id, video_id);
CREATE UNIQUE INDEX idx_script_progress_user_script ON script_progress(user_id, script_id);
DROP TRIGGER IF EXISTS update_script_progress_updated_at ON script_progress;
CREATE TRIGGER update_script_progress_updated_at BEFORE UPDATE ON script_progress FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TABLE script_progress_attempts (
  id TEXT PRIMARY KEY,
  progress_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  video_id TEXT NOT NULL,
  script_id TEXT,
  attempt_no INTEGER NOT NULL,
  is_correct INTEGER NOT NULL,
  tpw DOUBLE PRECISION,
  answered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (progress_id) REFERENCES script_progress(id) ON DELETE CASCADE,
  FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE
);
CREATE INDEX idx_sp_attempts_progress ON script_progress_attempts(progress_id, answered_at DESC);
CREATE INDEX idx_sp_attempts_user_video ON script_progress_attempts(user_id, video_id);

CREATE TABLE video_progress (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  video_id TEXT NOT NULL,
  last_studied_at TIMESTAMPTZ,
  last_progress_id TEXT,
  total_scripts INTEGER NOT NULL DEFAULT 0,
  mastered_scripts INTEGER NOT NULL DEFAULT 0,
  learning_scripts INTEGER NOT NULL DEFAULT 0,
  mastery_pct DOUBLE PRECISION NOT NULL DEFAULT 0,
  total_attempts INTEGER NOT NULL DEFAULT 0,
  total_correct INTEGER NOT NULL DEFAULT 0,
  total_wrong INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, video_id),
  FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE
);
CREATE INDEX idx_video_progress_user ON video_progress(user_id, last_studied_at DESC);
CREATE INDEX idx_video_progress_video ON video_progress(video_id);
DROP TRIGGER IF EXISTS update_video_progress_updated_at ON video_progress;
CREATE TRIGGER update_video_progress_updated_at BEFORE UPDATE ON video_progress FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- 7. Audio
CREATE TABLE lang_audio_content (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT,
  category_id BIGINT,
  original_text TEXT,
  translated_text TEXT,
  sync_data TEXT,
  audio_file_path TEXT,
  study_count INTEGER,
  last_studied_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (category_id) REFERENCES lang_categories(id)
);
CREATE INDEX idx_audio_content_user_created ON lang_audio_content(user_id, created_at DESC);
CREATE INDEX idx_audio_content_category ON lang_audio_content(category_id);
DROP TRIGGER IF EXISTS update_lang_audio_content_updated_at ON lang_audio_content;
CREATE TRIGGER update_lang_audio_content_updated_at BEFORE UPDATE ON lang_audio_content FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TABLE lang_audio_memos (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  content_id TEXT NOT NULL,
  line_number INTEGER NOT NULL,
  user_id TEXT NOT NULL,
  memo_text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (content_id) REFERENCES lang_audio_content(id) ON DELETE CASCADE
);
CREATE INDEX idx_audio_memos_content_user ON lang_audio_memos(content_id, user_id, line_number);
DROP TRIGGER IF EXISTS update_lang_audio_memos_updated_at ON lang_audio_memos;
CREATE TRIGGER update_lang_audio_memos_updated_at BEFORE UPDATE ON lang_audio_memos FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- 8. Languages & Words
CREATE TABLE languages (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  name_en TEXT,
  name_ko TEXT NOT NULL,
  code TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_languages_name_ko ON languages(name_ko);
DROP TRIGGER IF EXISTS update_languages_updated_at ON languages;
CREATE TRIGGER update_languages_updated_at BEFORE UPDATE ON languages FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TABLE words (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  language_id BIGINT NOT NULL,
  text TEXT NOT NULL,
  meaning_ko TEXT NOT NULL,
  level TEXT NOT NULL,
  part_of_speech TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (language_id) REFERENCES languages(id) ON DELETE CASCADE
);
CREATE INDEX idx_words_language ON words(language_id);
DROP TRIGGER IF EXISTS update_words_updated_at ON words;
CREATE TRIGGER update_words_updated_at BEFORE UPDATE ON words FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TABLE sentences (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  language_id BIGINT NOT NULL,
  text TEXT NOT NULL,
  translation_ko TEXT NOT NULL,
  audio_path TEXT NOT NULL,
  context_category TEXT,
  mapping_details TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (language_id) REFERENCES languages(id) ON DELETE CASCADE
);
CREATE INDEX idx_sentences_language ON sentences(language_id);
DROP TRIGGER IF EXISTS update_sentences_updated_at ON sentences;
CREATE TRIGGER update_sentences_updated_at BEFORE UPDATE ON sentences FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TABLE word_sentence_map (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  word_id BIGINT NOT NULL,
  sentence_id BIGINT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (word_id) REFERENCES words(id) ON DELETE CASCADE,
  FOREIGN KEY (sentence_id) REFERENCES sentences(id) ON DELETE CASCADE
);
CREATE INDEX idx_word_sentence_map_word ON word_sentence_map(word_id);
CREATE INDEX idx_word_sentence_map_sentence ON word_sentence_map(sentence_id);

CREATE TABLE verb_conjugations (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  word_id BIGINT NOT NULL,
  tense TEXT,
  conjugated_text TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (word_id) REFERENCES words(id) ON DELETE CASCADE
);
CREATE INDEX idx_verb_conjugations_word ON verb_conjugations(word_id);

-- 9. Board
CREATE TABLE board_posts (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id TEXT NOT NULL,
  user_email TEXT,
  title TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  file_name TEXT,
  file_path TEXT,
  view_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_board_posts_created_at ON board_posts(created_at DESC);
CREATE INDEX idx_board_posts_user_id ON board_posts(user_id);
DROP TRIGGER IF EXISTS update_board_posts_updated_at ON board_posts;
CREATE TRIGGER update_board_posts_updated_at BEFORE UPDATE ON board_posts FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- ===================================================================
-- Complex Triggers
-- ===================================================================

-- Validation for user_category_videos
CREATE OR REPLACE FUNCTION validate_user_category_video()
RETURNS TRIGGER AS $$
BEGIN
    -- Check category belongs to user
    IF NOT EXISTS (
        SELECT 1 FROM user_categories uc
        WHERE uc.id = NEW.category_id AND uc.user_id = NEW.user_id
    ) THEN
        RAISE EXCEPTION 'category does not belong to user';
    END IF;

    -- Check video is accessible
    IF NOT EXISTS (
        SELECT 1 FROM videos v
        WHERE v.id = NEW.video_id AND (v.visibility = 'public' OR v.uploader_id = NEW.user_id)
    ) THEN
        RAISE EXCEPTION 'video not accessible for this user';
    END IF;

    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS trg_user_category_videos_validate_insert ON user_category_videos;
CREATE TRIGGER trg_user_category_videos_validate_insert
BEFORE INSERT ON user_category_videos
FOR EACH ROW EXECUTE PROCEDURE validate_user_category_video();

DROP TRIGGER IF EXISTS trg_user_category_videos_validate_update ON user_category_videos;
CREATE TRIGGER trg_user_category_videos_validate_update
BEFORE UPDATE OF user_id, category_id, video_id ON user_category_videos
FOR EACH ROW EXECUTE PROCEDURE validate_user_category_video();

-- Prune user_category_videos when video becomes private
CREATE OR REPLACE FUNCTION prune_user_category_videos_on_private()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.visibility = 'private' THEN
        DELETE FROM user_category_videos
        WHERE video_id = NEW.id
          AND user_id <> COALESCE(NEW.uploader_id, '');
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS trg_user_category_videos_prune_on_private ON videos;
CREATE TRIGGER trg_user_category_videos_prune_on_private
AFTER UPDATE OF visibility ON videos
FOR EACH ROW EXECUTE PROCEDURE prune_user_category_videos_on_private();

-- ===================================================================
-- Row Level Security (RLS) Settings
-- ===================================================================

-- 기본적으로 모든 테이블에 RLS를 활성화합니다.
-- 주의: 이 설정은 익명(anon) 접근을 완벽히 차단합니다.
-- 서비스에서 자체 인증(auth_users)을 사용하고 있으므로, 
-- 서버사이드(Next.js Server Actions/API)에서 Service Role Key를 사용해야 정상 작동합니다.

ALTER TABLE auth_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

ALTER TABLE videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE transcripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE lang_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE edu_video_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_category_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE edu_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_learning_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE script_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE script_progress_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE lang_audio_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE lang_audio_memos ENABLE ROW LEVEL SECURITY;
ALTER TABLE languages ENABLE ROW LEVEL SECURITY;
ALTER TABLE words ENABLE ROW LEVEL SECURITY;
ALTER TABLE sentences ENABLE ROW LEVEL SECURITY;
ALTER TABLE word_sentence_map ENABLE ROW LEVEL SECURITY;
ALTER TABLE verb_conjugations ENABLE ROW LEVEL SECURITY;
ALTER TABLE board_posts ENABLE ROW LEVEL SECURITY;
