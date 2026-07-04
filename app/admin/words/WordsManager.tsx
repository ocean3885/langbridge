'use client';

import { useState } from 'react';
import AutoVerifyWizard from './AutoVerifyWizard';
import WordCard from './WordCard';
import WordsFilters from './WordsFilters';
import { useAutoVerification } from './hooks/useAutoVerification';
import type { AutoVerifyModelProvider } from './hooks/useAutoVerification';
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
  const [isAutoVerifyModelModalOpen, setIsAutoVerifyModelModalOpen] = useState(false);
  const [autoVerifyModelProvider, setAutoVerifyModelProvider] = useState<AutoVerifyModelProvider>('chatgpt');

  const autoVerification = useAutoVerification({ words, setWords });
  const pendingAutoVerifyWords = words.filter((word) => !word.is_verified);
  const autoVerifyRequestSize = Math.min(autoVerification.batchSize, pendingAutoVerifyWords.length);

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
          autoVerifyBatchSize={autoVerification.batchSize}
          onAutoVerifyBatchSizeChange={autoVerification.setBatchSize}
          onStartAutoVerify={() => setIsAutoVerifyModelModalOpen(true)}
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

      {isAutoVerifyModelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-gray-100 bg-white p-5 shadow-xl dark:border-gray-800 dark:bg-gray-900">
            <div className="mb-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">자동 검수 모델 선택</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                검수 대기 단어 {autoVerifyRequestSize}개를 선택한 모델로 스캔합니다.
              </p>
            </div>

            <div className="space-y-2">
              {AUTO_VERIFY_MODEL_OPTIONS.map((option) => (
                <label
                  key={option.id}
                  className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition ${
                    autoVerifyModelProvider === option.id
                      ? 'border-blue-300 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30'
                      : 'border-gray-200 bg-white hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:hover:bg-gray-800'
                  }`}
                >
                  <input
                    type="radio"
                    name="auto-verify-model-provider"
                    value={option.id}
                    checked={autoVerifyModelProvider === option.id}
                    onChange={() => setAutoVerifyModelProvider(option.id)}
                    className="mt-1 h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>
                    <span className="block text-sm font-bold text-gray-900 dark:text-gray-100">{option.name}</span>
                    <span className="block text-xs text-gray-500 dark:text-gray-400">{option.description}</span>
                  </span>
                </label>
              ))}
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsAutoVerifyModelModalOpen(false)}
                disabled={autoVerification.isScanning}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                취소
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsAutoVerifyModelModalOpen(false);
                  void autoVerification.start(autoVerifyModelProvider);
                }}
                disabled={autoVerifyRequestSize === 0 || autoVerification.isScanning}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50"
              >
                검수 시작
              </button>
            </div>
          </div>
        </div>
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

const AUTO_VERIFY_MODEL_OPTIONS: {
  id: AutoVerifyModelProvider;
  name: string;
  description: string;
}[] = [
  { id: 'chatgpt', name: 'ChatGPT', description: 'OpenAI API 모델로 정밀 검수' },
  { id: 'gemini', name: 'Gemini', description: 'Google 모델로 빠른 검수' },
  { id: 'deepseek', name: 'DeepSeek', description: '기본 생성 모델로 검수' },
];
