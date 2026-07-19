'use client';

import { useEffect } from 'react';
import { BookOpen, ChevronRight, Volume2, X } from 'lucide-react';
import type { SentenceMappedWord, WordUsageDetail } from '@/lib/supabase/services/word-sentence-map';
import { getPublicUrl } from '@/lib/utils';

export type DisplayLanguage = 'ko' | 'en';

export type WordUsageCopy = {
  words: string;
  sheetTitle: string;
  usedForm: string;
  meaning: string;
  examples: string;
  noExamples: string;
  close: string;
  pos: string;
};

interface WordInfoSheetProps {
  selectedWord: WordUsageDetail;
  selectedMapping: SentenceMappedWord | null;
  language: DisplayLanguage;
  copy: WordUsageCopy;
  onClose: () => void;
}

export function WordInfoSheet({
  selectedWord,
  selectedMapping,
  language,
  copy,
  onClose,
}: WordInfoSheetProps) {
  const visibleSentences = selectedWord.sentences.slice(0, 10);
  const meaning = selectedMapping ? getMeaning(selectedMapping, language) : getMeaning(selectedWord, language);
  const wordAudioUrl = getPublicUrl(selectedWord.audio_url);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }

    document.addEventListener('keydown', handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-labelledby="word-usage-sheet-title">
      <button
        type="button"
        aria-label={copy.close}
        className="absolute inset-0 h-full w-full cursor-default bg-black/35 backdrop-blur-[1px]"
        onClick={onClose}
      />
      <aside className="absolute inset-x-0 bottom-0 flex max-h-[86vh] flex-col rounded-t-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-950 md:inset-x-auto md:bottom-auto md:right-0 md:top-0 md:h-full md:max-h-none md:w-[420px] md:rounded-l-2xl md:rounded-tr-none">
        <div className="flex items-start justify-between gap-4 border-b border-zinc-100 px-5 py-5 dark:border-zinc-800">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wide text-[#2f7d4a] dark:text-emerald-400 md:text-sm">{copy.sheetTitle}</p>
            <h2 id="word-usage-sheet-title" className="mt-1 truncate text-2xl font-bold text-zinc-950 dark:text-zinc-50 md:text-3xl">
              {selectedWord.word}
            </h2>
            {selectedMapping?.used_as && selectedMapping.used_as !== selectedWord.word && (
              <p className="mt-1 text-sm font-medium text-zinc-500 dark:text-zinc-400 md:text-base">
                {copy.usedForm}: {selectedMapping.used_as}
              </p>
            )}
          </div>
          {wordAudioUrl && (
            <AudioIconButton
              audioUrl={wordAudioUrl}
              label={language === 'en' ? 'Listen to word' : '단어 듣기'}
            />
          )}
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
            aria-label={copy.close}
            title={copy.close}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-5">
          <div className="grid gap-3">
            <InfoRow label={copy.meaning} value={meaning} />
            {selectedWord.pos.length > 0 && <InfoRow label={copy.pos} value={selectedWord.pos.join(', ')} />}
          </div>

          <div className="mt-6">
            <div className="mb-3 flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-[#2f7d4a] dark:text-emerald-400 md:h-5 md:w-5" />
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 md:text-base">{copy.examples}</h3>
              <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-bold text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400 md:text-sm">
                {visibleSentences.length}
              </span>
            </div>

            {visibleSentences.length > 0 ? (
              <div className="grid gap-2">
                {visibleSentences.map((sentence) => (
                  <div key={`${selectedWord.word_id}-${sentence.sentence_id}`} className="rounded-xl border border-zinc-100 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900/70">
                    <div className="flex items-start gap-2">
                      <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-zinc-400" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold leading-6 text-zinc-950 dark:text-zinc-50 md:text-base md:leading-7">{sentence.sentence}</p>
                        {getSentenceTranslation(sentence, language) && (
                          <p className="mt-1 text-sm leading-6 text-zinc-500 dark:text-zinc-400 md:text-base md:leading-7">{getSentenceTranslation(sentence, language)}</p>
                        )}
                        {sentence.used_as && sentence.used_as !== selectedWord.word && (
                          <p className="mt-2 inline-flex rounded-full bg-white px-2 py-1 text-xs font-semibold text-zinc-500 dark:bg-zinc-800 dark:text-zinc-300 md:text-sm">
                            {copy.usedForm}: {sentence.used_as}
                          </p>
                        )}
                      </div>
                      {getPublicUrl(sentence.audio_url) && (
                        <AudioIconButton
                          audioUrl={getPublicUrl(sentence.audio_url)!}
                          label={language === 'en' ? 'Listen to example sentence' : '예문 듣기'}
                          className="mt-0.5"
                        />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="rounded-xl border border-dashed border-zinc-200 p-4 text-sm font-medium text-zinc-500 dark:border-zinc-700 dark:text-zinc-400 md:text-base">
                {copy.noExamples}
              </p>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}

function AudioIconButton({
  audioUrl,
  label,
  className = '',
}: {
  audioUrl: string;
  label: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => {
        const audio = new Audio(audioUrl);
        audio.play().catch(console.error);
      }}
      className={`${className} flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-500 shadow-sm transition hover:border-[#2f7d4a]/30 hover:bg-[#f4fbf6] hover:text-[#2f7d4a] dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-emerald-700 dark:hover:bg-zinc-800 dark:hover:text-emerald-400`}
      aria-label={label}
      title={label}
    >
      <Volume2 className="h-4 w-4" />
    </button>
  );
}

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;

  return (
    <div className="rounded-xl bg-zinc-50 px-3 py-2.5 dark:bg-zinc-900">
      <p className="text-xs font-bold text-zinc-400 dark:text-zinc-500 md:text-sm">{label}</p>
      <p className="mt-1 text-sm font-semibold text-zinc-900 dark:text-zinc-100 md:text-base md:leading-7">{value}</p>
    </div>
  );
}

function getMeaning(word: Pick<SentenceMappedWord, 'meaning_ko' | 'meaning_en'>, language: DisplayLanguage) {
  return (language === 'en' ? word.meaning_en : word.meaning_ko) || word.meaning_ko || word.meaning_en;
}

function getSentenceTranslation(
  sentence: Pick<WordUsageDetail['sentences'][number], 'translation' | 'translation_en'>,
  language: DisplayLanguage,
) {
  return (language === 'en' ? sentence.translation_en : sentence.translation) || sentence.translation || sentence.translation_en;
}
