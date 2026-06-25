'use client';

import type { ReactNode } from 'react';

export interface SpellingChunk {
  id: number;
  chunk: string;
  selected: boolean;
}

interface SpellingScrambleQuestionProps {
  eyebrow: string;
  prompt: string;
  question: ReactNode;
  hint?: string;
  answerPattern?: string;
  selectedChunks: SpellingChunk[];
  poolChunks: SpellingChunk[];
  isAnswered: boolean;
  onSelectChunk: (chunk: SpellingChunk) => void;
  onRemoveChunk: (chunk: SpellingChunk, index: number) => void;
  audioAction?: ReactNode;
  variant?: 'card' | 'embedded';
  className?: string;
}

export function SpellingScrambleQuestion({
  eyebrow,
  prompt,
  question,
  hint,
  answerPattern,
  selectedChunks,
  poolChunks,
  isAnswered,
  onSelectChunk,
  onRemoveChunk,
  audioAction,
  variant = 'card',
  className = '',
}: SpellingScrambleQuestionProps) {
  const Wrapper = variant === 'card' ? 'section' : 'div';
  const wrapperClassName = variant === 'card'
    ? `rounded-2xl border border-zinc-100 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-black/20 ${className}`
    : className;

  return (
    <Wrapper className={wrapperClassName}>
      <div className="flex items-center justify-between border-b border-zinc-100 pb-4 dark:border-zinc-800">
        <span className="text-xs font-black uppercase tracking-wide text-[#2f7d4a] dark:text-emerald-400">{eyebrow}</span>
        {audioAction}
      </div>

      <p className="mt-6 text-xs font-bold text-zinc-400 dark:text-zinc-500">{prompt}</p>
      <div className="mt-2">{question}</div>
      {hint && !answerPattern && (
        <p className="mt-2 inline-flex rounded-full bg-[#f4fbf6] px-3 py-1 text-xs font-bold text-[#2f7d4a] dark:bg-emerald-950/30 dark:text-emerald-300">
          {hint}
        </p>
      )}

      {answerPattern ? (
        <SpellingSlots
          answerPattern={answerPattern}
          selectedChunks={selectedChunks}
          isAnswered={isAnswered}
          onRemoveChunk={onRemoveChunk}
        />
      ) : (
        <div className="mt-8 flex min-h-16 flex-wrap items-center gap-2 rounded-xl border border-dashed border-zinc-200 bg-zinc-50/50 p-4 dark:border-zinc-800 dark:bg-zinc-950/30">
          {selectedChunks.map((item, index) => (
            <button
              key={`${item.chunk}-${item.id}`}
              type="button"
              disabled={isAnswered}
              onClick={() => onRemoveChunk(item, index)}
              className={`rounded-lg border px-3 py-2 text-sm font-bold shadow-sm transition hover:bg-zinc-50 disabled:cursor-default dark:border-zinc-800 dark:text-zinc-200 ${
                item.chunk === ' '
                  ? 'min-w-10 border-zinc-300 bg-zinc-200/60 text-center font-mono dark:bg-zinc-800/60'
                  : 'border-zinc-200 bg-white dark:bg-zinc-900'
              }`}
            >
              {item.chunk === ' ' ? '␣' : item.chunk}
            </button>
          ))}
        </div>
      )}

      {!isAnswered && (
        <div className="mt-6 flex flex-wrap gap-2">
          {poolChunks
            .filter((chunk) => !chunk.selected)
            .map((chunk) => (
              <button
                key={`${chunk.chunk}-${chunk.id}`}
                type="button"
                onClick={() => onSelectChunk(chunk)}
                className={`rounded-lg px-3 py-2 text-sm font-bold transition ${
                  chunk.chunk === ' '
                    ? 'min-w-14 bg-zinc-200 text-center font-mono text-zinc-700 hover:bg-zinc-300 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700'
                    : 'bg-zinc-100 text-zinc-900 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700'
                }`}
              >
                {chunk.chunk === ' ' ? '␣ Space' : chunk.chunk}
              </button>
            ))}
        </div>
      )}
    </Wrapper>
  );
}

