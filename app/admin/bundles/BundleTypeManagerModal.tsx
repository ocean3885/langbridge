'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Trash2, Edit2, Loader2, Code } from 'lucide-react';
import { listBundleTypes, createBundleType, updateBundleType, deleteBundleType } from '@/lib/supabase/services/bundles';

interface BundleType {
  id: string;
  name: string;
  code: string;
  description: string | null;
}

export default function BundleTypeManagerModal({ 
  isOpen, 
  onClose,
  onRefresh
}: { 
  isOpen: boolean; 
  onClose: () => void;
  onRefresh: () => void;
}) {
  const [types, setTypes] = useState<BundleType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [newType, setNewType] = useState({
    name: '',
    code: '',
    description: ''
  });
  
  const [editType, setEditType] = useState({
    name: '',
    code: '',
    description: ''
  });

  useEffect(() => {
    if (isOpen) {
      fetchTypes();
    }
  }, [isOpen]);

  const fetchTypes = async () => {
    setIsLoading(true);
    try {
      const data = await listBundleTypes();
      setTypes(data as BundleType[]);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newType.name.trim() || !newType.code.trim()) return;
    try {
      await createBundleType({ 
        name: newType.name.trim(), 
        code: newType.code.trim(),
        description: newType.description.trim() || null
      });
      setNewType({ name: '', code: '', description: '' });
      fetchTypes();
      onRefresh();
    } catch (e) {
      alert('타입 생성 중 오류가 발생했습니다.');
    }
  };

  const handleUpdate = async (id: string) => {
    if (!editType.name.trim() || !editType.code.trim()) return;
    try {
      await updateBundleType(id, { 
        name: editType.name.trim(),
        code: editType.code.trim(),
        description: editType.description.trim() || null
      });
      setEditingId(null);
      fetchTypes();
      onRefresh();
    } catch (e) {
      alert('타입 수정 중 오류가 발생했습니다.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('정말 삭제하시겠습니까? 관련 번들의 타입 설정이 해제됩니다.')) return;
    try {
      await deleteBundleType(id);
      fetchTypes();
      onRefresh();
    } catch (e) {
      alert('타입 삭제 중 오류가 발생했습니다.');
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-2xl bg-white dark:bg-gray-900 rounded-3xl shadow-2xl overflow-hidden"
          >
            <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">번들 타입 관리</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">상세페이지 레이아웃을 결정하는 타입을 관리합니다.</p>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
                <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Create Input */}
              <div className="bg-gray-50 dark:bg-gray-800/50 p-5 rounded-2xl space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">타입 이름 (표시용)</label>
                    <input 
                      type="text"
                      placeholder="예: 문장 학습형"
                      value={newType.name}
                      onChange={(e) => setNewType({ ...newType, name: e.target.value })}
                      className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/20 focus:border-blue-400 dark:focus:border-blue-500 outline-none transition-all text-sm text-gray-900 dark:text-gray-100 shadow-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">시스템 코드 (식별용)</label>
                    <div className="relative">
                      <Code className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                      <input 
                        type="text"
                        placeholder="예: sentence_focus"
                        value={newType.code}
                        onChange={(e) => setNewType({ ...newType, code: e.target.value.toLowerCase().replace(/\s/g, '_') })}
                        className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/20 focus:border-blue-400 dark:focus:border-blue-500 outline-none transition-all text-sm font-mono text-gray-900 dark:text-gray-100 shadow-sm"
                      />
                    </div>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">설명 (선택)</label>
                  <input 
                    type="text"
                    placeholder="타입에 대한 간단한 설명을 입력하세요"
                    value={newType.description}
                    onChange={(e) => setNewType({ ...newType, description: e.target.value })}
                    className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/20 focus:border-blue-400 dark:focus:border-blue-500 outline-none transition-all text-sm text-gray-900 dark:text-gray-100 shadow-sm"
                  />
                </div>
                <button 
                  onClick={handleCreate}
                  disabled={!newType.name.trim() || !newType.code.trim()}
                  className="w-full py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2 font-bold text-sm shadow-lg shadow-blue-100 dark:shadow-blue-900/20 active:scale-[0.98]"
                >
                  <Plus className="w-4 h-4" />
                  새 타입 추가
                </button>
              </div>

              {/* List */}
              <div className="max-h-[350px] overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                {isLoading ? (
                  <div className="flex items-center justify-center py-10">
                    <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                  </div>
                ) : types.length === 0 ? (
                  <div className="text-center py-12 bg-gray-50 dark:bg-gray-800/20 rounded-3xl border border-dashed border-gray-100 dark:border-gray-800">
                    <p className="text-gray-400 dark:text-gray-500 text-sm">등록된 타입이 없습니다.</p>
                  </div>
                ) : (
                  types.map(type => (
                    <div key={type.id} className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-5 hover:border-blue-200 dark:hover:border-blue-900 transition-all group shadow-sm">
                      {editingId === type.id ? (
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <input 
                              autoFocus
                              type="text"
                              value={editType.name}
                              onChange={(e) => setEditType({ ...editType, name: e.target.value })}
                              className="px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-blue-200 dark:border-blue-900 rounded-xl outline-none text-sm text-gray-900 dark:text-gray-100"
                              placeholder="이름"
                            />
                            <input 
                              type="text"
                              value={editType.code}
                              onChange={(e) => setEditType({ ...editType, code: e.target.value })}
                              className="px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-blue-200 dark:border-blue-900 rounded-xl outline-none text-sm font-mono text-gray-900 dark:text-gray-100"
                              placeholder="코드"
                            />
                          </div>
                          <input 
                            type="text"
                            value={editType.description}
                            onChange={(e) => setEditType({ ...editType, description: e.target.value })}
                            className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-blue-200 dark:border-blue-900 rounded-xl outline-none text-sm text-gray-900 dark:text-gray-100"
                            placeholder="설명"
                          />
                          <div className="flex justify-end gap-2">
                            <button onClick={() => setEditingId(null)} className="px-4 py-2 text-xs font-bold text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors">
                              취소
                            </button>
                            <button onClick={() => handleUpdate(type.id)} className="px-4 py-2 text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 rounded-xl transition-colors">
                              변경사항 저장
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-bold text-gray-900 dark:text-gray-100">{type.name}</span>
                              <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 font-mono text-[10px] rounded-md border border-gray-50 dark:border-gray-700">
                                {type.code}
                              </span>
                            </div>
                            {type.description && (
                              <div className="text-xs text-gray-400 dark:text-gray-500 line-clamp-1">{type.description}</div>
                            )}
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                            <button 
                              onClick={() => { 
                                setEditingId(type.id); 
                                setEditType({ name: type.name, code: type.code, description: type.description || '' }); 
                              }}
                              className="p-2.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-xl transition-colors"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => handleDelete(type.id)}
                              className="p-2.5 text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
