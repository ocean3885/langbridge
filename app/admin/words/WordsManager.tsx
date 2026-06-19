'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Pencil, Trash2, Save, X, Search, Sparkles, ExternalLink, Clipboard, Check } from 'lucide-react';

export interface Language {
  id: number;
  name_en: string;
  name_ko: string;
  code: string;
}

export interface Word {
  id: number;
  word: string;
  lang_code: string;
  pos: string[];
  meaning_ko: Record<string, string[]>;
  meaning_en: Record<string, string[]>;
  gender: string | null;
  declensions: Record<string, any>;
  conjugations: Record<string, any>;
  audio_url: string | null;
  languages?: Language;
  sentence_count?: number;
  distractor_count?: number;
}

const POS_MAP: Record<string, string> = {
  'noun': '명사',
  'verb': '동사',
  'adjective': '형용사',
  'adverb': '부사',
  'pronoun': '대명사',
  'preposition': '전치사',
  'conjunction': '접속사',
  'interjection': '감탄사',
  'article': '관사',
  'determiner': '한정사',
  'numeral': '수사',
  'particle': '조사',
  'auxiliary': '조동사',
  // Abbreviations
  'adj': '형용사',
  'adv': '부사',
  'n': '명사',
  'v': '동사',
  'prep': '전치사',
  'pron': '대명사',
  'conj': '접속사',
  'det': '한정사',
  'adp': '전치사',
  'aux': '조동사',
  'part': '조사',
  'propn': '고유명사',
  'num': '수사',
};

const POS_OPTIONS = [
  { value: 'noun', label: '명사 (Noun)' },
  { value: 'verb', label: '동사 (Verb)' },
  { value: 'adjective', label: '형용사 (Adjective)' },
  { value: 'adverb', label: '부사 (Adverb)' },
  { value: 'pronoun', label: '대명사 (Pronoun)' },
  { value: 'preposition', label: '전치사 (Preposition)' },
  { value: 'conjunction', label: '접속사 (Conjunction)' },
  { value: 'article', label: '관사 (Article)' },
  { value: 'numeral', label: '수사 (Numeral)' },
  { value: 'particle', label: '조사 (Particle)' },
  { value: 'auxiliary', label: '조동사 (Auxiliary)' },
  { value: 'propn', label: '고유명사 (Proper Noun)' },
];

const GENDER_OPTIONS = [
  { value: '', label: '없음 (None)' },
  { value: 'M', label: '남성 (Masculine)' },
  { value: 'F', label: '여성 (Feminine)' },
  { value: 'N', label: '중성 (Neuter)' },
];

const TARGET_DISTRACTOR_COUNT = 6;

function formatPOS(pos: string): string {
  return POS_MAP[pos.toLowerCase()] || pos;
}

function getCanonicalPOS(pos: string): string {
  const p = pos.toLowerCase().trim();
  if (p === 'n' || p === 'noun' || p === 'sustantivo' || p === 'nombre') return 'noun';
  if (p === 'v' || p === 'verb' || p === 'verbo') return 'verb';
  if (p === 'adj' || p === 'adjective' || p === 'adjetivo') return 'adjective';
  if (p === 'adv' || p === 'adverb' || p === 'adverbio') return 'adverb';
  if (p === 'pron' || p === 'pronoun') return 'pronoun';
  if (p === 'prep' || p === 'preposition' || p === 'adp') return 'preposition';
  if (p === 'conj' || p === 'conjunction') return 'conjunction';
  if (p === 'art' || p === 'article' || p === 'det' || p === 'determiner') return 'article';
  if (p === 'num' || p === 'numeral') return 'numeral';
  if (p === 'part' || p === 'particle') return 'particle';
  if (p === 'aux' || p === 'auxiliary') return 'auxiliary';
  if (p === 'propn') return 'propn';
  return p;
}

interface WordsManagerProps {
  initialWords: Word[];
  languages: Language[];
}

function getMeaningDisplay(meaning: any): string {
  if (!meaning) return '-';

  // If it's already a string, return it
  if (typeof meaning === 'string') {
    try {
      const parsed = JSON.parse(meaning);
      return getMeaningDisplay(parsed);
    } catch (e) {
      return meaning;
    }
  }

  // If it's an object, check common keys
  if (typeof meaning === 'object') {
    // Try ko, then en, then any first key
    const val = meaning.ko || meaning.en || Object.values(meaning)[0];
    if (Array.isArray(val)) return val[0] || '-';
    if (typeof val === 'string') return val;
  }

  return '-';
}

