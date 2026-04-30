'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plus, Pencil, Trash2, Save, X, Search } from 'lucide-react';

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
  meaning: Record<string, string[]>;
  gender: string | null;
  declensions: Record<string, any>;
  conjugations: Record<string, any>;
  audio_url: string | null;
  languages?: Language;
  sentence_count?: number;
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
};

function formatPOS(pos: string): string {
  return POS_MAP[pos.toLowerCase()] || pos;
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
    gender: '',
    pos_input: '', // UI simplification: comma separated
  });
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLanguage, setFilterLanguage] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 100;

  const filteredWords = words.filter((word) => {
    const matchesSearch = 
      word.word.toLowerCase().includes(searchTerm.toLowerCase()) ||
      getMeaningDisplay(word.meaning).includes(searchTerm);
    const matchesLanguage = filterLanguage === 'all' || word.lang_code === filterLanguage;
    return matchesSearch && matchesLanguage;
  });

  const paginatedWords = filteredWords.slice(
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


  const handleUpdate = async (id: number) => {
    if (!formData.word || !formData.meaning_ko || !formData.lang_code) {
      alert('단어, 의미, 언어를 모두 입력해주세요.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/admin/words', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          word: formData.word,
          lang_code: formData.lang_code,
          meaning: { ko: [formData.meaning_ko] },
          gender: formData.gender || null,
          pos: formData.pos_input ? formData.pos_input.split(',').map(s => s.trim()) : [],
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
      meaning_ko: word.meaning.ko?.[0] || '',
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
      gender: '',
      pos_input: '',
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 md:ml-64 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">단어 관리</h1>
            <p className="text-gray-600 mt-2">학습할 단어를 관리합니다.</p>
          </div>
        </div>

        {/* 검색 및 필터 */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={searchTerm}
                onChange={handleSearchChange}
                placeholder="단어 또는 의미 검색..."
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <select
              value={filterLanguage}
              onChange={handleFilterLanguageChange}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
            >
              <option value="all">모든 언어</option>
              {languages.map((lang) => (
                <option key={lang.id} value={lang.code}>
                  {lang.name_ko} ({lang.code})
                </option>
              ))}
            </select>
          </div>
        </div>


        {/* 단어 목록 (카드 그리드) */}
        {filteredWords.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 py-16 text-center text-gray-500">
            {searchTerm || filterLanguage !== 'all' ? '검색 결과가 없습니다.' : '등록된 단어가 없습니다.'}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {paginatedWords.map((word) => (
              <div key={word.id} className="bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200 overflow-hidden group">
                {editingId === word.id ? (
                  <div className="p-4 space-y-3">
                    <div className="flex gap-2">
                      <select
                        value={formData.lang_code}
                        onChange={(e) => setFormData({ ...formData, lang_code: e.target.value })}
                        className="flex-1 px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      >
                        {languages.map((lang) => (
                          <option key={lang.id} value={lang.code}>{lang.name_ko}</option>
                        ))}
                      </select>
                      <input
                        type="text"
                        value={formData.word}
                        onChange={(e) => setFormData({ ...formData, word: e.target.value })}
                        placeholder="단어"
                        className="flex-2 w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-medium"
                      />
                    </div>
                    <input
                      type="text"
                      value={formData.meaning_ko}
                      onChange={(e) => setFormData({ ...formData, meaning_ko: e.target.value })}
                      placeholder="의미 (한국어)"
                      className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={formData.gender}
                        onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                        placeholder="성별 (M/F)"
                        className="w-20 px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                      <input
                        type="text"
                        value={formData.pos_input}
                        onChange={(e) => setFormData({ ...formData, pos_input: e.target.value })}
                        placeholder="품사 (쉼표 구분)"
                        className="flex-1 px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                    <div className="flex justify-end gap-2 pt-2 border-t border-gray-50">
                      <button
                        onClick={() => handleUpdate(word.id)}
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
                    <Link href={`/admin/words/${word.id}`} className="block p-4 relative hover:bg-gray-50 transition-colors">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex flex-wrap gap-1.5">
                          <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider">
                            {word.lang_code}
                          </span>
                          {word.pos.map((p, idx) => (
                            <span key={idx} className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-[10px] font-medium">
                              {formatPOS(p)}
                            </span>
                          ))}
                        </div>
                        <div className="flex opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.preventDefault()}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              startEdit(word);
                            }}
                            className="p-1 text-gray-400 hover:text-blue-600 rounded-md transition-colors"
                            title="수정"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(word.id);
                            }}
                            className="p-1 text-gray-400 hover:text-red-600 rounded-md transition-colors"
                            title="삭제"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      
                      <h3 className="text-lg font-bold text-gray-900 mb-1 flex items-baseline gap-2">
                        {word.word}
                        {word.gender && (
                          <span className="text-xs font-normal text-gray-400">({word.gender})</span>
                        )}
                      </h3>
                      
                      <p className="text-sm text-gray-600 font-medium">
                        {getMeaningDisplay(word.meaning)}
                      </p>
                      
                      <div className="mt-3 pt-3 border-t border-gray-50 flex items-center justify-between text-[10px] text-gray-400">
                        <div className="flex gap-2">
                          <span>ID: {word.id}</span>
                          <span>•</span>
                          <span className="text-blue-500 font-medium">문장 {word.sentence_count || 0}</span>
                        </div>
                      </div>
                    </Link>
                )}
              </div>
            ))}
          </div>
        ) }
        
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
          전체 {words.length}개 중 {filteredWords.length}개 표시 ({(currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, filteredWords.length)})
        </div>
      </div>
    </div>
  );
}
