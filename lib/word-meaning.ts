export function formatWordMeaning(value: unknown): string | null {
  const meanings = collectMeaningStrings(value);
  return meanings.length > 0 ? Array.from(new Set(meanings)).join(', ') : null;
}

export function formatWordMeaningByPos(value: unknown, posValues: unknown[]): string | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return formatWordMeaning(value);
  }

  const meaningByPos = value as Record<string, unknown>;
  const preferredKeys = posValues.flatMap(getPosKeyCandidates);

  for (const key of preferredKeys) {
    const meaning = formatWordMeaning(meaningByPos[key]);
    if (meaning) return meaning;
  }

  for (const meaningValue of Object.values(meaningByPos)) {
    const meaning = formatWordMeaning(meaningValue);
    if (meaning) return meaning;
  }

  return null;
}

function getPosKeyCandidates(value: unknown): string[] {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return [];

  const aliases: Record<string, string[]> = {
    adjective: ['adj'],
    adverb: ['adv'],
    determiner: ['det'],
    conjunction: ['conj'],
    interjection: ['interj'],
    numeral: ['num'],
    number: ['num'],
    preposition: ['prep'],
    pronoun: ['pron'],
  };

  return Array.from(new Set([normalized, ...(aliases[normalized] || [])]));
}

function collectMeaningStrings(value: unknown): string[] {
  if (typeof value === 'string') {
    const meaning = value.trim();
    return meaning ? [meaning] : [];
  }

  if (Array.isArray(value)) {
    return value.flatMap(collectMeaningStrings);
  }

  if (value && typeof value === 'object') {
    return Object.values(value).flatMap(collectMeaningStrings);
  }

  return [];
}
