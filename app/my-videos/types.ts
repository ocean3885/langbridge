export type VideoItem = {
  id: string;
  youtube_id: string;
  title: string;
  description: string | null;
  duration: number | null;
  thumbnail_url: string | null;
  created_at: string;
  category_name: string | null;
  language_name: string | null;
  transcript_count: number;
};
