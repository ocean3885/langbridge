'use client';

import { useState } from 'react';
import { Plus, Pencil, Trash2, Save, X } from 'lucide-react';

interface Language {
  id: number;
  name_en: string;
  name_ko: string;
  code: string;
}

interface LanguagesManagerProps {
  initialLanguages: Language[];
}

export default function LanguagesManager({ initialLanguages }: LanguagesManagerProps) {
  const [languages, setLanguages] = useState<Language[]>(initialLanguages);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({ name_en: '', name_ko: '', code: '' });
  const [loading, setLoading] = useState(false);

  const handleAdd = async () => {
    if (!formData.name_en || !formData.name_ko || !formData.code) {
      alert('모든 필드를 입력해주세요.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/admin/languages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || '언어 추가 실패');
      }

      const newLanguage = await res.json();
      setLanguages([...languages, newLanguage]);
      setFormData({ name_en: '', name_ko: '', code: '' });
      setIsAdding(false);
      alert('언어가 추가되었습니다.');
    } catch (error) {
      alert(error instanceof Error ? error.message : '언어 추가 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (id: number) => {
    if (!formData.name_en || !formData.name_ko || !formData.code) {
      alert('모든 필드를 입력해주세요.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/admin/languages', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...formData }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || '언어 수정 실패');
      }

      const updatedLanguage = await res.json();
      setLanguages(languages.map(lang => lang.id === id ? updatedLanguage : lang));
      setEditingId(null);
      setFormData({ name_en: '', name_ko: '', code: '' });
      alert('언어가 수정되었습니다.');
    } catch (error) {
      alert(error instanceof Error ? error.message : '언어 수정 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('정말 이 언어를 삭제하시겠습니까?\n관련된 단어와 문장도 함께 영향을 받을 수 있습니다.')) {
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/admin/languages?id=${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || '언어 삭제 실패');
      }

      setLanguages(languages.filter(lang => lang.id !== id));
      alert('언어가 삭제되었습니다.');
    } catch (error) {
      alert(error instanceof Error ? error.message : '언어 삭제 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (language: Language) => {
    setEditingId(language.id);
    setFormData({
      name_en: language.name_en,
      name_ko: language.name_ko,
      code: language.code,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setIsAdding(false);
    setFormData({ name_en: '', name_ko: '', code: '' });
  };

  return (
    <div className="min-h-screen bg-gray-50 ml-64 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">언어 관리</h1>
            <p className="text-gray-600 mt-2">학습할 수 있는 언어를 관리합니다.</p>
          </div>
          <button
            onClick={() => setIsAdding(true)}
            disabled={isAdding || loading}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
          >
            <Plus className="w-5 h-5" />
            언어 추가
          </button>
        </div>

        {/* 추가 폼 */}
        {isAdding && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6 border-2 border-blue-500">
            <h2 className="text-xl font-bold text-gray-900 mb-4">새 언어 추가</h2>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">영어 이름</label>
                <input
                  type="text"
                  value={formData.name_en}
                  onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
                  placeholder="English"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">한국어 이름</label>
                <input
                  type="text"
                  value={formData.name_ko}
                  onChange={(e) => setFormData({ ...formData, name_ko: e.target.value })}
                  placeholder="영어"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">언어 코드</label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toLowerCase() })}
                  placeholder="en"
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

        {/* 언어 목록 */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-100 border-b">
              <tr>
                <th className="text-left px-6 py-3 text-sm font-semibold text-gray-700">ID</th>
                <th className="text-left px-6 py-3 text-sm font-semibold text-gray-700">영어 이름</th>
                <th className="text-left px-6 py-3 text-sm font-semibold text-gray-700">한국어 이름</th>
                <th className="text-left px-6 py-3 text-sm font-semibold text-gray-700">코드</th>
                <th className="text-right px-6 py-3 text-sm font-semibold text-gray-700">작업</th>
              </tr>
            </thead>
            <tbody>
              {languages.map((language) => (
                <tr key={language.id} className="border-b hover:bg-gray-50">
                  {editingId === language.id ? (
                    <>
                      <td className="px-6 py-4 text-sm text-gray-700">{language.id}</td>
                      <td className="px-6 py-4">
                        <input
                          type="text"
                          value={formData.name_en}
                          onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
                          className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <input
                          type="text"
                          value={formData.name_ko}
                          onChange={(e) => setFormData({ ...formData, name_ko: e.target.value })}
                          className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <input
                          type="text"
                          value={formData.code}
                          onChange={(e) => setFormData({ ...formData, code: e.target.value.toLowerCase() })}
                          className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleUpdate(language.id)}
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
                      <td className="px-6 py-4 text-sm text-gray-700">{language.id}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{language.name_en}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{language.name_ko}</td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        <code className="bg-gray-100 px-2 py-1 rounded">{language.code}</code>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => startEdit(language)}
                          disabled={loading || isAdding}
                          className="text-blue-600 hover:text-blue-800 mr-3 disabled:opacity-50"
                        >
                          <Pencil className="w-5 h-5 inline" />
                        </button>
                        <button
                          onClick={() => handleDelete(language.id)}
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
          {languages.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              등록된 언어가 없습니다. 새 언어를 추가해주세요.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
