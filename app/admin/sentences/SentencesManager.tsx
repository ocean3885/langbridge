'use client';

import { useState } from 'react';
import { Plus, Pencil, Trash2, Save, X, Search } from 'lucide-react';
import { generateSentenceAudio } from './actions';
import Link from 'next/link';

export interface Language {
  id: number;
  name_en: string;
  name_ko: string;
  code: string;
}

export interface Sentence {
  id: number;
  sentence: string;
  translation: string;
  audio_url: string | null;
  languages?: Language;
  word_count?: number;
}

interface SentencesManagerProps {
  initialSentences: Sentence[];
  languages: Language[];
}

export default function SentencesManager({ initialSentences, languages }: SentencesManagerProps) {
  const [sentences, setSentences] = useState<Sentence[]>(initialSentences);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    sentence: '',
    translation: '',
  });
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 100;

  const filteredSentences = sentences.filter((sentence) => {
    const matchesSearch = 
      sentence.sentence.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sentence.translation.includes(searchTerm);
    return matchesSearch;
  });

  const paginatedSentences = filteredSentences.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  const totalPages = Math.ceil(filteredSentences.length / itemsPerPage);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };


  const handleUpdate = async (id: number) => {
    if (!formData.sentence || !formData.translation) {
      alert('문장과 번역을 입력해주세요.');
      return;
    }

    setLoading(true);
    try {
      // 1. TTS 오디오 생성
      const defaultLangCode = 'es';

      const audioResult = await generateSentenceAudio({
        text: formData.sentence,
        languageCode: defaultLangCode,
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
          sentence: formData.sentence,
          translation: formData.translation,
          audio_url: audioResult.audioPath,
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
        sentence: '',
        translation: '',
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
      sentence: sentence.sentence,
      translation: sentence.translation,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setFormData({
      sentence: '',
      translation: '',
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 md:ml-64 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">문장 관리</h1>
            <p className="text-gray-600 mt-2">학습할 문장을 관리합니다.</p>
          </div>
        </div>

        {/* 검색 및 필터 */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={searchTerm}
                onChange={handleSearchChange}
                placeholder="문장 또는 번역 검색..."
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
        </div>


        {/* 문장 목록 (카드 그리드) */}
        {filteredSentences.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 py-16 text-center text-gray-500">
            {searchTerm ? '검색 결과가 없습니다.' : '등록된 문장이 없습니다.'}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {paginatedSentences.map((sentence) => (
              <div key={sentence.id} className="bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200 overflow-hidden group flex flex-col">
                {editingId === sentence.id ? (
                  <div className="p-4 flex flex-col h-full space-y-3">
                    <textarea
                      value={formData.sentence}
                      onChange={(e) => setFormData({ ...formData, sentence: e.target.value })}
                      rows={3}
                      className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-medium resize-none"
                    />
                    <textarea
                      value={formData.translation}
                      onChange={(e) => setFormData({ ...formData, translation: e.target.value })}
                      rows={3}
                      className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                    />
                    <div className="mt-auto pt-2 border-t border-gray-50 flex justify-end gap-2">
                      <button
                        onClick={() => handleUpdate(sentence.id)}
                        disabled={loading}
                        className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                        title="저장"
                      >
                        <Save className="w-5 h-5" />
                      </button>
                      <button
                        onClick={cancelEdit}
                        disabled={loading}
                        className="p-1.5 text-gray-500 hover:bg-gray-50 rounded-lg transition-colors"
                        title="취소"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="relative h-full">
                    <Link 
                      href={`/admin/sentences/${sentence.id}`}
                      className="p-4 flex flex-col h-full hover:bg-gray-50/50 transition-colors"
                    >
                      <div className="flex-1 space-y-3 mb-4 pr-16">
                        <h3 className="text-sm font-bold text-gray-900 leading-relaxed whitespace-pre-wrap break-words group-hover:text-blue-600 transition-colors">
                          {sentence.sentence}
                        </h3>
                        <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed break-words">
                          {sentence.translation}
                        </p>
                      </div>
                      
                      <div className="mt-auto pt-3 border-t border-gray-50 flex items-center justify-between text-[10px] text-gray-400">
                        <div className="flex gap-2">
                          <span>ID: {sentence.id}</span>
                          <span>•</span>
                          <span className="text-blue-500 font-medium">단어 {sentence.word_count || 0}</span>
                        </div>
                      </div>
                    </Link>

                    <div className="absolute top-4 right-4 flex opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 backdrop-blur-sm rounded-md shadow-sm border border-gray-100 z-10">
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          startEdit(sentence);
                        }}
                        className="p-1.5 text-gray-400 hover:text-blue-600 rounded-md transition-colors"
                        title="수정"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleDelete(sentence.id);
                        }}
                        className="p-1.5 text-gray-400 hover:text-red-600 rounded-md transition-colors"
                        title="삭제"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
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
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
                    className={`w-10 h-10 flex items-center justify-center rounded-lg text-sm font-medium transition-colors ${
                      currentPage === pageNum
                        ? 'bg-blue-600 text-white border border-blue-600'
                        : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
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
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              다음
            </button>
          </div>
        )}
        
        <div className="mt-4 text-sm text-gray-600 text-center">
          전체 {sentences.length}개 중 {filteredSentences.length}개 표시 ({(currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, filteredSentences.length)})
        </div>
      </div>
    </div>
  );
}
