'use client';

import { useEffect, useRef, useState } from 'react';
import { X, Sparkles, AlertTriangle, CheckCircle2, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';

interface DistractorData {
  id?: string | number;
  word: string;
  meaning_ko: string | null;
  meaning_en: string | null;
}

interface WordData {
  word: string;
  pos: string[];
  meaning_ko: Record<string, string[]>;
  meaning_en: Record<string, string[]>;
  gender: string | null;
  declensions?: any;
  conjugations?: any;
  difficulty: number;
  distractors: DistractorData[];
}

export interface AutoVerifyResult {
  id: number;
  status: 'valid' | 'corrected' | 'flagged';
  reason: string;
  original_data: WordData;
  corrected_data: WordData | null;
}

interface AutoVerifyWizardProps {
  isOpen: boolean;
  onClose: () => void;
  isScanning: boolean;
  results: AutoVerifyResult[];
  currentWizardIndex: number;
  setCurrentWizardIndex: React.Dispatch<React.SetStateAction<number>>;
  handleWizardAction: (
    action: 'approve' | 'confirm' | 'reject' | 'incomplete' | 'hold',
    selectedCorrection?: WordData
  ) => Promise<void>;
  loading: boolean;
}

type ChangeSelection = {
  word: boolean;
  pos: boolean;
  gender: boolean;
  difficulty: boolean;
  meaning_ko: boolean;
  meaning_en: boolean;
  declensions: boolean;
  conjugations: boolean;
  distractors: Record<number, boolean>;
};

function normalizeMeaningMap(meaning: unknown): Record<string, string[]> {
  if (!meaning) return {};

  if (typeof meaning === 'string') {
    try {
      return normalizeMeaningMap(JSON.parse(meaning));
    } catch {
      return { meaning: [meaning] };
    }
  }

  if (typeof meaning !== 'object' || Array.isArray(meaning)) return {};

  return Object.fromEntries(
    Object.entries(meaning as Record<string, unknown>).map(([pos, value]) => {
      const meanings = Array.isArray(value) ? value : [value];
      return [
        pos,
        meanings
          .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
          .map((item) => item.trim()),
      ];
    })
  );
}

function getMeaningSignature(meaning: unknown): string {
  const normalized = normalizeMeaningMap(meaning);
  return JSON.stringify(
    Object.fromEntries(
      Object.entries(normalized)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([pos, meanings]) => [pos, meanings])
    )
  );
}

function areWordDataFieldsChanged(original: WordData, corrected: WordData) {
  return {
    word: original.word !== corrected.word,
    pos: original.pos.join(', ') !== corrected.pos.join(', '),
    gender: original.gender !== corrected.gender,
    difficulty: (original.difficulty || 1) !== (corrected.difficulty || original.difficulty || 1),
    meaning_ko: getMeaningSignature(original.meaning_ko) !== getMeaningSignature(corrected.meaning_ko),
    meaning_en: getMeaningSignature(original.meaning_en) !== getMeaningSignature(corrected.meaning_en),
    declensions: isGrammarChanged(original.declensions, corrected.declensions),
    conjugations: isGrammarChanged(original.conjugations, corrected.conjugations),
  };
}

function isDistractorChanged(original: DistractorData | undefined, corrected: DistractorData) {
  if (!original) return true;
  return (
    corrected.word !== original.word ||
    corrected.meaning_ko !== original.meaning_ko ||
    corrected.meaning_en !== original.meaning_en
  );
}

function buildDefaultSelection(result: AutoVerifyResult): ChangeSelection {
  const original = result.original_data;
  const corrected = result.corrected_data;
  if (!corrected) {
    return {
      word: false,
      pos: false,
      gender: false,
      difficulty: false,
      meaning_ko: false,
      meaning_en: false,
      declensions: false,
      conjugations: false,
      distractors: {},
    };
  }

  const changes = areWordDataFieldsChanged(original, corrected);
  return {
    ...changes,
    distractors: Object.fromEntries(
      corrected.distractors.map((distractor, index) => [
        index,
        isDistractorChanged(original.distractors[index], distractor),
      ])
    ),
  };
}

function mergeSelectedCorrection(original: WordData, corrected: WordData, selection: ChangeSelection): WordData {
  return {
    word: selection.word ? corrected.word : original.word,
    pos: selection.pos ? corrected.pos : original.pos,
    meaning_ko: selection.meaning_ko ? corrected.meaning_ko : original.meaning_ko,
    meaning_en: selection.meaning_en ? corrected.meaning_en : original.meaning_en,
    gender: selection.gender ? corrected.gender : original.gender,
    declensions: selection.declensions ? corrected.declensions : original.declensions,
    conjugations: selection.conjugations ? corrected.conjugations : original.conjugations,
    difficulty: selection.difficulty ? corrected.difficulty : original.difficulty,
    distractors: corrected.distractors.map((distractor, index) => {
      const originalDistractor = original.distractors[index];
      if (!originalDistractor) return distractor;
      return selection.distractors[index] ? distractor : originalDistractor;
    }),
  };
}

