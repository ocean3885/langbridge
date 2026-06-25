'use client';

import { useMemo, useState } from 'react';
import type { SentenceMappedWord, WordUsageDetail } from '@/lib/supabase/services/word-sentence-map';
import { WordInfoSheet, type DisplayLanguage, type WordUsageCopy } from './WordInfoSheet';

export function WordUsageBadges({
  words,
  details,
  language,
  copy,
  className = 'mt-3',
}: {
  words: SentenceMappedWord[];
  details: WordUsageDetail[];
  language: DisplayLanguage;
  copy: WordUsageCopy;
  className?: string;
}) {
  const [selectedWordId, setSelectedWordId] = useState<number | null>(null);
  const detailByWordId = useMemo(() => new Map(details.map((detail) => [detail.word_id, detail])), [details]);
  const selectedWord = selectedWordId ? detailByWordId.get(selectedWordId) : null;
  const selectedMapping = selectedWordId ? words.find((word) => word.word_id === selectedWordId) || null : null;

  return (
    <>
      <div className={`${className} flex flex-wrap gap-2`} aria-label={copy.words}>
        {words.map((word) => {
          const meaning = getMeaning(word, language);

          return (
            <button
              key={`${word.sentence_id}-${word.word_id}`}
              type="button"
              onClick={() => setSelectedWordId(word.word_id)}
              className="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 px-3 py-1.5 text-sm font-medium text-zinc-700 transition hover:bg-[#dff1e5] hover:text-[#2f7d4a] focus:outline-none focus:ring-2 focus:ring-[#8bbf87] dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-emerald-950/70 dark:hover:text-emerald-300"
            >
              {word.used_as || word.word}
              {meaning && <span className="font-medium text-zinc-500 dark:text-zinc-400">· {meaning}</span>}
            </button>
          );
        })}
      </div>

      {selectedWord && (
        <WordInfoSheet
          selectedWord={selectedWord}
          selectedMapping={selectedMapping}
          language={language}
          copy={copy}
          onClose={() => setSelectedWordId(null)}
        />
      )}
    </>
  );
}

function getMeaning(word: Pick<SentenceMappedWord, 'meaning_ko' | 'meaning_en'>, language: DisplayLanguage) {
  return (language === 'en' ? word.meaning_en : word.meaning_ko) || word.meaning_ko || word.meaning_en;
}
