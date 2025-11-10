'use client';

import { useState } from 'react';
import { Plus, Pencil, Trash2, Save, X, Search } from 'lucide-react';

interface Language {
  id: number;
  name_en: string;
  name_ko: string;
  code: string;
}

interface Word {
  id: number;
  language_id: number;
  text: string;
  meaning_ko: string;
  level: string;
  part_of_speech: string | null;
  languages?: Language;
}

interface WordsManagerProps {
  initialWords: Word[];
  languages: Language[];
}

export default function WordsManager({ initialWords, languages }: WordsManagerProps) {
  const [words, setWords] = useState<Word[]>(initialWords);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    language_id: languages[0]?.id || 0,
    text: '',
    meaning_ko: '',
    level: 'A1',
    part_of_speech: '',
  });
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLanguage, setFilterLanguage] = useState<number>(0);

  const levels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
  const partsOfSpeech = ['명사', '동사', '형용사', '부사', '전치사', '접속사', '대명사', '감탄사'];

  const filteredWords = words.filter((word) => {
    const matchesSearch = 
      word.text.toLowerCase().includes(searchTerm.toLowerCase()) ||
      word.meaning_ko.includes(searchTerm);
    const matchesLanguage = filterLanguage === 0 || word.language_id === filterLanguage;
    return matchesSearch && matchesLanguage;
  });

  const handleAdd = async () => {
    if (!formData.text || !formData.meaning_ko) {
      alert('단어와 의미를 입력해주세요.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/admin/words', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          part_of_speech: formData.part_of_speech || null,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || '단어 추가 실패');
      }

      const newWord = await res.json();
      setWords([newWord, ...words]);
      setFormData({
        language_id: languages[0]?.id || 0,
        text: '',
        meaning_ko: '',
        level: 'A1',
        part_of_speech: '',
      });
      setIsAdding(false);
      alert('단어가 추가되었습니다.');
    } catch (error) {
      alert(error instanceof Error ? error.message : '단어 추가 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (id: number) => {
    if (!formData.text || !formData.meaning_ko) {
      alert('단어와 의미를 입력해주세요.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/admin/words', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          ...formData,
          part_of_speech: formData.part_of_speech || null,
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
        language_id: languages[0]?.id || 0,
        text: '',
        meaning_ko: '',
        level: 'A1',
        part_of_speech: '',
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
      language_id: word.language_id,
      text: word.text,
      meaning_ko: word.meaning_ko,
      level: word.level,
      part_of_speech: word.part_of_speech || '',
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setIsAdding(false);
    setFormData({
      language_id: languages[0]?.id || 0,
      text: '',
      meaning_ko: '',
      level: 'A1',
      part_of_speech: '',
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 ml-64 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">단어 관리</h1>
            <p className="text-gray-600 mt-2">학습할 단어를 관리합니다.</p>
          </div>
          <button
            onClick={() => setIsAdding(true)}
            disabled={isAdding || loading}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
          >
            <Plus className="w-5 h-5" />
            단어 추가
          </button>
        </div>

        {/* 검색 및 필터 */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="단어 또는 의미 검색..."
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <select
              value={filterLanguage}
              onChange={(e) => setFilterLanguage(Number(e.target.value))}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value={0}>모든 언어</option>
              {languages.map((lang) => (
                <option key={lang.id} value={lang.id}>
                  {lang.name_ko} ({lang.code})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 추가 폼 */}
        {isAdding && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6 border-2 border-blue-500">
            <h2 className="text-xl font-bold text-gray-900 mb-4">새 단어 추가</h2>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">언어</label>
                <select
                  value={formData.language_id}
                  onChange={(e) => setFormData({ ...formData, language_id: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {languages.map((lang) => (
                    <option key={lang.id} value={lang.id}>
                      {lang.name_ko} ({lang.code})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">단어</label>
                <input
                  type="text"
                  value={formData.text}
                  onChange={(e) => setFormData({ ...formData, text: e.target.value })}
                  placeholder="예: hello"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">의미 (한국어)</label>
                <input
                  type="text"
                  value={formData.meaning_ko}
                  onChange={(e) => setFormData({ ...formData, meaning_ko: e.target.value })}
                  placeholder="예: 안녕"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">난이도</label>
                <select
                  value={formData.level}
                  onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {levels.map((level) => (
                    <option key={level} value={level}>{level}</option>
                  ))}
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">품사 (선택)</label>
                <select
                  value={formData.part_of_speech}
                  onChange={(e) => setFormData({ ...formData, part_of_speech: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">선택 안함</option>
                  {partsOfSpeech.map((pos) => (
                    <option key={pos} value={pos}>{pos}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleAdd}
                disabled={loading}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                저장
              </button>
              <button
                onClick={cancelEdit}
                disabled={loading}
                className="flex items-center gap-2 bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
              >
                <X className="w-4 h-4" />
                취소
              </button>
            </div>
          </div>
        )}

        {/* 단어 목록 */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-100 border-b">
                <tr>
                  <th className="text-left px-6 py-3 text-sm font-semibold text-gray-700">ID</th>
                  <th className="text-left px-6 py-3 text-sm font-semibold text-gray-700">언어</th>
                  <th className="text-left px-6 py-3 text-sm font-semibold text-gray-700">단어</th>
                  <th className="text-left px-6 py-3 text-sm font-semibold text-gray-700">의미</th>
                  <th className="text-left px-6 py-3 text-sm font-semibold text-gray-700">난이도</th>
                  <th className="text-left px-6 py-3 text-sm font-semibold text-gray-700">품사</th>
                  <th className="text-right px-6 py-3 text-sm font-semibold text-gray-700">작업</th>
                </tr>
              </thead>
              <tbody>
                {filteredWords.map((word) => (
                  <tr key={word.id} className="border-b hover:bg-gray-50">
                    {editingId === word.id ? (
                      <>
                        <td className="px-6 py-4 text-sm text-gray-700">{word.id}</td>
                        <td className="px-6 py-4">
                          <select
                            value={formData.language_id}
                            onChange={(e) => setFormData({ ...formData, language_id: Number(e.target.value) })}
                            className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                          >
                            {languages.map((lang) => (
                              <option key={lang.id} value={lang.id}>
                                {lang.name_ko}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-6 py-4">
                          <input
                            type="text"
                            value={formData.text}
                            onChange={(e) => setFormData({ ...formData, text: e.target.value })}
                            className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-6 py-4">
                          <input
                            type="text"
                            value={formData.meaning_ko}
                            onChange={(e) => setFormData({ ...formData, meaning_ko: e.target.value })}
                            className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-6 py-4">
                          <select
                            value={formData.level}
                            onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                            className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                          >
                            {levels.map((level) => (
                              <option key={level} value={level}>{level}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-6 py-4">
                          <select
                            value={formData.part_of_speech}
                            onChange={(e) => setFormData({ ...formData, part_of_speech: e.target.value })}
                            className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="">-</option>
                            {partsOfSpeech.map((pos) => (
                              <option key={pos} value={pos}>{pos}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => handleUpdate(word.id)}
                            disabled={loading}
                            className="text-green-600 hover:text-green-800 mr-3 disabled:opacity-50"
                          >
                            <Save className="w-5 h-5 inline" />
                          </button>
                          <button
                            onClick={cancelEdit}
                            disabled={loading}
                            className="text-gray-600 hover:text-gray-800 disabled:opacity-50"
                          >
                            <X className="w-5 h-5 inline" />
                          </button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-6 py-4 text-sm text-gray-700">{word.id}</td>
                        <td className="px-6 py-4 text-sm">
                          <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium">
                            {word.languages?.name_ko || '-'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{word.text}</td>
                        <td className="px-6 py-4 text-sm text-gray-700">{word.meaning_ko}</td>
                        <td className="px-6 py-4 text-sm">
                          <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-medium">
                            {word.level}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700">{word.part_of_speech || '-'}</td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => startEdit(word)}
                            disabled={loading || isAdding}
                            className="text-blue-600 hover:text-blue-800 mr-3 disabled:opacity-50"
                          >
                            <Pencil className="w-5 h-5 inline" />
                          </button>
                          <button
                            onClick={() => handleDelete(word.id)}
                            disabled={loading || isAdding}
                            className="text-red-600 hover:text-red-800 disabled:opacity-50"
                          >
                            <Trash2 className="w-5 h-5 inline" />
                          </button>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredWords.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              {searchTerm || filterLanguage ? '검색 결과가 없습니다.' : '등록된 단어가 없습니다. 새 단어를 추가해주세요.'}
            </div>
          )}
        </div>
        
        <div className="mt-4 text-sm text-gray-600">
          전체 {words.length}개 중 {filteredWords.length}개 표시
        </div>
      </div>
    </div>
  );
}