function SpellingSlots({
  answerPattern,
  selectedChunks,
  isAnswered,
  onRemoveChunk,
}: {
  answerPattern: string;
  selectedChunks: SpellingChunk[];
  isAnswered: boolean;
  onRemoveChunk: (chunk: SpellingChunk, index: number) => void;
}) {
  const characters = Array.from(answerPattern.trim());
  const prefilledIndex = getFirstNonSpaceIndex(characters);
  let selectedIndex = 0;
  const slots: ReactNode[] = [];

  for (let index = 0; index < characters.length; index += 1) {
    const character = characters[index];

    if (character === ' ') {
      slots.push(<span key={`space-${index}`} className="mx-1 h-10 w-3" />);
      continue;
    }

    if (index === prefilledIndex) {
      slots.push(
        <span key={`prefilled-${index}`} className="flex h-11 min-w-10 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 px-3 text-base font-black text-emerald-700 shadow-sm dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200">
          {character}
        </span>
      );
      continue;
    }

    const chunk = selectedChunks[selectedIndex];
    const chunkIndex = selectedIndex;
    selectedIndex++;

    if (!chunk) {
      slots.push(<span key={`empty-${index}`} className="h-11 min-w-10 rounded-lg border border-dashed border-zinc-300 bg-white/60 dark:border-zinc-700 dark:bg-zinc-900/60" />);
      continue;
    }

    slots.push(
      <button
        key={`${chunk.chunk}-${chunk.id}-${index}`}
        type="button"
        disabled={isAnswered}
        onClick={() => onRemoveChunk(chunk, chunkIndex)}
        className="flex h-11 min-w-10 items-center justify-center rounded-lg border border-zinc-200 bg-white px-3 text-base font-black text-zinc-900 shadow-sm transition hover:bg-zinc-50 disabled:cursor-default dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
      >
        {chunk.chunk}
      </button>
    );

    index += Math.max(0, Array.from(chunk.chunk).length - 1);
  }

  return (
    <div className="mt-8 rounded-xl border border-dashed border-zinc-200 bg-zinc-50/50 p-4 dark:border-zinc-800 dark:bg-zinc-950/30">
      <div className="flex min-h-16 flex-wrap items-center gap-2">
        {slots}
      </div>
    </div>
  );
}

export function getSpellingHint(word: string) {
  const trimmed = word.trim();
  const characters = Array.from(trimmed);
  const firstLetter = characters[getFirstNonSpaceIndex(characters)] || '';

  return {
    firstLetter,
    letterCount: trimmed.replace(/\s+/g, '').length,
  };
}

export function splitWordHybrid(word: string, options: { prefillFirstLetter?: boolean } = {}): string[] {
  const chunks = word
    .trim()
    .split(/\s+/)
    .flatMap((token) => splitTokenForSpelling(token));

  if (!options.prefillFirstLetter) return chunks;

  let removedPrefilledLetter = false;
  return chunks.flatMap((chunk) => {
    if (removedPrefilledLetter) return [chunk];

    const characters = Array.from(chunk);
    const firstLetterIndex = getFirstNonSpaceIndex(characters);
    if (firstLetterIndex < 0) return [chunk];

    removedPrefilledLetter = true;
    const remaining = characters.filter((_, index) => index !== firstLetterIndex).join('');
    return remaining ? [remaining] : [];
  });
}

export function buildPrefilledSpellingAnswer(word: string, chunks: string[]) {
  const characters = Array.from(word.trim());
  const prefilledIndex = getFirstNonSpaceIndex(characters);
  let chunkIndex = 0;
  const answer: string[] = [];

  for (let index = 0; index < characters.length; index += 1) {
    const character = characters[index];

    if (index === prefilledIndex || character === ' ') {
      answer.push(character);
      continue;
    }

    const chunk = chunks[chunkIndex++] || '';
    answer.push(chunk);
    index += Math.max(0, Array.from(chunk).length - 1);
  }

  return answer.join('');
}

function getFirstNonSpaceIndex(characters: string[]) {
  const index = characters.findIndex((character) => character.trim().length > 0);
  return index >= 0 ? index : 0;
}

