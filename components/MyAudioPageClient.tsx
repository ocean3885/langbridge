'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FolderOpen, Pencil, Check, X, Settings } from 'lucide-react';
import MyAudioList from './MyAudioList';
import CategoryManageModal from './CategoryManageModal';

type AudioWithCategory = {
  id: string;
  title: string | null;
  created_at: string;
  user_id: string;
  audio_file_path: string | null;
  category_id: number | null;
  created_label: string;
};

type GroupedCategory = {
  id: number | null;
  name: string;
  languageName: string;
  audioList: AudioWithCategory[];
};

type Category = {
  id: number;
  name: string;
  languageName: string;
};

type Language = {
  id: number;
  name_ko: string;
  code: string;
};

interface Props {
  allGroupedCategories: GroupedCategory[];
  allCategories: Category[];
  languages: Language[];
  bulkDelete: (formData: FormData) => Promise<void>;
  changeCategory: (formData: FormData) => Promise<void>;
  renameCategory: (formData: FormData) => Promise<void>;
  recordStudy: (formData: FormData) => Promise<void>;
}

export default function MyAudioPageClient({ 
  allGroupedCategories,
  allCategories,
  languages, 
  bulkDelete, 
  changeCategory,
  renameCategory,
  recordStudy,
}: Props) {
  const [selectedLanguageId, setSelectedLanguageId] = useState<number | 'all'>('all');
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState('');
  const [showManageModal, setShowManageModal] = useState(false);
  const router = useRouter();
  const [selectModes, setSelectModes] = useState<Record<string, boolean>>({});

  const getKey = (id: number | null) => (id === null ? 'uncategorized' : String(id));

  // 선택된 언어로 필터링
  const filteredCategories = selectedLanguageId === 'all'
    ? allGroupedCategories
    : allGroupedCategories.filter(cat => {
        // 카테고리의 언어명으로 매칭 (정확한 매칭을 위해 language_id로 비교하는 것이 더 좋지만, 
        // 현재 구조상 languageName만 있으므로 name_ko로 비교)
        const selectedLang = languages.find(l => l.id === selectedLanguageId);
        return selectedLang && cat.languageName === selectedLang.name_ko;
      });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
        <h1 className="text-2xl sm:text-4xl font-bold whitespace-nowrap">내 오디오</h1>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* 언어 선택 셀렉트 박스 */}
          <div className="flex items-center gap-2 flex-1 sm:flex-initial">
          <label htmlFor="language-filter" className="text-xs sm:text-sm font-medium text-gray-700 whitespace-nowrap">
            언어 :
          </label>
          <select
            id="language-filter"
            value={selectedLanguageId}
            onChange={(e) => setSelectedLanguageId(e.target.value === 'all' ? 'all' : Number(e.target.value))}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white grow sm:w-auto"
          >
            <option value="all">전체 언어</option>
            {languages.map(lang => (
              <option key={lang.id} value={lang.id}>
                {lang.name_ko} ({lang.code})
              </option>
            ))}
          </select>
        </div>

          {/* 카테고리 관리 버튼 */}
          <button
            onClick={() => setShowManageModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors text-sm whitespace-nowrap"
          >
            <Settings className="w-4 h-4" />
            <span className="hidden sm:inline">관리</span>
          </button>
        </div>
      </div>

      {filteredCategories.length === 0 && (
        <p className="text-gray-600">
          {selectedLanguageId === 'all' 
            ? '아직 생성된 오디오가 없습니다.' 
            : '선택한 언어에 해당하는 오디오가 없습니다.'}
        </p>
      )}

      {filteredCategories.length > 0 && (
        <div className="space-y-8 sm:space-y-10">
          {filteredCategories.map(category => {
            const k = getKey(category.id);
            const isSelectMode = !!selectModes[k];
            return (
            <section key={category.id ?? 'uncategorized'} className="space-y-3 sm:space-y-4">
              <div className="flex items-center flex-wrap gap-2 sm:gap-3 border-b-2 border-gray-200 pb-2">
                <FolderOpen className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
                {editingCategoryId === category.id ? (
                  <div className="flex items-center gap-2">
                    <input
                      className="text-xl sm:text-2xl font-bold text-gray-800 border-b border-gray-300 focus:outline-none focus:border-blue-500 bg-transparent px-1"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      autoFocus
                    />
                    <button
                      aria-label="저장"
                      className="text-green-600 hover:text-green-700"
                      onClick={async () => {
                        const name = editingName.trim();
                        if (!name || category.id == null) {
                          setEditingCategoryId(null);
                          return;
                        }
                        const fd = new FormData();
                        fd.append('categoryId', String(category.id));
                        fd.append('name', name);
                        await renameCategory(fd);
                        setEditingCategoryId(null);
                        router.refresh();
                      }}
                    >
                      <Check className="w-5 h-5" />
                    </button>
                    <button
                      aria-label="취소"
                      className="text-gray-500 hover:text-gray-700"
                      onClick={() => setEditingCategoryId(null)}
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                ) : (
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-800 flex items-center gap-2">
                    {category.name}
                    {category.languageName && (
                      <span className="ml-2 text-sm sm:text-base font-medium text-blue-600">({category.languageName})</span>
                    )}
                    {category.id !== null && (
                      <button
                        aria-label="이름 변경"
                        className="text-gray-500 hover:text-gray-700"
                        onClick={() => {
                          setEditingCategoryId(category.id as number);
                          setEditingName(category.name);
                        }}
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                    )}
                  </h2>
                )}
                <div className="ml-auto flex items-center gap-2">
                  <span className="text-xs sm:text-sm text-gray-500">({category.audioList.length}개)</span>
                  <button
                    type="button"
                    className={`text-xs sm:text-sm px-2 sm:px-3 py-1 rounded border transition ${isSelectMode ? 'bg-gray-200 border-gray-300' : 'bg-gray-800 text-white border-gray-900'}`}
                    onClick={() => setSelectModes(prev => ({ ...prev, [k]: !prev[k] }))}
                  >
                    {isSelectMode ? '선택 종료' : '선택'}
                  </button>
                </div>
              </div>
              <MyAudioList
                audioList={category.audioList}
                bulkDelete={bulkDelete}
                changeCategory={changeCategory}
                categories={allCategories}
                recordStudy={recordStudy}
                selectMode={isSelectMode}
              />
            </section>
          );})}
        </div>
      )}

      <CategoryManageModal
        isOpen={showManageModal}
        onClose={() => setShowManageModal(false)}
        onCategoryChanged={() => router.refresh()}
      />
    </div>
  );
}
