import { formatWordMeaning } from '@/lib/word-meaning';

/** Shared by the server and client. Keep database/UI dependencies out of this module. */
export type PracticeTarget = 'sentence' | 'word';
export type PracticeLanguage = 'ko' | 'en';
export interface PracticeDefinition {
  target: PracticeTarget;
  availableIn: 'bundle' | 'review' | 'both';
  achievement: 'stars' | 'proficiency' | 'none';
  result: 'correctness' | 'completion';
  stars: number;
  updatesRelatedWord: boolean;
  label: string;
  path: string;
  getWords?: (item: PracticeBundleItem) => PracticeWord[];
  isEligible: (item: PracticeBundleItem, language: PracticeLanguage) => boolean;
}

export interface PracticeWord {
  id: number;
  word: string;
  lang_code?: string | null;
  audio_url?: string | null;
  meaning_ko?: unknown;
  meaning_en?: unknown;
  words_distractor?: { distractor: string; meaning_en?: string; meaning_ko?: string }[];
}
export interface PracticeWordMap {
  used_as?: string | null;
  words: PracticeWord | null;
}
export interface PracticeBundleItem {
  id: string;
  audio_url?: string | null;
  words?: PracticeWord | null;
  sentences?: {
    sentence?: string | null;
    translation?: string | null;
    translation_en?: string | null;
    word_sentence_map?: PracticeWordMap[] | null;
  } | null;
}

export function getWordFillMapCandidates<T extends PracticeWordMap>(sentence: string, maps: T[]): (T & { words: NonNullable<T['words']> })[] {
  return maps.filter((map): map is T & { words: NonNullable<T['words']> } => {
    const target = map.used_as || map.words?.word;
    return Boolean(map.words?.word && target && sentence.toLocaleLowerCase().includes(target.toLocaleLowerCase()));
  });
}

export function getPracticeSentenceTranslation(item: PracticeBundleItem, language: PracticeLanguage) {
  const sentence = item.sentences;
  return (language === 'en' ? sentence?.translation_en : sentence?.translation) || sentence?.translation || sentence?.translation_en || '';
}

function hasTranslatedSentence(item: PracticeBundleItem, language: PracticeLanguage) {
  const sentence = item.sentences;
  return Boolean(sentence?.sentence && getPracticeSentenceTranslation(item, language));
}

export const PRACTICE_REGISTRY = {
  quiz: {
    target: 'sentence', availableIn: 'bundle', achievement: 'stars', result: 'correctness', stars: 1,
    updatesRelatedWord: false, label: 'Sentence Quiz', path: 'quiz', isEligible: hasTranslatedSentence,
  },
  scramble: {
    target: 'sentence', availableIn: 'bundle', achievement: 'stars', result: 'correctness', stars: 1,
    updatesRelatedWord: false, label: 'Scramble', path: 'scramble', isEligible: hasTranslatedSentence,
  },
  wordfill: {
    target: 'sentence', availableIn: 'bundle', achievement: 'stars', result: 'correctness', stars: 1,
    updatesRelatedWord: true, label: 'Word Fill', path: 'wordfill',
    getWords: (item: PracticeBundleItem) => getWordFillMapCandidates(item.sentences?.sentence || '', item.sentences?.word_sentence_map || []).map(map => map.words),
    isEligible: (item: PracticeBundleItem) => Boolean(item.sentences?.sentence && getWordFillMapCandidates(item.sentences.sentence, item.sentences.word_sentence_map || []).length),
  },
  spelling: {
    target: 'word', availableIn: 'both', achievement: 'proficiency', result: 'correctness', stars: 0,
    updatesRelatedWord: false, label: 'Spelling', path: 'spelling',
    getWords: getLinkedWords,
    isEligible: (item: PracticeBundleItem) => getLinkedWords(item).some(word => word.word && getPracticeWordMeaning(word, 'ko')),
  },
  flashcards: {
    target: 'sentence', availableIn: 'bundle', achievement: 'none', result: 'completion', stars: 0,
    updatesRelatedWord: false, label: 'Flashcards', path: 'flashcards',
    isEligible: (item: PracticeBundleItem) => Boolean(item.sentences?.sentence),
  },
  word_quiz: {
    target: 'word', availableIn: 'both', achievement: 'proficiency', result: 'correctness', stars: 0,
    updatesRelatedWord: false, label: 'Word Quiz', path: 'word-quiz', getWords: getLinkedWords,
    isEligible: (item: PracticeBundleItem) => getLinkedWords(item).some(word => getPracticeWordMeaning(word, 'ko')),
  },
  word_flashcards: {
    target: 'word', availableIn: 'both', achievement: 'proficiency', result: 'correctness', stars: 0,
    updatesRelatedWord: false, label: 'Word Flashcards', path: 'word-flashcards', getWords: getLinkedWords,
    isEligible: (item: PracticeBundleItem) => getLinkedWords(item).some(word => getPracticeWordMeaning(word, 'ko')),
  },
} satisfies Record<string, PracticeDefinition>;