function MeaningByPos({
  meaning,
  pos,
  tone = 'default',
}: {
  meaning: unknown;
  pos: string[];
  tone?: 'default' | 'removed' | 'added';
}) {
  const meaningMap = normalizeMeaningMap(meaning);
  const orderedPos = Array.from(new Set([...pos, ...Object.keys(meaningMap)]));
  const toneClass = {
    default: 'text-gray-900 dark:text-gray-100',
    removed: 'text-red-500',
    added: 'text-green-600 dark:text-green-400',
  }[tone];

  if (orderedPos.length === 0) {
    return <span className={`text-sm font-medium ${toneClass}`}>-</span>;
  }

  return (
    <div className="mt-1 space-y-1.5">
      {orderedPos.map((posValue) => (
        <div key={posValue} className="flex items-start gap-2 text-sm">
          <span className="min-w-14 rounded bg-gray-100 px-1.5 py-0.5 text-center text-xs font-bold text-gray-500 dark:bg-gray-800 dark:text-gray-400">
            {posValue}
          </span>
          <span className={`font-medium ${toneClass}`}>
            {meaningMap[posValue]?.join(', ') || '-'}
          </span>
        </div>
      ))}
    </div>
  );
}

function normalizeGrammarValue(value: unknown): unknown {
  if (value === null || value === undefined) return {};
  if (Array.isArray(value)) return value.map(normalizeGrammarValue);
  if (typeof value !== 'object') return value;

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => [key, normalizeGrammarValue(item)])
  );
}

function isGrammarChanged(original: unknown, corrected: unknown): boolean {
  return JSON.stringify(normalizeGrammarValue(original)) !== JSON.stringify(normalizeGrammarValue(corrected));
}

function formatGrammarDisplay(value: unknown): string {
  const normalized = normalizeGrammarValue(value);
  if (
    normalized &&
    typeof normalized === 'object' &&
    !Array.isArray(normalized) &&
    Object.keys(normalized).length === 0
  ) {
    return '없음';
  }
  if (typeof normalized === 'string') return normalized;
  if (typeof normalized === 'number' || typeof normalized === 'boolean') return String(normalized);
  return JSON.stringify(normalized);
}

type GrammarDiffRow = {
  path: string;
  original: string;
  corrected: string;
  type: 'added' | 'removed' | 'changed';
};

function flattenGrammarValue(value: unknown, path: string[] = []): Map<string, string> {
  const normalized = normalizeGrammarValue(value);
  const label = path.length > 0 ? path.join(' > ') : '전체';

  if (
    normalized === null ||
    normalized === undefined ||
    typeof normalized !== 'object' ||
    (Array.isArray(normalized) && normalized.length === 0)
  ) {
    return new Map([[label, formatGrammarDisplay(normalized)]]);
  }

  if (!Array.isArray(normalized) && Object.keys(normalized).length === 0) {
    return new Map([[label, '없음']]);
  }

  const entries = Array.isArray(normalized)
    ? normalized.map((item, index) => [String(index), item] as const)
    : Object.entries(normalized as Record<string, unknown>);

  return entries.reduce((acc, [key, item]) => {
    flattenGrammarValue(item, [...path, key]).forEach((itemValue, itemPath) => {
      acc.set(itemPath, itemValue);
    });
    return acc;
  }, new Map<string, string>());
}

function getGrammarDiffRows(original: unknown, corrected: unknown): GrammarDiffRow[] {
  const originalMap = flattenGrammarValue(original);
  const correctedMap = flattenGrammarValue(corrected);
  const paths = Array.from(new Set([...originalMap.keys(), ...correctedMap.keys()]))
    .sort((left, right) => left.localeCompare(right));

  return paths.flatMap((path) => {
    const originalValue = originalMap.get(path);
    const correctedValue = correctedMap.get(path);

    if (originalValue === correctedValue) return [];

    return [{
      path,
      original: originalValue ?? '없음',
      corrected: correctedValue ?? '없음',
      type: originalValue === undefined ? 'added' : correctedValue === undefined ? 'removed' : 'changed',
    }];
  });
}