export default function WordsManager({ initialWords, languages }: WordsManagerProps) {
  const [words, setWords] = useState<Word[]>(initialWords);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    lang_code: languages[0]?.code || '',
    word: '',
    meaning_ko: '', // UI simplification: will be mapped to meaning.ko
    meaning_en: '', // UI simplification: will be mapped to meaning.en
    gender: '',
    pos_input: '', // UI simplification: comma separated
  });
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLanguage, setFilterLanguage] = useState<string>('all');
  const [filterLowDistractors, setFilterLowDistractors] = useState(false);
  const [filterMissingAudio, setFilterMissingAudio] = useState(false);
  const [filterPOS, setFilterPOS] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | 'none'>('none');
  const [currentPage, setCurrentPage] = useState(1);
  const [isBulkGenerating, setIsBulkGenerating] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0 });
  interface BulkReportDistractor {
    word: string;
    meaning_ko: string | null;
    meaning_en: string | null;
  }
  interface BulkReportItem {
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
  const [bulkReport, setBulkReport] = useState<BulkReportItem[] | null>(null);
  const [bulkBatchId, setBulkBatchId] = useState<string | null>(null);
  const [isBulkReportCopied, setIsBulkReportCopied] = useState(false);
  const [isPublishingBulkReport, setIsPublishingBulkReport] = useState(false);
  const [isSavingBulkReview, setIsSavingBulkReview] = useState(false);
  const [isDiscardingBulkBatch, setIsDiscardingBulkBatch] = useState(false);
  const [pendingBatchCount, setPendingBatchCount] = useState(0);
  const [incompleteBatchCount, setIncompleteBatchCount] = useState(0);
  const itemsPerPage = 100;

  const mapStoredBatchToReport = (batch: any): BulkReportItem[] => {
    const items = Array.isArray(batch?.distractor_generation_items)
      ? batch.distractor_generation_items
      : [];

    return items
      .filter((item: any) => item.status === 'generated' || item.status === 'failed')
      .map((item: any) => {
      const source = item.source_snapshot && typeof item.source_snapshot === 'object'
        ? item.source_snapshot
        : {};
      const reviewedDistractors = item.review_json && Array.isArray(item.review_json.distractors)
        ? item.review_json.distractors
        : null;
      const generated = reviewedDistractors || (Array.isArray(item.generated_json) ? item.generated_json : []);

      return {
        itemId: item.id ?? null,
        id: Number(item.word_id),
        word: String(source.word ?? `단어 #${item.word_id}`),
        lang_code: String(source.lang_code ?? ''),
        pos: Array.isArray(source.pos) ? source.pos.map(String) : [],
        meaning_ko: source.meaning_ko && typeof source.meaning_ko === 'object' ? source.meaning_ko : {},
        meaning_en: source.meaning_en && typeof source.meaning_en === 'object' ? source.meaning_en : {},
        previousDistractorCount: Number(source.distractor_count ?? 0),
        distractors: generated.map((d: any) => ({
          word: String(d.word ?? ''),
          meaning_ko: typeof d.meaning_ko === 'string' ? d.meaning_ko : null,
          meaning_en: typeof d.meaning_en === 'string' ? d.meaning_en : null,
        })),
        status: item.status === 'failed' ? 'failed' as const : 'success' as const,
        reviewed: item.review_json?.reviewed === true,
        error: item.error_message || undefined,
      };
    });
  };

  const fetchPendingBatches = async () => {
    const response = await fetch('/api/admin/words/distractor-batches');
    if (!response.ok) return [];
    const batches = await response.json();
    return Array.isArray(batches) ? batches : [];
  };

  const refreshPendingBatchCount = async () => {
    const [pendingBatches, incompleteResponse] = await Promise.all([
      fetchPendingBatches(),
      fetch('/api/admin/words/distractor-batches?scope=incomplete'),
    ]);
    setPendingBatchCount(pendingBatches.length);

    if (incompleteResponse.ok) {
      const incompleteBatches = await incompleteResponse.json();
      setIncompleteBatchCount(Array.isArray(incompleteBatches) ? incompleteBatches.length : 0);
    }
  };

  const handleLoadPendingBatch = async () => {
    try {
      const batches = await fetchPendingBatches();
      const latestBatch = batches[0];
      if (!latestBatch) {
        setPendingBatchCount(0);
        alert('검수 대기 중인 생성 배치가 없습니다.');
        return;
      }

      setBulkBatchId(latestBatch.id);
      setBulkReport(mapStoredBatchToReport(latestBatch));
      setPendingBatchCount(batches.length);
    } catch (error) {
      alert(error instanceof Error ? error.message : '검수 대기 배치를 불러오지 못했습니다.');
    }
  };

  useEffect(() => {
    void refreshPendingBatchCount();
  }, []);

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
    return matchesSearch && matchesLanguage && matchesLowDistractors && matchesMissingAudio && matchesPOS;
  });

  const sortedWords = [...filteredWords].sort((a, b) => {
    if (sortOrder === 'none') return 0;
    const countA = a.sentence_count || 0;
    const countB = b.sentence_count || 0;
    return sortOrder === 'asc' ? countA - countB : countB - countA;
  });

  const paginatedWords = sortedWords.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  const totalPages = Math.ceil(filteredWords.length / itemsPerPage);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const handleFilterLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilterLanguage(e.target.value);
    setCurrentPage(1);
  };

  const toggleLowDistractorsFilter = () => {
    setFilterLowDistractors(!filterLowDistractors);
    setCurrentPage(1);
  };

  const toggleMissingAudioFilter = () => {
    setFilterMissingAudio(!filterMissingAudio);
    setCurrentPage(1);
  };


  const handleUpdate = async (id: number) => {
    if (!formData.word || !formData.meaning_ko || !formData.lang_code) {
      alert('단어, 의미, 언어를 모두 입력해주세요.');
      return;
    }

    setLoading(true);
    try {
      const posList = formData.pos_input ? formData.pos_input.split(',').map(s => s.trim()) : [];
      const primaryPos = posList.length > 0 ? posList[0].toLowerCase() : 'general';
      const meaningKoArray = [formData.meaning_ko.trim()].filter(Boolean);
      const meaningEnArray = [formData.meaning_en.trim()].filter(Boolean);

      const res = await fetch('/api/admin/words', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          word: formData.word,
          lang_code: formData.lang_code,
          meaning_ko: { [primaryPos]: meaningKoArray },
          meaning_en: { [primaryPos]: meaningEnArray },
          gender: formData.gender || null,
          pos: posList,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || '단어 수정 실패');
      }

      const updatedWord = await res.json();
      setWords(words.map(word => word.id === id ? updatedWord : word));
      setEditingId(null);
      setFormData({
        lang_code: languages[0]?.code || '',
        word: '',
        meaning_ko: '',
        meaning_en: '',
        gender: '',
        pos_input: '',
      });
      alert('단어가 수정되었습니다.');
    } catch (error) {
      alert(error instanceof Error ? error.message : '단어 수정 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('정말 이 단어를 삭제하시겠습니까?')) {
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/admin/words?id=${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || '단어 삭제 실패');
      }

      setWords(words.filter(word => word.id !== id));
      alert('단어가 삭제되었습니다.');
    } catch (error) {
      alert(error instanceof Error ? error.message : '단어 삭제 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (word: Word) => {
    setEditingId(word.id);
    setFormData({
      lang_code: word.lang_code,
      word: word.word,
      meaning_ko: word.meaning_ko.ko?.[0] || '',
      meaning_en: word.meaning_en.en?.[0] || '',
      gender: word.gender || '',
      pos_input: word.pos.join(', '),
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setFormData({
      lang_code: languages[0]?.code || '',
      word: '',
      meaning_ko: '',
      meaning_en: '',
      gender: '',
      pos_input: '',
    });
  };

  const handleBulkGenerateDistractors = async () => {
    if (incompleteBatchCount > 0) {
      alert('미완료 오답 생성 배치를 먼저 검수하고 승인·반영해주세요.');
      return;
    }

    const wordsToGenerate = filteredWords.filter(
      w => (w.distractor_count ?? 0) < TARGET_DISTRACTOR_COUNT
    );
    if (wordsToGenerate.length === 0) {
      alert('오답 개수가 부족한 단어가 없습니다.');
      return;
    }

    if (!confirm(`총 ${wordsToGenerate.length}개 단어에 대해 새로운 오답 ${TARGET_DISTRACTOR_COUNT}개씩 생성하시겠습니까?\n기존 오답은 검수 중에는 유지되며, 승인 완료 시 새 ${TARGET_DISTRACTOR_COUNT}개로 전체 교체됩니다.`)) {
      return;
    }

    setIsBulkGenerating(true);
    setBulkProgress({ current: 0, total: wordsToGenerate.length });
    setBulkReport(null);
    setBulkBatchId(null);

    const reportItems: BulkReportItem[] = [];
    let batchId: string;

    try {
      const batchResponse = await fetch('/api/admin/words/distractor-batches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ totalCount: wordsToGenerate.length }),
      });
      const batchData = await batchResponse.json();
      if (!batchResponse.ok || !batchData?.id) {
        throw new Error(batchData?.error || '생성 배치를 만들 수 없습니다.');
      }
      batchId = batchData.id;
      setBulkBatchId(batchId);
    } catch (error) {
      setIsBulkGenerating(false);
      alert(error instanceof Error ? error.message : '생성 배치를 만들 수 없습니다.');
      return;
    }

    for (let i = 0; i < wordsToGenerate.length; i++) {
      const word = wordsToGenerate[i];

      try {
        const res = await fetch('/api/admin/words/generate-distractors', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            batchId,
            wordId: word.id,
            count: TARGET_DISTRACTOR_COUNT,
          }),
        });

        const generatedItem = await res.json();
        if (!res.ok) {
          throw new Error(generatedItem?.error || '오답 생성 요청에 실패했습니다.');
        }

        const generatedDistractors: BulkReportDistractor[] = Array.isArray(generatedItem?.generated_json)
          ? generatedItem.generated_json.map((d: any) => ({
              word: String(d.word ?? ''),
              meaning_ko: typeof d.meaning_ko === 'string' ? d.meaning_ko : null,
              meaning_en: typeof d.meaning_en === 'string' ? d.meaning_en : null,
            }))
          : [];

        reportItems.push({
          itemId: generatedItem.id,
          id: word.id,
          word: word.word,
          lang_code: word.lang_code,
          pos: word.pos,
          meaning_ko: word.meaning_ko,
          meaning_en: word.meaning_en,
          previousDistractorCount: word.distractor_count ?? 0,
          distractors: generatedDistractors,
          status: 'success',
          reviewed: false,
        });
      } catch (error: any) {
        console.error(`Failed to generate distractors for word id ${word.id}:`, error);

        reportItems.push({
          itemId: null,
          id: word.id,
          word: word.word,
          lang_code: word.lang_code,
          pos: word.pos,
          meaning_ko: word.meaning_ko,
          meaning_en: word.meaning_en,
          previousDistractorCount: word.distractor_count ?? 0,
          distractors: [],
          status: 'failed',
          reviewed: false,
          error: error.message || '알 수 없는 오류',
        });
      }

      setBulkProgress(prev => ({ ...prev, current: i + 1 }));
    }

    try {
      const finalizeResponse = await fetch('/api/admin/words/distractor-batches', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batchId, action: 'finalize' }),
      });
      const finalizeData = await finalizeResponse.json();
      if (!finalizeResponse.ok) {
        throw new Error(finalizeData?.error || '생성 배치 완료 처리에 실패했습니다.');
      }
    } catch (error) {
      console.error('Failed to finalize distractor generation batch:', error);
      alert(error instanceof Error ? error.message : '생성 배치 완료 처리에 실패했습니다.');
    }

    setIsBulkGenerating(false);
    try {
      const storedBatchResponse = await fetch(`/api/admin/words/distractor-batches?batchId=${batchId}`);
      const storedBatches = await storedBatchResponse.json();
      const storedBatch = Array.isArray(storedBatches) ? storedBatches[0] : null;
      setBulkReport(storedBatch ? mapStoredBatchToReport(storedBatch) : reportItems);
    } catch {
      setBulkReport(reportItems);
    }
    void refreshPendingBatchCount();
  };

  const updateBulkDistractor = (
    itemId: string,
    distractorIndex: number,
    patch: Partial<BulkReportDistractor>
  ) => {
    setBulkReport(current => current?.map(item => (
      item.itemId === itemId
        ? {
            ...item,
            distractors: item.distractors.map((distractor, index) => (
              index === distractorIndex ? { ...distractor, ...patch } : distractor
            )),
          }
        : item
    )) ?? null);
  };

  const setBulkWordReviewed = (itemId: string, reviewed: boolean) => {
    setBulkReport(current => current?.map(item => (
      item.itemId === itemId ? { ...item, reviewed } : item
    )) ?? null);
  };

  const buildBulkReviewItems = (report: BulkReportItem[]) => (
    report
      .filter(item => item.itemId)
      .map(item => ({
        item_id: item.itemId,
        reviewed: item.reviewed,
        distractors: item.distractors,
      }))
  );

  const handleSaveBulkReview = async () => {
    if (!bulkReport || !bulkBatchId) return;

    setIsSavingBulkReview(true);
    try {
      const response = await fetch('/api/admin/words/distractor-batches', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          batchId: bulkBatchId,
          action: 'save_review',
          items: buildBulkReviewItems(bulkReport),
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result?.error || '검수 내용 저장에 실패했습니다.');
      }
      alert('검수 내용을 저장했습니다.');
    } catch (error) {
      alert(error instanceof Error ? error.message : '검수 내용 저장 중 오류가 발생했습니다.');
    } finally {
      setIsSavingBulkReview(false);
    }
  };

  const handlePublishBulkReport = async () => {
    if (!bulkReport || !bulkBatchId) return;

    const reviewedItems = bulkReport.filter(item => item.status === 'success' && item.reviewed);
    if (reviewedItems.length === 0) {
      alert('검수 완료한 단어를 하나 이상 선택해주세요.');
      return;
    }

    const invalidItems = reviewedItems.filter(item => (
      item.distractors.length !== TARGET_DISTRACTOR_COUNT ||
      item.distractors.some(distractor => (
        !distractor.word.trim() ||
        !distractor.meaning_ko?.trim() ||
        !distractor.meaning_en?.trim()
      ))
    ));
    if (invalidItems.length > 0) {
      alert(`다음 단어는 오답 ${TARGET_DISTRACTOR_COUNT}개와 모든 뜻을 채워야 합니다.\n${invalidItems.map(item => item.word).join('\n')}`);
      return;
    }

    if (!confirm(`${reviewedItems.length}개 단어의 기존 오답을 삭제하고 새 오답 ${TARGET_DISTRACTOR_COUNT}개씩 등록하시겠습니까?`)) {
      return;
    }

    setIsPublishingBulkReport(true);
    try {
      const response = await fetch('/api/admin/words/distractor-batches', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          batchId: bulkBatchId,
          action: 'publish_items',
          items: reviewedItems.map(item => ({
            item_id: item.itemId,
            distractors: item.distractors,
          })),
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result?.error || '승인 오답 반영에 실패했습니다.');
      }

      const wordsResponse = await fetch('/api/admin/words');
      if (wordsResponse.ok) {
        setWords(await wordsResponse.json());
      }

      alert(`${result.replacedWordCount ?? 0}개 단어의 오답을 등록했습니다.`);
      if (result.batchCompleted) {
        setBulkReport(null);
        setBulkBatchId(null);
      } else {
        const publishedIds = new Set(reviewedItems.map(item => item.itemId));
        setBulkReport(current => current?.filter(item => !publishedIds.has(item.itemId)) ?? null);
      }
      void refreshPendingBatchCount();
    } catch (error) {
      alert(error instanceof Error ? error.message : '승인 오답 반영 중 오류가 발생했습니다.');
    } finally {
      setIsPublishingBulkReport(false);
    }
  };

  const handleDiscardBulkBatch = async () => {
    if (!bulkBatchId || !bulkReport) return;
    const pendingWordCount = bulkReport.filter(item => item.status === 'success').length;
    if (!confirm(
      `남은 검수 단어 ${pendingWordCount}개를 등록하지 않고 배치를 폐기하시겠습니까?\n` +
      '현재 등록된 기존 오답 데이터는 변경되지 않으며, 부족한 단어는 다음 일괄 생성 대상에 다시 포함됩니다.'
    )) {
      return;
    }

    setIsDiscardingBulkBatch(true);
    try {
      const response = await fetch('/api/admin/words/distractor-batches', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          batchId: bulkBatchId,
          action: 'discard',
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result?.error || '생성 배치 폐기에 실패했습니다.');
      }

      alert(`배치를 폐기했습니다. 미등록 생성 단어 ${result.discardedItemCount ?? 0}개를 제외했습니다.`);
      setBulkReport(null);
      setBulkBatchId(null);
      void refreshPendingBatchCount();
    } catch (error) {
      alert(error instanceof Error ? error.message : '생성 배치 폐기 중 오류가 발생했습니다.');
    } finally {
      setIsDiscardingBulkBatch(false);
    }
  };

  const handleCopyBulkReportForChatGPT = async () => {
    if (!bulkReport) return;

    const reviewData = bulkReport.map((item) => ({
      word_id: item.id,
      source: {
        word: item.word,
        language: item.lang_code,
        pos: item.pos,
        meaning_ko: item.meaning_ko,
        meaning_en: item.meaning_en,
        previous_distractor_count: item.previousDistractorCount,
      },
      generation_status: item.status,
      error: item.error ?? null,
      generated_distractors: item.distractors,
    }));

    const prompt = `아래는 어학 학습 서비스에서 AI로 생성한 오답 선택지(distractor) 결과입니다.
각 원본 단어와 생성된 오답을 검수해주세요.

검수 기준:
1. 오답 단어가 실제 ${reviewData.some(item => item.source.language === 'es') ? '스페인어' : '해당 언어'} 단어 또는 자연스러운 어구인지
2. 원본 단어와 완전히 같거나 사실상 동일한 활용형이 포함되지 않았는지
3. 같은 원본 단어 안에서 오답이 중복되지 않았는지
4. 오답의 한국어/영어 뜻이 정확하고 서로 일치하는지
5. 퀴즈 오답으로 쓰기에 지나치게 무관하거나, 반대로 정답으로도 인정될 정도로 의미가 같은 항목이 없는지
6. 철자 오류, 잘못된 성·수·품사, 부자연스러운 표현이 없는지
7. 생성 실패 항목이 있다면 오류 내역도 함께 요약할 것
8. 각 원본 단어는 최종적으로 정확히 ${TARGET_DISTRACTOR_COUNT}개의 오답으로 기존 데이터를 전체 교체할 예정임

문제가 있는 단어만 아래 형식으로 줄바꿈하여 작성해주세요.

[문제 단어] 원본 단어 (word_id: ID)

- 문제 오답: 오답 단어
  문제: 무엇이 잘못되었는지 간단하고 명확하게 설명
  권장 수정: 스페인어 단어 / 한국어 뜻 / 영어 뜻

한 원본 단어에 문제가 여러 개 있으면 같은 [문제 단어] 아래에 이어서 작성해주세요.

마지막에는 아래 형식으로 요약해주세요.

[요약]
전체 단어: N개
정상 단어: N개
문제 단어: N개
주요 문제: 문제 유형과 개수

표, JSON, 코드 블록은 사용하지 마세요.
문제가 전혀 없으면 "검수 결과 이상 없음"이라고만 작성해주세요.

검수 데이터:
\`\`\`json
${JSON.stringify(reviewData, null, 2)}
\`\`\``;

    try {
      await navigator.clipboard.writeText(prompt);
      setIsBulkReportCopied(true);
      window.setTimeout(() => setIsBulkReportCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy bulk report:', error);
      alert('클립보드 복사에 실패했습니다.');
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

        {/* 검색 및 필터 */}
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-md p-4 mb-6 border border-gray-100 dark:border-gray-800">
          <div className="grid grid-cols-1 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={searchTerm}
                onChange={handleSearchChange}
                placeholder="단어 또는 의미 검색..."
                className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              />
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-4">
              <label className="inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={filterLowDistractors}
                  onChange={toggleLowDistractorsFilter}
                  className="sr-only peer"
                />
                <div className="relative w-11 h-6 bg-gray-200 dark:bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                <span className="ms-3 text-sm font-medium text-gray-700 dark:text-gray-300">
                  오답 개수 부족 ({TARGET_DISTRACTOR_COUNT}개 미만)
                </span>
              </label>

              {filterLowDistractors && filteredWords.some(
                w => (w.distractor_count ?? 0) < TARGET_DISTRACTOR_COUNT
              ) && (
                <button
                  onClick={handleBulkGenerateDistractors}
                  disabled={isBulkGenerating || incompleteBatchCount > 0}
                  title={incompleteBatchCount > 0 ? '미완료 배치를 먼저 검수·반영해주세요.' : undefined}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  {isBulkGenerating
                    ? '생성 중...'
                    : incompleteBatchCount > 0
                      ? '검수 완료 후 생성 가능'
                      : '오답 일괄 생성'}
                </button>
              )}

              {pendingBatchCount > 0 && (
                <button
                  onClick={handleLoadPendingBatch}
                  disabled={isBulkGenerating}
                  className="px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-800 dark:bg-amber-950/40 dark:hover:bg-amber-950/60 dark:text-amber-300 text-xs font-semibold rounded-lg shadow-sm transition disabled:opacity-50"
                >
                  검수 대기 배치 {pendingBatchCount}건
                </button>
              )}

              <label className="inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={filterMissingAudio}
                  onChange={toggleMissingAudioFilter}
                  className="sr-only peer"
                />
                <div className="relative w-11 h-6 bg-gray-200 dark:bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                <span className="ms-3 text-sm font-medium text-gray-700 dark:text-gray-300">음성 데이터 없음</span>
              </label>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500 font-medium whitespace-nowrap">품사 필터:</span>
                <select
                  value={filterPOS}
                  onChange={(e) => {
                    setFilterPOS(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none transition-all bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                >
                  <option value="all">모든 품사</option>
                  {POS_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500 font-medium whitespace-nowrap">문장 수 정렬:</span>
                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value as any)}
                  className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none transition-all bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                >
                  <option value="none">기본(최신순)</option>
                  <option value="asc">문장 적은 순</option>
                  <option value="desc">문장 많은 순</option>
                </select>
              </div>
            </div>
          </div>
        </div>


        {/* 단어 목록 (카드 그리드) */}
        {filteredWords.length === 0 ? (
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 py-16 text-center text-gray-500">
            {searchTerm || filterLanguage !== 'all' || filterLowDistractors || filterMissingAudio || filterPOS !== 'all' ? '검색 결과가 없습니다.' : '등록된 단어가 없습니다.'}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {paginatedWords.map((word) => (
              <div key={word.id} className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 hover:shadow-md transition-all duration-200 overflow-hidden group relative">
                {editingId === word.id ? (
                  <div className="p-4 space-y-3">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={formData.word}
                        onChange={(e) => setFormData({ ...formData, word: e.target.value })}
                        placeholder="단어"
                        className="w-full px-2 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-medium bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                      />
                    </div>
                    <input
                      type="text"
                      value={formData.meaning_ko}
                      onChange={(e) => setFormData({ ...formData, meaning_ko: e.target.value })}
                      placeholder="의미 (한국어)"
                      className="w-full px-2 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    />
                    <input
                      type="text"
                      value={formData.meaning_en}
                      onChange={(e) => setFormData({ ...formData, meaning_en: e.target.value })}
                      placeholder="Meaning (English)"
                      className="w-full px-2 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    />
                    <div className="flex gap-2">
                      <select
                        value={formData.gender}
                        onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                        className="w-32 px-2 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                      >
                        {GENDER_OPTIONS.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label.split(' ')[0]}</option>
                        ))}
                      </select>
                      <select
                        value={formData.pos_input.split(',')[0].trim().toLowerCase()}
                        onChange={(e) => setFormData({ ...formData, pos_input: e.target.value })}
                        className="flex-1 px-2 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                      >
                        <option value="">품사 선택</option>
                        {POS_OPTIONS.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label.split(' ')[0]}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex justify-end gap-2 pt-2 border-t border-gray-50 dark:border-gray-800">
                      <button
                        onClick={() => handleUpdate(word.id)}
                        disabled={loading}
                        className="p-1.5 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                        title="저장"
                      >
                        <Save className="w-5 h-5" />
                      </button>
                      <button
                        onClick={cancelEdit}
                        disabled={loading}
                        className="p-1.5 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors"
                        title="취소"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <Link href={`/admin/words/${word.id}`} className="block p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex flex-wrap gap-1.5">
                          <span className="bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider">
                            {word.lang_code}
                          </span>
                          {word.pos.map((p, idx) => (
                            <span key={idx} className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded-full text-[10px] font-medium">
                              {formatPOS(p)}
                            </span>
                          ))}
                        </div>
                        {/* Space for the delete button */}
                        <div className="w-6 h-6" />
                      </div>

                      <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-1 flex items-baseline gap-2">
                        {word.word}
                        {word.gender && word.gender !== 'null' && (
                          <span className="text-xs font-normal text-gray-400">({word.gender})</span>
                        )}
                      </h3>

                      <div className="space-y-0.5">
                        <p className="text-sm text-gray-600 dark:text-gray-300 font-medium">
                          {getMeaningDisplay(word.meaning_ko)}
                        </p>
                        <p className="text-[11px] text-gray-400 italic">
                          {getMeaningDisplay(word.meaning_en)}
                        </p>
                      </div>

                      <div className="mt-3 pt-3 border-t border-gray-50 dark:border-gray-800 flex items-center justify-between text-[10px] text-gray-400">
                        <div className="flex gap-2">
                          <span>ID: {word.id}</span>
                          <span>•</span>
                          <span className="text-blue-500 dark:text-blue-400 font-medium">문장 {word.sentence_count || 0}</span>
                          <span>•</span>
                          <span className={`${(word.distractor_count ?? 0) < TARGET_DISTRACTOR_COUNT ? 'text-red-500 font-bold' : 'text-gray-400 dark:text-gray-500'}`}>
                            오답 {word.distractor_count || 0}
                          </span>
                        </div>
                      </div>
                    </Link>

                    <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-all">
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleDelete(word.id);
                        }}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        title="삭제"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </>
                )}
              </div>
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
          전체 {words.length}개 중 {filteredWords.length}개 표시 ({(currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, filteredWords.length)})
        </div>
      </div>

      {isBulkGenerating && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-8 shadow-xl max-w-md w-full border border-gray-100 dark:border-gray-800 space-y-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white text-center">오답 일괄 생성 중</h3>
            <div className="w-full bg-gray-200 dark:bg-gray-700 h-2.5 rounded-full overflow-hidden">
              <div
                className="bg-blue-600 h-full transition-all duration-300"
                style={{ width: `${(bulkProgress.current / bulkProgress.total) * 100}%` }}
              />
            </div>
            <p className="text-sm font-semibold text-gray-650 dark:text-gray-400 text-center">
              {bulkProgress.current} / {bulkProgress.total} 단어 완료
            </p>
            <p className="text-xs text-gray-400 text-center leading-relaxed">
              API 요청 한도와 타임아웃을 조절하기 위해 단어별로 순차 처리 중입니다. 완료될 때까지 브라우저 창을 닫지 마세요.
            </p>
          </div>
        </div>
      )}

      {bulkReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-xl max-w-3xl w-full border border-gray-100 dark:border-gray-800 flex flex-col max-h-[85vh]">
            <div className="flex justify-between items-center pb-4 border-b border-gray-100 dark:border-gray-800">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-blue-500" />
                오답 생성 검수
              </h3>
              <button
                onClick={() => setBulkReport(null)}
                className="p-1.5 text-gray-400 hover:text-gray-650 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-3 border-b border-gray-100 dark:border-gray-800 flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                오답 {TARGET_DISTRACTOR_COUNT}개와 뜻을 확인·수정한 뒤, 문제가 없는 단어를 체크하고 등록하세요. 등록한 단어는 이 목록에서 사라집니다.
              </p>
              <span className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 dark:bg-blue-950/30 dark:text-blue-300">
                검수 완료 {bulkReport.filter(item => item.reviewed).length} / {bulkReport.filter(item => item.status === 'success').length}
              </span>
            </div>
            
            <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
              <div className="grid grid-cols-1 divide-y divide-gray-150 dark:divide-gray-800">
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
                              <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
                                item.reviewed
                                  ? 'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-300'
                                  : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-300'
                              }`}>
                                {item.reviewed ? '검수 완료' : '검수 필요'}
                              </span>
                            )}
                        <span className="text-[11px] text-amber-600 dark:text-amber-400">
                              기존 {item.previousDistractorCount}개 → 등록 시 새 {TARGET_DISTRACTOR_COUNT}개
                        </span>
                      </div>
                          <p className="mt-1 text-xs text-gray-500">
                            원본 뜻: {getMeaningDisplay(item.meaning_en)}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {item.status === 'success' ? (
                        item.distractors.length > 0 ? (
                          <>
                            <div className="hidden grid-cols-[minmax(110px,1fr)_minmax(130px,1.4fr)_minmax(130px,1.4fr)] gap-2 px-2 text-[10px] font-black uppercase tracking-wide text-gray-400 md:grid">
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
                                onChange={(event) => item.itemId && updateBulkDistractor(item.itemId, idx, { word: event.target.value })}
                                className="min-w-0 px-2 py-1.5 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs font-semibold text-gray-800 dark:text-gray-100"
                                placeholder="오답 단어"
                              />
                              <input
                                value={dist.meaning_ko ?? ''}
                                onChange={(event) => item.itemId && updateBulkDistractor(item.itemId, idx, { meaning_ko: event.target.value })}
                                className="min-w-0 px-2 py-1.5 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs text-gray-700 dark:text-gray-200"
                                placeholder="한국어 뜻"
                              />
                              <input
                                value={dist.meaning_en ?? ''}
                                onChange={(event) => item.itemId && updateBulkDistractor(item.itemId, idx, { meaning_en: event.target.value })}
                                className="min-w-0 px-2 py-1.5 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs text-gray-700 dark:text-gray-200"
                                placeholder="English meaning"
                              />
                            </div>
                            ))}
                          </>
                        ) : (
                          <span className="text-xs text-gray-400">생성된 오답 없음 (이미 충족되었을 수 있음)</span>
                        )
                      ) : (
                        <span className="rounded-lg border border-red-200/50 bg-red-50 px-3 py-2 text-xs font-medium text-red-600 dark:bg-red-950/20 dark:text-red-400">
                          생성 실패: {item.error}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-gray-100 dark:border-gray-800 flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs font-bold text-gray-500 dark:text-gray-400">
                선택한 단어 {bulkReport.filter(item => item.reviewed).length}개
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
                onClick={handleCopyBulkReportForChatGPT}
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
                onClick={handleSaveBulkReview}
                disabled={isSavingBulkReview || isPublishingBulkReport || isDiscardingBulkBatch}
                className="px-5 py-2 bg-amber-100 hover:bg-amber-200 dark:bg-amber-950/40 dark:hover:bg-amber-950/60 text-amber-800 dark:text-amber-300 rounded-xl text-sm font-bold shadow-sm transition-all disabled:opacity-50"
              >
                {isSavingBulkReview ? '저장 중...' : '검수 내용 저장'}
              </button>
              <button
                onClick={handlePublishBulkReport}
                disabled={
                  isPublishingBulkReport ||
                  isSavingBulkReview ||
                  isDiscardingBulkBatch ||
                  bulkReport.filter(item => item.reviewed).length === 0
                }
                className="px-5 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-bold shadow-sm transition-all disabled:opacity-50"
              >
                {isPublishingBulkReport
                  ? '등록 중...'
                  : `${bulkReport.filter(item => item.reviewed).length}개 완료 및 등록`}
              </button>
              <button
                onClick={() => setBulkReport(null)}
                disabled={isPublishingBulkReport || isDiscardingBulkBatch}
                className="px-5 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-750 dark:text-gray-300 rounded-xl text-sm font-bold shadow-sm transition-all"
              >
                닫기
              </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
