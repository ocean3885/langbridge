export interface Language {
  id: number;
  name_en: string;
  name_ko: string;
  code: string;
}

export interface Word {
  id: number;
  word: string;
  lang_code: string;
  pos: string[];
  meaning_ko: Record<string, string[]>;
  meaning_en: Record<string, string[]>;
  gender: string | null;
  declensions: Record<string, unknown>;
  conjugations: Record<string, unknown>;
  audio_url: string | null;
  languages?: Language | null;
  sentence_count?: number;
  distractor_count?: number;
  is_verified?: boolean;
  difficulty?: number;
}

export type VerificationFilter = 'all' | 'verified' | 'pending';
export type SentenceSortOrder = 'asc' | 'desc' | 'none';

