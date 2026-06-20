'use client';

import { useEffect, useRef } from 'react';
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
  handleWizardAction: (action: 'approve' | 'confirm' | 'reject' | 'incomplete' | 'hold') => Promise<void>;
  loading: boolean;
  getMeaningDisplay: (meaning: any) => string;
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

function formatGrammarValue(value: unknown): string {
  const normalized = normalizeGrammarValue(value);
  if (
    normalized &&
    typeof normalized === 'object' &&
    !Array.isArray(normalized) &&
    Object.keys(normalized).length === 0
  ) {
    return '없음';
  }
  return JSON.stringify(normalized, null, 2);
}

function GrammarChangeComparison({
  label,
  original,
  corrected,
}: {
  label: string;
  original: unknown;
  corrected: unknown;
}) {
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50/20 p-4 dark:border-amber-900/30 dark:bg-amber-950/5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="text-sm font-bold text-gray-800 dark:text-gray-200">{label}</span>
        <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
          교정됨
        </span>
      </div>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <div className="min-w-0">
          <span className="mb-1.5 block text-xs font-bold uppercase text-red-500">기존</span>
          <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-words rounded-lg border border-red-100 bg-white p-3 text-sm leading-relaxed text-red-700 dark:border-red-950/50 dark:bg-gray-900 dark:text-red-300">
            {formatGrammarValue(original)}
          </pre>
        </div>
        <div className="min-w-0">
          <span className="mb-1.5 block text-xs font-bold uppercase text-green-600 dark:text-green-400">AI 교정안</span>
          <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-words rounded-lg border border-green-100 bg-white p-3 text-sm leading-relaxed text-green-700 dark:border-green-950/50 dark:bg-gray-900 dark:text-green-300">
            {formatGrammarValue(corrected)}
          </pre>
        </div>
      </div>
    </div>
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
  getMeaningDisplay,
}: AutoVerifyWizardProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  const currentItem = results[currentWizardIndex];

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
          void handleWizardAction('approve');
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
  }, [isOpen, isScanning, results, currentWizardIndex, handleWizardAction]);

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
                Gemini/Deepseek 모델이 스펠링, 뜻, 성·수 변화 및 오답의 유의어 관계(의미적 독립성)를 검증하고 있습니다. 잠시만 기다려주세요.
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

              const origMeaningKo = getMeaningDisplay(original.meaning_ko);
              const corrMeaningKo = isCorrected ? getMeaningDisplay(corrected.meaning_ko) : origMeaningKo;
              const isMeaningKoChanged = isCorrected && origMeaningKo !== corrMeaningKo;

              const origMeaningEn = getMeaningDisplay(original.meaning_en);
              const corrMeaningEn = isCorrected ? getMeaningDisplay(corrected.meaning_en) : origMeaningEn;
              const isMeaningEnChanged = isCorrected && origMeaningEn !== corrMeaningEn;
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
                              <div className="flex flex-wrap items-center gap-2 mt-1">
                                <span className="text-sm line-through text-red-500 font-medium">{origMeaningKo}</span>
                                <span className="text-gray-400 text-sm">→</span>
                                <span className="text-sm font-bold text-green-600 dark:text-green-400">
                                  {corrMeaningKo}
                                </span>
                              </div>
                            ) : (
                              <span className="text-sm font-medium text-gray-900 dark:text-gray-100 mt-1 block">
                                {origMeaningKo}
                              </span>
                            )}
                          </div>
                          <span
                            className={`text-xs font-bold px-2 py-0.5 rounded ml-2 ${
                              isMeaningKoChanged
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                                : 'text-gray-400 dark:text-gray-500'
                            }`}
                          >
                            {isMeaningKoChanged ? '교정됨' : '유지'}
                          </span>
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
                              <div className="flex flex-wrap items-center gap-2 mt-1">
                                <span className="text-sm line-through text-red-500 font-medium">{origMeaningEn}</span>
                                <span className="text-gray-400 text-sm">→</span>
                                <span className="text-sm font-bold text-green-600 dark:text-green-400">
                                  {corrMeaningEn}
                                </span>
                              </div>
                            ) : (
                              <span className="text-sm font-medium text-gray-900 dark:text-gray-100 mt-1 block">
                                {origMeaningEn}
                              </span>
                            )}
                          </div>
                          <span
                            className={`text-xs font-bold px-2 py-0.5 rounded ml-2 ${
                              isMeaningEnChanged
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                                : 'text-gray-400 dark:text-gray-500'
                            }`}
                          >
                            {isMeaningEnChanged ? '교정됨' : '유지'}
                          </span>
                        </div>
                      </div>

                      {(isDeclensionsChanged || isConjugationsChanged) && (
                        <div className="space-y-4">
                          <div>
                            <h4 className="text-sm font-bold text-gray-800 dark:text-gray-200">문법 변화 정보</h4>
                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                              AI가 변경한 변화형만 표시됩니다. 승인하면 교정안으로 저장됩니다.
                            </p>
                          </div>
                          {isDeclensionsChanged && (
                            <GrammarChangeComparison
                              label="성·수 변화 (Declensions)"
                              original={original.declensions}
                              corrected={corrected.declensions}
                            />
                          )}
                          {isConjugationsChanged && (
                            <GrammarChangeComparison
                              label="동사 활용 (Conjugations)"
                              original={original.conjugations}
                              corrected={corrected.conjugations}
                            />
                          )}
                        </div>
                      )}

                      {/* 오답 리스트 비교 */}
                      <div className="space-y-3">
                        <span className="text-xs text-gray-400 font-bold uppercase block">
                          오답 혼동 어휘 (6개) 검수 비교
                        </span>
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
                                  <span
                                    className={`text-xs font-bold px-1.5 py-0.2 rounded ${
                                      hasAnyChanged
                                        ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300'
                                        : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                                    }`}
                                  >
                                    {hasAnyChanged ? '교체됨' : '유지'}
                                  </span>
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
                            <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                              {getMeaningDisplay(original.meaning_ko)}
                            </p>
                          </div>

                          <div>
                            <span className="text-xs text-gray-400 font-bold uppercase block mb-1">
                              뜻 (English)
                            </span>
                            <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                              {getMeaningDisplay(original.meaning_en)}
                            </p>
                          </div>
                        </div>

                        {/* 오답 리스트 */}
                        <div className="space-y-4">
                          <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 pb-1 border-b dark:border-gray-800">
                            오답 혼동 어휘 (6개)
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
                          onClick={() => handleWizardAction('approve')}
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
