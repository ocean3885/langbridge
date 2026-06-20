'use client';

import { useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { AutoVerifyResult } from '../AutoVerifyWizard';
import type { Word } from '../words.types';

type WizardAction = 'approve' | 'confirm' | 'reject' | 'incomplete' | 'hold';

interface UseAutoVerificationOptions {
  words: Word[];
  setWords: Dispatch<SetStateAction<Word[]>>;
}

export function useAutoVerification({ words, setWords }: UseAutoVerificationOptions) {
  const [isOpen, setIsOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [results, setResults] = useState<AutoVerifyResult[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [batchSize, setBatchSize] = useState(5);
  const [isSaving, setIsSaving] = useState(false);

  const moveToNext = () => {
    if (currentIndex < results.length - 1) {
      setCurrentIndex((current) => current + 1);
      return;
    }

    alert('모든 단어 카드의 검수가 완료되었습니다.');
    setIsOpen(false);
    setResults([]);
  };

  const start = async () => {
    const wordsToVerify = words.filter((word) => !word.is_verified);
    if (wordsToVerify.length === 0) {
      alert('검수 대기 상태(is_verified가 false)인 단어가 없습니다.');
      return;
    }

    const requestSize = Math.min(batchSize, wordsToVerify.length);
    if (!confirm(`검수 대기 단어 중 ${requestSize}개에 대해 AI 자동 검수 스캔을 시작하시겠습니까?`)) {
      return;
    }

    setIsOpen(true);
    setIsScanning(true);
    setCurrentIndex(0);
    setResults([]);

    try {
      const response = await fetch('/api/admin/words/auto-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wordIds: wordsToVerify.slice(0, requestSize).map((word) => word.id),
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'AI 검수 스캔에 실패했습니다.');
      }
      setResults(data.results || []);
    } catch (error) {
      alert(error instanceof Error ? error.message : '스캔 중 오류가 발생했습니다.');
      setIsOpen(false);
    } finally {
      setIsScanning(false);
    }
  };

  const applyAction = async (action: WizardAction) => {
    const currentItem = results[currentIndex];
    if (!currentItem) return;

    setIsSaving(true);
    try {
      const corrected = currentItem.corrected_data;
      const shouldApplyCorrection = (action === 'approve' || action === 'confirm') && corrected;
      const payload: Record<string, unknown> = {
        wordId: currentItem.id,
        action,
      };

      if (shouldApplyCorrection) {
        payload.wordData = {
          word: corrected.word,
          pos: corrected.pos,
          meaning_ko: corrected.meaning_ko,
          meaning_en: corrected.meaning_en,
          gender: corrected.gender,
          declensions: corrected.declensions || {},
          conjugations: corrected.conjugations || {},
          difficulty: corrected.difficulty,
        };
        payload.distractors = corrected.distractors.map((distractor) => ({
          word: distractor.word,
          meaning_ko: distractor.meaning_ko,
          meaning_en: distractor.meaning_en,
        }));
      }

      const response = await fetch('/api/admin/words/auto-verify', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || '검수 상태 업데이트에 실패했습니다.');
      }

      if (result.word) {
        setWords((current) => current.map((word) => (
          word.id === currentItem.id ? result.word : word
        )));
      }
      moveToNext();
    } catch (error) {
      alert(error instanceof Error ? error.message : '업데이트 중 오류가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  return {
    isOpen,
    setIsOpen,
    isScanning,
    results,
    currentIndex,
    setCurrentIndex,
    batchSize,
    setBatchSize,
    isSaving,
    start,
    applyAction,
  };
}
