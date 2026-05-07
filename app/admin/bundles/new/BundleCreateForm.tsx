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
  Loader2
} from 'lucide-react';
import Link from 'next/link';
import { listCategories, createBundleWithItems } from '@/lib/supabase/services/bundles';
import { uploadThumbnail } from '@/lib/supabase/services/storage';

interface BundleItemInput {
  sentence: string;
  translation: string;
  translation_en: string;
}

interface BundleJsonInput {
  items: BundleItemInput[];
}

export default function BundleCreateForm() {
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
  }, []);

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
    <div className="md:ml-64 p-4 md:p-8 pt-20 md:pt-8 bg-gray-50 min-h-[calc(100vh-5rem)]">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex items-center gap-4">
          <Link 
            href="/admin/bundles"
            className="p-2 bg-white rounded-xl border border-gray-100 text-gray-500 hover:text-blue-600 hover:border-blue-100 transition-all shadow-sm group"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          </Link>
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">새 번들 생성</h1>
            <p className="text-gray-500 text-sm">학습 번들을 단계별로 구성합니다.</p>
          </div>
        </div>

        <div className="flex items-center gap-4 p-4 bg-white rounded-3xl border border-gray-100 shadow-sm overflow-x-auto no-scrollbar">
          <div className={`flex items-center gap-3 px-4 py-2 shrink-0 ${step >= 1 ? 'bg-blue-50 text-blue-700' : 'text-gray-400'} rounded-2xl font-bold`}>
            <div className={`w-8 h-8 rounded-full ${step >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-400'} flex items-center justify-center text-sm`}>1</div>
            <span>문장 데이터</span>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-300 shrink-0" />
          <div className={`flex items-center gap-3 px-4 py-2 shrink-0 ${step >= 2 ? 'bg-blue-50 text-blue-700' : 'text-gray-400'} rounded-2xl font-bold`}>
            <div className={`w-8 h-8 rounded-full ${step >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-400'} flex items-center justify-center text-sm`}>2</div>
            <span>단어 데이터</span>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-300 shrink-0" />
          <div className={`flex items-center gap-3 px-4 py-2 shrink-0 ${step >= 3 ? 'bg-blue-50 text-blue-700' : 'text-gray-400'} rounded-2xl font-bold`}>
            <div className={`w-8 h-8 rounded-full ${step >= 3 ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-400'} flex items-center justify-center text-sm`}>3</div>
            <span>번들 설정 & 이미지</span>
          </div>
        </div>

        {step === 1 && (
          <div className="bg-white rounded-3xl border border-gray-100 shadow-xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="p-6 border-b border-gray-50 bg-gray-50/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-2xl flex items-center justify-center">
                  <FileJson className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="font-bold text-gray-900">문장 목록 입력</h2>
                  <p className="text-xs text-gray-500">전체 문장 리스트 JSON을 입력하세요.</p>
                </div>
              </div>
              <button 
                onClick={() => setJsonInput(exampleJson)}
                className="text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 px-3 py-1.5 rounded-lg transition-colors"
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
                  <div className="flex items-center gap-3 p-4 bg-red-50 text-red-700 rounded-2xl border border-red-100 animate-in zoom-in-95 duration-200">
                    <AlertCircle className="w-5 h-5 shrink-0" />
                    <p className="text-sm font-medium">{error}</p>
                  </div>
                )}
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={!jsonInput.trim()}
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 text-white font-bold rounded-2xl transition-all shadow-lg shadow-blue-200 active:scale-95 disabled:active:scale-100"
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
            <div className="flex items-center justify-between bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-2xl flex items-center justify-center">
                  <FileJson className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="font-bold text-gray-900">단어 정보 입력 (선택)</h2>
                  <p className="text-xs text-gray-500">각 문장에 포함된 주요 단어들의 JSON 정보를 입력하세요.</p>
                </div>
              </div>
              <div className="text-sm font-bold text-blue-600 bg-blue-50 px-4 py-2 rounded-xl">
                총 {parsedData.items.length}개 문장
              </div>
            </div>

            <div className="space-y-4">
              {parsedData.items.map((item, index) => (
                <div key={index} className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="p-6 bg-gray-50/50 border-b border-gray-50">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-blue-600 uppercase tracking-widest">문장 {index + 1}</span>
                      <button 
                        onClick={() => handleWordJsonChange(index, wordExampleJson)}
                        className="text-[10px] font-bold text-gray-400 hover:text-blue-600 transition-colors"
                      >
                        예시 채우기
                      </button>
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-1">{item.sentence}</h3>
                    <p className="text-sm text-gray-500">{item.translation}</p>
                  </div>
                  <div className="p-6">
                    <div className="relative">
                      <div className="absolute top-4 right-4 flex items-center gap-2">
                        <Code2 className="w-4 h-4 text-gray-300" />
                        <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">WORDS JSON</span>
                      </div>
                      <textarea
                        value={wordJsons[index]}
                        onChange={(e) => handleWordJsonChange(index, e.target.value)}
                        placeholder='{"words": { "word": { ... } }}'
                        className={`w-full h-48 p-4 font-mono text-xs bg-gray-900 text-gray-300 rounded-2xl border-0 focus:ring-4 ${wordErrors[index] ? 'focus:ring-red-500/20' : 'focus:ring-blue-500/10'} outline-none transition-all resize-none shadow-inner`}
                      />
                    </div>
                    {wordErrors[index] && (
                      <div className="mt-3 flex items-center gap-2 text-red-600 text-xs font-medium">
                        <AlertCircle className="w-4 h-4" />
                        {wordErrors[index]}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-between p-8 bg-white rounded-3xl border border-gray-100 shadow-sm">
              <button
                onClick={() => setStep(1)}
                className="px-8 py-4 bg-white border border-gray-200 text-gray-600 font-bold rounded-2xl hover:bg-gray-50 transition-all active:scale-95"
              >
                이전으로
              </button>
              <button
                onClick={validateWordJsons}
                className="inline-flex items-center justify-center gap-2 px-10 py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl transition-all shadow-lg shadow-blue-200 active:scale-95"
              >
                다음 설정 단계
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {step === 3 && parsedData && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="p-6 bg-gray-50/50 border-b border-gray-50 flex items-center gap-3">
                <Tag className="w-5 h-5 text-blue-600" />
                <h2 className="font-bold text-gray-900">번들 정보 설정</h2>
              </div>
              <div className="p-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 ml-1">번들 제목</label>
                    <input 
                      type="text"
                      value={bundleMeta.title}
                      onChange={(e) => setBundleMeta({...bundleMeta, title: e.target.value})}
                      placeholder="번들 제목을 입력하세요"
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 ml-1">카테고리</label>
                    <select 
                      value={bundleMeta.category_id}
                      onChange={(e) => setBundleMeta({...bundleMeta, category_id: e.target.value})}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all appearance-none cursor-pointer"
                    >
                      <option value="">카테고리 선택</option>
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-bold text-gray-700 ml-1">번들 설명</label>
                    <textarea 
                      rows={3}
                      value={bundleMeta.description}
                      onChange={(e) => setBundleMeta({...bundleMeta, description: e.target.value})}
                      placeholder="번들에 대한 상세 설명을 입력하세요"
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none resize-none transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 ml-1">학습 레벨 (1-10)</label>
                    <input 
                      type="number"
                      min={1}
                      max={10}
                      value={bundleMeta.level}
                      onChange={(e) => setBundleMeta({...bundleMeta, level: parseInt(e.target.value) || 1})}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 ml-1">공개 여부</label>
                    <div className="flex items-center gap-6 py-2 ml-1">
                      <label className="flex items-center gap-2 cursor-pointer group">
                        <input 
                          type="radio"
                          checked={bundleMeta.is_published}
                          onChange={() => setBundleMeta({...bundleMeta, is_published: true})}
                          className="w-4 h-4 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                        <span className="text-sm font-medium text-gray-600 group-hover:text-blue-600 transition-colors">공개</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer group">
                        <input 
                          type="radio"
                          checked={!bundleMeta.is_published}
                          onChange={() => setBundleMeta({...bundleMeta, is_published: false})}
                          className="w-4 h-4 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                        <span className="text-sm font-medium text-gray-600 group-hover:text-amber-600 transition-colors">비공개</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="p-6 bg-gray-50/50 border-b border-gray-50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <ImageIcon className="w-5 h-5 text-blue-600" />
                  <h2 className="font-bold text-gray-900">이미지 라이브러리</h2>
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
                  <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-gray-100 rounded-3xl bg-gray-50/50">
                    <UploadCloud className="w-12 h-12 text-gray-300 mb-4" />
                    <p className="text-gray-400 font-medium text-sm">업로드된 이미지가 없습니다.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {uploadedImages.map((img, idx) => (
                      <div key={idx} className="group relative aspect-square rounded-2xl overflow-hidden bg-gray-100 border border-gray-100">
                        <img src={img.url} alt={`Uploaded ${idx}`} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <button 
                            onClick={() => removeImage(idx)}
                            className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="absolute top-2 left-2 px-2 py-1 bg-white/90 text-[10px] font-bold rounded-lg shadow-sm">
                          #{idx + 1}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="p-6 bg-gray-50/50 border-b border-gray-50 flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-blue-600" />
                <h2 className="font-bold text-gray-900">문장별 이미지 매칭</h2>
              </div>
              <div className="p-0 max-h-[600px] overflow-y-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 bg-gray-50 text-gray-400 text-[10px] font-bold uppercase tracking-widest border-b border-gray-100 z-10">
                    <tr>
                      <th className="px-6 py-4 w-16">순번</th>
                      <th className="px-6 py-4">문장</th>
                      <th className="px-6 py-4">이미지 선택</th>
                      <th className="px-6 py-4 w-40">미리보기</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {parsedData.items.map((item, index) => (
                      <tr key={index} className="hover:bg-blue-50/20 transition-colors">
                        <td className="px-6 py-6">
                          <span className="text-sm font-bold text-gray-400">#{index + 1}</span>
                        </td>
                        <td className="px-6 py-6">
                          <p className="text-sm font-bold text-gray-900 mb-1">{item.sentence}</p>
                          <p className="text-xs text-gray-500">{item.translation}</p>
                        </td>
                        <td className="px-6 py-6">
                          <select 
                            value={itemImageMappings[index] === null ? '' : itemImageMappings[index]}
                            onChange={(e) => handleMappingChange(index, e.target.value === '' ? null : parseInt(e.target.value))}
                            className="w-full px-3 py-2 bg-gray-50 border border-gray-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-100 transition-all cursor-pointer"
                          >
                            <option value="">이미지 없음</option>
                            {uploadedImages.map((_, imgIdx) => (
                              <option key={imgIdx} value={imgIdx}>이미지 #{imgIdx + 1}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-6 py-6">
                          {itemImageMappings[index] !== null ? (
                            <div className="w-24 aspect-video rounded-lg overflow-hidden border border-gray-100 shadow-sm">
                              <img 
                                src={uploadedImages[itemImageMappings[index]!].url} 
                                alt="Preview" 
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ) : (
                            <div className="w-24 aspect-video rounded-lg bg-gray-50 border border-dashed border-gray-200 flex items-center justify-center">
                              <ImageIcon className="w-4 h-4 text-gray-300" />
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-between p-8 bg-white rounded-3xl border border-gray-100 shadow-sm">
              <button
                onClick={() => setStep(2)}
                className="px-8 py-4 bg-white border border-gray-200 text-gray-600 font-bold rounded-2xl hover:bg-gray-50 transition-all active:scale-95"
              >
                이전으로
              </button>
              <button
                disabled={isSubmitting || !bundleMeta.title}
                onClick={handleSubmit}
                className="inline-flex items-center justify-center gap-2 px-12 py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 text-white font-bold rounded-2xl transition-all shadow-lg shadow-blue-200 active:scale-95 disabled:active:scale-100"
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
