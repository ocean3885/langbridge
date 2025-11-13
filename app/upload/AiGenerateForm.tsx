'use client';

import { useState } from 'react';
import { generateSentencesAction } from './ai-actions';

interface Language {
  id: number;
  name_ko: string;
  code: string;
}

interface Props {
  languages: Language[];
  onGenerated: (sentences: string[]) => void;
}

export default function AiGenerateForm({ languages, onGenerated }: Props) {
  const [keyword, setKeyword] = useState('');
  const [count, setCount] = useState<number>(5);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const defaultLangCode = languages.length > 0 ? (languages.find(l => l.code === 'es-ES')?.code || languages[0].code) : 'es-ES';
  const [selectedLanguageCode, setSelectedLanguageCode] = useState<string>(defaultLangCode);

  async function handleGenerate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsGenerating(true);
    setError(null);

    try {
      const formData = new FormData(e.currentTarget);
      const result = await generateSentencesAction(formData);
      onGenerated(result.sentences);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'AI 생성 중 오류가 발생했습니다.');
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleGenerateClick() {
    setIsGenerating(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('keyword', keyword);
      formData.append('count', count.toString());
      formData.append('language_code', selectedLanguageCode);
      
      const result = await generateSentencesAction(formData);
      onGenerated(result.sentences);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'AI 생성 중 오류가 발생했습니다.');
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <div className="space-y-6 bg-white shadow-md rounded-lg p-6">
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-4">
        <h3 className="font-semibold text-purple-900 mb-2">✨ AI 문장 생성</h3>
        <p className="text-sm text-purple-800">
          특정 단어나 구문을 포함한 문장을 AI가 자동으로 생성합니다.
        </p>
      </div>

      <div>
        <label htmlFor="ai_language_code" className="block text-sm font-semibold text-gray-700 mb-2">
          언어 선택 <span className="text-red-500">*</span>
        </label>
        {languages && languages.length > 0 ? (
          <select
            name="language_code"
            id="ai_language_code"
            required
            disabled={isGenerating}
            value={selectedLanguageCode}
            onChange={(e) => setSelectedLanguageCode(e.target.value)}
            className="w-full border border-gray-300 rounded-md p-3 focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:bg-gray-100"
          >
            {languages.map((lang) => (
              <option key={lang.id} value={lang.code}>
                {lang.name_ko} ({lang.code})
              </option>
            ))}
          </select>
        ) : (
          <div className="text-sm text-gray-500">사용 가능한 언어가 없습니다.</div>
        )}
      </div>

      <div>
        <label htmlFor="keyword" className="block text-sm font-semibold text-gray-700 mb-2">
          단어 또는 구문 <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          name="keyword"
          id="keyword"
          required
          disabled={isGenerating}
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          className="w-full border border-gray-300 rounded-md p-3 focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:bg-gray-100"
          placeholder="예: hola, estar, por favor"
        />
        <p className="mt-2 text-sm text-gray-500">
          이 단어/구문이 포함된 문장을 생성합니다
        </p>
      </div>

      <div>
        <label htmlFor="count" className="block text-sm font-semibold text-gray-700 mb-2">
          생성할 문장 수
        </label>
        <input
          type="number"
          name="count"
          id="count"
          min={1}
          max={20}
          required
          disabled={isGenerating}
          value={count}
          onChange={(e) => setCount(Math.max(1, Math.min(20, parseInt(e.target.value) || 5)))}
          className="w-full border border-gray-300 rounded-md p-3 focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:bg-gray-100"
        />
        <p className="mt-2 text-sm text-gray-500">
          1~20개 사이로 선택하세요
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-800 text-sm">❌ {error}</p>
        </div>
      )}

      <button
        type="button"
        onClick={handleGenerateClick}
        disabled={isGenerating || !keyword.trim()}
        className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-lg transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
      >
        {isGenerating ? (
          <span className="flex items-center justify-center">
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            AI 생성 중...
          </span>
        ) : (
          '✨ AI로 문장 생성하기'
        )}
      </button>
    </div>
  );
}