export type PracticeMode = keyof typeof PRACTICE_REGISTRY;
export const PRACTICE_MODES = Object.keys(PRACTICE_REGISTRY) as PracticeMode[];
export const SENTENCE_STAR_MODES = PRACTICE_MODES.filter(mode => {
  const definition: PracticeDefinition = PRACTICE_REGISTRY[mode];
  return definition.target === 'sentence' && definition.achievement === 'stars' && definition.availableIn !== 'review';
});
export function isPracticeMode(value: unknown): value is PracticeMode {
  return typeof value === 'string' && Object.hasOwn(PRACTICE_REGISTRY, value);
}
export function isBundlePracticeMode(value: unknown): value is PracticeMode {
  if (!isPracticeMode(value)) return false;
  const definition: PracticeDefinition = PRACTICE_REGISTRY[value];
  return definition.availableIn !== 'review';
}
export function isWordPracticeMode(value: unknown): value is PracticeMode {
  return isPracticeMode(value) && PRACTICE_REGISTRY[value].target === 'word' && PRACTICE_REGISTRY[value].result === 'correctness';
}
export function isScoredPracticeMode(value: unknown): value is PracticeMode {
  return isPracticeMode(value) && PRACTICE_REGISTRY[value].result === 'correctness';
}
export function getEligiblePracticeItems<T extends PracticeBundleItem>(items: T[], mode: PracticeMode, language: PracticeLanguage): T[] {
  const definition: PracticeDefinition = PRACTICE_REGISTRY[mode];
  return items.filter(item => definition.isEligible(item, language));
}

export function getPracticeWordMeaning(word: PracticeWord, language: PracticeLanguage) {
  return formatWordMeaning(language === 'en' ? word.meaning_en : word.meaning_ko)
    || formatWordMeaning(word.meaning_ko) || formatWordMeaning(word.meaning_en) || '';
}

function getLinkedWords(item: PracticeBundleItem): PracticeWord[] {
  return [item.words, ...(item.sentences?.word_sentence_map || []).map(map => map.words)]
    .filter((word): word is PracticeWord => Boolean(word?.id && word.word));
}

/** Canonical word targets: deduplicated across sentences, before session limits or sorting. */
export function getPracticeWordTargets(items: PracticeBundleItem[], mode: PracticeMode, language: PracticeLanguage) {
  const definition: PracticeDefinition = PRACTICE_REGISTRY[mode];
  const byWordId = new Map<number, { word: PracticeWord; bundleItemId: string; audioUrl: string | null; meaning: string }>();
  // Prefer a directly included word over its occurrence in a sentence.
  const ordered = [...items.filter(item => item.words), ...items.filter(item => !item.words)];
  for (const item of ordered) {
    if (!definition.isEligible(item, language)) continue;
    for (const word of definition.getWords?.(item) || []) {
      const meaning = getPracticeWordMeaning(word, language);
      if (!word.word || !meaning || byWordId.has(Number(word.id))) continue;
      byWordId.set(Number(word.id), { word, bundleItemId: item.id, meaning, audioUrl: (item.words ? item.audio_url : null) || word.audio_url || null });
    }
  }
  return [...byWordId.values()];
}
