'use client';

import Link from 'next/link';
import { X, Sparkles, ExternalLink, Clipboard, Check } from 'lucide-react';

export interface BulkReportDistractor {
  word: string;
  meaning_ko: string | null;
  meaning_en: string | null;
}

export interface BulkReportItem {
  itemId: string | null;
  id: number;
  word: string;
  lang_code: string;
  pos: string[];
  meaning_ko: Record<string, string[]>;
  meaning_en: Record<string, string[]>;
  previousDistractorCount: number;
  distractors: BulkReportDistractor[];
  status: 'success' | 'failed';
  reviewed: boolean;
  error?: string;
}

interface BulkReportModalProps {
  bulkReport: BulkReportItem[];
  onClose: () => void;
  updateBulkDistractor: (itemId: string, distractorIndex: number, patch: Partial<BulkReportDistractor>) => void;
  setBulkWordReviewed: (itemId: string, reviewed: boolean) => void;
  isPublishingBulkReport: boolean;
  isSavingBulkReview: boolean;
  isDiscardingBulkBatch: boolean;
  handleDiscardBulkBatch: () => Promise<void>;
  handleCopyBulkReportForChatGPT: () => Promise<void>;
  isBulkReportCopied: boolean;
  handleSaveBulkReview: () => Promise<void>;
  handlePublishBulkReport: () => Promise<void>;
  targetDistractorCount: number;
  getMeaningDisplay: (meaning: any) => string;
}

