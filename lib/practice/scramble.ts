/** Deterministic question layout; shuffling and session state belong to the client. */
export interface AdaptiveScrambleToken {
  id: number;
  text: string;
}

const EDGE_PUNCTUATION = /^[¡¿"'“”‘’()[\]{}.,!?;:]+|[¡¿"'“”‘’()[\]{}.,!?;:]+$/g;

export function normalizeScrambleWords(sentence: string) {
  return sentence.split(/\s+/)
    .map(word => word.replace(EDGE_PUNCTUATION, '').toLowerCase())
    .filter(Boolean);
}

export function buildScrambleQuestion(sentence: string, proficiencyLevel = 0) {
  const words = normalizeScrambleWords(sentence);
  const beginner = !Number.isFinite(proficiencyLevel) || proficiencyLevel < 2;
  const maxPieces = beginner ? 6 : 8;
  // Keep at least two pieces when possible. Short sentences remain individual words.
  const desiredPieces = beginner ? Math.ceil(words.length / 2) : words.length;
  const pieceCount = Math.min(words.length, maxPieces, Math.max(2, desiredPieces));
  const tokens: AdaptiveScrambleToken[] = [];
  for (let index = 0; index < pieceCount; index++) {
    const from = Math.floor(index * words.length / pieceCount);
    const to = Math.floor((index + 1) * words.length / pieceCount);
    tokens.push({ id: index, text: words.slice(from, to).join(' ') });
  }
  // Never supply the entire answer for a one-word sentence.
  const fixedTokens = beginner && tokens.length > 1 ? tokens.slice(0, 1) : [];
  return {
    tokens,
    fixedTokens,
    selectableTokens: tokens.slice(fixedTokens.length),
    grouped: tokens.length < words.length,
  };
}

export function isScrambleAnswerCorrect(
  question: ReturnType<typeof buildScrambleQuestion>,
  selected: AdaptiveScrambleToken[],
) {
  if (!question.tokens.length || selected.length !== question.selectableTokens.length) return false;
  const ids = new Set(selected.map(token => token.id));
  if (ids.size !== selected.length || selected.some(token => !question.selectableTokens.some(candidate => candidate.id === token.id && candidate.text === token.text))) return false;
  return [...question.fixedTokens, ...selected].map(token => token.text).join(' ') === question.tokens.map(token => token.text).join(' ');
}

export function getScrambleInstruction(grouped: boolean, language: 'ko' | 'en') {
  return language === 'ko'
    ? grouped ? '단어 묶음을 순서대로 놓아보세요.' : '단어를 순서대로 놓아보세요.'
    : grouped ? 'Put the word groups in order.' : 'Put the words in order.';
}
