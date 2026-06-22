'use client';

import { useState } from 'react';
import { Plus, Loader2, Check } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface WordExtractorProps {
  sentenceId: number;
  langCode: string;
}

export default function WordExtractor({ sentenceId, langCode }: WordExtractorProps) {
  const [selectedWord, setSelectedWord] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{
    wordId: number;
    extractedWord: string;
    reusedExistingWord: boolean;
    mappingCreated: boolean;
  } | null>(null);
  const router = useRouter();

  const handleExtract = async () => {
    if (!selectedWord.trim()) return;

    setIsLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/admin/sentences/extract-word', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sentenceId,
          word: selectedWord.trim(),
          langCode,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '단어 등록 중 오류가 발생했습니다.');
      }

      setResult({
        wordId: data.wordId,
        extractedWord: data.extractedWord,
        reusedExistingWord: Boolean(data.reusedExistingWord),
        mappingCreated: Boolean(data.mappingCreated),
      });
      
      // 입력창 초기화
      setSelectedWord('');

      // 5초 뒤에 성공 메시지 숨기기
      setTimeout(() => {
        setResult(null);
      }, 5000);

      // 목록 새로고침
      router.refresh();
    } catch (error) {
      alert(error instanceof Error ? error.message : '오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mt-8 bg-blue-50/50 rounded-3xl p-8 border border-blue-100/50">
      <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
        <Plus className="w-5 h-5 text-blue-600" />
        문장에서 단어 추출하여 등록
      </h3>
      
      <p className="text-sm text-gray-600 mb-6 leading-relaxed">
        문장에서 단어를 입력하거나 복사하여 붙여넣으세요. DeepSeek AI가 자동으로 사전적 원형을 찾고 정보를 생성하여 등록합니다.
      </p>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <input
            type="text"
            value={selectedWord}
            onChange={(e) => setSelectedWord(e.target.value)}
            placeholder="예: comer, fui, casas..."
            className="w-full px-5 py-3.5 rounded-2xl border border-gray-200 focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all outline-none bg-white shadow-sm"
            disabled={isLoading}
          />
        </div>
        <button
          onClick={handleExtract}
          disabled={isLoading || !selectedWord.trim()}
          className="px-8 py-3.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-bold rounded-2xl transition-all shadow-lg shadow-blue-200 flex items-center justify-center gap-2 min-w-[140px]"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              분석 중...
            </>
          ) : (
            <>
              <Plus className="w-5 h-5" />
              단어 등록
            </>
          )}
        </button>
      </div>

      {result && (
        <div className="mt-6 p-5 bg-white border border-green-100 rounded-2xl flex items-center justify-between animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center">
              <Check className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">
                {!result.mappingCreated
                  ? `'${result.extractedWord}' 단어는 이미 이 문장에 연결되어 있습니다.`
                  : result.reusedExistingWord
                    ? `'${result.extractedWord}' 기존 단어를 문장에 연결했습니다.`
                    : `'${result.extractedWord}' 단어가 성공적으로 등록되었습니다!`}
              </p>
              {result.mappingCreated && (
                <p className="text-xs text-gray-500">문장과 자동으로 연결되었습니다.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
