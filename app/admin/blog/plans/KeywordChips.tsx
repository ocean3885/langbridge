export function splitKeywords(value: string) {
  return value
    .split(',')
    .map((keyword) => keyword.trim())
    .filter(Boolean);
}

export function KeywordChips({ keywords }: { keywords: string[] }) {
  if (keywords.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {keywords.map((keyword) => (
        <span
          key={keyword}
          className="rounded-md bg-zinc-100 px-2 py-1 text-xs font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
        >
          {keyword}
        </span>
      ))}
    </div>
  );
}
