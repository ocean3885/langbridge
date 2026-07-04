import { RotateCcw, Search, SlidersHorizontal, Sparkles } from 'lucide-react';
import type { Language, SentenceSortOrder, VerificationFilter, Word } from './words.types';
import { DIFFICULTY_OPTIONS, POS_OPTIONS, TARGET_DISTRACTOR_COUNT } from './words.constants';

interface WordsFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  languages: Language[];
  filterLanguage: string;
  onLanguageChange: (value: string) => void;
  filterLowDistractors: boolean;
  onLowDistractorsChange: (value: boolean) => void;
  filterMissingAudio: boolean;
  onMissingAudioChange: (value: boolean) => void;
  filterPOS: string;
  onPOSChange: (value: string) => void;
  filterVerification: VerificationFilter;
  onVerificationChange: (value: VerificationFilter) => void;
  filterDifficulty: string;
  onDifficultyChange: (value: string) => void;
  sortOrder: SentenceSortOrder;
  onSortOrderChange: (value: SentenceSortOrder) => void;
  filteredWords: Word[];
  autoVerifyBatchSize: number;
  onAutoVerifyBatchSizeChange: (value: number) => void;
  onStartAutoVerify: () => void;
  autoVerifyDisabled: boolean;
  totalWordCount: number;
  onResetFilters: () => void;
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}) {
  return (
    <label className="inline-flex cursor-pointer items-center rounded-lg border border-gray-200 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-800">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="peer sr-only"
      />
      <div className="peer relative h-6 w-11 rounded-full bg-gray-200 after:absolute after:start-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-blue-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:bg-gray-700 dark:peer-focus:ring-blue-800" />
      <span className="ms-3 text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>
    </label>
  );
}

export default function WordsFilters(props: WordsFiltersProps) {
  const activeFilterCount = [
    props.searchTerm.trim() !== '',
    props.filterLanguage !== 'all',
    props.filterLowDistractors,
    props.filterMissingAudio,
    props.filterPOS !== 'all',
    props.filterVerification !== 'all',
    props.filterDifficulty !== 'all',
    props.sortOrder !== 'none',
  ].filter(Boolean).length;

  return (
    <div className="mb-6 space-y-3">
      <section className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-300">
              <SlidersHorizontal className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100">단어 검색 및 필터</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                전체 {props.totalWordCount}개 중 {props.filteredWords.length}개 표시
              </p>
            </div>
          </div>

          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={props.onResetFilters}
              className="inline-flex items-center justify-center gap-1.5 self-start rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600 transition hover:border-gray-300 hover:bg-gray-50 hover:text-gray-900 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white sm:self-auto"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              필터 초기화
              <span className="rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">
                {activeFilterCount}
              </span>
            </button>
          )}
        </div>

        <div className="relative mt-4">
          <Search className="absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            value={props.searchTerm}
            onChange={(event) => props.onSearchChange(event.target.value)}
            placeholder="단어 또는 한국어·영어 의미 검색"
            aria-label="단어 검색"
            className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:focus:border-blue-500 dark:focus:bg-gray-850 dark:focus:ring-blue-950/50"
          />
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <FilterSelect label="언어" value={props.filterLanguage} onChange={props.onLanguageChange}>
            <option value="all">모든 언어</option>
            {props.languages.map((language) => (
              <option key={language.code} value={language.code}>{language.name_ko}</option>
            ))}
          </FilterSelect>

          <FilterSelect label="품사" value={props.filterPOS} onChange={props.onPOSChange}>
            <option value="all">모든 품사</option>
            {POS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </FilterSelect>

          <FilterSelect
            label="검수 상태"
            value={props.filterVerification}
            onChange={(value) => props.onVerificationChange(value as VerificationFilter)}
          >
            <option value="all">전체 상태</option>
            <option value="verified">검수 완료</option>
            <option value="pending">검수 대기</option>
          </FilterSelect>

          <FilterSelect label="난이도" value={props.filterDifficulty} onChange={props.onDifficultyChange}>
            <option value="all">모든 난이도</option>
            {DIFFICULTY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.value}단계 ({option.label})</option>
            ))}
          </FilterSelect>

          <FilterSelect
            label="정렬"
            value={props.sortOrder}
            onChange={(value) => props.onSortOrderChange(value as SentenceSortOrder)}
          >
            <option value="none">기본 단어순</option>
            <option value="asc">문장 적은 순</option>
            <option value="desc">문장 많은 순</option>
          </FilterSelect>
        </div>

        <div className="mt-4 flex flex-col gap-2 border-t border-gray-100 pt-4 dark:border-gray-800 sm:flex-row sm:flex-wrap">
          <Toggle
            checked={props.filterLowDistractors}
            onChange={props.onLowDistractorsChange}
            label={`오답 부족 (${TARGET_DISTRACTOR_COUNT}개 미만)`}
          />
          <Toggle
            checked={props.filterMissingAudio}
            onChange={props.onMissingAudioChange}
            label="음성 데이터 없음"
          />
        </div>
      </section>

      <section className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100">관리 작업</h2>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              생성 및 자동 검수 작업은 단어 데이터를 변경합니다.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center lg:justify-end">
            <div className="flex min-h-10 flex-wrap items-center gap-2 rounded-lg bg-blue-50 p-1 dark:bg-blue-950/30">
              <label htmlFor="auto-verify-size" className="pl-2 text-xs font-bold text-blue-700 dark:text-blue-300">
                검수 단위
              </label>
              <select
                id="auto-verify-size"
                value={props.autoVerifyBatchSize}
                onChange={(event) => props.onAutoVerifyBatchSizeChange(Number(event.target.value))}
                className="rounded-md border border-blue-100 bg-white px-2 py-1.5 text-xs font-semibold text-gray-900 outline-none focus:ring-2 focus:ring-blue-500 dark:border-blue-900 dark:bg-gray-800 dark:text-gray-100"
              >
                {[5, 10].map((size) => <option key={size} value={size}>{size}개</option>)}
              </select>
              <button
                type="button"
                onClick={props.onStartAutoVerify}
                disabled={props.autoVerifyDisabled}
                className="inline-flex min-h-8 items-center justify-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50"
              >
                <Sparkles className="h-4 w-4" />
                자동 검수
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="block min-w-0">
      <span className="mb-1.5 block text-xs font-semibold text-gray-500 dark:text-gray-400">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm font-medium text-gray-900 outline-none transition-all focus:border-blue-400 focus:ring-4 focus:ring-blue-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:focus:border-blue-500 dark:focus:ring-blue-950/50"
      >
        {children}
      </select>
    </label>
  );
}
