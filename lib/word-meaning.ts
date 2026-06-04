export function formatWordMeaning(value: unknown): string | null {
  const meanings = collectMeaningStrings(value);
  return meanings.length > 0 ? Array.from(new Set(meanings)).join(', ') : null;
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
