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
  Copy,
  Tag,
  ImageIcon,
  Plus,
  UploadCloud,
  Trash2,
  Loader2,
  ImagePlus,
  Save,
  RotateCcw,
  Volume2
} from 'lucide-react';
import Link from 'next/link';
import { listCategories, listBundleTypes, createBundleWithItems, getBundle } from '@/lib/supabase/services/bundles';
import { deleteFileFromPublicUrl, deleteFilesInFolder, uploadThumbnail } from '@/lib/supabase/services/storage';
import { 
  saveAdminDraft, 
  getAdminDraft, 
  deleteAdminDraft,
  listAdminDrafts,
  deleteAdminDraftById
} from '@/lib/supabase/services/admin-drafts';
import { 
  Clock,
  X,
  FileText,
  History
} from 'lucide-react';

interface BundleItemInput {
  sentence: string;
  translation: string;
  translation_en: string;
}

interface BundleJsonInput {
  items: BundleItemInput[];
}

type TTSProvider = 'google' | 'elevenlabs';

interface TTSOption {
  id: string;
  name: string;
}

const TTS_PROVIDERS: Record<TTSProvider, { name: string; models: TTSOption[]; voices: TTSOption[] }> = {
  google: {
    name: 'Google Cloud TTS',
    models: [
      { id: 'standard', name: 'Standard' },
      { id: 'wavenet', name: 'WaveNet' },
      { id: 'neural2', name: 'Neural2' },
      { id: 'studio', name: 'Studio' },
    ],
    voices: [
      { id: 'es-ES-Standard-A', name: 'es-ES-Standard-A (여성)' },
      { id: 'es-ES-Standard-B', name: 'es-ES-Standard-B (남성)' },
      { id: 'es-ES-Neural2-A', name: 'es-ES-Neural2-A (여성)' },
      { id: 'es-ES-Neural2-B', name: 'es-ES-Neural2-B (남성)' },
      { id: 'es-ES-Wavenet-B', name: 'es-ES-Wavenet-B (남성)' },
      { id: 'es-ES-Wavenet-C', name: 'es-ES-Wavenet-C (여성)' },
    ]
  },
  elevenlabs: {
    name: 'ElevenLabs',
    models: [
      { id: 'eleven_multilingual_v2', name: 'Multilingual v2' },
      { id: 'eleven_multilingual_v1', name: 'Multilingual v1' },
      { id: 'eleven_monolingual_v1', name: 'Monolingual v1' },
    ],
    voices: [
      { id: '2Lb1en5ujrODDIqmp7F3', name: '선호 성우 (Custom)' },
      { id: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel (미국, 여성)' },
      { id: '29vD33N1CtxCmqQRPOHJ', name: 'Drew (미국, 남성)' },
      { id: 'pNInz6obpgDQGcFmaJcg', name: 'Antoni (미국, 남성)' },
      { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Bella (미국, 여성)' },
      { id: 'AZnzlk1XvdvUeBnXmlld', name: 'Domi (미국, 여성)' },
    ]
  }
};

const defaultSentenceTtsOptions = {
  provider: 'elevenlabs' as TTSProvider,
  model: TTS_PROVIDERS.elevenlabs.models[0].id,
  voice: TTS_PROVIDERS.elevenlabs.voices[0].id,
  speed: 0.8,
};

interface Props {
  userId: string;
}

function createPendingBundleId() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  return '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, char =>
    (Number(char) ^ Math.floor(Math.random() * 16) >> Number(char) / 4).toString(16)
  );
}

const sentenceJsonFields = ['sentence', 'translation', 'translation_en'] as const;

function escapeLooseJsonStringValue(value: string) {
  let escaped = '';

  for (let i = 0; i < value.length; i++) {
    const char = value[i];

    if (char === '\\') {
      escaped += char;
      if (i + 1 < value.length) {
        escaped += value[i + 1];
        i++;
      }
      continue;
    }

    escaped += char === '"' ? '\\"' : char;
  }

  return escaped;
}

