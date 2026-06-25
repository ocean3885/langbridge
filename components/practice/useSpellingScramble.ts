'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  buildPrefilledSpellingAnswer,
  getSpellingHint,
  splitWordHybrid,
  type SpellingChunk,
} from '@/components/practice/SpellingScrambleQuestion';

interface UseSpellingScrambleOptions {
  prefillFirstLetter?: boolean;
}

export function useSpellingScramble(word: string, options: UseSpellingScrambleOptions = {}) {
  const { prefillFirstLetter = true } = options;
  const [poolChunks, setPoolChunks] = useState<SpellingChunk[]>([]);
  const [selectedChunks, setSelectedChunks] = useState<SpellingChunk[]>([]);

  const reset = useCallback(() => {
    const realChunks = splitWordHybrid(word, { prefillFirstLetter });
    setPoolChunks(shuffle(realChunks).map((chunk, index) => ({
      id: index,
      chunk,
      selected: false,
    })));
    setSelectedChunks([]);
  }, [prefillFirstLetter, word]);

  useEffect(() => {
    reset();
  }, [reset]);

  const selectChunk = useCallback((chunk: SpellingChunk) => {
    setSelectedChunks((prev) => [...prev, chunk]);
    setPoolChunks((prev) => prev.map((item) => (
      item.id === chunk.id ? { ...item, selected: true } : item
    )));
  }, []);

  const removeChunk = useCallback((chunk: SpellingChunk, index: number) => {
    setSelectedChunks((prev) => prev.filter((_, chunkIndex) => chunkIndex !== index));
    setPoolChunks((prev) => prev.map((item) => (
      item.id === chunk.id ? { ...item, selected: false } : item
    )));
  }, []);

  const buildAnswer = useCallback(() => (
    buildPrefilledSpellingAnswer(word, selectedChunks.map((chunk) => chunk.chunk))
  ), [selectedChunks, word]);

  const checkAnswer = useCallback(() => (
    buildAnswer().toLowerCase().trim() === word.toLowerCase().trim()
  ), [buildAnswer, word]);

  const hint = useMemo(() => getSpellingHint(word), [word]);

  return {
    poolChunks,
    selectedChunks,
    hint,
    hasSelection: selectedChunks.length > 0,
    selectChunk,
    removeChunk,
    buildAnswer,
    checkAnswer,
    reset,
  };
}

function shuffle<T>(values: T[]) {
  const copy = [...values];
  for (let index = copy.length - 1; index > 0; index--) {
    const target = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[target]] = [copy[target], copy[index]];
  }
  return copy;
}
