'use client';

import { useState } from 'react';
import AiGenerateForm from './AiGenerateForm';

interface Category {
  id: number;
  name: string;
  language_id?: number | null;
}

interface Language {
  id: number;
  name_ko: string;
  code: string;
}

interface Props {
  processFileAction: (formData: FormData) => Promise<void>;
  categories: Category[];
  languages: Language[];
  onCategoryAdded?: () => void;
}

export default function UploadForm({ processFileAction, categories, languages, onCategoryAdded }: Props) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [inputMode, setInputMode] = useState<'file' | 'text' | 'ai'>('file');
  const [inputText, setInputText] = useState('');
  const [aiGeneratedCount, setAiGeneratedCount] = useState(0);
  const defaultLangCode = languages.find(l => l.code === 'es-ES')?.code || languages[0]?.code || '';
  const [selectedLanguageCode, setSelectedLanguageCode] = useState<string>(defaultLangCode);

  const selectedLanguage = languages.find(l => l.code === selectedLanguageCode);
  const selectedLanguageId = selectedLanguage?.id ?? null;
  const filteredCategories = (categories || []).filter(c => c.language_id === selectedLanguageId);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData(e.currentTarget);
      await processFileAction(formData);
    } catch (err) {
      setError(err instanceof Error ? err.message : '업로드 중 오류가 발생했습니다.');
    } finally {
      setIsUploading(false);
    }
  }

  async function handleAddCategory() {
    if (!newCategoryName.trim()) {
      setError('카테고리 이름을 입력하세요.');
      return;
    }

    setIsAddingCategory(true);
    setError(null);

    try {
      const response = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCategoryName.trim(), language_id: selectedLanguageId })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || '카테고리 추가에 실패했습니다.');
      }

      setNewCategoryName('');
      setShowAddCategory(false);
      
      // 부모 컴포넌트에 카테고리가 추가되었음을 알림
      if (onCategoryAdded) {
        onCategoryAdded();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '카테고리 추가 중 오류가 발생했습니다.');
    } finally {
      setIsAddingCategory(false);
    }
  }

  function handleAiGenerated(sentences: string[]) {
    // AI로 생성된 문장을 텍스트 입력 필드에 채워넣기
    const combined = sentences.join('\n');
    setInputText(combined);
    setInputMode('text'); // 텍스트 모드로 전환
    setAiGeneratedCount(sentences.length / 2); // 원문/번역 쌍이므로 2로 나눔
    setError(null);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-white shadow-md rounded-lg p-6">
      {/* 입력 방식 선택 */}
      <div>
        <span className="block text-sm font-semibold text-gray-700 mb-2">입력 방식</span>
        <div className="inline-flex rounded-md shadow-sm overflow-hidden border border-gray-300">
          <label className={`px-4 py-2 text-sm cursor-pointer ${inputMode === 'file' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700'}`}>
            <input
              type="radio"
              name="input_mode"
              value="file"
              className="sr-only"
              checked={inputMode === 'file'}
              onChange={() => setInputMode('file')}
              disabled={isUploading}
            />
            파일 업로드
          </label>
          <label className={`px-4 py-2 text-sm cursor-pointer border-l border-gray-300 ${inputMode === 'text' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700'}`}>
            <input
              type="radio"
              name="input_mode"
              value="text"
              className="sr-only"
              checked={inputMode === 'text'}
              onChange={() => setInputMode('text')}
              disabled={isUploading}
            />
            직접 입력
          </label>
          <label className={`px-4 py-2 text-sm cursor-pointer border-l border-gray-300 ${inputMode === 'ai' ? 'bg-purple-600 text-white' : 'bg-white text-gray-700'}`}>
            <input
              type="radio"
              name="input_mode"
              value="ai"
              className="sr-only"
              checked={inputMode === 'ai'}
              onChange={() => setInputMode('ai')}
              disabled={isUploading}
            />
            ✨ AI 생성
          </label>
        </div>
      </div>

      {inputMode !== 'ai' && (
        <div>
          <label htmlFor="language_code" className="block text-sm font-semibold text-gray-700 mb-2">
            언어 선택 <span className="text-red-500">*</span>
          </label>
          {languages && languages.length > 0 ? (
            <select
              name="language_code"
              id="language_code"
              required
              disabled={isUploading}
              value={selectedLanguageCode}
              onChange={(e) => setSelectedLanguageCode(e.target.value)}
              className="w-full border border-gray-300 rounded-md p-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
            >
              {languages.map((lang) => (
                <option key={lang.id} value={lang.code}>
                  {lang.name_ko} ({lang.code})
                </option>
              ))}
            </select>
          ) : (
            <div className="text-sm text-gray-500">사용 가능한 언어가 없습니다. 기본 언어로 처리됩니다.</div>
          )}
        </div>
      )}

      <div>
        <label htmlFor="title" className="block text-sm font-semibold text-gray-700 mb-2">
          제목 <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          name="title"
          id="title"
          required
          disabled={isUploading}
          className="w-full border border-gray-300 rounded-md p-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
          placeholder="예: 스페인어 기초 회화"
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label htmlFor="category" className="block text-sm font-semibold text-gray-700">
            카테고리
          </label>
          <button
            type="button"
            onClick={() => setShowAddCategory(!showAddCategory)}
            disabled={isUploading}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium disabled:text-gray-400"
          >
            {showAddCategory ? '취소' : '+ 새 카테고리'}
          </button>
        </div>

        {showAddCategory ? (
          <div className="space-y-2">
            <div className="flex gap-2">
              <input
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="새 카테고리 이름"
                disabled={isAddingCategory}
                className="flex-1 border border-gray-300 rounded-md p-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
              />
              <button
                type="button"
                onClick={handleAddCategory}
                disabled={isAddingCategory || !newCategoryName.trim()}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {isAddingCategory ? '추가 중...' : '추가'}
              </button>
            </div>
          </div>
        ) : (
          <select
            name="category"
            id="category"
            disabled={isUploading}
            className="w-full border border-gray-300 rounded-md p-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
          >
            <option value="">선택 안 함</option>
            {filteredCategories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {inputMode === 'ai' ? (
        <AiGenerateForm languages={languages} onGenerated={handleAiGenerated} />
      ) : inputMode === 'file' ? (
        <div>
          <label htmlFor="input_file" className="block text-sm font-semibold text-gray-700 mb-2">
            TXT 파일 <span className="text-red-500">*</span>
          </label>
          <input
            type="file"
            name="input_file"
            id="input_file"
            accept=".txt"
            required={inputMode === 'file'}
            disabled={isUploading}
            className="w-full border border-gray-300 rounded-md p-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
          <p className="mt-2 text-sm text-gray-500">
            스페인어와 한국어가 번갈아 나오는 TXT 파일을 업로드하세요
          </p>
        </div>
      ) : (
        <div>
          {aiGeneratedCount > 0 && (
            <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-green-800 text-sm">
                ✅ AI가 {aiGeneratedCount}개의 문장을 생성했습니다. 아래에서 확인하고 필요하면 수정하세요.
              </p>
            </div>
          )}
          <label htmlFor="input_text" className="block text-sm font-semibold text-gray-700 mb-2">
            텍스트 직접 입력 <span className="text-red-500">*</span>
          </label>
          <textarea
            id="input_text"
            name="input_text"
            required={inputMode === 'text'}
            disabled={isUploading}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={`예시\nHola\n안녕하세요\n¿Cómo estás?\n어떻게 지내세요?`}
            className="w-full min-h-[200px] border border-gray-300 rounded-md p-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
          />
          <p className="mt-2 text-sm text-gray-500">
            한 줄에 원문, 다음 줄에 번역이 오도록 번갈아 입력하세요.
          </p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-800 text-sm">❌ {error}</p>
        </div>
      )}

      {inputMode !== 'ai' && (
        <button
          type="submit"
          disabled={isUploading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {isUploading ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              처리 중... (수 분 소요될 수 있습니다)
            </span>
          ) : (
            '업로드 및 처리 시작'
          )}
        </button>
      )}
    </form>
  );
}