function repairBundleJsonInput(input: string): BundleJsonInput | null {
  const repairedLines = input.split('\n').map((line) => {
    for (const field of sentenceJsonFields) {
      const match = line.match(new RegExp(`^(\\s*"${field}"\\s*:\\s*)"(.*)"(\\s*,?\\s*)$`));

      if (match) {
        return `${match[1]}"${escapeLooseJsonStringValue(match[2])}"${match[3]}`;
      }
    }

    return line;
  });

  let repaired = repairedLines.join('\n').trim();
  repaired = repaired.replace(/,\s*$/, '');
  repaired = repaired.replace(/,\s*([}\]])/g, '$1');

  const hasItemsArray = /"items"\s*:/.test(repaired);
  const hasSentenceFields = sentenceJsonFields.every((field) => new RegExp(`"${field}"\\s*:`).test(repaired));

  if (!hasItemsArray && hasSentenceFields) {
    repaired = `{\n  "items": [\n${repaired}\n  ]\n}`;
  }

  try {
    return JSON.parse(repaired);
  } catch {
    return null;
  }
}

export default function BundleCreateForm({ userId }: Props) {
  const router = useRouter();
  const [pendingBundleId, setPendingBundleId] = useState(createPendingBundleId);
  const [step, setStep] = useState(1);
  const [jsonInput, setJsonInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [parsedData, setParsedData] = useState<BundleJsonInput | null>(null);

  const [wordJsons, setWordJsons] = useState<string[]>([]);
  const [wordErrors, setWordErrors] = useState<(string | null)[]>([]);
  
  // Step 3 State
  const [categories, setCategories] = useState<any[]>([]);
  const [bundleTypes, setBundleTypes] = useState<any[]>([]);
  const [bundleMeta, setBundleMeta] = useState({
    title: '',
    title_en: '',
    description: '',
    description_en: '',
    level: 1,
    category_id: '',
    type_id: '',
    thumbnail_url: '',
    is_published: false
  });
  const [sentenceTtsOptions, setSentenceTtsOptions] = useState(defaultSentenceTtsOptions);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [uploadedImages, setUploadedImages] = useState<{file?: File, previewUrl: string, remoteUrl?: string}[]>([]);
  const [itemImageMappings, setItemImageMappings] = useState<(number | null)[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [tempTitle, setTempTitle] = useState('');
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(null);
  const [isLoadModalOpen, setIsLoadModalOpen] = useState(false);
  const [draftsList, setDraftsList] = useState<any[]>([]);
  const [isLoadingDrafts, setIsLoadingDrafts] = useState(false);
  const [copiedSentenceIndex, setCopiedSentenceIndex] = useState<number | null>(null);

  const DRAFT_TYPE = 'bundle_create';

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [cats, types] = await Promise.all([
          listCategories(),
          listBundleTypes()
        ]);
        setCategories(cats);
        setBundleTypes(types);
      } catch (err) {
        console.error('Failed to fetch initial data', err);
      }
    };
    fetchData();

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
      // 1. Upload main thumbnail if pending
      let finalThumbnailUrl = bundleMeta.thumbnail_url;
      if (thumbnailFile) {
        const formData = new FormData();
        formData.append('file', thumbnailFile);
        finalThumbnailUrl = await uploadThumbnail(formData, `bundles/${pendingBundleId}/thumbnail`);
        setThumbnailFile(null);
      }

      // 2. Upload any pending local images first
      const updatedImages = [...uploadedImages];
      for (let i = 0; i < updatedImages.length; i++) {
        const img = updatedImages[i];
        if (img.file && !img.remoteUrl) {
          const formData = new FormData();
          formData.append('file', img.file);
          const url = await uploadThumbnail(formData, `bundles/${pendingBundleId}/items`);
          updatedImages[i] = {
            ...img,
            remoteUrl: url,
            previewUrl: url,
            file: undefined
          };
        }
      }
      setUploadedImages(updatedImages);

      // 3. Prepare draft data with remote URLs
      const draftData = {
        step,
        tempTitle,
        jsonInput,
        parsedData,
        wordJsons,
        bundleMeta: { ...bundleMeta, thumbnail_url: finalThumbnailUrl },
        sentenceTtsOptions,
        pendingBundleId,
        itemImageMappings,
        savedImages: updatedImages.map(img => img.remoteUrl).filter(Boolean)
      };
      
      const saved = await saveAdminDraft(userId, DRAFT_TYPE, draftData, currentDraftId || undefined);
      setBundleMeta(prev => ({ ...prev, thumbnail_url: finalThumbnailUrl }));
      setLastSaved(saved.updated_at);
      setCurrentDraftId(saved.id);
      alert('서버에 임시 저장되었습니다. (이미지 업로드 포함)');
    } catch (err: any) {
      console.error('Failed to save draft', err);
      alert('임시 저장 중 오류가 발생했습니다: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const fetchDraftsList = async () => {
    setIsLoadingDrafts(true);
    try {
      const list = await listAdminDrafts(userId, DRAFT_TYPE);
      setDraftsList(list);
    } catch (err) {
      console.error('Failed to fetch drafts list', err);
    } finally {
      setIsLoadingDrafts(false);
    }
  };

  const openLoadModal = async () => {
    await fetchDraftsList();
    setIsLoadModalOpen(true);
  };

  const loadSpecificDraft = async (draftRecord: any) => {
    if (!confirm('선택한 임시 데이터를 불러오시겠습니까? 현재 작성 중인 내용은 사라집니다.')) {
      return;
    }

    try {
      const draft = draftRecord.data;
      setStep(draft.step || 1);
      setTempTitle(draft.tempTitle || '');
      setJsonInput(draft.jsonInput || '');
      setParsedData(draft.parsedData || null);
      setWordJsons(draft.wordJsons || []);
      setPendingBundleId(draft.pendingBundleId || createPendingBundleId());
      
      const defaultMeta = {
        title: '',
        title_en: '',
        description: '',
        description_en: '',
        level: 1,
        category_id: '',
        type_id: '',
        thumbnail_url: '',
        is_published: false
      };
      setBundleMeta({ ...defaultMeta, ...(draft.bundleMeta || {}) });
      setSentenceTtsOptions({
        ...defaultSentenceTtsOptions,
        ...(draft.sentenceTtsOptions || {})
      });
      
      setItemImageMappings(draft.itemImageMappings || []);
      
      // Restore images from draft
      if (draft.savedImages && Array.isArray(draft.savedImages)) {
        setUploadedImages(draft.savedImages.map((url: string) => ({
          previewUrl: url,
          remoteUrl: url
        })));
      } else {
        setUploadedImages([]);
      }

      setLastSaved(draftRecord.updated_at);
      setCurrentDraftId(draftRecord.id);
      setIsLoadModalOpen(false);
    } catch (e) {
      console.error('Failed to load draft', e);
      alert('데이터 로드 중 오류가 발생했습니다.');
    }
  };

  const deleteDraft = async (draftRecord: any) => {
    if (!confirm('이 임시 저장 데이터를 삭제하시겠습니까?')) return;
    
    try {
      const pendingId = draftRecord.data?.pendingBundleId;
      const completedBundle = pendingId ? await getBundle(pendingId) : null;

      if (pendingId && !completedBundle) {
        await deleteFilesInFolder(`bundles/${pendingId}`);
      } else if (!completedBundle) {
        const urls = new Set<string>();
        const thumbnailUrl = draftRecord.data?.bundleMeta?.thumbnail_url;
        if (thumbnailUrl) urls.add(thumbnailUrl);
        if (Array.isArray(draftRecord.data?.savedImages)) {
          draftRecord.data.savedImages.forEach((url: string) => urls.add(url));
        }
        await Promise.all(Array.from(urls).map(url => deleteFileFromPublicUrl(url)));
      }

      const id = draftRecord.id;
      await deleteAdminDraftById(id, userId);
      if (currentDraftId === id) {
        setCurrentDraftId(null);
        setLastSaved(null);
        setThumbnailFile(null);
        setUploadedImages([]);
        setBundleMeta(prev => ({ ...prev, thumbnail_url: '' }));
      }
      await fetchDraftsList();
    } catch (err: any) {
      alert('삭제 중 오류가 발생했습니다.');
    }
  };

  const createNewDraft = () => {
    if (confirm('현재 작업 중인 내용을 초기화하고 새로 작성하시겠습니까?')) {
      setStep(1);
      setPendingBundleId(createPendingBundleId());
      setTempTitle('');
      setJsonInput('');
      setParsedData(null);
      setWordJsons([]);
      setBundleMeta({
        title: '',
        title_en: '',
        description: '',
        description_en: '',
        level: 1,
        category_id: '',
        type_id: '',
        thumbnail_url: '',
        is_published: false
      });
      setSentenceTtsOptions(defaultSentenceTtsOptions);
      setThumbnailFile(null);
      setItemImageMappings([]);
      setLastSaved(null);
      setCurrentDraftId(null);
    }
  };

  const handleJsonSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    try {
      let parsed: BundleJsonInput;
      let repairedInput = false;

      try {
        parsed = JSON.parse(jsonInput);
      } catch {
        const repaired = repairBundleJsonInput(jsonInput);

        if (!repaired) {
          throw new Error('Invalid JSON format.');
        }

        parsed = repaired;
        repairedInput = true;
      }
      
      if (!parsed.items || !Array.isArray(parsed.items)) {
        throw new Error('JSON must contain an "items" array.');
      }
      
      if (parsed.items.length === 0) {
        throw new Error('Items array cannot be empty.');
      }
      
      for (const item of parsed.items) {
        if (
          typeof item.sentence !== 'string' ||
          typeof item.translation !== 'string' ||
          typeof item.translation_en !== 'string' ||
          !item.sentence.trim() ||
          !item.translation.trim() ||
          !item.translation_en.trim()
        ) {
          throw new Error('각 item에는 "sentence", "translation", "translation_en" 문자열 값이 모두 필요합니다.');
        }
      }
      
      const normalized = {
        items: parsed.items.map((item: BundleItemInput) => ({
          sentence: item.sentence.trim(),
          translation: item.translation.trim(),
          translation_en: item.translation_en.trim()
        }))
      };

      setParsedData(normalized);
      if (repairedInput) {
        setJsonInput(JSON.stringify(normalized, null, 2));
      }
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

  const copySentence = async (sentence: string, index: number) => {
    try {
      await navigator.clipboard.writeText(sentence);
      setCopiedSentenceIndex(index);
      setTimeout(() => {
        setCopiedSentenceIndex(current => current === index ? null : current);
      }, 1200);
    } catch (err) {
      alert('문장 복사에 실패했습니다.');
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newImages = Array.from(files).map(file => ({
      file,
      previewUrl: URL.createObjectURL(file)
    }));

    setUploadedImages([...uploadedImages, ...newImages]);
  };

  const removeImage = (index: number) => {
    const newImages = [...uploadedImages];
    if (newImages[index].file) {
      URL.revokeObjectURL(newImages[index].previewUrl);
    }
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

  const handleSentenceTtsProviderChange = (provider: TTSProvider) => {
    setSentenceTtsOptions({
      provider,
      model: TTS_PROVIDERS[provider].models[0].id,
      voice: TTS_PROVIDERS[provider].voices[0].id,
      speed: sentenceTtsOptions.speed,
    });
  };

  const handleSubmit = async () => {
    if (!bundleMeta.title) {
      alert('번들 제목을 입력해주세요.');
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Upload main thumbnail if pending
      let finalThumbnailUrl = bundleMeta.thumbnail_url;
      if (thumbnailFile) {
        const formData = new FormData();
        formData.append('file', thumbnailFile);
        finalThumbnailUrl = await uploadThumbnail(formData, `bundles/${pendingBundleId}/thumbnail`);
      }

      // 2. Upload only pending local images
      const imageUrls: string[] = [];
      for (const img of uploadedImages) {
        if (img.remoteUrl) {
          imageUrls.push(img.remoteUrl);
        } else if (img.file) {
          const formData = new FormData();
          formData.append('file', img.file);
          const url = await uploadThumbnail(formData, `bundles/${pendingBundleId}/items`);
          imageUrls.push(url);
        }
      }

      // 3. Prepare items with mapped image URLs
      const itemsToCreate = parsedData!.items.map((item, idx) => {
        const imageIndex = itemImageMappings[idx];
        return {
          ...item,
          wordJson: wordJsons[idx],
          imageUrl: imageIndex !== null ? imageUrls[imageIndex] : null
        };
      });

      // 4. Create bundle with items
      const bundle = await createBundleWithItems(
        { ...bundleMeta, id: pendingBundleId, thumbnail_url: finalThumbnailUrl },
        itemsToCreate,
        sentenceTtsOptions
      );

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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link 
              href="/admin/bundles"
              className="p-2 bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-100 dark:hover:border-blue-900 transition-all shadow-sm group shrink-0"
            >
              <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            </Link>
            <div className="min-w-0">
              <h1 className="text-xl md:text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight truncate">새 번들 생성</h1>
              <p className="text-gray-500 dark:text-gray-400 text-xs md:text-sm truncate">학습 번들을 단계별로 구성합니다.</p>
            </div>
          </div>
          
          <div className="flex items-center justify-end gap-2">
            {lastSaved && (
              <div className="hidden lg:block text-right mr-2">
                <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">마지막 저장</p>
                <p className="text-xs text-gray-500">{new Date(lastSaved).toLocaleTimeString()}</p>
              </div>
            )}
            <button
              onClick={openLoadModal}
              className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl text-xs font-bold text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-all shadow-sm"
            >
              <RotateCcw className="w-4 h-4" />
              <span>불러오기</span>
            </button>
            <button
              onClick={saveDraft}
              disabled={isSaving}
              className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 dark:shadow-blue-900/20 disabled:opacity-50"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>{isSaving ? '저장 중...' : '임시저장'}</span>
            </button>
            <button
              onClick={createNewDraft}
              className="p-2 text-gray-400 hover:text-blue-500 transition-colors shrink-0"
              title="새로 작성 (초기화)"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 p-2 bg-white dark:bg-gray-900 rounded-2xl md:rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-x-auto no-scrollbar scroll-smooth">
          <button 
            onClick={() => setStep(1)}
            className={`flex items-center gap-2 md:gap-3 px-3 md:px-4 py-2 shrink-0 ${step >= 1 ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'} rounded-xl md:rounded-2xl font-bold transition-all text-xs md:text-sm`}
          >
            <div className={`w-6 h-6 md:w-8 md:h-8 rounded-full ${step >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500'} flex items-center justify-center text-[10px] md:text-sm shrink-0`}>1</div>
            <span>문장 데이터</span>
          </button>
          <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
          <button 
            onClick={() => parsedData && setStep(2)}
            disabled={!parsedData}
            className={`flex items-center gap-2 md:gap-3 px-3 md:px-4 py-2 shrink-0 ${step >= 2 ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'} rounded-xl md:rounded-2xl font-bold transition-all text-xs md:text-sm ${parsedData ? '' : 'opacity-50 cursor-not-allowed'}`}
          >
            <div className={`w-6 h-6 md:w-8 md:h-8 rounded-full ${step >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500'} flex items-center justify-center text-[10px] md:text-sm shrink-0`}>2</div>
            <span>단어 데이터</span>
          </button>
          <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
          <button 
            onClick={() => parsedData && setStep(3)}
            disabled={!parsedData}
            className={`flex items-center gap-2 md:gap-3 px-3 md:px-4 py-2 shrink-0 ${step >= 3 ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'} rounded-xl md:rounded-2xl font-bold transition-all text-xs md:text-sm ${parsedData ? '' : 'opacity-50 cursor-not-allowed'}`}
          >
            <div className={`w-6 h-6 md:w-8 md:h-8 rounded-full ${step >= 3 ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500'} flex items-center justify-center text-[10px] md:text-sm shrink-0`}>3</div>
            <span>번들 설정</span>
          </button>
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
                type="button"
                onClick={() => setJsonInput(exampleJson)}
                className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 bg-blue-50 dark:bg-blue-900/30 px-3 py-1.5 rounded-lg transition-colors"
              >
                예시 가져오기
              </button>
            </div>
            
            <form onSubmit={handleJsonSubmit} className="p-8 space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700 dark:text-gray-300 ml-1">번들 제목 (임시)</label>
                  <input 
                    type="text"
                    value={tempTitle}
                    onChange={(e) => setTempTitle(e.target.value)}
                    placeholder="임시 저장 시 식별할 제목을 입력하세요"
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/20 focus:border-blue-400 dark:focus:border-blue-500 outline-none transition-all text-gray-900 dark:text-gray-100"
                  />
                </div>
                <div className="relative">
                  <div className="absolute top-4 right-4 flex items-center gap-2">
                    <Code2 className="w-4 h-4 text-gray-300" />
                    <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">JSON</span>
                  </div>
                  <textarea
                    value={jsonInput}
                    onChange={(e) => setJsonInput(e.target.value)}
                    placeholder='{"items": [{"sentence": "...", "translation": "...", "translation_en": "..."}]}'
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
                    <div className="mb-1 flex items-start gap-2">
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white leading-snug">{item.sentence}</h3>
                      <button
                        type="button"
                        onClick={() => copySentence(item.sentence, index)}
                        className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white dark:bg-gray-900 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                        title="스페인어 문장 복사"
                      >
                        {copiedSentenceIndex === index ? (
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{item.translation}</p>
                    <p className="text-xs text-blue-500/70 dark:text-blue-400/70 italic mt-1">{item.translation_en}</p>
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
              <div className="p-8 space-y-10">
                {/* 1. Thumbnail Section (Dedicated Row) */}
                <div className="space-y-4 max-w-sm mx-auto">
                  <label className="text-sm font-bold text-gray-700 dark:text-gray-300 flex justify-center items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-blue-500" />
                    번들 대표 썸네일
                  </label>
                  <div className="relative aspect-[16/9] sm:aspect-[2/1] rounded-3xl overflow-hidden bg-gray-50 dark:bg-gray-800/50 border-2 border-dashed border-gray-200 dark:border-gray-700 group hover:border-blue-400 dark:hover:border-blue-500 transition-all shadow-inner">
                    {bundleMeta.thumbnail_url || thumbnailFile ? (
                      <>
                        <img 
                          src={thumbnailFile ? URL.createObjectURL(thumbnailFile) : bundleMeta.thumbnail_url} 
                          className="w-full h-full object-cover" 
                          alt="Bundle Thumbnail" 
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <label className="p-2 bg-white text-blue-600 rounded-full cursor-pointer hover:bg-blue-50 transition-colors shadow-lg">
                            <ImagePlus className="w-5 h-5" />
                            <input 
                              type="file" 
                              className="hidden" 
                              accept="image/*"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) setThumbnailFile(file);
                              }}
                            />
                          </label>
                          <button 
                            onClick={() => {
                              setThumbnailFile(null);
                              setBundleMeta({...bundleMeta, thumbnail_url: ''});
                            }}
                            className="p-2 bg-white text-red-600 rounded-full hover:bg-red-50 transition-colors shadow-lg"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </>
                    ) : (
                      <label className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer">
                        <div className="w-12 h-12 bg-white dark:bg-gray-900 rounded-2xl shadow-sm flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                          <ImagePlus className="w-6 h-6 text-blue-500" />
                        </div>
                        <span className="text-sm font-bold text-gray-400">대표 이미지 업로드</span>
                        <p className="text-[10px] text-gray-400 mt-1">이미지 미설정 시 첫 번째 문장의 이미지가 사용됩니다.</p>
                        <input 
                          type="file" 
                          className="hidden" 
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) setThumbnailFile(file);
                          }}
                        />
                      </label>
                    )}
                  </div>
                </div>

                {/* 2. Metadata Fields Section */}
                <div className="space-y-6 pt-6 border-t border-gray-50 dark:border-gray-800">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Title Group */}
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-700 dark:text-gray-300 ml-1">번들 제목 (국문)</label>
                      <input 
                        type="text"
                        value={bundleMeta.title}
                        onChange={(e) => setBundleMeta({...bundleMeta, title: e.target.value})}
                        placeholder="국문 제목을 입력하세요"
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/20 focus:border-blue-400 dark:focus:border-blue-500 outline-none transition-all text-gray-900 dark:text-gray-100"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-700 dark:text-gray-300 ml-1">번들 제목 (영문)</label>
                      <input 
                        type="text"
                        value={bundleMeta.title_en}
                        onChange={(e) => setBundleMeta({...bundleMeta, title_en: e.target.value})}
                        placeholder="Bundle title in English"
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/20 focus:border-blue-400 dark:focus:border-blue-500 outline-none transition-all text-gray-900 dark:text-gray-100"
                      />
                    </div>

                    {/* Description Group */}
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-sm font-bold text-gray-700 dark:text-gray-300 ml-1">번들 설명 (국문)</label>
                      <textarea 
                        rows={2}
                        value={bundleMeta.description}
                        onChange={(e) => setBundleMeta({...bundleMeta, description: e.target.value})}
                        placeholder="번들에 대한 상세 설명을 입력하세요"
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/20 focus:border-blue-400 dark:focus:border-blue-500 outline-none resize-none transition-all text-gray-900 dark:text-gray-100"
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-sm font-bold text-gray-700 dark:text-gray-300 ml-1">번들 설명 (영문)</label>
                      <textarea 
                        rows={2}
                        value={bundleMeta.description_en}
                        onChange={(e) => setBundleMeta({...bundleMeta, description_en: e.target.value})}
                        placeholder="Bundle description in English"
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/20 focus:border-blue-400 dark:focus:border-blue-500 outline-none resize-none transition-all text-gray-900 dark:text-gray-100"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-gray-50 dark:border-gray-800 pt-6">
                  {/* Other Settings */}

                  {/* Other Settings */}
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
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 dark:text-gray-300 ml-1">번들 타입 (레이아웃)</label>
                    <select 
                      value={bundleMeta.type_id}
                      onChange={(e) => setBundleMeta({...bundleMeta, type_id: e.target.value})}
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/20 focus:border-blue-400 dark:focus:border-blue-500 outline-none transition-all appearance-none cursor-pointer text-gray-900 dark:text-gray-100"
                    >
                      <option value="">타입 선택 (기본값: 문장 학습형)</option>
                      {bundleTypes.map(type => (
                        <option key={type.id} value={type.id}>{type.name}</option>
                      ))}
                    </select>
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

                <div className="space-y-6 border-t border-gray-50 dark:border-gray-800 pt-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-amber-50 dark:bg-amber-900/20 rounded-2xl flex items-center justify-center">
                      <Volume2 className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-gray-900 dark:text-white">문장 TTS 생성 설정</h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400">새 문장이거나 기존 문장에 오디오가 없을 때 적용됩니다.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-700 dark:text-gray-300 ml-1">API 제공자</label>
                      <select
                        value={sentenceTtsOptions.provider}
                        onChange={(e) => handleSentenceTtsProviderChange(e.target.value as TTSProvider)}
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/20 focus:border-blue-400 dark:focus:border-blue-500 outline-none transition-all appearance-none cursor-pointer text-gray-900 dark:text-gray-100"
                      >
                        <option value="elevenlabs">ElevenLabs</option>
                        <option value="google">Google Cloud TTS</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-700 dark:text-gray-300 ml-1">모델</label>
                      <select
                        value={sentenceTtsOptions.model}
                        onChange={(e) => setSentenceTtsOptions({ ...sentenceTtsOptions, model: e.target.value })}
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/20 focus:border-blue-400 dark:focus:border-blue-500 outline-none transition-all appearance-none cursor-pointer text-gray-900 dark:text-gray-100"
                      >
                        {TTS_PROVIDERS[sentenceTtsOptions.provider].models.map(model => (
                          <option key={model.id} value={model.id}>{model.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-700 dark:text-gray-300 ml-1">목소리</label>
                      <select
                        value={sentenceTtsOptions.voice}
                        onChange={(e) => setSentenceTtsOptions({ ...sentenceTtsOptions, voice: e.target.value })}
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/20 focus:border-blue-400 dark:focus:border-blue-500 outline-none transition-all appearance-none cursor-pointer text-gray-900 dark:text-gray-100"
                      >
                        {TTS_PROVIDERS[sentenceTtsOptions.provider].voices.map(voice => (
                          <option key={voice.id} value={voice.id}>{voice.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-700 dark:text-gray-300 ml-1">재생 속도</label>
                      <input
                        type="number"
                        min="0.7"
                        max="1.2"
                        step="0.1"
                        value={sentenceTtsOptions.speed}
                        onChange={(e) => setSentenceTtsOptions({ ...sentenceTtsOptions, speed: parseFloat(e.target.value) || 0.8 })}
                        disabled={sentenceTtsOptions.provider !== 'google'}
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/20 focus:border-blue-400 dark:focus:border-blue-500 outline-none transition-all text-gray-900 dark:text-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                      <p className="text-[10px] text-gray-400 dark:text-gray-500 ml-1">속도는 Google TTS 선택 시에만 적용됩니다.</p>
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
                        <img src={img.previewUrl} alt={`Uploaded ${idx}`} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <button 
                            type="button"
                            onClick={() => removeImage(idx)}
                            className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="absolute top-2 left-2 px-2 py-1 bg-white/90 dark:bg-gray-800/90 text-gray-900 dark:text-gray-100 text-[10px] font-bold rounded-lg shadow-sm">
                          #{idx + 1}
                          {img.remoteUrl && <span className="ml-1 text-[8px] text-green-500">● SAVED</span>}
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
                          <p className="text-xs text-blue-500/70 dark:text-blue-400/70 italic mt-1">{item.translation_en}</p>
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
                                src={uploadedImages[itemImageMappings[index]!].previewUrl} 
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

      {/* Load Draft Modal */}
      {isLoadModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-300" 
            onClick={() => setIsLoadModalOpen(false)}
          />
          <div className="relative w-full max-w-2xl bg-white dark:bg-gray-900 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-8 duration-300">
            <div className="p-8 border-b border-gray-50 dark:border-gray-800 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center">
                  <History className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">임시 저장 데이터 불러오기</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">저장된 초안 중 하나를 선택하여 이어서 작업하세요.</p>
                </div>
              </div>
              <button 
                onClick={() => setIsLoadModalOpen(false)}
                className="p-3 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-2xl text-gray-400 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-4 max-h-[500px] overflow-y-auto no-scrollbar">
              {isLoadingDrafts ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                  <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                  <p className="text-sm font-medium text-gray-400">데이터를 불러오는 중...</p>
                </div>
              ) : draftsList.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                  <div className="w-16 h-16 bg-gray-50 dark:bg-gray-800 rounded-3xl flex items-center justify-center">
                    <FileText className="w-8 h-8 text-gray-300 dark:text-gray-600" />
                  </div>
                  <p className="text-sm font-medium text-gray-400">저장된 임시 데이터가 없습니다.</p>
                </div>
              ) : (
                <div className="grid gap-3 p-2">
                  {draftsList.map((draft) => (
                    <div 
                      key={draft.id}
                      className={`group flex items-center justify-between p-5 rounded-3xl border transition-all cursor-pointer ${currentDraftId === draft.id ? 'bg-blue-50/50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' : 'bg-white dark:bg-gray-800/50 border-gray-100 dark:border-gray-800 hover:border-blue-200 dark:hover:border-blue-800 hover:bg-blue-50/20 dark:hover:bg-blue-900/10'}`}
                      onClick={() => loadSpecificDraft(draft)}
                    >
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${currentDraftId === draft.id ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-400 group-hover:text-blue-600'}`}>
                          <FileText className="w-5 h-5" />
                        </div>
                        <div className="truncate">
                          <h3 className={`font-bold truncate ${currentDraftId === draft.id ? 'text-blue-700 dark:text-blue-400' : 'text-gray-900 dark:text-white'}`}>
                            {draft.data.tempTitle || '제목 없는 임시 저장'}
                          </h3>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="flex items-center gap-1 text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                              <Clock className="w-3 h-3" />
                              {new Date(draft.updated_at).toLocaleString()}
                            </span>
                            <span className="text-[10px] px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-500 rounded-full font-bold">
                              단계 {draft.data.step || 1}
                            </span>
                          </div>
                        </div>
                      </div>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteDraft(draft);
                        }}
                        className="p-3 text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-2xl transition-all ml-4"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="p-8 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-50 dark:border-gray-800">
              <button 
                onClick={() => setIsLoadModalOpen(false)}
                className="w-full py-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 font-bold rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
