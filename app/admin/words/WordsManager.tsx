'use client';

import { useState } from 'react';
import BulkReportModal from './BulkReportModal';
import AutoVerifyWizard from './AutoVerifyWizard';
import WordCard from './WordCard';
import WordsFilters from './WordsFilters';
import { useAutoVerification } from './hooks/useAutoVerification';
import { useDistractorBatch } from './hooks/useDistractorBatch';
import type { Language, SentenceSortOrder, VerificationFilter, Word } from './words.types';
import { TARGET_DISTRACTOR_COUNT, WORDS_PER_PAGE } from './words.constants';
import { getCanonicalPOS, getMeaningDisplay } from './words.utils';

interface WordsManagerProps {
  initialWords: Word[];
  languages: Language[];
}

export default function WordsManager({ initialWords, languages }: WordsManagerProps) {
  const [words, setWords] = useState<Word[]>(initialWords);
  const [deletingWordId, setDeletingWordId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLanguage, setFilterLanguage] = useState<string>('all');
  const [filterLowDistractors, setFilterLowDistractors] = useState(false);
  const [filterMissingAudio, setFilterMissingAudio] = useState(false);
  const [filterPOS, setFilterPOS] = useState<string>('all');
  const [filterVerification, setFilterVerification] = useState<VerificationFilter>('all');
  const [filterDifficulty, setFilterDifficulty] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<SentenceSortOrder>('none');
  const [currentPage, setCurrentPage] = useState(1);

  const autoVerification = useAutoVerification({ words, setWords });

  const filteredWords = words.filter((word) => {
    const matchesSearch =
      word.word.toLowerCase().includes(searchTerm.toLowerCase()) ||
      getMeaningDisplay(word.meaning_ko).includes(searchTerm) ||
      getMeaningDisplay(word.meaning_en).includes(searchTerm);
    const matchesLanguage = filterLanguage === 'all' || word.lang_code === filterLanguage;
    const matchesLowDistractors =
      !filterLowDistractors || (word.distractor_count ?? 0) < TARGET_DISTRACTOR_COUNT;
    const matchesMissingAudio = !filterMissingAudio || !word.audio_url?.trim();
    const matchesPOS =
      filterPOS === 'all' ||
      word.pos.some((p) => getCanonicalPOS(p) === filterPOS);
    const matchesVerification =
      filterVerification === 'all' ||
      (filterVerification === 'verified' ? word.is_verified === true : word.is_verified !== true);
    const matchesDifficulty =
      filterDifficulty === 'all' || (word.difficulty ?? 1) === Number(filterDifficulty);
    return matchesSearch &&
      matchesLanguage &&
      matchesLowDistractors &&
      matchesMissingAudio &&
      matchesPOS &&
      matchesVerification &&
      matchesDifficulty;
  });

  const distractorBatch = useDistractorBatch({ filteredWords, setWords });

  const sortedWords = [...filteredWords].sort((a, b) => {
    if (sortOrder === 'none') return 0;
    const countA = a.sentence_count || 0;
    const countB = b.sentence_count || 0;
    return sortOrder === 'asc' ? countA - countB : countB - countA;
  });

  const paginatedWords = sortedWords.slice(
    (currentPage - 1) * WORDS_PER_PAGE,
    currentPage * WORDS_PER_PAGE
  );
  const totalPages = Math.ceil(filteredWords.length / WORDS_PER_PAGE);

  const handleDelete = async (id: number) => {
    if (!confirm('정말 이 단어를 삭제하시겠습니까?')) {
      return;
    }

    setDeletingWordId(id);
    try {
      const res = await fetch(`/api/admin/words?id=${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || '단어 삭제 실패');
      }

      setWords((current) => current.filter((word) => word.id !== id));
      alert('단어가 삭제되었습니다.');
    } catch (error) {
      alert(error instanceof Error ? error.message : '단어 삭제 중 오류가 발생했습니다.');
    } finally {
      setDeletingWordId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-background md:ml-64 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">단어 관리</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">학습할 단어를 관리합니다.</p>
          </div>
        </div>

        <WordsFilters
          searchTerm={searchTerm}
          onSearchChange={(value) => {
            setSearchTerm(value);
            setCurrentPage(1);
          }}
          languages={languages}
          filterLanguage={filterLanguage}
          onLanguageChange={(value) => {
            setFilterLanguage(value);
            setCurrentPage(1);
          }}
          filterLowDistractors={filterLowDistractors}
          onLowDistractorsChange={(value) => {
            setFilterLowDistractors(value);
            setCurrentPage(1);
          }}
          filterMissingAudio={filterMissingAudio}
          onMissingAudioChange={(value) => {
            setFilterMissingAudio(value);
            setCurrentPage(1);
          }}
          filterPOS={filterPOS}
          onPOSChange={(value) => {
            setFilterPOS(value);
            setCurrentPage(1);
          }}
          filterVerification={filterVerification}
          onVerificationChange={(value) => {
            setFilterVerification(value);
            setCurrentPage(1);
          }}
          filterDifficulty={filterDifficulty}
          onDifficultyChange={(value) => {
            setFilterDifficulty(value);
            setCurrentPage(1);
          }}
          sortOrder={sortOrder}
          onSortOrderChange={(value) => {
            setSortOrder(value);
            setCurrentPage(1);
          }}
          filteredWords={filteredWords}
          isBulkGenerating={distractorBatch.isGenerating}
          incompleteBatchCount={distractorBatch.incompleteBatchCount}
          pendingBatchCount={distractorBatch.pendingBatchCount}
          onBulkGenerate={() => void distractorBatch.generate()}
          onLoadPendingBatch={() => void distractorBatch.loadPendingBatch()}
          autoVerifyBatchSize={autoVerification.batchSize}
          onAutoVerifyBatchSizeChange={autoVerification.setBatchSize}
          onStartAutoVerify={() => void autoVerification.start()}
          autoVerifyDisabled={autoVerification.isSaving || autoVerification.isScanning}
          totalWordCount={words.length}
          onResetFilters={() => {
            setSearchTerm('');
            setFilterLanguage('all');
            setFilterLowDistractors(false);
            setFilterMissingAudio(false);
            setFilterPOS('all');
            setFilterVerification('all');
            setFilterDifficulty('all');
            setSortOrder('none');
            setCurrentPage(1);
          }}
        />

        {filteredWords.length === 0 ? (
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 py-16 text-center text-gray-500">
            {searchTerm || filterLanguage !== 'all' || filterLowDistractors || filterMissingAudio || filterPOS !== 'all' || filterVerification !== 'all' || filterDifficulty !== 'all' ? '검색 결과가 없습니다.' : '등록된 단어가 없습니다.'}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {paginatedWords.map((word) => (
              <WordCard
                key={word.id}
                word={word}
                deleting={deletingWordId === word.id}
                onDelete={(id) => void handleDelete(id)}
              />
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-2 mt-8">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              이전
            </button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum = currentPage;
                if (currentPage <= 3) pageNum = i + 1;
                else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                else pageNum = currentPage - 2 + i;

                // Ensure pageNum is valid
                if (pageNum < 1 || pageNum > totalPages) return null;

                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-10 h-10 flex items-center justify-center rounded-lg text-sm font-medium transition-colors ${currentPage === pageNum
                        ? 'bg-blue-600 text-white border border-blue-600'
                        : 'text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              다음
            </button>
          </div>
        )}

        <div className="mt-4 text-sm text-gray-600 dark:text-gray-400 text-center">
          전체 {words.length}개 중 {filteredWords.length}개 표시 ({filteredWords.length === 0 ? 0 : (currentPage - 1) * WORDS_PER_PAGE + 1}-{Math.min(currentPage * WORDS_PER_PAGE, filteredWords.length)})
        </div>
      </div>

      {distractorBatch.isGenerating && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-8 shadow-xl max-w-md w-full border border-gray-100 dark:border-gray-800 space-y-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white text-center">오답 일괄 생성 중</h3>
            <div className="w-full bg-gray-200 dark:bg-gray-700 h-2.5 rounded-full overflow-hidden">
              <div
                className="bg-blue-600 h-full transition-all duration-300"
                style={{ width: `${(distractorBatch.progress.current / distractorBatch.progress.total) * 100}%` }}
              />
            </div>
            <p className="text-sm font-semibold text-gray-650 dark:text-gray-400 text-center">
              {distractorBatch.progress.current} / {distractorBatch.progress.total} 단어 완료
            </p>
            <p className="text-xs text-gray-400 text-center leading-relaxed">
              API 요청 한도와 타임아웃을 조절하기 위해 단어별로 순차 처리 중입니다. 완료될 때까지 브라우저 창을 닫지 마세요.
            </p>
          </div>
        </div>
      )}

      {distractorBatch.report && (
        <BulkReportModal
          bulkReport={distractorBatch.report}
          onClose={() => distractorBatch.setReport(null)}
          updateBulkDistractor={distractorBatch.updateDistractor}
          setBulkWordReviewed={distractorBatch.setWordReviewed}
          isPublishingBulkReport={distractorBatch.isPublishing}
          isSavingBulkReview={distractorBatch.isSavingReview}
          isDiscardingBulkBatch={distractorBatch.isDiscarding}
          handleDiscardBulkBatch={distractorBatch.discard}
          handleCopyBulkReportForChatGPT={distractorBatch.copyForReview}
          isBulkReportCopied={distractorBatch.isReportCopied}
          handleSaveBulkReview={distractorBatch.saveReview}
          handlePublishBulkReport={distractorBatch.publish}
          targetDistractorCount={TARGET_DISTRACTOR_COUNT}
          getMeaningDisplay={getMeaningDisplay}
        />
      )}

      {autoVerification.isOpen && (
        <AutoVerifyWizard
          isOpen={autoVerification.isOpen}
          onClose={() => autoVerification.setIsOpen(false)}
          isScanning={autoVerification.isScanning}
          results={autoVerification.results}
          currentWizardIndex={autoVerification.currentIndex}
          setCurrentWizardIndex={autoVerification.setCurrentIndex}
          handleWizardAction={autoVerification.applyAction}
          loading={autoVerification.isSaving}
        />
      )}
    </div>
  );
}