function splitTokenForSpelling(token: string) {
  const characters = Array.from(token.trim());
  if (characters.length <= 5) return characters;

  const syllables = splitSpanishLikeSyllables(characters);
  if (syllables.length <= 1) return splitIntoBalancedChunks(characters, characters.length >= 9 ? 3 : 2);

  return syllables.flatMap((syllable) => (
    Array.from(syllable).length <= 4 ? [syllable] : splitIntoBalancedChunks(Array.from(syllable), 3)
  ));
}

function splitSpanishLikeSyllables(characters: string[]) {
  const nuclei = characters
    .map((character, index) => isVowel(character) ? index : -1)
    .filter((index) => index >= 0);

  if (nuclei.length <= 1) return [];

  const boundaries = [0];
  for (let index = 0; index < nuclei.length - 1; index += 1) {
    const previousNucleus = nuclei[index];
    const nextNucleus = nuclei[index + 1];
    const consonantStart = previousNucleus + 1;
    const consonantCount = nextNucleus - consonantStart;

    if (consonantCount <= 0) {
      boundaries.push(nextNucleus);
      continue;
    }

    if (consonantCount === 1) {
      boundaries.push(consonantStart);
      continue;
    }

    const cluster = characters.slice(consonantStart, nextNucleus).join('').toLowerCase();
    const trailingCluster = cluster.slice(-2);

    if (consonantCount === 2) {
      boundaries.push(canStartSpanishSyllable(cluster) ? consonantStart : consonantStart + 1);
    } else {
      boundaries.push(canStartSpanishSyllable(trailingCluster) ? nextNucleus - 2 : nextNucleus - 1);
    }
  }

  boundaries.push(characters.length);

  return boundaries.slice(0, -1).map((start, index) => (
    characters.slice(start, boundaries[index + 1]).join('')
  )).filter(Boolean);
}

function splitIntoBalancedChunks(characters: string[], targetSize: number) {
  const chunks: string[] = [];
  for (let index = 0; index < characters.length; index += targetSize) {
    chunks.push(characters.slice(index, index + targetSize).join(''));
  }
  return chunks;
}

function isVowel(character: string) {
  return /[aeiouáéíóúü]/i.test(character);
}

function canStartSpanishSyllable(cluster: string) {
  return ['bl', 'br', 'cl', 'cr', 'dr', 'fl', 'fr', 'gl', 'gr', 'pl', 'pr', 'tr'].includes(cluster);
}

export function generateSpellingDistractors(realChunks: string[], langCode: string): string[] {
  const distractors = new Set<string>();
  const vowels = ['a', 'e', 'i', 'o', 'u'];

  for (const chunk of realChunks) {
    if (chunk === ' ') continue;

    if (chunk.length >= 2) {
      for (const vowel of vowels) {
        const swapped = chunk.replace(/[aeiou]/gi, vowel);
        if (swapped !== chunk && !realChunks.includes(swapped)) {
          distractors.add(swapped);
        }
      }

      if (langCode === 'es' || langCode === 'sp') {
        let confusion = '';
        if (chunk.includes('c')) confusion = chunk.replace('c', 's');
        else if (chunk.includes('s')) confusion = chunk.replace('s', 'c');
        else if (chunk.includes('b')) confusion = chunk.replace('b', 'v');
        else if (chunk.includes('v')) confusion = chunk.replace('v', 'b');
        else if (chunk.includes('g')) confusion = chunk.replace('g', 'j');

        if (confusion && confusion !== chunk && !realChunks.includes(confusion)) {
          distractors.add(confusion);
        }
      }
    } else if (chunk.length === 1) {
      for (const vowel of vowels) {
        if (vowel !== chunk && !realChunks.includes(vowel)) {
          distractors.add(vowel);
        }
      }
    }

    if (distractors.size >= 3) break;
  }

  const fallbacks = ['te', 'me', 'es', 'un', 'la', 'lo', 'se', 'a', 'e', 'o'];
  for (const fallback of fallbacks) {
    if (distractors.size >= 3) break;
    if (!realChunks.includes(fallback)) {
      distractors.add(fallback);
    }
  }

  return Array.from(distractors).slice(0, 3);
}