export default function BulkReportModal({
  bulkReport,
  onClose,
  updateBulkDistractor,
  setBulkWordReviewed,
  isPublishingBulkReport,
  isSavingBulkReview,
  isDiscardingBulkBatch,
  handleDiscardBulkBatch,
  handleCopyBulkReportForChatGPT,
  isBulkReportCopied,
  handleSaveBulkReview,
  handlePublishBulkReport,
  targetDistractorCount,
  getMeaningDisplay,
}: BulkReportModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-xl max-w-3xl w-full border border-gray-100 dark:border-gray-800 flex flex-col max-h-[85vh]">
        <div className="flex justify-between items-center pb-4 border-b border-gray-100 dark:border-gray-800">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-500" />
            오답 생성 검수
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="py-3 border-b border-gray-100 dark:border-gray-800 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            오답 {targetDistractorCount}개와 뜻을 확인·수정한 뒤, 문제가 없는 단어를 체크하고 등록하세요. 등록한 단어는 이 목록에서 사라집니다.
          </p>
          <span className="rounded-full bg-blue-50 px-3 py-1.5 text-sm font-bold text-blue-700 dark:bg-blue-950/30 dark:text-blue-300">
            검수 완료 {bulkReport.filter((item) => item.reviewed).length} / {bulkReport.filter((item) => item.status === 'success').length}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
          <div className="grid grid-cols-1 divide-y divide-gray-200 dark:divide-gray-800">
            {bulkReport.map((item) => (
              <div
                key={item.id}
                className={`my-3 space-y-3 rounded-xl border p-4 first:mt-0 ${
                  item.status === 'failed'
                    ? 'border-red-200 bg-red-50/60 dark:border-red-900/50 dark:bg-red-950/10'
                    : item.reviewed
                    ? 'border-green-300 bg-green-50/60 dark:border-green-800 dark:bg-green-950/15'
                    : 'border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    {item.status === 'success' && item.itemId && (
                      <label className="mt-0.5 inline-flex shrink-0 cursor-pointer items-center gap-2">
                        <input
                          type="checkbox"
                          checked={item.reviewed}
                          onChange={(event) => setBulkWordReviewed(item.itemId!, event.target.checked)}
                          className="h-5 w-5 accent-green-600"
                          aria-label={`${item.word} 검수 완료`}
                        />
                      </label>
                    )}
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/admin/words/${item.id}`}
                          target="_blank"
                          className="text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                        >
                          {item.word}
                          <ExternalLink className="w-3.5 h-3.5 inline" />
                        </Link>
                        {item.status === 'success' && (
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-black ${
                              item.reviewed
                                ? 'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-300'
                                : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-300'
                            }`}
                          >
                            {item.reviewed ? '검수 완료' : '검수 필요'}
                          </span>
                        )}
                        <span className="text-xs text-amber-600 dark:text-amber-400">
                          기존 {item.previousDistractorCount}개 → 등록 시 새 {targetDistractorCount}개
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-gray-500">
                        원본 뜻: {getMeaningDisplay(item.meaning_en)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  {item.status === 'success' ? (
                    item.distractors.length > 0 ? (
                      <>
                        <div className="hidden grid-cols-[minmax(110px,1fr)_minmax(130px,1.4fr)_minmax(130px,1.4fr)] gap-2 px-2 text-xs font-black uppercase tracking-wide text-gray-400 md:grid">
                          <span>오답 단어</span>
                          <span>한국어 뜻</span>
                          <span>English meaning</span>
                        </div>
                        {item.distractors.map((dist, idx) => (
                          <div
                            key={idx}
                            className="grid gap-2 rounded-lg border border-gray-200 bg-gray-50 p-2 dark:border-gray-800 dark:bg-gray-950/30 md:grid-cols-[minmax(110px,1fr)_minmax(130px,1.4fr)_minmax(130px,1.4fr)]"
                          >
                            <input
                              value={dist.word}
                              onChange={(event) =>
                                item.itemId && updateBulkDistractor(item.itemId, idx, { word: event.target.value })
                              }
                              className="min-w-0 px-2 py-1.5 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm font-semibold text-gray-800 dark:text-gray-100"
                              placeholder="오답 단어"
                            />
                            <input
                              value={dist.meaning_ko ?? ''}
                              onChange={(event) =>
                                item.itemId &&
                                updateBulkDistractor(item.itemId, idx, { meaning_ko: event.target.value })
                              }
                              className="min-w-0 px-2 py-1.5 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-700 dark:text-gray-200"
                              placeholder="한국어 뜻"
                            />
                            <input
                              value={dist.meaning_en ?? ''}
                              onChange={(event) =>
                                item.itemId &&
                                updateBulkDistractor(item.itemId, idx, { meaning_en: event.target.value })
                              }
                              className="min-w-0 px-2 py-1.5 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-700 dark:text-gray-200"
                              placeholder="English meaning"
                            />
                          </div>
                        ))}
                      </>
                    ) : (
                      <span className="text-sm text-gray-400">생성된 오답 없음 (이미 충족되었을 수 있음)</span>
                    )
                  ) : (
                    <span className="rounded-lg border border-red-200/50 bg-red-50 px-3 py-2 text-sm font-medium text-red-600 dark:bg-red-950/20 dark:text-red-400">
                      생성 실패: {item.error}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="pt-4 border-t border-gray-100 dark:border-gray-800 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-bold text-gray-500 dark:text-gray-400">
            선택한 단어 {bulkReport.filter((item) => item.reviewed).length}개
          </p>
          <div className="flex flex-wrap justify-end gap-2">
            <button
              onClick={() => void handleDiscardBulkBatch()}
              disabled={isPublishingBulkReport || isSavingBulkReview || isDiscardingBulkBatch}
              className="px-5 py-2 bg-red-50 hover:bg-red-100 dark:bg-red-950/30 dark:hover:bg-red-950/50 text-red-700 dark:text-red-300 rounded-xl text-sm font-bold shadow-sm transition-all disabled:opacity-50"
            >
              {isDiscardingBulkBatch ? '폐기 중...' : '남은 배치 폐기'}
            </button>
            <button
              onClick={() => void handleCopyBulkReportForChatGPT()}
              disabled={isDiscardingBulkBatch}
              className="px-5 py-2 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/30 dark:hover:bg-blue-950/50 text-blue-700 dark:text-blue-300 rounded-xl text-sm font-bold shadow-sm transition-all flex items-center gap-2"
            >
              {isBulkReportCopied ? (
                <>
                  <Check className="w-4 h-4" />
                  복사 완료
                </>
              ) : (
                <>
                  <Clipboard className="w-4 h-4" />
                  ChatGPT 검수용 복사
                </>
              )}
            </button>
            <button
              onClick={() => void handleSaveBulkReview()}
              disabled={isSavingBulkReview || isPublishingBulkReport || isDiscardingBulkBatch}
              className="px-5 py-2 bg-amber-100 hover:bg-amber-200 dark:bg-amber-950/40 dark:hover:bg-amber-950/60 text-amber-800 dark:text-amber-300 rounded-xl text-sm font-bold shadow-sm transition-all disabled:opacity-50"
            >
              {isSavingBulkReview ? '저장 중...' : '검수 내용 저장'}
            </button>
            <button
              onClick={() => void handlePublishBulkReport()}
              disabled={
                isPublishingBulkReport ||
                isSavingBulkReview ||
                isDiscardingBulkBatch ||
                bulkReport.filter((item) => item.reviewed).length === 0
              }
              className="px-5 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-bold shadow-sm transition-all disabled:opacity-50"
            >
              {isPublishingBulkReport
                ? '등록 중...'
                : `${bulkReport.filter((item) => item.reviewed).length}개 완료 및 등록`}
            </button>
            <button
              onClick={onClose}
              disabled={isPublishingBulkReport || isDiscardingBulkBatch}
              className="px-5 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-bold shadow-sm transition-all"
            >
              닫기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
