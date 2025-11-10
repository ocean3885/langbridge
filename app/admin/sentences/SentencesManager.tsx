'use client';

import { useState } from 'react';
import { Plus, Pencil, Trash2, Save, X, Search } from 'lucide-react';
import { generateSentenceAudio } from './actions';

interface Language {
  id: number;
  name_en: string;
  name_ko: string;
  code: string;
}

interface Sentence {
  id: number;
  language_id: number;
  text: string;
  translation_ko: string;
  audio_path: string;
  context_category: string | null;
  mapping_details: Record<string, unknown> | null;
  languages?: Language;
}

interface SentencesManagerProps {
  initialSentences: Sentence[];
  languages: Language[];
}

export default function SentencesManager({ initialSentences, languages }: SentencesManagerProps) {
  const [sentences, setSentences] = useState<Sentence[]>(initialSentences);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    language_id: languages[0]?.id || 0,
    text: '',
    translation_ko: '',
    context_category: '',
  });
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLanguage, setFilterLanguage] = useState<number>(0);

  const filteredSentences = sentences.filter((sentence) => {
    const matchesSearch = 
      sentence.text.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sentence.translation_ko.includes(searchTerm);
    const matchesLanguage = filterLanguage === 0 || sentence.language_id === filterLanguage;
    return matchesSearch && matchesLanguage;
  });

  const handleAdd = async () => {
    if (!formData.text || !formData.translation_ko) {
      alert('문장과 번역을 입력해주세요.');
      return;
    }

    setLoading(true);
    try {
      // 1. 먼저 TTS 오디오 생성
      const selectedLanguage = languages.find(lang => lang.id === formData.language_id);
      if (!selectedLanguage) {
        alert('언어를 선택해주세요.');
        setLoading(false);
        return;
      }

      const audioResult = await generateSentenceAudio({
        text: formData.text,
        languageCode: selectedLanguage.code,
      });

      if (!audioResult.success || !audioResult.audioPath) {
        alert(audioResult.error || '오디오 생성에 실패했습니다.');
        setLoading(false);
        return;
      }

      // 2. 오디오 경로와 함께 문장 저장
      const res = await fetch('/api/admin/sentences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          audio_path: audioResult.audioPath,
          context_category: formData.context_category || null,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || '문장 추가 실패');
      }

      const newSentence = await res.json();
      setSentences([newSentence, ...sentences]);
      setFormData({
        language_id: languages[0]?.id || 0,
        text: '',
        translation_ko: '',
        context_category: '',
      });
      setIsAdding(false);
      alert('문장이 추가되었습니다.');
    } catch (error) {
      alert(error instanceof Error ? error.message : '문장 추가 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (id: number) => {
    if (!formData.text || !formData.translation_ko) {
      alert('문장과 번역을 입력해주세요.');
      return;
    }

    setLoading(true);
    try {
      // 1. 먼저 TTS 오디오 생성
      const selectedLanguage = languages.find(lang => lang.id === formData.language_id);
      if (!selectedLanguage) {
        alert('언어를 선택해주세요.');
        setLoading(false);
        return;
      }

      const audioResult = await generateSentenceAudio({
        text: formData.text,
        languageCode: selectedLanguage.code,
        sentenceId: id,
      });

      if (!audioResult.success || !audioResult.audioPath) {
        alert(audioResult.error || '오디오 생성에 실패했습니다.');
        setLoading(false);
        return;
      }

      // 2. 오디오 경로와 함께 문장 수정
      const res = await fetch('/api/admin/sentences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          ...formData,
          audio_path: audioResult.audioPath,
          context_category: formData.context_category || null,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || '문장 수정 실패');
      }

      const updatedSentence = await res.json();
      setSentences(sentences.map(sentence => sentence.id === id ? updatedSentence : sentence));
      setEditingId(null);
      setFormData({
        language_id: languages[0]?.id || 0,
        text: '',
        translation_ko: '',
        context_category: '',
      });
      alert('문장이 수정되었습니다.');
    } catch (error) {
      alert(error instanceof Error ? error.message : '문장 수정 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('정말 이 문장을 삭제하시겠습니까?')) {
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/admin/sentences?id=${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || '문장 삭제 실패');
      }

      setSentences(sentences.filter(sentence => sentence.id !== id));
      alert('문장이 삭제되었습니다.');
    } catch (error) {
      alert(error instanceof Error ? error.message : '문장 삭제 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (sentence: Sentence) => {
    setEditingId(sentence.id);
    setFormData({
      language_id: sentence.language_id,
      text: sentence.text,
      translation_ko: sentence.translation_ko,
      context_category: sentence.context_category || '',
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setIsAdding(false);
    setFormData({
      language_id: languages[0]?.id || 0,
      text: '',
      translation_ko: '',
      context_category: '',
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 ml-64 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">문장 관리</h1>
            <p className="text-gray-600 mt-2">학습할 문장을 관리합니다.</p>
          </div>
          <button
            onClick={() => setIsAdding(true)}
            disabled={isAdding || loading}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
          >
            <Plus className="w-5 h-5" />
            문장 추가
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
                placeholder="문장 또는 번역 검색..."
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
            <h2 className="text-xl font-bold text-gray-900 mb-4">새 문장 추가</h2>
            <div className="grid grid-cols-1 gap-4 mb-4">
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
                <label className="block text-sm font-medium text-gray-700 mb-1">문장</label>
                <textarea
                  value={formData.text}
                  onChange={(e) => setFormData({ ...formData, text: e.target.value })}
                  placeholder="예: Hola, ¿cómo estás?"
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">번역 (한국어)</label>
                <textarea
                  value={formData.translation_ko}
                  onChange={(e) => setFormData({ ...formData, translation_ko: e.target.value })}
                  placeholder="예: 안녕하세요, 어떻게 지내세요?"
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">컨텍스트 카테고리 (선택)</label>
                <input
                  type="text"
                  value={formData.context_category}
                  onChange={(e) => setFormData({ ...formData, context_category: e.target.value })}
                  placeholder="예: 인사, 여행, 식당 등"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
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

        {/* 문장 목록 */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-100 border-b">
                <tr>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">ID</th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">언어</th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">문장</th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">번역</th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">카테고리</th>
                  <th className="text-right px-4 py-3 text-sm font-semibold text-gray-700">작업</th>
                </tr>
              </thead>
              <tbody>
                {filteredSentences.map((sentence) => (
                  <tr key={sentence.id} className="border-b hover:bg-gray-50">
                    {editingId === sentence.id ? (
                      <>
                        <td className="px-4 py-4 text-sm text-gray-700">{sentence.id}</td>
                        <td className="px-4 py-4">
                          <select
                            value={formData.language_id}
                            onChange={(e) => setFormData({ ...formData, language_id: Number(e.target.value) })}
                            className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 text-sm"
                          >
                            {languages.map((lang) => (
                              <option key={lang.id} value={lang.id}>
                                {lang.name_ko}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-4">
                          <textarea
                            value={formData.text}
                            onChange={(e) => setFormData({ ...formData, text: e.target.value })}
                            rows={2}
                            className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 text-sm"
                          />
                        </td>
                        <td className="px-4 py-4">
                          <textarea
                            value={formData.translation_ko}
                            onChange={(e) => setFormData({ ...formData, translation_ko: e.target.value })}
                            rows={2}
                            className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 text-sm"
                          />
                        </td>
                        <td className="px-4 py-4">
                          <input
                            type="text"
                            value={formData.context_category}
                            onChange={(e) => setFormData({ ...formData, context_category: e.target.value })}
                            className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 text-sm"
                          />
                        </td>
                        <td className="px-4 py-4 text-right">
                          <button
                            onClick={() => handleUpdate(sentence.id)}
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
                        <td className="px-4 py-4 text-sm text-gray-700">{sentence.id}</td>
                        <td className="px-4 py-4 text-sm">
                          <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium">
                            {sentence.languages?.name_ko || '-'}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-900 max-w-xs truncate" title={sentence.text}>
                          {sentence.text}
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-700 max-w-xs truncate" title={sentence.translation_ko}>
                          {sentence.translation_ko}
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-700">
                          {sentence.context_category || '-'}
                        </td>
                        <td className="px-4 py-4 text-right">
                          <button
                            onClick={() => startEdit(sentence)}
                            disabled={loading || isAdding}
                            className="text-blue-600 hover:text-blue-800 mr-3 disabled:opacity-50"
                          >
                            <Pencil className="w-5 h-5 inline" />
                          </button>
                          <button
                            onClick={() => handleDelete(sentence.id)}
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
          {filteredSentences.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              {searchTerm || filterLanguage ? '검색 결과가 없습니다.' : '등록된 문장이 없습니다. 새 문장을 추가해주세요.'}
            </div>
          )}
        </div>
        
        <div className="mt-4 text-sm text-gray-600">
          전체 {sentences.length}개 중 {filteredSentences.length}개 표시
        </div>
      </div>
    </div>
  );
}
