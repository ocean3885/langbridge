export const POS_MAP: Record<string, string> = {
  noun: '명사',
  verb: '동사',
  adjective: '형용사',
  adverb: '부사',
  pronoun: '대명사',
  preposition: '전치사',
  conjunction: '접속사',
  interjection: '감탄사',
  article: '관사',
  determiner: '한정사',
  numeral: '수사',
  particle: '조사',
  auxiliary: '조동사',
  adj: '형용사',
  adv: '부사',
  n: '명사',
  v: '동사',
  prep: '전치사',
  pron: '대명사',
  conj: '접속사',
  det: '한정사',
  adp: '전치사',
  aux: '조동사',
  part: '조사',
  propn: '고유명사',
  num: '수사',
};

export const POS_OPTIONS = [
  { value: 'noun', label: '명사 (Noun)' },
  { value: 'verb', label: '동사 (Verb)' },
  { value: 'adjective', label: '형용사 (Adjective)' },
  { value: 'adverb', label: '부사 (Adverb)' },
  { value: 'pronoun', label: '대명사 (Pronoun)' },
  { value: 'preposition', label: '전치사 (Preposition)' },
  { value: 'conjunction', label: '접속사 (Conjunction)' },
  { value: 'article', label: '관사 (Article)' },
  { value: 'numeral', label: '수사 (Numeral)' },
  { value: 'particle', label: '조사 (Particle)' },
  { value: 'auxiliary', label: '조동사 (Auxiliary)' },
  { value: 'propn', label: '고유명사 (Proper Noun)' },
];

export const GENDER_OPTIONS = [
  { value: '', label: '없음 (None)' },
  { value: 'M', label: '남성 (Masculine)' },
  { value: 'F', label: '여성 (Feminine)' },
  { value: 'N', label: '중성 (Neuter)' },
];

export const DIFFICULTY_OPTIONS = [
  { value: 1, label: 'Beginner' },
  { value: 2, label: 'A1' },
  { value: 3, label: 'A2' },
  { value: 4, label: 'B1' },
  { value: 5, label: 'B2' },
  { value: 6, label: 'C1' },
  { value: 7, label: 'C2' },
];

export const TARGET_DISTRACTOR_COUNT = 6;
export const WORDS_PER_PAGE = 100;

