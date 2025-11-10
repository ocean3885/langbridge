'use client';

import { useState } from 'react';
import { Plus, Pencil, Trash2, Save, X } from 'lucide-react';

interface Category {
  id: number;
  name: string;
}

interface CategoriesManagerProps {
  initialCategories: Category[];
}

export default function CategoriesManager({ initialCategories }: CategoriesManagerProps) {
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({ name: '' });
  const [loading, setLoading] = useState(false);

  const handleAdd = async () => {
    if (!formData.name.trim()) {
      alert('카테고리 이름을 입력해주세요.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: formData.name.trim() }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || '카테고리 추가 실패');
      }

      const newCategory = await res.json();
      setCategories([...categories, newCategory]);
      setFormData({ name: '' });
      setIsAdding(false);
      alert('카테고리가 추가되었습니다.');
    } catch (error) {
      alert(error instanceof Error ? error.message : '카테고리 추가 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (id: number) => {
    if (!formData.name.trim()) {
      alert('카테고리 이름을 입력해주세요.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/categories', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, name: formData.name.trim() }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || '카테고리 수정 실패');
      }

      const updatedCategory = await res.json();
      setCategories(categories.map(cat => cat.id === id ? updatedCategory : cat));
      setEditingId(null);
      setFormData({ name: '' });
      alert('카테고리가 수정되었습니다.');
    } catch (error) {
      alert(error instanceof Error ? error.message : '카테고리 수정 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('정말 이 카테고리를 삭제하시겠습니까?')) {
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/categories?id=${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || '카테고리 삭제 실패');
      }

      setCategories(categories.filter(cat => cat.id !== id));
      alert('카테고리가 삭제되었습니다.');
    } catch (error) {
      alert(error instanceof Error ? error.message : '카테고리 삭제 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (category: Category) => {
    setEditingId(category.id);
    setFormData({ name: category.name });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setIsAdding(false);
    setFormData({ name: '' });
  };

  return (
    <div className="min-h-screen bg-gray-50 ml-64 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">카테고리 관리</h1>
            <p className="text-gray-600 mt-2">오디오 콘텐츠 카테고리를 관리합니다.</p>
          </div>
          <button
            onClick={() => setIsAdding(true)}
            disabled={isAdding || loading}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
          >
            <Plus className="w-5 h-5" />
            카테고리 추가
          </button>
        </div>

        {/* 추가 폼 */}
        {isAdding && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6 border-2 border-blue-500">
            <h2 className="text-xl font-bold text-gray-900 mb-4">새 카테고리 추가</h2>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">카테고리 이름</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ name: e.target.value })}
                placeholder="예: 스페인어 기초"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
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

        {/* 카테고리 목록 */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-100 border-b">
              <tr>
                <th className="text-left px-6 py-3 text-sm font-semibold text-gray-700">ID</th>
                <th className="text-left px-6 py-3 text-sm font-semibold text-gray-700">카테고리 이름</th>
                <th className="text-right px-6 py-3 text-sm font-semibold text-gray-700">작업</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((category) => (
                <tr key={category.id} className="border-b hover:bg-gray-50">
                  {editingId === category.id ? (
                    <>
                      <td className="px-6 py-4 text-sm text-gray-700">{category.id}</td>
                      <td className="px-6 py-4">
                        <input
                          type="text"
                          value={formData.name}
                          onChange={(e) => setFormData({ name: e.target.value })}
                          className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleUpdate(category.id)}
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
                      <td className="px-6 py-4 text-sm text-gray-700">{category.id}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{category.name}</td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => startEdit(category)}
                          disabled={loading || isAdding}
                          className="text-blue-600 hover:text-blue-800 mr-3 disabled:opacity-50"
                        >
                          <Pencil className="w-5 h-5 inline" />
                        </button>
                        <button
                          onClick={() => handleDelete(category.id)}
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
          {categories.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              등록된 카테고리가 없습니다. 새 카테고리를 추가해주세요.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
