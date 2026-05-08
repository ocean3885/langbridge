'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  ChevronRight, 
  FileJson, 
  CheckCircle2, 
  AlertCircle,
  Code2,
  Tag,
  ImageIcon,
  Plus,
  UploadCloud,
  Trash2,
  Loader2,
  Save,
  RotateCcw
} from 'lucide-react';
import Link from 'next/link';
import { listCategories, createBundleWithItems } from '@/lib/supabase/services/bundles';
import { uploadThumbnail } from '@/lib/supabase/services/storage';
import { saveAdminDraft, getAdminDraft, deleteAdminDraft } from '@/lib/supabase/services/admin-drafts';

interface BundleItemInput {
  sentence: string;
  translation: string;
  translation_en: string;
}

interface BundleJsonInput {
  items: BundleItemInput[];
}

interface Props {
  userId: string;
}

export default function BundleCreateForm({ userId }: Props) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [jsonInput, setJsonInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [parsedData, setParsedData] = useState<BundleJsonInput | null>(null);

  const [wordJsons, setWordJsons] = useState<string[]>([]);
  const [wordErrors, setWordErrors] = useState<(string | null)[]>([]);
  
  // Step 3 State
  const [categories, setCategories] = useState<any[]>([]);
  const [bundleMeta, setBundleMeta] = useState({
    title: '',
    description: '',
    level: 1,
    category_id: '',
    is_published: false
  });
  const [uploadedImages, setUploadedImages] = useState<{file: File, url: string}[]>([]);
  const [itemImageMappings, setItemImageMappings] = useState<(number | null)[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);

  const DRAFT_TYPE = 'bundle_create';

  useEffect(() => {
    const fetchCats = async () => {
      try {
        const data = await listCategories();
        setCategories(data);
      } catch (err) {
        console.error('Failed to fetch categories', err);
      }
    };
    fetchCats();

    // DB에서 초안 로드 시도
    const fetchDraft = async () => {
      try {
        const draft = await getAdminDraft(userId, DRAFT_TYPE);
        if (draft) {
          setLastSaved(draft.updated_at);
        }
      } catch (err) {
        console.error('Failed to fetch draft', err);
      }
    };
    fetchDraft();
  }, [userId]);

  const saveDraft = async () => {
    setIsSaving(true);
    try {
      const draftData = {
        step,
        jsonInput,
        parsedData,
        wordJsons,
        bundleMeta,
        itemImageMappings,
      };
      
      const saved = await saveAdminDraft(userId, DRAFT_TYPE, draftData);
      setLastSaved(saved.updated_at);
      alert('서버에 임시 저장되었습니다. 다른 기기에서도 이어서 작업할 수 있습니다.');
    } catch (err: any) {
      console.error('Failed to save draft', err);
      alert('임시 저장 중 오류가 발생했습니다: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const loadDraft = async () => {
    if (!confirm('저장된 임시 데이터를 서버에서 불러오시겠습니까? 현재 작성 중인 내용은 사라집니다.')) {
      return;
    }

    try {
      const draftRecord = await getAdminDraft(userId, DRAFT_TYPE);
      if (!draftRecord) {
        alert('저장된 임시 데이터가 없습니다.');
        return;
      }

      const draft = draftRecord.data;
      setStep(draft.step || 1);
      setJsonInput(draft.jsonInput || '');
      setParsedData(draft.parsedData || null);
      setWordJsons(draft.wordJsons || []);
      setBundleMeta(draft.bundleMeta || {
        title: '',
        description: '',
        level: 1,
        category_id: '',
        is_published: false
      });
      setItemImageMappings(draft.itemImageMappings || []);
      setLastSaved(draftRecord.updated_at);
      
      if (draft.itemImageMappings?.some((m: any) => m !== null)) {
        alert('텍스트 데이터는 복구되었으나, 이미지는 보안상 다시 업로드해야 합니다.');
      }
    } catch (e) {
      console.error('Failed to load draft', e);
      alert('데이터 로드 중 오류가 발생했습니다.');
    }
  };

  const clearDraft = async () => {
    if (confirm('서버에 저장된 임시 데이터를 삭제하시겠습니까?')) {
      try {
        await deleteAdminDraft(userId, DRAFT_TYPE);
        setLastSaved(null);
      } catch (err: any) {
        alert('삭제 중 오류가 발생했습니다: ' + err.message);
      }
    }
  };

  const handleJsonSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    try {
      const parsed = JSON.parse(jsonInput);
      
      if (!parsed.items || !Array.isArray(parsed.items)) {
        throw new Error('JSON must contain an "items" array.');
      }
      
      if (parsed.items.length === 0) {
        throw new Error('Items array cannot be empty.');
      }
      
      for (const item of parsed.items) {
        if (!item.sentence || !item.translation) {
          throw new Error('Each item must have at least "sentence" and "translation".');
        }
      }
      
      setParsedData(parsed);
      setWordJsons(new Array(parsed.items.length).fill(''));
      setWordErrors(new Array(parsed.items.length).fill(null));
      setItemImageMappings(new Array(parsed.items.length).fill(null));
      setStep(2);
    } catch (err: any) {
      setError(err.message || 'Invalid JSON format.');
    }
  };

  const handleWordJsonChange = (index: number, value: string) => {
    const newWordJsons = [...wordJsons];
    newWordJsons[index] = value;
    setWordJsons(newWordJsons);

    const newWordErrors = [...wordErrors];
    newWordErrors[index] = null;
    setWordErrors(newWordErrors);
  };

  const validateWordJsons = () => {
    const newErrors = [...wordErrors];
    let hasError = false;

    wordJsons.forEach((json, index) => {
      if (!json.trim()) {
        return;
      }

      try {
        const parsed = JSON.parse(json);
        if (!parsed.words) {
          throw new Error('JSON must contain a "words" object.');
        }
      } catch (err: any) {
        newErrors[index] = err.message || '유효하지 않은 JSON 형식입니다.';
        hasError = true;
      }
    });

    setWordErrors(newErrors);
    if (!hasError) {
      setStep(3);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newImages = Array.from(files).map(file => ({
      file,
      url: URL.createObjectURL(file)
    }));

    setUploadedImages([...uploadedImages, ...newImages]);
  };

  const removeImage = (index: number) => {
    const newImages = [...uploadedImages];
    URL.revokeObjectURL(newImages[index].url);
    newImages.splice(index, 1);
    setUploadedImages(newImages);

    const newMappings = itemImageMappings.map(m => {
      if (m === index) return null;
      if (m !== null && m > index) return m - 1;
      return m;
    });
    setItemImageMappings(newMappings);
  };

  const handleMappingChange = (itemIndex: number, imageIndex: number | null) => {
    const newMappings = [...itemImageMappings];
    newMappings[itemIndex] = imageIndex;
    setItemImageMappings(newMappings);
  };

  const handleSubmit = async () => {
    if (!bundleMeta.title) {
      alert('번들 제목을 입력해주세요.');
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Upload unique images
      const imageUrls: string[] = [];
      for (const img of uploadedImages) {
        const formData = new FormData();
        formData.append('file', img.file);
        const url = await uploadThumbnail(formData);
        imageUrls.push(url);
      }

      // 2. Prepare items with mapped image URLs
      const itemsToCreate = parsedData!.items.map((item, idx) => {
        const imageIndex = itemImageMappings[idx];
        return {
          ...item,
          wordJson: wordJsons[idx],
          imageUrl: imageIndex !== null ? imageUrls[imageIndex] : null
        };
      });

      // 3. Create bundle with items
      const bundle = await createBundleWithItems(bundleMeta, itemsToCreate);

      alert('번들이 성공적으로 생성되었습니다!');
      await deleteAdminDraft(userId, DRAFT_TYPE);
      router.push(`/admin/bundles/${bundle.id}`);
      router.refresh();
    } catch (err: any) {
      alert(err.message || '번들 생성 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const exampleJson = `{
  "items": [
    {
      "sentence": "Hoy vengo a hablar de mis trabajos pasados.",
      "translation": "오늘은 나의 과거 직업들에 대해 이야기하러 왔어요.",
      "translation_en": "Today I come to talk about my past jobs."
    }
  ]
}`;

  const wordExampleJson = `{
  "words": {
    "trabajos": {
      "word": "trabajo",
      "pos": ["m"],
      "meaning_ko": { "m": "직업, 일" },
      "meaning_en": { "m": "job, work" },
      "gender": "m",
      "conjugations": null,
      "declensions": { "ms": "trabajo", "mp": "trabajos", "fs": null, "fp": null }
    }
  }
}`;

  return (
    <div className="md:ml-64 p-4 md:p-8 pt-20 md:pt-8 bg-gray-50 dark:bg-background min-h-[calc(100vh-5rem)]">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex items-center gap-4">
          <Link 
            href="/admin/bundles"
            className="p-2 bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-100 dark:hover:border-blue-900 transition-all shadow-sm group"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">새 번들 생성</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm">학습 번들을 단계별로 구성합니다.</p>
          </div>
          
          <div className="flex items-center gap-2">
            {lastSaved && (
              <div className="hidden sm:block text-right mr-2">
                <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">마지막 저장</p>
                <p className="text-xs text-gray-500">{new Date(lastSaved).toLocaleString()}</p>
              </div>
            )}
            <button
              onClick={loadDraft}
              disabled={!lastSaved}
              className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl text-xs font-bold text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm"
              title="임시저장 불러오기"
            >
              <RotateCcw className="w-4 h-4" />
              <span className="hidden sm:inline">불러오기</span>
            </button>
            <button
              onClick={saveDraft}
              disabled={isSaving}
              className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 dark:shadow-blue-900/20 disabled:opacity-50"
              title="임시저장"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span className="hidden sm:inline">{isSaving ? '저장 중...' : '임시저장'}</span>
            </button>
            {lastSaved && (
              <button
                onClick={clearDraft}
                className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                title="임시저장 삭제"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4 p-4 bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-x-auto no-scrollbar">
          <div className={`flex items-center gap-3 px-4 py-2 shrink-0 ${step >= 1 ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'} rounded-2xl font-bold`}>
            <div className={`w-8 h-8 rounded-full ${step >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500'} flex items-center justify-center text-sm`}>1</div>
            <span>문장 데이터</span>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-300 shrink-0" />
          <div className={`flex items-center gap-3 px-4 py-2 shrink-0 ${step >= 2 ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'} rounded-2xl font-bold`}>
            <div className={`w-8 h-8 rounded-full ${step >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500'} flex items-center justify-center text-sm`}>2</div>
            <span>단어 데이터</span>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-300 shrink-0" />
          <div className={`flex items-center gap-3 px-4 py-2 shrink-0 ${step >= 3 ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'} rounded-2xl font-bold`}>
            <div className={`w-8 h-8 rounded-full ${step >= 3 ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500'} flex items-center justify-center text-sm`}>3</div>
            <span>번들 설정 & 이미지</span>
          </div>
        </div>

        {step === 1 && (
          <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="p-6 border-b border-gray-50 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center">
                  <FileJson className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h2 className="font-bold text-gray-900 dark:text-white">문장 목록 입력</h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">전체 문장 리스트 JSON을 입력하세요.</p>
                </div>
              </div>
              <button 
                onClick={() => setJsonInput(exampleJson)}
                className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 bg-blue-50 dark:bg-blue-900/30 px-3 py-1.5 rounded-lg transition-colors"
              >
                예시 가져오기
              </button>
            </div>
            
            <form onSubmit={handleJsonSubmit} className="p-8 space-y-6">
              <div className="space-y-4">
                <div className="relative">
                  <div className="absolute top-4 right-4 flex items-center gap-2">
                    <Code2 className="w-4 h-4 text-gray-300" />
                    <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">JSON</span>
                  </div>
                  <textarea
                    value={jsonInput}
                    onChange={(e) => setJsonInput(e.target.value)}
                    placeholder='{"items": [{"sentence": "...", "translation": "..."}]}'
                    className={`w-full h-96 p-6 font-mono text-sm bg-gray-900 text-gray-300 rounded-3xl border-0 focus:ring-4 ${error ? 'focus:ring-red-500/10 border-red-500' : 'focus:ring-blue-500/10'} outline-none transition-all resize-none shadow-inner`}
                  />
                </div>
                {error && (
                  <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/10 text-red-700 dark:text-red-400 rounded-2xl border border-red-100 dark:border-red-900/50 animate-in zoom-in-95 duration-200">
                    <AlertCircle className="w-5 h-5 shrink-0" />
                    <p className="text-sm font-medium">{error}</p>
                  </div>
                )}
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={!jsonInput.trim()}
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 dark:disabled:bg-gray-800 text-white font-bold rounded-2xl transition-all shadow-lg shadow-blue-200 dark:shadow-blue-900/20 active:scale-95 disabled:active:scale-100"
                >
                  다음 단계로
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </form>
          </div>
        )}

        {step === 2 && parsedData && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between bg-white dark:bg-gray-900 p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center">
                  <FileJson className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h2 className="font-bold text-gray-900 dark:text-white">단어 정보 입력 (선택)</h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">각 문장에 포함된 주요 단어들의 JSON 정보를 입력하세요.</p>
                </div>
              </div>
              <div className="text-sm font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-4 py-2 rounded-xl">
                총 {parsedData.items.length}개 문장
              </div>
            </div>

            <div className="space-y-4">
              {parsedData.items.map((item, index) => (
                <div key={index} className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
                  <div className="p-6 bg-gray-50/50 dark:bg-gray-800/50 border-b border-gray-50 dark:border-gray-800">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest">문장 {index + 1}</span>
                      <button 
                        onClick={() => handleWordJsonChange(index, wordExampleJson)}
                        className="text-[10px] font-bold text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                      >
                        예시 채우기
                      </button>
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">{item.sentence}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{item.translation}</p>
                  </div>
                  <div className="p-6">
                    <div className="relative">
                      <div className="absolute top-4 right-4 flex items-center gap-2">
                        <Code2 className="w-4 h-4 text-gray-300 dark:text-gray-700" />
                        <span className="text-[10px] font-bold text-gray-300 dark:text-gray-700 uppercase tracking-widest">WORDS JSON</span>
                      </div>
                      <textarea
                        value={wordJsons[index]}
                        onChange={(e) => handleWordJsonChange(index, e.target.value)}
                        placeholder='{"words": { "word": { ... } }}'
                        className={`w-full h-48 p-4 font-mono text-xs bg-gray-900 text-gray-300 rounded-2xl border-0 focus:ring-4 ${wordErrors[index] ? 'focus:ring-red-500/20' : 'focus:ring-blue-500/10'} outline-none transition-all resize-none shadow-inner`}
                      />
                    </div>
                    {wordErrors[index] && (
                      <div className="mt-3 flex items-center gap-2 text-red-600 dark:text-red-400 text-xs font-medium">
                        <AlertCircle className="w-4 h-4" />
                        {wordErrors[index]}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-between p-8 bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm">
              <button
                onClick={() => setStep(1)}
                className="px-8 py-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 font-bold rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all active:scale-95"
              >
                이전으로
              </button>
              <button
                onClick={validateWordJsons}
                className="inline-flex items-center justify-center gap-2 px-10 py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl transition-all shadow-lg shadow-blue-200 dark:shadow-blue-900/20 active:scale-95"
              >
                다음 설정 단계
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {step === 3 && parsedData && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
            <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
              <div className="p-6 bg-gray-50/50 dark:bg-gray-800/50 border-b border-gray-50 dark:border-gray-800 flex items-center gap-3">
                <Tag className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <h2 className="font-bold text-gray-900 dark:text-white">번들 정보 설정</h2>
              </div>
              <div className="p-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 dark:text-gray-300 ml-1">번들 제목</label>
                    <input 
                      type="text"
                      value={bundleMeta.title}
                      onChange={(e) => setBundleMeta({...bundleMeta, title: e.target.value})}
                      placeholder="번들 제목을 입력하세요"
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/20 focus:border-blue-400 dark:focus:border-blue-500 outline-none transition-all text-gray-900 dark:text-gray-100"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 dark:text-gray-300 ml-1">카테고리</label>
                    <select 
                      value={bundleMeta.category_id}
                      onChange={(e) => setBundleMeta({...bundleMeta, category_id: e.target.value})}
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/20 focus:border-blue-400 dark:focus:border-blue-500 outline-none transition-all appearance-none cursor-pointer text-gray-900 dark:text-gray-100"
                    >
                      <option value="">카테고리 선택</option>
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-bold text-gray-700 dark:text-gray-300 ml-1">번들 설명</label>
                    <textarea 
                      rows={3}
                      value={bundleMeta.description}
                      onChange={(e) => setBundleMeta({...bundleMeta, description: e.target.value})}
                      placeholder="번들에 대한 상세 설명을 입력하세요"
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/20 focus:border-blue-400 dark:focus:border-blue-500 outline-none resize-none transition-all text-gray-900 dark:text-gray-100"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 dark:text-gray-300 ml-1">학습 레벨 (1-10)</label>
                    <input 
                      type="number"
                      min={1}
                      max={10}
                      value={bundleMeta.level}
                      onChange={(e) => setBundleMeta({...bundleMeta, level: parseInt(e.target.value) || 1})}
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/20 focus:border-blue-400 dark:focus:border-blue-500 outline-none transition-all text-gray-900 dark:text-gray-100"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 dark:text-gray-300 ml-1">공개 여부</label>
                    <div className="flex items-center gap-6 py-2 ml-1">
                      <label className="flex items-center gap-2 cursor-pointer group">
                        <input 
                          type="radio"
                          checked={bundleMeta.is_published}
                          onChange={() => setBundleMeta({...bundleMeta, is_published: true})}
                          className="w-4 h-4 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                        <span className="text-sm font-medium text-gray-600 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">공개</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer group">
                        <input 
                          type="radio"
                          checked={!bundleMeta.is_published}
                          onChange={() => setBundleMeta({...bundleMeta, is_published: false})}
                          className="w-4 h-4 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                        <span className="text-sm font-medium text-gray-600 dark:text-gray-400 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">비공개</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
              <div className="p-6 bg-gray-50/50 dark:bg-gray-800/50 border-b border-gray-50 dark:border-gray-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <ImageIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <h2 className="font-bold text-gray-900 dark:text-white">이미지 라이브러리</h2>
                </div>
                <div className="relative">
                  <input 
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl hover:bg-blue-700 transition-colors">
                    <Plus className="w-4 h-4" />
                    이미지 추가
                  </button>
                </div>
              </div>
              <div className="p-8">
                {uploadedImages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-gray-100 dark:border-gray-800 rounded-3xl bg-gray-50/50 dark:bg-gray-800/20">
                    <UploadCloud className="w-12 h-12 text-gray-300 dark:text-gray-700 mb-4" />
                    <p className="text-gray-400 dark:text-gray-500 font-medium text-sm">업로드된 이미지가 없습니다.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {uploadedImages.map((img, idx) => (
                      <div key={idx} className="group relative aspect-square rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-800 border border-gray-100 dark:border-gray-800">
                        <img src={img.url} alt={`Uploaded ${idx}`} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <button 
                            onClick={() => removeImage(idx)}
                            className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="absolute top-2 left-2 px-2 py-1 bg-white/90 dark:bg-gray-800/90 text-gray-900 dark:text-gray-100 text-[10px] font-bold rounded-lg shadow-sm">
                          #{idx + 1}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
              <div className="p-6 bg-gray-50/50 dark:bg-gray-800/50 border-b border-gray-50 dark:border-gray-800 flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <h2 className="font-bold text-gray-900 dark:text-white">문장별 이미지 매칭</h2>
              </div>
              <div className="p-0 max-h-[600px] overflow-y-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 bg-gray-50 dark:bg-gray-800 text-gray-400 dark:text-gray-500 text-[10px] font-bold uppercase tracking-widest border-b border-gray-100 dark:border-gray-800 z-10">
                    <tr>
                      <th className="px-6 py-4 w-16">순번</th>
                      <th className="px-6 py-4">문장</th>
                      <th className="px-6 py-4">이미지 선택</th>
                      <th className="px-6 py-4 w-40">미리보기</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                    {parsedData.items.map((item, index) => (
                      <tr key={index} className="hover:bg-blue-50/20 dark:hover:bg-blue-900/10 transition-colors">
                        <td className="px-6 py-6">
                          <span className="text-sm font-bold text-gray-400">#{index + 1}</span>
                        </td>
                        <td className="px-6 py-6">
                          <p className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-1">{item.sentence}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{item.translation}</p>
                        </td>
                        <td className="px-6 py-6">
                          <select 
                            value={itemImageMappings[index] === null ? '' : itemImageMappings[index]}
                            onChange={(e) => handleMappingChange(index, e.target.value === '' ? null : parseInt(e.target.value))}
                            className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/20 transition-all cursor-pointer"
                          >
                            <option value="">이미지 없음</option>
                            {uploadedImages.map((_, imgIdx) => (
                              <option key={imgIdx} value={imgIdx}>이미지 #{imgIdx + 1}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-6 py-6">
                          {itemImageMappings[index] !== null ? (
                            <div className="w-24 aspect-video rounded-lg overflow-hidden border border-gray-100 dark:border-gray-800 shadow-sm bg-gray-100 dark:bg-gray-800">
                              <img 
                                src={uploadedImages[itemImageMappings[index]!].url} 
                                alt="Preview" 
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ) : (
                            <div className="w-24 aspect-video rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-dashed border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-400 dark:text-gray-600">
                              <ImageIcon className="w-4 h-4" />
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-between p-8 bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm">
              <button
                onClick={() => setStep(2)}
                className="px-8 py-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 font-bold rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all active:scale-95"
              >
                이전으로
              </button>
              <button
                disabled={isSubmitting || !bundleMeta.title}
                onClick={handleSubmit}
                className="inline-flex items-center justify-center gap-2 px-12 py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 dark:disabled:bg-gray-800 text-white font-bold rounded-2xl transition-all shadow-lg shadow-blue-200 dark:shadow-blue-900/20 active:scale-95 disabled:active:scale-100"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    생성 중...
                  </>
                ) : (
                  <>
                    번들 생성 완료
                    <CheckCircle2 className="w-5 h-5" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