function GrammarChangeComparison({
  label,
  original,
  corrected,
  checked,
  onCheckedChange,
}: {
  label: string;
  original: unknown;
  corrected: unknown;
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}) {
  const diffRows = getGrammarDiffRows(original, corrected);

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50/20 p-4 dark:border-amber-900/30 dark:bg-amber-950/5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="text-sm font-bold text-gray-800 dark:text-gray-200">{label}</span>
        <div className="flex items-center gap-2">
          {onCheckedChange && (
            <label className="inline-flex items-center gap-1.5 rounded bg-white px-2 py-1 text-xs font-bold text-gray-700 shadow-sm dark:bg-gray-900 dark:text-gray-200">
              <input
                type="checkbox"
                checked={checked ?? true}
                onChange={(event) => onCheckedChange(event.target.checked)}
                className="h-3.5 w-3.5"
              />
              반영
            </label>
          )}
          <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
            {diffRows.length}개 변경
          </span>
        </div>
      </div>
      <div className="space-y-2">
        {diffRows.map((row) => (
          <div
            key={row.path}
            className="rounded-lg border border-gray-200 bg-white p-3 text-sm dark:border-gray-800 dark:bg-gray-900"
          >
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="rounded bg-gray-100 px-2 py-0.5 font-mono text-xs font-bold text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                {row.path}
              </span>
              <span
                className={`rounded px-2 py-0.5 text-xs font-bold ${
                  row.type === 'added'
                    ? 'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-300'
                    : row.type === 'removed'
                      ? 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300'
                      : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                }`}
              >
                {row.type === 'added' ? '추가' : row.type === 'removed' ? '삭제' : '변경'}
              </span>
            </div>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_auto_1fr] md:items-center">
              <div className="min-w-0 rounded border border-red-100 bg-red-50/50 px-3 py-2 text-red-700 dark:border-red-950/50 dark:bg-red-950/10 dark:text-red-300">
                <span className="mb-1 block text-xs font-bold text-red-500">기존</span>
                <span className="break-words font-medium">{row.original}</span>
              </div>
              <span className="hidden text-gray-400 md:block">→</span>
              <div className="min-w-0 rounded border border-green-100 bg-green-50/50 px-3 py-2 text-green-700 dark:border-green-950/50 dark:bg-green-950/10 dark:text-green-300">
                <span className="mb-1 block text-xs font-bold text-green-600 dark:text-green-400">AI 교정안</span>
                <span className="break-words font-medium">{row.corrected}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ApplyChangeToggle({
  checked,
  onChange,
  disabled = false,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label className={`inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-xs font-bold ${
      checked
        ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300'
        : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
    } ${disabled ? 'opacity-70' : ''}`}>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="h-3.5 w-3.5"
      />
      반영
    </label>
  );
}

export default function AutoVerifyWizard({
  isOpen,
  onClose,
  isScanning,
  results,
  currentWizardIndex,
  setCurrentWizardIndex,
  handleWizardAction,
  loading,
}: AutoVerifyWizardProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const [selectionsByResultId, setSelectionsByResultId] = useState<Record<number, ChangeSelection>>({});

  const currentItem = results[currentWizardIndex];

  useEffect(() => {
    if (!currentItem || !currentItem.corrected_data) return;
    setSelectionsByResultId((current) => {
      if (current[currentItem.id]) return current;
      return {
        ...current,
        [currentItem.id]: buildDefaultSelection(currentItem),
      };
    });
  }, [currentItem]);

  const currentSelection = currentItem
    ? selectionsByResultId[currentItem.id] || buildDefaultSelection(currentItem)
    : null;

  const setCurrentSelectionValue = (
    key: keyof Omit<ChangeSelection, 'distractors'>,
    value: boolean
  ) => {
    if (!currentItem) return;
    setSelectionsByResultId((current) => ({
      ...current,
      [currentItem.id]: {
        ...(current[currentItem.id] || buildDefaultSelection(currentItem)),
        [key]: value,
      },
    }));
  };

  const setCurrentDistractorSelection = (index: number, value: boolean) => {
    if (!currentItem) return;
    setSelectionsByResultId((current) => {
      const selection = current[currentItem.id] || buildDefaultSelection(currentItem);
      return {
        ...current,
        [currentItem.id]: {
          ...selection,
          distractors: {
            ...selection.distractors,
            [index]: value,
          },
        },
      };
    });
  };

  const approveWithSelectedChanges = () => {
    if (!currentItem?.corrected_data || !currentSelection) {
      void handleWizardAction('approve');
      return;
    }

    void handleWizardAction(
      'approve',
      mergeSelectedCorrection(currentItem.original_data, currentItem.corrected_data, currentSelection)
    );
  };

  // 단축키 이벤트 리스너 바인딩
  useEffect(() => {
    if (!isOpen || isScanning || results.length === 0) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Input, Select, Textarea 등에 포커스가 있으면 단축키 무시
      const activeEl = document.activeElement;
      if (
        activeEl &&
        (activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'SELECT' ||
          activeEl.tagName === 'TEXTAREA' ||
          activeEl.getAttribute('contenteditable') === 'true')
      ) {
        return;
      }

      const item = results[currentWizardIndex];
      if (!item) return;

      const isCorrected = item.status === 'corrected' && item.corrected_data;

      if (e.key === 'Enter') {
        e.preventDefault();
        if (isCorrected) {
          approveWithSelectedChanges();
        } else {
          void handleWizardAction('confirm');
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        if (isCorrected) {
          void handleWizardAction('incomplete');
        } else {
          void handleWizardAction('hold');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, isScanning, results, currentWizardIndex, handleWizardAction, selectionsByResultId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4" ref={modalRef}>
      <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-2xl w-full max-w-5xl border border-gray-200 dark:border-gray-800 flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="flex justify-between items-center pb-4 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-500" />
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">AI 단어 순차 검수 마법사</h3>
          </div>
          <div className="flex items-center gap-4">
            {!isScanning && results.length > 0 && (
              <span className="text-sm font-semibold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full">
                카드 {currentWizardIndex + 1} / {results.length}
              </span>
            )}
            <button
              onClick={() => {
                if (confirm('검수를 중단하시겠습니까? 지금까지 반영한 내역은 DB에 보존됩니다.')) {
                  onClose();
                }
              }}
              className="p-1.5 text-gray-400 hover:text-gray-650 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto py-6">
          {isScanning ? (
            /* 1단계: AI 스캔 중 (로딩 화면) */
            <div className="flex flex-col items-center justify-center py-20 space-y-4">
              <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
              <h4 className="text-lg font-bold text-gray-900 dark:text-white">
                AI가 단어 및 오답 데이터를 정밀 검수하는 중입니다...
              </h4>
              <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md text-center leading-relaxed">
                Gemini/Deepseek 모델이 스펠링, 뜻, 성·수 변화 및 오답의 복수 정답 가능성을 검증하고 있습니다. 잠시만 기다려주세요.
              </p>
            </div>
          ) : results.length === 0 ? (
            <div className="text-center py-20 text-gray-500">
              검수할 단어 데이터를 불러오지 못했거나 오류가 발생했습니다.
            </div>
          ) : (
            /* 2단계: 카드 검토 */
            (() => {
              const original = currentItem.original_data;
              const corrected = currentItem.corrected_data;
              const isCorrected = currentItem.status === 'corrected' && corrected;

              // 각 필드의 변경 여부 체크
              const isWordChanged = isCorrected && original.word !== corrected.word;
              const isPosChanged = isCorrected && original.pos.join(', ') !== corrected.pos.join(', ');
              const isGenderChanged = isCorrected && original.gender !== corrected.gender;
              const isDifficultyChanged =
                isCorrected &&
                (original.difficulty || 1) !== (corrected.difficulty || original.difficulty || 1);

              const isMeaningKoChanged =
                isCorrected &&
                getMeaningSignature(original.meaning_ko) !== getMeaningSignature(corrected.meaning_ko);
              const isMeaningEnChanged =
                isCorrected &&
                getMeaningSignature(original.meaning_en) !== getMeaningSignature(corrected.meaning_en);
              const isDeclensionsChanged =
                Boolean(isCorrected) && isGrammarChanged(original.declensions, corrected?.declensions);
              const isConjugationsChanged =
                Boolean(isCorrected) && isGrammarChanged(original.conjugations, corrected?.conjugations);

              return (
                <div className="space-y-6">
                  {/* AI 판정 라벨 및 수정 사유 */}
                  {currentItem.status === 'corrected' ? (
                    <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-xl">
                      <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-bold text-sm mb-1">
                        <AlertTriangle className="w-4 h-4" />
                        AI 판단: 교정 제안 (Corrected)
                      </div>
                      <p className="text-sm text-amber-700 dark:text-amber-400 leading-relaxed font-medium">
                        {currentItem.reason || '단어 정보 또는 오답 리스트에 개선안이 있습니다.'}
                      </p>
                      <p className="mt-2 text-xs font-semibold text-amber-700 dark:text-amber-300">
                        체크된 변경만 승인완료 시 DB에 반영됩니다. 체크를 해제하면 기존 값이 유지됩니다.
                      </p>
                    </div>
                  ) : currentItem.status === 'flagged' ? (
                    <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 rounded-xl">
                      <div className="flex items-center gap-2 text-red-800 dark:text-red-300 font-bold text-sm mb-1">
                        <AlertTriangle className="w-4 h-4" />
                        AI 판단: 주의 요망 (Flagged)
                      </div>
                      <p className="text-sm text-red-700 dark:text-red-400 leading-relaxed font-medium">
                        {currentItem.reason || '수동 확인이 필요한 오류가 감지되었습니다.'}
                      </p>
                    </div>
                  ) : (
                    <div className="p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900/50 rounded-xl">
                      <div className="flex items-center gap-2 text-green-800 dark:text-green-300 font-bold text-sm">
                        <CheckCircle2 className="w-4 h-4" />
                        AI 판단: 이상 없음 (Valid)
                      </div>
                    </div>
                  )}

                  {isCorrected ? (
                    /* Case A: 교정 필요 (항목별 콤팩트 비교 View) */
                    <div className="space-y-6">
                      {/* 단어 기본 정보의 2x2 그리드형 항목별 비교 */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* 단어 원형 */}
                        <div
                          className={`p-3 rounded-xl border flex justify-between items-center ${
                            isWordChanged
                              ? 'bg-amber-50/20 dark:bg-amber-950/5 border-amber-200 dark:border-amber-900/30'
                              : 'bg-gray-50 dark:bg-gray-900/40 border-gray-200 dark:border-gray-800'
                          }`}
                        >
                          <div>
                            <span className="text-xs text-gray-400 font-bold uppercase block">단어 원형</span>
                            {isWordChanged ? (
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-sm line-through text-red-500 font-medium">{original.word}</span>
                                <span className="text-gray-400 text-sm">→</span>
                                <span className="text-sm font-bold text-green-600 dark:text-green-400">
                                  {corrected.word}
                                </span>
                              </div>
                            ) : (
                              <span className="text-sm font-bold text-gray-900 dark:text-gray-100 mt-1 block">
                                {original.word}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {isWordChanged && currentSelection && (
                              <ApplyChangeToggle
                                checked={currentSelection.word}
                                onChange={(checked) => setCurrentSelectionValue('word', checked)}
                              />
                            )}
                            <span
                              className={`text-xs font-bold px-2 py-0.5 rounded ${
                                isWordChanged
                                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                                  : 'text-gray-400 dark:text-gray-500'
                              }`}
                            >
                              {isWordChanged ? '교정됨' : '유지'}
                            </span>
                          </div>
                        </div>

                        {/* 품사 */}
                        <div
                          className={`p-3 rounded-xl border flex justify-between items-center ${
                            isPosChanged
                              ? 'bg-amber-50/20 dark:bg-amber-950/5 border-amber-200 dark:border-amber-900/30'
                              : 'bg-gray-50 dark:bg-gray-900/40 border-gray-200 dark:border-gray-800'
                          }`}
                        >
                          <div>
                            <span className="text-xs text-gray-400 font-bold uppercase block">품사</span>
                            {isPosChanged ? (
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-sm line-through text-red-500 font-medium">
                                  {original.pos.join(', ') || '없음'}
                                </span>
                                <span className="text-gray-400 text-sm">→</span>
                                <span className="text-sm font-bold text-green-600 dark:text-green-400">
                                  {corrected.pos.join(', ')}
                                </span>
                              </div>
                            ) : (
                              <span className="text-sm font-semibold text-gray-800 dark:text-gray-300 mt-1 block">
                                {original.pos.join(', ') || '-'}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {isPosChanged && currentSelection && (
                              <ApplyChangeToggle
                                checked={currentSelection.pos}
                                onChange={(checked) => setCurrentSelectionValue('pos', checked)}
                              />
                            )}
                            <span
                              className={`text-xs font-bold px-2 py-0.5 rounded ${
                                isPosChanged
                                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                                  : 'text-gray-400 dark:text-gray-500'
                              }`}
                            >
                              {isPosChanged ? '교정됨' : '유지'}
                            </span>
                          </div>
                        </div>

                        {/* 성별 */}
                        <div
                          className={`p-3 rounded-xl border flex justify-between items-center ${
                            isGenderChanged
                              ? 'bg-amber-50/20 dark:bg-amber-950/5 border-amber-200 dark:border-amber-900/30'
                              : 'bg-gray-50 dark:bg-gray-900/40 border-gray-200 dark:border-gray-800'
                          }`}
                        >
                          <div>
                            <span className="text-xs text-gray-400 font-bold uppercase block">성별</span>
                            {isGenderChanged ? (
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-sm line-through text-red-500 font-medium">
                                  {original.gender || '없음'}
                                </span>
                                <span className="text-gray-400 text-sm">→</span>
                                <span className="text-sm font-bold text-green-600 dark:text-green-400">
                                  {corrected.gender || '없음'}
                                </span>
                              </div>
                            ) : (
                              <span className="text-sm font-semibold text-gray-800 dark:text-gray-300 mt-1 block">
                                {original.gender || '없음'}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {isGenderChanged && currentSelection && (
                              <ApplyChangeToggle
                                checked={currentSelection.gender}
                                onChange={(checked) => setCurrentSelectionValue('gender', checked)}
                              />
                            )}
                            <span
                              className={`text-xs font-bold px-2 py-0.5 rounded ${
                                isGenderChanged
                                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                                  : 'text-gray-400 dark:text-gray-500'
                              }`}
                            >
                              {isGenderChanged ? '교정됨' : '유지'}
                            </span>
                          </div>
                        </div>

                        {/* 난이도 */}
                        <div
                          className={`p-3 rounded-xl border flex justify-between items-center ${
                            isDifficultyChanged
                              ? 'bg-amber-50/20 dark:bg-amber-950/5 border-amber-200 dark:border-amber-900/30'
                              : 'bg-gray-50 dark:bg-gray-900/40 border-gray-200 dark:border-gray-800'
                          }`}
                        >
                          <div>
                            <span className="text-xs text-gray-400 font-bold uppercase block">난이도</span>
                            {isDifficultyChanged ? (
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-sm line-through text-red-500 font-medium">
                                  Level {original.difficulty || 1}
                                </span>
                                <span className="text-gray-400 text-sm">→</span>
                                <span className="text-sm font-bold text-green-600 dark:text-green-400">
                                  Level {corrected.difficulty || original.difficulty || 1}
                                </span>
                              </div>
                            ) : (
                              <span className="text-sm font-semibold text-gray-800 dark:text-gray-300 mt-1 block">
                                Level {original.difficulty || 1}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {isDifficultyChanged && currentSelection && (
                              <ApplyChangeToggle
                                checked={currentSelection.difficulty}
                                onChange={(checked) => setCurrentSelectionValue('difficulty', checked)}
                              />
                            )}
                            <span
                              className={`text-xs font-bold px-2 py-0.5 rounded ${
                                isDifficultyChanged
                                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                                  : 'text-gray-400 dark:text-gray-500'
                              }`}
                            >
                              {isDifficultyChanged ? '교정됨' : '유지'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* 뜻 비교 */}
                      <div className="space-y-4">
                        {/* 한국어 뜻 */}
                        <div
                          className={`p-3 rounded-xl border flex justify-between items-center ${
                            isMeaningKoChanged
                              ? 'bg-amber-50/20 dark:bg-amber-950/5 border-amber-200 dark:border-amber-900/30'
                              : 'bg-gray-50 dark:bg-gray-900/40 border-gray-200 dark:border-gray-800'
                          }`}
                        >
                          <div className="flex-1">
                            <span className="text-xs text-gray-400 font-bold uppercase block">한국어 뜻</span>
                            {isMeaningKoChanged ? (
                              <div className="mt-2 grid grid-cols-1 gap-3 md:grid-cols-2">
                                <div>
                                  <span className="text-xs font-bold text-red-500">기존</span>
                                  <MeaningByPos meaning={original.meaning_ko} pos={original.pos} tone="removed" />
                                </div>
                                <div>
                                  <span className="text-xs font-bold text-green-600 dark:text-green-400">AI 교정안</span>
                                  <MeaningByPos meaning={corrected.meaning_ko} pos={corrected.pos} tone="added" />
                                </div>
                              </div>
                            ) : (
                              <MeaningByPos meaning={original.meaning_ko} pos={original.pos} />
                            )}
                          </div>
                          <div className="ml-2 flex items-center gap-2">
                            {isMeaningKoChanged && currentSelection && (
                              <ApplyChangeToggle
                                checked={currentSelection.meaning_ko}
                                onChange={(checked) => setCurrentSelectionValue('meaning_ko', checked)}
                              />
                            )}
                            <span
                              className={`text-xs font-bold px-2 py-0.5 rounded ${
                                isMeaningKoChanged
                                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                                  : 'text-gray-400 dark:text-gray-500'
                              }`}
                            >
                              {isMeaningKoChanged ? '교정됨' : '유지'}
                            </span>
                          </div>
                        </div>

                        {/* 영어 뜻 */}
                        <div
                          className={`p-3 rounded-xl border flex justify-between items-center ${
                            isMeaningEnChanged
                              ? 'bg-amber-50/20 dark:bg-amber-950/5 border-amber-200 dark:border-amber-900/30'
                              : 'bg-gray-50 dark:bg-gray-900/40 border-gray-200 dark:border-gray-800'
                          }`}
                        >
                          <div className="flex-1">
                            <span className="text-xs text-gray-400 font-bold uppercase block">영어 뜻</span>
                            {isMeaningEnChanged ? (
                              <div className="mt-2 grid grid-cols-1 gap-3 md:grid-cols-2">
                                <div>
                                  <span className="text-xs font-bold text-red-500">기존</span>
                                  <MeaningByPos meaning={original.meaning_en} pos={original.pos} tone="removed" />
                                </div>
                                <div>
                                  <span className="text-xs font-bold text-green-600 dark:text-green-400">AI 교정안</span>
                                  <MeaningByPos meaning={corrected.meaning_en} pos={corrected.pos} tone="added" />
                                </div>
                              </div>
                            ) : (
                              <MeaningByPos meaning={original.meaning_en} pos={original.pos} />
                            )}
                          </div>
                          <div className="ml-2 flex items-center gap-2">
                            {isMeaningEnChanged && currentSelection && (
                              <ApplyChangeToggle
                                checked={currentSelection.meaning_en}
                                onChange={(checked) => setCurrentSelectionValue('meaning_en', checked)}
                              />
                            )}
                            <span
                              className={`text-xs font-bold px-2 py-0.5 rounded ${
                                isMeaningEnChanged
                                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                                  : 'text-gray-400 dark:text-gray-500'
                              }`}
                            >
                              {isMeaningEnChanged ? '교정됨' : '유지'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {(isDeclensionsChanged || isConjugationsChanged) && (
                        <div className="space-y-4">
                          <div>
                            <h4 className="text-sm font-bold text-gray-800 dark:text-gray-200">문법 변화 정보</h4>
                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                              AI가 변경한 변화형만 표시됩니다. 체크된 변화 정보만 승인 시 저장됩니다.
                            </p>
                          </div>
                          {isDeclensionsChanged && (
                            <GrammarChangeComparison
                              label="성·수 변화 (Declensions)"
                              original={original.declensions}
                              corrected={corrected.declensions}
                              checked={currentSelection?.declensions}
                              onCheckedChange={(checked) => setCurrentSelectionValue('declensions', checked)}
                            />
                          )}
                          {isConjugationsChanged && (
                            <GrammarChangeComparison
                              label="동사 활용 (Conjugations)"
                              original={original.conjugations}
                              corrected={corrected.conjugations}
                              checked={currentSelection?.conjugations}
                              onCheckedChange={(checked) => setCurrentSelectionValue('conjugations', checked)}
                            />
                          )}
                        </div>
                      )}

                      {/* 오답 리스트 비교 */}
                      <div className="space-y-3">
                        <div>
                          <span className="text-xs text-gray-400 font-bold uppercase block">
                            오답 혼동 어휘 ({corrected.distractors.length}개) 검수 비교
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {corrected.distractors.map((corrDist: any, idx: number) => {
                            const origDist = original.distractors[idx] || { word: '', meaning_ko: '', meaning_en: '' };
                            const isDistWordChanged = corrDist.word !== origDist.word;
                            const isDistKoChanged = corrDist.meaning_ko !== origDist.meaning_ko;
                            const isDistEnChanged = corrDist.meaning_en !== origDist.meaning_en;
                            const hasAnyChanged = isDistWordChanged || isDistKoChanged || isDistEnChanged;

                            return (
                              <div
                                key={idx}
                                className={`p-3 border rounded-xl flex flex-col justify-between text-sm transition-all ${
                                  hasAnyChanged
                                    ? 'border-green-200 bg-green-50/20 dark:border-green-950/20 dark:bg-green-950/5'
                                    : 'border-gray-200 bg-gray-50/30 dark:border-gray-800 dark:bg-gray-900/30'
                                }`}
                              >
                                <div className="flex items-center justify-between pb-1.5 border-b border-dashed dark:border-gray-800">
                                  <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                                    오답 #{idx + 1}
                                  </span>
                                  <div className="flex items-center gap-2">
                                    {hasAnyChanged && currentSelection && (
                                      <ApplyChangeToggle
                                        checked={!original.distractors[idx] || currentSelection.distractors[idx]}
                                        disabled={!original.distractors[idx]}
                                        onChange={(checked) => setCurrentDistractorSelection(idx, checked)}
                                      />
                                    )}
                                    <span
                                      className={`text-xs font-bold px-1.5 py-0.2 rounded ${
                                        hasAnyChanged
                                          ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300'
                                          : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                                      }`}
                                    >
                                      {hasAnyChanged ? (original.distractors[idx] ? '교체됨' : '신규') : '유지'}
                                    </span>
                                  </div>
                                </div>

                                <div className="mt-2 space-y-1.5">
                                  {/* 오답 단어 */}
                                  <div>
                                    <span className="text-xs text-gray-400 block font-semibold">오답 단어</span>
                                    {isDistWordChanged ? (
                                      <div className="flex items-center gap-1.5 text-sm font-semibold">
                                        <span className="line-through text-red-500">{origDist.word || '없음'}</span>
                                        <span className="text-gray-400">→</span>
                                        <span className="text-green-700 dark:text-green-400 font-bold">
                                          {corrDist.word}
                                        </span>
                                      </div>
                                    ) : (
                                      <span className="font-semibold text-gray-800 dark:text-gray-200">
                                        {corrDist.word}
                                      </span>
                                    )}
                                  </div>

                                  {/* 한국어 뜻 */}
                                  <div>
                                    <span className="text-xs text-gray-400 block font-semibold">한국어 뜻</span>
                                    {isDistKoChanged ? (
                                      <div className="flex items-center gap-1.5 text-sm">
                                        <span className="line-through text-red-500">
                                          {origDist.meaning_ko || '없음'}
                                        </span>
                                        <span className="text-gray-400">→</span>
                                        <span className="text-green-700 dark:text-green-400 font-medium">
                                          {corrDist.meaning_ko}
                                        </span>
                                      </div>
                                    ) : (
                                      <span className="text-gray-700 dark:text-gray-300">
                                        {corrDist.meaning_ko || '-'}
                                      </span>
                                    )}
                                  </div>

                                  {/* 영어 뜻 */}
                                  <div>
                                    <span className="text-xs text-gray-400 block font-semibold">영어 뜻</span>
                                    {isDistEnChanged ? (
                                      <div className="flex items-center gap-1.5 text-sm">
                                        <span className="line-through text-red-500">
                                          {origDist.meaning_en || '없음'}
                                        </span>
                                        <span className="text-gray-400">→</span>
                                        <span className="text-green-700 dark:text-green-400 font-medium">
                                          {corrDist.meaning_en}
                                        </span>
                                      </div>
                                    ) : (
                                      <span className="text-gray-600 dark:text-gray-400">
                                        {corrDist.meaning_en || '-'}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Case B: 이상 없음 (Unified single column View) */
                    <div className="bg-gray-50 dark:bg-gray-900/40 p-5 rounded-xl border border-gray-100 dark:border-gray-800 space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* 단어 기본 정보 */}
                        <div className="space-y-4">
                          <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 pb-1 border-b dark:border-gray-800">
                            단어 기본 정보
                          </h4>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <span className="text-xs text-gray-400 font-bold uppercase block mb-1">
                                단어 원형
                              </span>
                              <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{original.word}</p>
                            </div>
                            <div>
                              <span className="text-xs text-gray-400 font-bold uppercase block mb-1">품사</span>
                              <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 mt-1">
                                {original.pos.join(', ') || '-'}
                              </p>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <span className="text-xs text-gray-400 font-bold uppercase block mb-1">성별</span>
                              <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                                {original.gender || '없음'}
                              </p>
                            </div>
                            <div>
                              <span className="text-xs text-gray-400 font-bold uppercase block mb-1">
                                난이도
                              </span>
                              <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                                {(() => {
                                  const levels: Record<number, string> = {
                                    1: 'Beginner',
                                    2: 'A1',
                                    3: 'A2',
                                    4: 'B1',
                                    5: 'B2',
                                    6: 'C1',
                                    7: 'C2',
                                  };
                                  return levels[original.difficulty] || `Level ${original.difficulty}`;
                                })()}
                              </p>
                            </div>
                          </div>

                          <div>
                            <span className="text-xs text-gray-400 font-bold uppercase block mb-1">
                              뜻 (한국어)
                            </span>
                            <MeaningByPos meaning={original.meaning_ko} pos={original.pos} />
                          </div>

                          <div>
                            <span className="text-xs text-gray-400 font-bold uppercase block mb-1">
                              뜻 (English)
                            </span>
                            <MeaningByPos meaning={original.meaning_en} pos={original.pos} />
                          </div>
                        </div>

                        {/* 오답 리스트 */}
                        <div className="space-y-4">
                          <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 pb-1 border-b dark:border-gray-800">
                            오답 혼동 어휘 ({original.distractors.length}개)
                          </h4>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {original.distractors.map((d: any, idx: number) => (
                              <div
                                key={idx}
                                className="p-3 border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 rounded-lg text-sm leading-relaxed"
                              >
                                <div className="font-bold text-gray-800 dark:text-gray-200">{d.word}</div>
                                <div className="text-gray-550 text-sm mt-0.5">한글: {d.meaning_ko || '-'}</div>
                                <div className="text-gray-555 text-sm">영어: {d.meaning_en || '-'}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()
          )}
        </div>

        {/* Modal Footer (Action Buttons) */}
        {!isScanning && results.length > 0 && (
          <div className="pt-4 border-t border-gray-100 dark:border-gray-800 flex justify-between items-center">
            {/* Left Side: Navigation */}
            <div className="flex gap-2">
              <button
                disabled={currentWizardIndex === 0 || loading}
                onClick={() => setCurrentWizardIndex((prev) => prev - 1)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-700 text-gray-750 dark:text-gray-350 rounded-xl text-sm font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 flex items-center gap-1 transition"
              >
                <ChevronLeft className="w-4 h-4" />
                이전 카드
              </button>
              <button
                disabled={currentWizardIndex === results.length - 1 || loading}
                onClick={() => setCurrentWizardIndex((prev) => prev + 1)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-700 text-gray-750 dark:text-gray-350 rounded-xl text-sm font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 flex items-center gap-1 transition"
              >
                다음 카드
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Right Side: Actions */}
            <div className="flex gap-2">
              {(() => {
                  const isCorrected = currentItem.status === 'corrected' && currentItem.corrected_data;

                  if (isCorrected) {
                    return (
                      <>
                        <button
                          onClick={() => handleWizardAction('incomplete')}
                          disabled={loading}
                          className="px-5 py-2 bg-gray-100 hover:bg-gray-250 dark:bg-gray-800 dark:hover:bg-gray-705 text-gray-600 dark:text-gray-300 rounded-xl text-sm font-bold shadow-sm transition"
                        >
                          미완료
                        </button>
                        <button
                          onClick={() => handleWizardAction('reject')}
                          disabled={loading}
                          className="px-5 py-2 bg-amber-100 hover:bg-amber-200 dark:bg-amber-950/30 dark:hover:bg-amber-950/50 text-amber-700 dark:text-amber-300 rounded-xl text-sm font-bold shadow-sm transition"
                        >
                          반려완료
                        </button>
                        <button
                          onClick={approveWithSelectedChanges}
                          disabled={loading}
                          className="px-5 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-bold shadow-sm transition"
                        >
                          승인완료
                        </button>
                      </>
                    );
                  } else {
                    return (
                      <>
                        <button
                          onClick={() => handleWizardAction('hold')}
                          disabled={loading}
                          className="px-5 py-2 bg-gray-100 hover:bg-gray-250 dark:bg-gray-800 dark:hover:bg-gray-705 text-gray-600 dark:text-gray-300 rounded-xl text-sm font-bold shadow-sm transition"
                        >
                          보류
                        </button>
                        <button
                          onClick={() => handleWizardAction('confirm')}
                          disabled={loading}
                          className="px-5 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-bold shadow-sm transition"
                        >
                          확인
                        </button>
                      </>
                    );
                  }
                })()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
