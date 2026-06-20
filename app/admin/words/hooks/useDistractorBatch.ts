'use client';

import { useEffect, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { BulkReportDistractor, BulkReportItem } from '../BulkReportModal';
import type { Word } from '../words.types';
import { TARGET_DISTRACTOR_COUNT } from '../words.constants';

interface UseDistractorBatchOptions {
  filteredWords: Word[];
  setWords: Dispatch<SetStateAction<Word[]>>;
}

function mapStoredBatchToReport(batch: any): BulkReportItem[] {
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
        distractors: generated.map((distractor: any) => ({
          word: String(distractor.word ?? ''),
          meaning_ko: typeof distractor.meaning_ko === 'string' ? distractor.meaning_ko : null,
          meaning_en: typeof distractor.meaning_en === 'string' ? distractor.meaning_en : null,
        })),
        status: item.status === 'failed' ? 'failed' as const : 'success' as const,
        reviewed: item.review_json?.reviewed === true,
        error: item.error_message || undefined,
      };
    });
}

export function useDistractorBatch({ filteredWords, setWords }: UseDistractorBatchOptions) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [report, setReport] = useState<BulkReportItem[] | null>(null);
  const [batchId, setBatchId] = useState<string | null>(null);
  const [isReportCopied, setIsReportCopied] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isSavingReview, setIsSavingReview] = useState(false);
  const [isDiscarding, setIsDiscarding] = useState(false);
  const [pendingBatchCount, setPendingBatchCount] = useState(0);
  const [incompleteBatchCount, setIncompleteBatchCount] = useState(0);

  const fetchPendingBatches = async () => {
    const response = await fetch('/api/admin/words/distractor-batches');
    if (!response.ok) return [];
    const batches = await response.json();
    return Array.isArray(batches) ? batches : [];
  };

  const refreshBatchCounts = async () => {
    const response = await fetch('/api/admin/words/distractor-batches?scope=counts');
    if (!response.ok) return;

    const counts = await response.json();
    setPendingBatchCount(Number(counts.pendingCount) || 0);
    setIncompleteBatchCount(Number(counts.incompleteCount) || 0);
  };

  useEffect(() => {
    void refreshBatchCounts();
  }, []);

  const loadPendingBatch = async () => {
    try {
      const batches = await fetchPendingBatches();
      const latestBatch = batches[0];
      if (!latestBatch) {
        setPendingBatchCount(0);
        alert('검수 대기 중인 생성 배치가 없습니다.');
        return;
      }

      setBatchId(latestBatch.id);
      setReport(mapStoredBatchToReport(latestBatch));
      setPendingBatchCount(batches.length);
    } catch (error) {
      alert(error instanceof Error ? error.message : '검수 대기 배치를 불러오지 못했습니다.');
    }
  };

  const generate = async () => {
    if (incompleteBatchCount > 0) {
      alert('미완료 오답 생성 배치를 먼저 검수하고 승인·반영해주세요.');
      return;
    }

    const wordsToGenerate = filteredWords.filter(
      (word) => (word.distractor_count ?? 0) < TARGET_DISTRACTOR_COUNT
    );
    if (wordsToGenerate.length === 0) {
      alert('오답 개수가 부족한 단어가 없습니다.');
      return;
    }

    if (!confirm(`총 ${wordsToGenerate.length}개 단어에 대해 새로운 오답 ${TARGET_DISTRACTOR_COUNT}개씩 생성하시겠습니까?\n기존 오답은 검수 중에는 유지되며, 승인 완료 시 새 ${TARGET_DISTRACTOR_COUNT}개로 전체 교체됩니다.`)) {
      return;
    }

    setIsGenerating(true);
    setProgress({ current: 0, total: wordsToGenerate.length });
    setReport(null);
    setBatchId(null);

    const reportItems: BulkReportItem[] = [];
    let createdBatchId: string;

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
      createdBatchId = batchData.id;
      setBatchId(createdBatchId);
    } catch (error) {
      setIsGenerating(false);
      alert(error instanceof Error ? error.message : '생성 배치를 만들 수 없습니다.');
      return;
    }

    for (let index = 0; index < wordsToGenerate.length; index += 1) {
      const word = wordsToGenerate[index];
      try {
        const response = await fetch('/api/admin/words/generate-distractors', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            batchId: createdBatchId,
            wordId: word.id,
            count: TARGET_DISTRACTOR_COUNT,
          }),
        });
        const generatedItem = await response.json();
        if (!response.ok) {
          throw new Error(generatedItem?.error || '오답 생성 요청에 실패했습니다.');
        }

        const distractors: BulkReportDistractor[] = Array.isArray(generatedItem?.generated_json)
          ? generatedItem.generated_json.map((item: any) => ({
              word: String(item.word ?? ''),
              meaning_ko: typeof item.meaning_ko === 'string' ? item.meaning_ko : null,
              meaning_en: typeof item.meaning_en === 'string' ? item.meaning_en : null,
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
          distractors,
          status: 'success',
          reviewed: false,
        });
      } catch (error) {
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
          error: error instanceof Error ? error.message : '알 수 없는 오류',
        });
      }
      setProgress((current) => ({ ...current, current: index + 1 }));
    }

    try {
      const finalizeResponse = await fetch('/api/admin/words/distractor-batches', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batchId: createdBatchId, action: 'finalize' }),
      });
      const finalizeData = await finalizeResponse.json();
      if (!finalizeResponse.ok) {
        throw new Error(finalizeData?.error || '생성 배치 완료 처리에 실패했습니다.');
      }
    } catch (error) {
      console.error('Failed to finalize distractor generation batch:', error);
      alert(error instanceof Error ? error.message : '생성 배치 완료 처리에 실패했습니다.');
    }

    setIsGenerating(false);
    try {
      const response = await fetch(`/api/admin/words/distractor-batches?batchId=${createdBatchId}`);
      const batches = await response.json();
      const storedBatch = Array.isArray(batches) ? batches[0] : null;
      setReport(storedBatch ? mapStoredBatchToReport(storedBatch) : reportItems);
    } catch {
      setReport(reportItems);
    }
    void refreshBatchCounts();
  };

  const updateDistractor = (
    itemId: string,
    distractorIndex: number,
    patch: Partial<BulkReportDistractor>
  ) => {
    setReport((current) => current?.map((item) => (
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

  const setWordReviewed = (itemId: string, reviewed: boolean) => {
    setReport((current) => current?.map((item) => (
      item.itemId === itemId ? { ...item, reviewed } : item
    )) ?? null);
  };

  const saveReview = async () => {
    if (!report || !batchId) return;
    setIsSavingReview(true);
    try {
      const response = await fetch('/api/admin/words/distractor-batches', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          batchId,
          action: 'save_review',
          items: report.filter((item) => item.itemId).map((item) => ({
            item_id: item.itemId,
            reviewed: item.reviewed,
            distractors: item.distractors,
          })),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result?.error || '검수 내용 저장에 실패했습니다.');
      alert('검수 내용을 저장했습니다.');
    } catch (error) {
      alert(error instanceof Error ? error.message : '검수 내용 저장 중 오류가 발생했습니다.');
    } finally {
      setIsSavingReview(false);
    }
  };

  const publish = async () => {
    if (!report || !batchId) return;
    const reviewedItems = report.filter((item) => item.status === 'success' && item.reviewed);
    if (reviewedItems.length === 0) {
      alert('검수 완료한 단어를 하나 이상 선택해주세요.');
      return;
    }

    const invalidItems = reviewedItems.filter((item) => (
      item.distractors.length !== TARGET_DISTRACTOR_COUNT ||
      item.distractors.some((distractor) => (
        !distractor.word.trim() ||
        !distractor.meaning_ko?.trim() ||
        !distractor.meaning_en?.trim()
      ))
    ));
    if (invalidItems.length > 0) {
      alert(`다음 단어는 오답 ${TARGET_DISTRACTOR_COUNT}개와 모든 뜻을 채워야 합니다.\n${invalidItems.map((item) => item.word).join('\n')}`);
      return;
    }

    if (!confirm(`${reviewedItems.length}개 단어의 기존 오답을 삭제하고 새 오답 ${TARGET_DISTRACTOR_COUNT}개씩 등록하시겠습니까?`)) {
      return;
    }

    setIsPublishing(true);
    try {
      const response = await fetch('/api/admin/words/distractor-batches', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          batchId,
          action: 'publish_items',
          items: reviewedItems.map((item) => ({
            item_id: item.itemId,
            distractors: item.distractors,
          })),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result?.error || '승인 오답 반영에 실패했습니다.');

      const wordsResponse = await fetch('/api/admin/words');
      if (wordsResponse.ok) setWords(await wordsResponse.json());

      alert(`${result.replacedWordCount ?? 0}개 단어의 오답을 등록했습니다.`);
      if (result.batchCompleted) {
        setReport(null);
        setBatchId(null);
      } else {
        const publishedIds = new Set(reviewedItems.map((item) => item.itemId));
        setReport((current) => current?.filter((item) => !publishedIds.has(item.itemId)) ?? null);
      }
      void refreshBatchCounts();
    } catch (error) {
      alert(error instanceof Error ? error.message : '승인 오답 반영 중 오류가 발생했습니다.');
    } finally {
      setIsPublishing(false);
    }
  };

  const discard = async () => {
    if (!batchId || !report) return;
    const pendingWordCount = report.filter((item) => item.status === 'success').length;
    if (!confirm(
      `남은 검수 단어 ${pendingWordCount}개를 등록하지 않고 배치를 폐기하시겠습니까?\n` +
      '현재 등록된 기존 오답 데이터는 변경되지 않으며, 부족한 단어는 다음 일괄 생성 대상에 다시 포함됩니다.'
    )) return;

    setIsDiscarding(true);
    try {
      const response = await fetch('/api/admin/words/distractor-batches', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batchId, action: 'discard' }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result?.error || '생성 배치 폐기에 실패했습니다.');

      alert(`배치를 폐기했습니다. 미등록 생성 단어 ${result.discardedItemCount ?? 0}개를 제외했습니다.`);
      setReport(null);
      setBatchId(null);
      void refreshBatchCounts();
    } catch (error) {
      alert(error instanceof Error ? error.message : '생성 배치 폐기 중 오류가 발생했습니다.');
    } finally {
      setIsDiscarding(false);
    }
  };

  const copyForReview = async () => {
    if (!report) return;
    const reviewData = report.filter((item) => item.status === 'success').map((item) => ({
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
1. 오답 단어가 실제 ${reviewData.some((item) => item.source.language === 'es') ? '스페인어' : '해당 언어'} 단어 또는 자연스러운 어구인지
2. 원본 단어와 완전히 같거나 사실상 동일한 활용형이 포함되지 않았는지
3. 같은 원본 단어 안에서 오답이 중복되지 않았는지
4. 오답의 한국어/영어 뜻이 정확하고 서로 일치하는지
5. 퀴즈 오답으로 쓰기에 지나치게 무관하거나, 반대로 정답으로도 인정될 정도로 의미가 같은 항목이 없는지
6. 철자 오류, 잘못된 성·수·품사, 부자연스러운 표현이 없는지
7. 각 원본 단어는 최종적으로 정확히 ${TARGET_DISTRACTOR_COUNT}개의 오답으로 기존 데이터를 전체 교체할 예정임

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
      setIsReportCopied(true);
      window.setTimeout(() => setIsReportCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy bulk report:', error);
      alert('클립보드 복사에 실패했습니다.');
    }
  };

  return {
    isGenerating,
    progress,
    report,
    setReport,
    isReportCopied,
    isPublishing,
    isSavingReview,
    isDiscarding,
    pendingBatchCount,
    incompleteBatchCount,
    loadPendingBatch,
    generate,
    updateDistractor,
    setWordReviewed,
    saveReview,
    publish,
    discard,
    copyForReview,
  };
}
