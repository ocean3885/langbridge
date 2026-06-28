import { DIFFICULTY_OPTIONS, POS_MAP } from './words.constants';

export function formatDifficulty(difficulty?: number): string {
  return DIFFICULTY_OPTIONS.find((option) => option.value === difficulty)?.label
    ?? `Level ${difficulty ?? 1}`;
}

export function formatPOS(pos: string): string {
  return POS_MAP[pos.toLowerCase()] || pos;
}

export function getCanonicalPOS(pos: string): string {
  const normalized = pos.toLowerCase().trim();
  if (['n', 'noun', 'sustantivo', 'nombre'].includes(normalized)) return 'noun';
  if (['v', 'verb', 'verbo'].includes(normalized)) return 'verb';
  if (['adj', 'adjective', 'adjetivo'].includes(normalized)) return 'adjective';
  if (['adv', 'adverb', 'adverbio'].includes(normalized)) return 'adverb';
  if (['pron', 'pronoun'].includes(normalized)) return 'pronoun';
  if (['prep', 'preposition', 'adp'].includes(normalized)) return 'preposition';
  if (['conj', 'conjunction'].includes(normalized)) return 'conjunction';
  if (['art', 'article', 'det', 'determiner'].includes(normalized)) return 'article';
  if (['num', 'numeral'].includes(normalized)) return 'numeral';
  if (['interj', 'interjection'].includes(normalized)) return 'interjection';
  if (['part', 'particle'].includes(normalized)) return 'particle';
  if (['aux', 'auxiliary'].includes(normalized)) return 'auxiliary';
  return normalized;
}

export function getMeaningDisplay(meaning: unknown): string {
  if (!meaning) return '-';

  if (typeof meaning === 'string') {
    try {
      return getMeaningDisplay(JSON.parse(meaning));
    } catch {
      return meaning;
    }
  }

  if (typeof meaning === 'object') {
    const values = meaning as Record<string, unknown>;
    const value = values.ko || values.en || Object.values(values)[0];
    if (Array.isArray(value)) return String(value[0] || '-');
    if (typeof value === 'string') return value;
  }

  return '-';
}
