'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowDown, ArrowLeft, ArrowUp, Book, Check, CheckCircle2, CheckSquare, Copy, Edit2, ExternalLink, Filter, GripVertical, ImageIcon, Layout, Loader2, MessageCircle, RotateCcw, Save, Search, Sparkles, Square, Tag, Trash2, UploadCloud, Volume2, X } from 'lucide-react';
import { bundleLevelOptions, getBundleLevelDisplay } from '@/lib/bundle-level';
import { formatDate, getPublicUrl } from '@/lib/utils';
import { updateBundle, deleteBundle, listCategories, listBundleTypes, updateBundleItemImage, deleteBundleItemsBulk, updateBundleItemsOrder, regenerateBundleItemSentenceTTS } from '@/lib/supabase/services/bundles';
import { deleteFileFromPublicUrl, uploadThumbnail } from '@/lib/supabase/services/storage';
import { compressImageForUpload } from '@/lib/image-compression';
import { defaultAdminTtsOptions } from '@/lib/admin-tts-options';
import TTSSettingsFields from '@/components/admin/TTSSettingsFields';
import BundleImageMapper from './BundleImageMapper';

const BASIC_EXCLUDED_LEMMAS = new Set([
  'yo', 'tú', 'tu', 'él', 'el', 'ella', 'ello', 'ellos', 'ellas', 'usted', 'ustedes',
  'nosotros', 'nosotras', 'vosotros', 'vosotras',
  'me', 'te', 'se', 'nos', 'os', 'le', 'les', 'lo', 'la', 'los', 'las',
  'mi', 'mis', 'tu', 'tus', 'su', 'sus', 'nuestro', 'nuestra', 'nuestros', 'nuestras',
  'de', 'a', 'en', 'con', 'por', 'para', 'sin', 'sobre', 'un', 'una', 'unos', 'unas',
  'y', 'e', 'o', 'u', 'que', 'pero', 'si', 'sí', 'no', 'muy', 'más',
  'este', 'esta', 'estos', 'estas', 'esto', 'ese', 'esa', 'esos', 'esas', 'eso',
]);

export default function BundleDetail({ 
  bundle: initialBundle, 
  items, 
  words = [],
  initialStudyWordIds = [],
  blogPosts = []
}: { 
  bundle: any; 
  items: any[]; 
  words?: any[];
  initialStudyWordIds?: number[];
  blogPosts?: { slug: string; title: string; status: string }[];
}) {
  const router = useRouter();
  const [bundle, setBundle] = useState(initialBundle);
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isUploadingBundleImage, setIsUploadingBundleImage] = useState(false);
  const pendingThumbnailUploadsRef = useRef<string[]>([]);
  const pendingBundleImageUploadsRef = useRef<string[]>([]);
  
  // Selection Mode State
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [currentItems, setCurrentItems] = useState(items);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [isSortMode, setIsSortMode] = useState(false);
  const [sortableItems, setSortableItems] = useState(items);
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const [isSavingOrder, setIsSavingOrder] = useState(false);
  const [ttsModalItem, setTtsModalItem] = useState<any | null>(null);
  const [isRegeneratingItemAudio, setIsRegeneratingItemAudio] = useState(false);
  const [itemTtsOptions, setItemTtsOptions] = useState(defaultAdminTtsOptions);
  const [isSentenceListCopied, setIsSentenceListCopied] = useState(false);
  const [isBlogPromptCopied, setIsBlogPromptCopied] = useState(false);
  
  // Edit Form State
  const [editForm, setEditForm] = useState({
    title: initialBundle.title,
    title_en: initialBundle.title_en || '',
    description: initialBundle.description || '',
    description_en: initialBundle.description_en || '',
    level: initialBundle.level,
    is_published: initialBundle.is_published,
    access_level: (initialBundle.access_level || 'free') as 'free' | 'premium',
    category_id: initialBundle.category_id,
    type_id: initialBundle.type_id,
    image_url: initialBundle.image_url || '',
    thumbnail_url: initialBundle.thumbnail_url || '',
    blog_post_slug: initialBundle.blog_post_slug || ''
  });

  const [itemMappings, setItemMappings] = useState<{ [key: string]: string | null }>(
    items.reduce((acc, item) => ({ ...acc, [item.id]: item.image_url || null }), {})
  );
  const sortedWords = [...words].sort((a, b) =>
    String(a.word || '').localeCompare(String(b.word || ''), 'es', { sensitivity: 'base' })
  );

  // Study Words State
  const [studyWordIds, setStudyWordIds] = useState<number[]>(initialStudyWordIds || []);
  const [isEditingStudyWords, setIsEditingStudyWords] = useState(false);
  const [selectedWordIds, setSelectedWordIds] = useState<Set<number>>(() => new Set(initialStudyWordIds || []));
  const [isSavingStudyWords, setIsSavingStudyWords] = useState(false);
  const [wordFilter, setWordFilter] = useState<'all' | 'selected' | 'unselected'>('all');
  const [wordSearch, setWordSearch] = useState('');

  const handleStartEditWords = () => {
    setSelectedWordIds(new Set(studyWordIds));
    setIsEditingStudyWords(true);
    setWordFilter('all');
    setWordSearch('');
  };

  const handleCancelEditWords = () => {
    setSelectedWordIds(new Set(studyWordIds));
    setIsEditingStudyWords(false);
    setWordFilter('all');
    setWordSearch('');
  };

  const handleToggleWord = (wordId: number) => {
    setSelectedWordIds((prev) => {
      const next = new Set(prev);
      if (next.has(wordId)) {
        next.delete(wordId);
      } else {
        next.add(wordId);
      }
      return next;
    });
  };

  const handleSelectAllWords = () => {
    setSelectedWordIds(new Set(words.map((w: any) => w.id)));
  };

  const handleDeselectAllWords = () => {
    setSelectedWordIds(new Set());
  };

  const handleExcludeBasicWords = () => {
    setSelectedWordIds((prev) => {
      const next = new Set(prev);
      for (const w of words) {
        const normalized = String(w.word || '').trim().toLowerCase();
        if (BASIC_EXCLUDED_LEMMAS.has(normalized)) {
          next.delete(w.id);
        }
      }
      return next;
    });
  };

  const handleSaveStudyWords = async () => {
    setIsSavingStudyWords(true);
    try {
      const response = await fetch(`/api/admin/bundles/${bundle.id}/words`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wordIds: Array.from(selectedWordIds) }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to save study words');
      }

      const data = await response.json();
      setStudyWordIds(data.selectedWordIds || Array.from(selectedWordIds));
      setIsEditingStudyWords(false);
      router.refresh();
      alert('학습 대상 단어가 성공적으로 저장되었습니다.');
    } catch (err: any) {
      console.error('Error saving study words:', err);
      alert(`저장에 실패했습니다: ${err.message}`);
    } finally {
      setIsSavingStudyWords(false);
    }
  };

  const displayedWords = sortedWords.filter((w) => {
    if (wordSearch.trim()) {
      const q = wordSearch.trim().toLowerCase();
      const matchWord = String(w.word || '').toLowerCase().includes(q);
      const matchMeaningKo = getMeaningDisplay(w.meaning_ko).toLowerCase().includes(q);
      const matchMeaningEn = getMeaningDisplay(w.meaning_en).toLowerCase().includes(q);
      if (!matchWord && !matchMeaningKo && !matchMeaningEn) return false;
    }
    const activeWordIds = isEditingStudyWords ? selectedWordIds : new Set(studyWordIds);
    const isSelected = activeWordIds.has(w.id);
    if (wordFilter === 'selected' && !isSelected) return false;
    if (wordFilter === 'unselected' && isSelected) return false;
    return true;
  });

  const orderedSourceSentences = currentItems
    .map(item => item.sentences?.sentence?.trim())
    .filter((sentence): sentence is string => Boolean(sentence));

  const updateItemAudioInState = (itemId: string, audioUrl: string) => {
    const updateItem = (item: any) => item.id === itemId
      ? {
          ...item,
          audio_url: audioUrl,
          sentences: item.sentences
            ? { ...item.sentences, audio_url: audioUrl }
            : item.sentences
        }
      : item;

    setCurrentItems(prev => prev.map(updateItem));
    setSortableItems(prev => prev.map(updateItem));
  };

  const handleRegenerateItemAudio = async () => {
    if (!ttsModalItem) return;

    setIsRegeneratingItemAudio(true);
    try {
      const newAudioUrl = await regenerateBundleItemSentenceTTS(ttsModalItem.id, itemTtsOptions);
      updateItemAudioInState(ttsModalItem.id, newAudioUrl);
      setTtsModalItem(null);
      router.refresh();
    } catch (err: any) {
      alert(err.message || '번들 아이템 음성 재생성 중 오류가 발생했습니다.');
    } finally {
      setIsRegeneratingItemAudio(false);
    }
  };

  const playAudio = (audioUrl: string | null | undefined) => {
    const src = getPublicUrl(audioUrl || null);
    if (!src) return;

    new Audio(src).play().catch(err => {
      console.error('Failed to play audio:', err);
      alert('오디오를 재생할 수 없습니다. 파일 경로나 스토리지 공개 URL을 확인해주세요.');
    });
  };
  
  const [categories, setCategories] = useState<any[]>([]);
  const [bundleTypes, setBundleTypes] = useState<any[]>([]);

  useEffect(() => {
    const fetchOptions = async () => {
      const [categoryData, typeData] = await Promise.all([
        listCategories(),
        listBundleTypes()
      ]);
      setCategories(categoryData);
      setBundleTypes(typeData);
    };
    fetchOptions();
  }, []);

  const buildMappingsFromItems = (sourceItems: any[]) =>
    sourceItems.reduce((acc, item) => ({ ...acc, [item.id]: item.image_url || null }), {});

  const deleteThumbnailUrls = async (urls: string[]) => {
    const uniqueUrls = Array.from(new Set(urls.filter(Boolean)));
    await Promise.allSettled(uniqueUrls.map(url => deleteFileFromPublicUrl(url)));
  };

  const handleCancelEdit = async () => {
    const pendingUploads = pendingThumbnailUploadsRef.current;
    const pendingBundleImageUploads = pendingBundleImageUploadsRef.current;
    pendingThumbnailUploadsRef.current = [];
    pendingBundleImageUploadsRef.current = [];
    await deleteThumbnailUrls(pendingUploads);
    await deleteThumbnailUrls(pendingBundleImageUploads);

    setEditForm({
      title: bundle.title,
      title_en: bundle.title_en || '',
      description: bundle.description || '',
      description_en: bundle.description_en || '',
      level: bundle.level,
      is_published: bundle.is_published,
      access_level: (bundle.access_level || 'free') as 'free' | 'premium',
      category_id: bundle.category_id,
      type_id: bundle.type_id,
      image_url: bundle.image_url || '',
      thumbnail_url: bundle.thumbnail_url || '',
      blog_post_slug: bundle.blog_post_slug || ''
    });
    setItemMappings(buildMappingsFromItems(currentItems));
    setIsEditing(false);
  };

  const moveSortableItem = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= sortableItems.length || fromIndex === toIndex) return;

    setSortableItems(prev => {
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  };

  const enterSortMode = () => {
    setSortableItems(currentItems);
    setSelectedItems([]);
    setIsSelectMode(false);
    setIsSortMode(true);
  };

  const cancelSortMode = () => {
    setSortableItems(currentItems);
    setDraggedItemId(null);
    setIsSortMode(false);
  };

  const handleSortDrop = (targetIndex: number) => {
    if (!draggedItemId) return;

    const fromIndex = sortableItems.findIndex(item => item.id === draggedItemId);
    moveSortableItem(fromIndex, targetIndex);
    setDraggedItemId(null);
  };

  const handleSaveOrder = async () => {
    setIsSavingOrder(true);

    try {
      await updateBundleItemsOrder(bundle.id, sortableItems.map(item => item.id));
      const orderedItems = sortableItems.map((item, index) => ({ ...item, order_index: index }));
      setCurrentItems(orderedItems);
      setSortableItems(orderedItems);
      setIsSortMode(false);
      router.refresh();
    } catch (e) {
      alert('순서 저장 중 오류가 발생했습니다.');
    } finally {
      setIsSavingOrder(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);

    try {
      const compressedFile = await compressImageForUpload(file, { maxWidth: 768 });
      const formData = new FormData();
      formData.append('file', compressedFile);

      const url = await uploadThumbnail(formData, `bundles/${bundle.id}/thumbnail`);
      const previousPendingUpload = pendingThumbnailUploadsRef.current.find(uploadedUrl => uploadedUrl === editForm.thumbnail_url);

      if (previousPendingUpload) {
        pendingThumbnailUploadsRef.current = pendingThumbnailUploadsRef.current.filter(uploadedUrl => uploadedUrl !== previousPendingUpload);
        await deleteThumbnailUrls([previousPendingUpload]);
      }

      pendingThumbnailUploadsRef.current = [...pendingThumbnailUploadsRef.current, url];
      setEditForm(prev => ({ ...prev, thumbnail_url: url }));
      e.target.value = '';
    } catch (err: any) {
      alert(err.message || '이미지 업로드에 실패했습니다.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleBundleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingBundleImage(true);

    try {
      const compressedFile = await compressImageForUpload(file, { maxWidth: 1024 });
      const formData = new FormData();
      formData.append('file', compressedFile);

      const url = await uploadThumbnail(formData, `bundles/${bundle.id}/image`);
      const previousPendingUpload = pendingBundleImageUploadsRef.current.find(uploadedUrl => uploadedUrl === editForm.image_url);

      if (previousPendingUpload) {
        pendingBundleImageUploadsRef.current = pendingBundleImageUploadsRef.current.filter(uploadedUrl => uploadedUrl !== previousPendingUpload);
        await deleteThumbnailUrls([previousPendingUpload]);
      }

      pendingBundleImageUploadsRef.current = [...pendingBundleImageUploadsRef.current, url];
      setEditForm(prev => ({ ...prev, image_url: url }));
      e.target.value = '';
    } catch (err: any) {
      alert(err.message || '이미지 업로드에 실패했습니다.');
    } finally {
      setIsUploadingBundleImage(false);
    }
  };

  const handleUpdate = async () => {
    setIsLoading(true);
    try {
      const previousBundleImageUrl = bundle.image_url || '';
      const nextBundleImageUrl = editForm.image_url || '';
      const previousThumbnailUrl = bundle.thumbnail_url || '';
      const nextThumbnailUrl = editForm.thumbnail_url || '';
      const pendingUploads = pendingThumbnailUploadsRef.current;
      const pendingBundleImageUploads = pendingBundleImageUploadsRef.current;

      // 1. 번들 기본 정보 업데이트
      const updated = await updateBundle(bundle.id, {
        ...editForm,
        title_en: editForm.title_en || null,
        description_en: editForm.description_en || null,
        blog_post_slug: editForm.blog_post_slug?.trim() || null
      });
      
      // 2. 각 아이템 이미지 업데이트 (변경된 것만)
      const itemUpdatePromises = Object.entries(itemMappings).map(([itemId, imageUrl]) => {
        const originalItem = currentItems.find(it => it.id === itemId);
        if (originalItem && originalItem.image_url !== imageUrl) {
          return updateBundleItemImage(itemId, imageUrl);
        }
        return Promise.resolve(null);
      });
      
      await Promise.all(itemUpdatePromises);

      const updatedItems = currentItems.map(item => ({
        ...item,
        image_url: itemMappings[item.id] || null
      }));
      
      const selectedCat = categories.find(c => c.id === editForm.category_id);
      const selectedType = bundleTypes.find(t => t.id === editForm.type_id);
      setBundle({ 
        ...bundle, 
        ...updated, 
        bundle_category: selectedCat ? { 
          id: selectedCat.id, 
          name: selectedCat.name,
          name_en: selectedCat.name_en 
        } : null,
        bundle_type: selectedType ? {
          id: selectedType.id,
          name: selectedType.name,
          code: selectedType.code
        } : null
      });
      setCurrentItems(updatedItems);
      setItemMappings(buildMappingsFromItems(updatedItems));

      const stalePendingUploads = pendingUploads.filter(url => url !== nextThumbnailUrl);
      const stalePendingBundleImageUploads = pendingBundleImageUploads.filter(url => url !== nextBundleImageUrl);
      const shouldDeletePreviousBundleImage =
        previousBundleImageUrl &&
        previousBundleImageUrl !== nextBundleImageUrl &&
        !pendingBundleImageUploads.includes(previousBundleImageUrl);
      const shouldDeletePreviousThumbnail =
        previousThumbnailUrl &&
        previousThumbnailUrl !== nextThumbnailUrl &&
        !pendingUploads.includes(previousThumbnailUrl);

      pendingThumbnailUploadsRef.current = [];
      pendingBundleImageUploadsRef.current = [];
      await deleteThumbnailUrls([
        ...stalePendingBundleImageUploads,
        ...(shouldDeletePreviousBundleImage ? [previousBundleImageUrl] : []),
        ...stalePendingUploads,
        ...(shouldDeletePreviousThumbnail ? [previousThumbnailUrl] : [])
      ]);
      
      router.refresh();
      setIsEditing(false);
    } catch (e) {
      alert('수정 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('정말 이 번들을 삭제하시겠습니까? 관련 아이템도 모두 삭제됩니다.')) return;
    setIsDeleting(true);
    try {
      await deleteBundle(bundle.id);
      router.push('/admin/bundles');
      router.refresh();
    } catch (e) {
      alert('삭제 중 오류가 발생했습니다.');
      setIsDeleting(false);
    }
  };

  function getMeaningDisplay(meaning: any): string {
    if (!meaning) return '-';
    if (typeof meaning === 'string') {
      try {
        const parsed = JSON.parse(meaning);
        return getMeaningDisplay(parsed);
      } catch (e) {
        return meaning;
      }
    }
    if (typeof meaning === 'object') {
      const val = meaning.ko || meaning.en || Object.values(meaning)[0];
      if (Array.isArray(val)) return val[0] || '-';
      if (typeof val === 'string') return val;
    }
    return '-';
  }

  function getSentenceWords(item: any) {
    const mappings = item.sentences?.word_sentence_map || [];
    const uniqueWords = new Map<number, any>();

    for (const mapping of mappings) {
      const word = Array.isArray(mapping.words) ? mapping.words[0] : mapping.words;
      if (word?.id && !uniqueWords.has(word.id)) {
        uniqueWords.set(word.id, {
          ...word,
          used_as: mapping.used_as || null,
        });
      }
    }

    return Array.from(uniqueWords.values());
  }

  const handleCopySourceSentences = async () => {
    if (orderedSourceSentences.length === 0) {
      alert('복사할 원문 문장이 없습니다.');
      return;
    }

    try {
      await navigator.clipboard.writeText(orderedSourceSentences.join('\n'));
      setIsSentenceListCopied(true);
      window.setTimeout(() => setIsSentenceListCopied(false), 1800);
    } catch (error) {
      alert('클립보드 복사에 실패했습니다.');
    }
  };

  const handleCopyBlogExplanationPrompt = async () => {
    const sentenceLines = currentItems
      .map((item, idx) => {
        const es = item.sentences?.sentence?.trim();
        const ko = item.sentences?.translation?.trim();
        if (!es) return null;
        return `${idx + 1}. ${es}${ko ? ` (${ko})` : ''}`;
      })
      .filter(Boolean)
      .join('\n');

    if (!sentenceLines) {
      alert('번들에 포함된 문장이 없습니다.');
      return;
    }

    const levelInfo = getBundleLevelDisplay(bundle.level, 'ko');
    const bundleImageUrl = bundle.image_url || bundle.thumbnail_url || '';
    const fixedBlogTitle = `${bundle.title} — 문장·문법 해설`;

    const promptText = `HolaLingo 스페인어 학습 번들 「${bundle.title}」의 문장·문법 상세 해설 블로그 신규 글 JSON을 생성해줘.

역할:

* 너는 한국어 사용자를 대상으로 스페인어 학습 콘텐츠를 쓰는 에디터야.
* 초보 학습자가 모바일에서도 빠르게 읽고 각 문장의 어순·문법 핵심만 직관적으로 이해할 수 있도록 군더더기 없이 콤팩트하게 작성해야 해.
* 스페인어 예문과 문법 설명은 철자와 악센트(á, é, í, ó, ú, ñ, ¿, ¡)까지 정확하고 자연스러워야 해.

대상 번들 정보:

* 번들 ID (bundleId): ${bundle.id}
* 번들 제목: ${bundle.title}${bundle.title_en ? ` (${bundle.title_en})` : ''}
* 번들 설명: ${bundle.description || '스페인어 회화 표현 묶음'}
* 카테고리: ${bundle.bundle_category?.name || '일반 회화'}
* 난이도: ${levelInfo.label} (${levelInfo.shortLabel})
* 번들 대표 이미지 URL: ${bundleImageUrl}

번들에 포함된 문장 목록 (순서대로):

${sentenceLines}

필드 규칙:

* bundleId는 반드시 "${bundle.id}"로 고정 (블로그 글 생성 시 해당 번들과 자동 연결됨)
* title은 번들 제목과 일치하도록 반드시 "${fixedBlogTitle}"로 고정
* category는 반드시 아래 스키마와 동일하게 { "slug": "bundle-guide", "name": "번들문장해설", "description": "HolaLingo 학습 번들의 문장 구조와 핵심 문법을 콤팩트하게 풀이한 해설" }로 고정
* slug는 영문 소문자 kebab-case로 작성하고, 영문 소문자, 숫자, 하이픈만 사용
* canonicalUrl은 반드시 "/blog/{slug}" 형식
* status는 "published"
* imageUrl과 ogImageUrl은 번들 대표 이미지 URL인 "${bundleImageUrl}"을 그대로 사용
* description은 블로그 카드와 상세 상단에 보이는 독자 친화 요약으로 작성 (80~140자 권장)
* seoTitle은 검색 유입을 고려해 핵심 스페인어 표현/문법 키워드가 드러나도록 25~55자로 작성 (title과 다르게 검색 친화적으로 작성)
* seoDescription은 검색 결과 노출을 고려한 메타 설명으로 작성 (80~140자 권장)
* tags는 4~6개 (번들 주제/카테고리 관련 태그 포함, 각 tag.slug는 영문 소문자 kebab-case, tag.name은 한국어 태그명)
* readingMinutes는 3~6 사이의 정수

본문(content) 작성 규칙:

* content는 반드시 { "format": "markdown", "body": "..." } 구조를 사용
* 모바일 화면에서 표가 깨지지 않도록 마크다운 표(| ... |)는 절대 사용하지 말 것
* 글 제목과 동일한 # H1 제목은 생략하고, ## 대제목과 ### 문장 소제목으로만 구성할 것
* 본문 구성은 아래 2단계로 간결하고 콤팩트하게 작성할 것:
  1. **핵심 문법·어순 포인트 요약 (##)**: 이 번들 문장들을 이해하는 데 꼭 필요한 핵심 패턴 1~2가지를 인용구(> )와 짧은 설명(2~3문장)으로 요약
  2. **문장별 콤팩트 해설 (##)**: 수록된 모든 문장을 순서대로 다루되, 각 문장(### 번호. 스페인어 문장)마다 아래 2~3줄 불릿으로만 짧고 명확하게 정리 (장황한 줄글 금지)
     - **뜻**: 자연스러운 한국어 의미
     - **어순·구조**: \`어절 단위로 쪼개어\` 의미 연결
     - **핵심 포인트**: 동사 변화·전치사·대명사 등 퀴즈/어순 배열에서 헷갈리기 쉬운 핵심 1줄 팁
* 스페인어 핵심 단어나 어절은 인라인 코드(\`표현\`)로 감싸 강조하고, 중요 키워드는 굵게(**강조**) 표시
* JSON 문자열 내부이므로 content.body의 줄바꿈은 반드시 \\n으로 이스케이프하고, 내부 큰따옴표는 \\"로 이스케이프할 것

출력 규칙:

* JSON 객체만 출력
* markdown 코드블록(\`\`\`json), 설명, 주석, trailing comma 금지
* 모든 key와 문자열은 double quote 사용
* 아래 스키마 외의 필드는 넣지 말 것

스키마:
{
    "bundleId": "${bundle.id}",
    "slug": "spanish-bundle-grammar-guide-example",
    "title": "${fixedBlogTitle}",
    "description": "이 번들에 수록된 스페인어 회화 표현들의 어순 구조와 핵심 문법 포인트를 문장별로 간결하게 정리했습니다.",
    "category": {
        "slug": "bundle-guide",
        "name": "번들문장해설",
        "description": "HolaLingo 학습 번들의 문장 구조와 핵심 문법을 콤팩트하게 풀이한 해설"
    },
    "tags": [
        { "slug": "spanish-beginner", "name": "스페인어 초보" },
        { "slug": "spanish-conversation", "name": "스페인어 회화" },
        { "slug": "spanish-grammar", "name": "스페인어 문법" },
        { "slug": "spanish-word-order", "name": "스페인어 어순" }
    ],
    "imageUrl": "${bundleImageUrl}",
    "readingMinutes": 4,
    "status": "published",
    "seoTitle": "스페인어 필수 회화 문장 문법·어순 핵심 해설",
    "seoDescription": "실전 스페인어 회화 문장의 동사 변화, 대명사 위치, 어순 규칙을 문장별 콤팩트 해설로 빠르게 익혀 보세요.",
    "ogImageUrl": "${bundleImageUrl}",
    "canonicalUrl": "/blog/spanish-bundle-grammar-guide-example",
    "content": {
        "format": "markdown",
        "body": "이번 번들의 문장들이 어떤 어순과 문법 규칙으로 만들어졌는지 핵심만 빠르게 짚어봅니다. 구조를 이해하면 **단어 배열**과 **빈칸 채우기** 연습이 훨씬 쉬워집니다.\\n\\n## 핵심 문법 포인트\\n\\n> 목적격 대명사(\`me\`, \`te\`, \`lo\`)는 활용된 동사 바로 앞에 위치합니다.\\n\\n스페인어 요청문은 **누구에게(대명사) + 동사 + 무엇을(목적어)** 순서로 이어지는 경우가 많습니다. 전치사 \`para\` 뒤에 동사원형을 붙이면 '~하기 위해'라는 목적을 간단히 표현할 수 있습니다.\\n\\n---\\n\\n## 문장별 핵심 해설\\n\\n### 1. ¿Me pone un café con leche, por favor?\\n\\n- **뜻:** 카페콘레체 한 잔 주시겠어요?\\n- **어순·구조:** \`¿Me\` (저에게) + \`pone\` (내어 주다) + \`un café con leche\` (우유 넣은 커피 한 잔을) + \`por favor?\` (부탁합니다)\\n- **핵심 포인트:** \`poner\`(놓다·내어 주다)의 정중한 3인칭 단수형 \`pone\` 앞에 간접목적격 대명사 \`me\`를 붙여 주문할 때 가장 자연스럽게 쓰는 표현입니다.\\n\\n### 2. ¿Para tomar aquí o para llevar?\\n\\n- **뜻:** 드시고 가시나요, 포장하시나요?\\n- **어순·구조:** \`¿Para tomar aquí\` (여기서 마시기 위해) + \`o\` (또는) + \`para llevar?\` (가져가기 위해)\\n- **핵심 포인트:** 전치사 \`para\` 뒤에는 변형하지 않은 **동사원형**(\`tomar\`, \`llevar\`)이 바로 옵니다."
    }
}`;

    try {
      await navigator.clipboard.writeText(promptText);
      setIsBlogPromptCopied(true);
      window.setTimeout(() => setIsBlogPromptCopied(false), 1800);
    } catch {
      alert('프롬프트 복사에 실패했습니다.');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedItems.length === 0) return;
    if (!confirm(`선택한 ${selectedItems.length}개의 아이템을 삭제하시겠습니까?`)) return;
    
    setIsBulkDeleting(true);
    try {
      await deleteBundleItemsBulk(bundle.id, selectedItems);
      
      // Update local state
      const remainingItems = currentItems
        .filter(item => !selectedItems.includes(item.id))
        .map((item, index) => ({ ...item, order_index: index }));
      
      setCurrentItems(remainingItems);
      setItemMappings(buildMappingsFromItems(remainingItems));
      setSelectedItems([]);
      setIsSelectMode(false);
      
      router.refresh();
      alert('성공적으로 삭제되었습니다.');
    } catch (e) {
      console.error(e);
      alert('삭제 중 오류가 발생했습니다.');
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const toggleSelectItem = (id: string) => {
    setSelectedItems(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  return (
    <div className="md:ml-64 p-4 md:p-8 pt-20 md:pt-8 bg-gray-50 dark:bg-background min-h-screen">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Navigation and Actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <Link 
            href="/admin/bundles"
            className="inline-flex items-center gap-2 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
            <span>번들 목록으로 돌아가기</span>
          </Link>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={() => {
                if (isEditing) {
                  handleCancelEdit();
                } else {
                  setIsEditing(true);
                }
              }}
              title={isEditing ? '취소' : '정보 수정'}
              className={`inline-flex items-center justify-center w-10 h-10 rounded-xl transition-all ${isEditing ? 'bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300' : 'bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 shadow-sm'}`}
            >
              {isEditing ? <X className="w-5 h-5" /> : <Edit2 className="w-5 h-5" />}
            </button>
            <button 
              disabled={isDeleting}
              onClick={handleDelete}
              title="번들 삭제"
              className="inline-flex items-center justify-center w-10 h-10 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-xl transition-all shadow-sm shadow-red-100 dark:shadow-none disabled:opacity-50"
            >
              {isDeleting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Bundle Info Card */}
        <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
          {isEditing ? (
            <div className="p-6 md:p-8 space-y-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg">
                  <Edit2 className="w-5 h-5" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">번들 정보 수정</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700 dark:text-gray-300 ml-1">번들 제목 (KO)</label>
                  <input 
                    type="text"
                    value={editForm.title}
                    onChange={(e) => setEditForm({...editForm, title: e.target.value})}
                    placeholder="한국어 제목"
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/20 focus:border-blue-400 dark:focus:border-blue-500 outline-none transition-all text-gray-900 dark:text-gray-100"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700 dark:text-gray-300 ml-1">Bundle Title (EN)</label>
                  <input 
                    type="text"
                    value={editForm.title_en}
                    onChange={(e) => setEditForm({...editForm, title_en: e.target.value})}
                    placeholder="English Title"
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/20 focus:border-blue-400 dark:focus:border-blue-500 outline-none transition-all text-gray-900 dark:text-gray-100"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-bold text-gray-700 dark:text-gray-300 ml-1">설명 (KO)</label>
                  <textarea 
                    rows={2}
                    value={editForm.description}
                    onChange={(e) => setEditForm({...editForm, description: e.target.value})}
                    placeholder="한국어 설명"
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/20 focus:border-blue-400 dark:focus:border-blue-500 outline-none resize-none transition-all text-gray-900 dark:text-gray-100"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-bold text-gray-700 dark:text-gray-300 ml-1">Description (EN)</label>
                  <textarea 
                    rows={2}
                    value={editForm.description_en}
                    onChange={(e) => setEditForm({...editForm, description_en: e.target.value})}
                    placeholder="English Description"
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/20 focus:border-blue-400 dark:focus:border-blue-500 outline-none resize-none transition-all text-gray-900 dark:text-gray-100"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700 dark:text-gray-300 ml-1">카테고리</label>
                  <select 
                    value={editForm.category_id || ''}
                    onChange={(e) => setEditForm({...editForm, category_id: e.target.value || null})}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/20 focus:border-blue-400 dark:focus:border-blue-500 outline-none transition-all appearance-none cursor-pointer text-gray-900 dark:text-gray-100"
                  >
                    <option value="">카테고리 없음</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name} {cat.name_en ? `(${cat.name_en})` : ''}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700 dark:text-gray-300 ml-1">번들 타입</label>
                  <select 
                    value={editForm.type_id || ''}
                    onChange={(e) => setEditForm({...editForm, type_id: e.target.value || null})}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/20 focus:border-blue-400 dark:focus:border-blue-500 outline-none transition-all appearance-none cursor-pointer text-gray-900 dark:text-gray-100"
                  >
                    <option value="">타입 없음</option>
                    {bundleTypes.map(type => (
                      <option key={type.id} value={type.id}>
                        {type.name} {type.code ? `(${type.code})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700 dark:text-gray-300 ml-1">학습 레벨</label>
                  <select
                    value={editForm.level}
                    onChange={(e) => setEditForm({...editForm, level: parseInt(e.target.value) || 1})}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/20 focus:border-blue-400 dark:focus:border-blue-500 outline-none transition-all appearance-none cursor-pointer text-gray-900 dark:text-gray-100"
                  >
                    {!bundleLevelOptions.some((option) => option.value === Number(editForm.level)) && (
                      <option value={editForm.level}>{getBundleLevelDisplay(editForm.level, 'ko').label}</option>
                    )}
                    {bundleLevelOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700 ml-1">공개 상태</label>
                  <div className="flex items-center gap-6 py-2 ml-1">
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <input 
                        type="radio"
                        checked={editForm.is_published}
                        onChange={() => setEditForm({...editForm, is_published: true})}
                        className="w-4 h-4 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400 group-hover:text-blue-600 transition-colors">공개</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <input 
                        type="radio"
                        checked={!editForm.is_published}
                        onChange={() => setEditForm({...editForm, is_published: false})}
                        className="w-4 h-4 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400 group-hover:text-amber-600 transition-colors">비공개</span>
                    </label>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700 ml-1">접근 등급</label>
                  <div className="flex items-center gap-6 py-2 ml-1">
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <input
                        type="radio"
                        checked={editForm.access_level === 'free'}
                        onChange={() => setEditForm({...editForm, access_level: 'free'})}
                        className="w-4 h-4 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400 group-hover:text-emerald-600 transition-colors">무료</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <input
                        type="radio"
                        checked={editForm.access_level === 'premium'}
                        onChange={() => setEditForm({...editForm, access_level: 'premium'})}
                        className="w-4 h-4 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400 group-hover:text-orange-600 transition-colors">유료</span>
                    </label>
                  </div>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-bold text-gray-700 dark:text-gray-300 ml-1">연결된 문법·문장 해설 블로그 (Blog Post Slug)</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <select
                      value={editForm.blog_post_slug || ''}
                      onChange={(e) => setEditForm({ ...editForm, blog_post_slug: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/20 focus:border-blue-400 dark:focus:border-blue-500 outline-none transition-all appearance-none cursor-pointer text-sm text-gray-900 dark:text-gray-100"
                    >
                      <option value="">연결된 블로그 글 없음</option>
                      {blogPosts.map((post) => (
                        <option key={post.slug} value={post.slug}>
                          [{post.status === 'published' ? '발행됨' : post.status}] {post.title} ({post.slug})
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      value={editForm.blog_post_slug || ''}
                      onChange={(e) => setEditForm({ ...editForm, blog_post_slug: e.target.value })}
                      placeholder="또는 블로그 slug 직접 입력 (예: spanish-cafe-order-grammar)"
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/20 focus:border-blue-400 dark:focus:border-blue-500 outline-none transition-all font-mono text-xs text-gray-900 dark:text-gray-100"
                    />
                  </div>
                  <p className="text-xs text-gray-400 ml-1">
                    연결된 블로그 글이 있으면 번들 상세 페이지 및 학습 플레이어에서 문법·표현 해설 링크가 표시됩니다.
                  </p>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-bold text-gray-700 ml-1">썸네일 이미지</label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-1">
                    {/* Preview */}
                    <div className="relative aspect-video bg-gray-100 dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden flex items-center justify-center">
                      <Image
                        src={editForm.thumbnail_url || '/images/bundle-fallback.webp'}
                        alt="Thumbnail preview"
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, 33vw"
                        priority
                      />
                      {isUploading && (
                        <div className="absolute inset-0 bg-white/60 backdrop-blur-sm flex items-center justify-center">
                          <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
                        </div>
                      )}
                    </div>
                    
                    {/* Upload Controls */}
                    <div className="md:col-span-2 space-y-3">
                      <div className="relative group">
                        <input 
                          type="file"
                          accept="image/*"
                          onChange={handleFileChange}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        />
                        <div className="flex items-center justify-center gap-2 px-4 py-8 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl group-hover:border-blue-400 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20 transition-all">
                          <UploadCloud className="w-6 h-6 text-gray-400 group-hover:text-blue-500" />
                          <span className="text-sm font-medium text-gray-500 group-hover:text-blue-600">
                            {isUploading ? '업로드 중...' : '이미지 파일을 선택하거나 드래그하세요'}
                          </span>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">직접 URL 입력</span>
                        <input 
                          type="text"
                          placeholder="https://example.com/thumbnail.jpg"
                          value={editForm.thumbnail_url}
                          onChange={(e) => setEditForm({...editForm, thumbnail_url: e.target.value})}
                          className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/20 focus:border-blue-400 dark:focus:border-blue-500 outline-none transition-all font-mono text-xs text-gray-900 dark:text-gray-100"
                        />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-bold text-gray-700 ml-1">학습 플레이어 기본 이미지</label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-1">
                    <div className="relative aspect-video bg-gray-100 dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden flex items-center justify-center">
                      {editForm.image_url ? (
                        <Image
                          src={editForm.image_url}
                          alt="Player default preview"
                          fill
                          className="object-cover"
                          sizes="(max-width: 768px) 100vw, 33vw"
                        />
                      ) : (
                        <ImageIcon className="w-8 h-8 text-gray-300 dark:text-gray-600" />
                      )}
                      {isUploadingBundleImage && (
                        <div className="absolute inset-0 bg-white/60 backdrop-blur-sm flex items-center justify-center">
                          <Loader2 className="w-6 h-6 text-emerald-600 animate-spin" />
                        </div>
                      )}
                    </div>

                    <div className="md:col-span-2 space-y-3">
                      <div className="relative group">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleBundleImageFileChange}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        />
                        <div className="flex items-center justify-center gap-2 px-4 py-8 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl group-hover:border-emerald-400 group-hover:bg-emerald-50 dark:group-hover:bg-emerald-900/20 transition-all">
                          <UploadCloud className="w-6 h-6 text-gray-400 group-hover:text-emerald-500" />
                          <span className="text-sm font-medium text-gray-500 group-hover:text-emerald-600">
                            {isUploadingBundleImage ? '업로드 중...' : '플레이어 기본 이미지를 선택하세요'}
                          </span>
                        </div>
                      </div>
                      <p className="text-xs font-medium text-gray-400">
                        아이템별 이미지가 없을 때 학습 플레이어에 표시됩니다.
                      </p>
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">직접 URL 입력</span>
                        <input
                          type="text"
                          placeholder="https://example.com/player-image.jpg"
                          value={editForm.image_url}
                          onChange={(e) => setEditForm({...editForm, image_url: e.target.value})}
                          className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-900/20 focus:border-emerald-400 dark:focus:border-emerald-500 outline-none transition-all font-mono text-xs text-gray-900 dark:text-gray-100"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col">
              {/* 1. Thumbnail Row (Independent & Centered) */}
              <div className="p-6 md:p-8 pb-0 flex justify-center">
                <div className="relative w-full max-w-xl aspect-video rounded-3xl overflow-hidden shadow-xl border border-gray-100 dark:border-gray-800 shrink-0 bg-gray-50 dark:bg-gray-800">
                  <Image
                    src={bundle.thumbnail_url || '/images/bundle-fallback.webp'}
                    alt={bundle.title}
                    fill
                    className="object-cover animate-in fade-in duration-300"
                    sizes="(max-width: 768px) 100vw, 576px"
                    priority
                  />
                </div>
              </div>
              
              {/* 2. Content Row */}
              <div className="p-8 md:p-12 pt-8">
                <div className="flex flex-wrap items-center gap-3 mb-6">
                  {bundle.bundle_category && (
                    <span className="px-3 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full text-[10px] font-extrabold uppercase tracking-wider">
                      {bundle.bundle_category.name}
                    </span>
                  )}
                  <span className="px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 rounded-lg text-[10px] font-bold">
                    {getBundleLevelDisplay(bundle.level, 'ko').shortLabel}
                  </span>
                  {bundle.is_published ? (
                    <span className="px-2 py-1 bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-lg text-[10px] font-bold">
                      공개됨
                    </span>
                  ) : (
                    <span className="px-2 py-1 bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-lg text-[10px] font-bold">
                      비공개
                    </span>
                  )}
                  <span className={`px-2 py-1 rounded-lg text-[10px] font-bold ${bundle.access_level === 'premium' ? 'bg-orange-50 text-orange-600 dark:bg-orange-900/30 dark:text-orange-300' : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300'}`}>
                    {bundle.access_level === 'premium' ? '유료' : '무료'}
                  </span>
                </div>
                
                <h1 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white mb-2 tracking-tight">{bundle.title}</h1>
                {bundle.title_en && <p className="text-lg text-gray-400 dark:text-gray-500 font-bold mb-8">{bundle.title_en}</p>}
                
                <div className="space-y-6 mb-12">
                  <p className="text-gray-600 dark:text-gray-400 text-lg leading-relaxed">
                    {bundle.description || '추가 설명이 없습니다.'}
                  </p>
                  {bundle.description_en && (
                    <p className="text-gray-400 dark:text-gray-500 text-base italic leading-relaxed border-l-4 border-gray-100 dark:border-gray-800 pl-6 py-2">
                      {bundle.description_en}
                    </p>
                  )}
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 text-sm pt-8 border-t border-gray-50 dark:border-gray-800">
                  <div className="flex flex-col">
                    <span className="text-gray-400 dark:text-gray-500 font-bold mb-1 uppercase tracking-widest text-[10px]">생성일</span>
                    <span className="font-bold text-gray-900 dark:text-gray-100">{formatDate(bundle.created_at)}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-gray-400 dark:text-gray-500 font-bold mb-1 uppercase tracking-widest text-[10px]">학습 컨텐츠</span>
                    <span className="font-bold text-gray-900 dark:text-gray-100">{currentItems.length}개 아이템</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-gray-400 dark:text-gray-500 font-bold mb-1 uppercase tracking-widest text-[10px]">최종 수정</span>
                    <span className="font-bold text-gray-900 dark:text-gray-100">{formatDate(bundle.updated_at)}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-gray-400 dark:text-gray-500 font-bold mb-1 uppercase tracking-widest text-[10px]">언어</span>
                    <span className="font-bold text-gray-900 dark:text-gray-100">Spanish</span>
                  </div>
                </div>
                <div className="mt-6 pt-6 border-t border-gray-50 dark:border-gray-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-gray-400 dark:text-gray-500 font-bold uppercase tracking-widest text-[10px]">문장·문법 해설 블로그:</span>
                    {bundle.blog_post_slug ? (
                      <Link
                        href={`/blog/${bundle.blog_post_slug}?bundleId=${bundle.id}`}
                        target="_blank"
                        className="inline-flex items-center gap-1.5 font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
                      >
                        <span>
                          {blogPosts.find((p) => p.slug === bundle.blog_post_slug)?.title || `/blog/${bundle.blog_post_slug}`}
                        </span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Link>
                    ) : (
                      <span className="text-xs text-gray-400 dark:text-gray-500">미연결 (우측 상단 수정 버튼에서 연결 가능)</span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => void handleCopyBlogExplanationPrompt()}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs font-bold hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition"
                    >
                      {isBlogPromptCopied ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5" />}
                      {isBlogPromptCopied ? '해설 프롬프트 복사됨' : '해설 블로그 프롬프트 복사'}
                    </button>
                    <Link
                      href="/admin/blog/new"
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 text-xs font-bold hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                    >
                      블로그 글쓰기
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Image Mapper Section (Edit Mode) */}
        {isEditing && (
          <div className="space-y-4">
            <BundleImageMapper 
              items={currentItems} 
              onItemsUpdate={(newMappings) => setItemMappings(newMappings)} 
              uploadFolder={`bundles/${bundle.id}/items`}
            />
            {/* Buttons moved here */}
            <div className="flex justify-end gap-3">
              <button 
                onClick={handleCancelEdit}
                className="px-8 py-3.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-bold rounded-2xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-all active:scale-95"
              >
                취소
              </button>
              <button 
                disabled={isLoading}
                onClick={handleUpdate}
                className="px-8 py-3.5 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 dark:shadow-none flex items-center gap-2 active:scale-95"
              >
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                모든 변경사항 저장
              </button>
            </div>
          </div>
        )}

        {/* Bundle Items Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
              <Book className="w-5 h-5 text-blue-500" />
              번들 아이템 구성
            </h2>
            <div className="flex items-center gap-2">
              {isSortMode ? (
                <>
                  <button 
                    disabled={isSavingOrder}
                    onClick={cancelSortMode}
                    className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-xs font-bold rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-all disabled:opacity-50"
                  >
                    취소
                  </button>
                  <button 
                    disabled={isSavingOrder}
                    onClick={handleSaveOrder}
                    className="px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl hover:bg-blue-700 transition-all disabled:opacity-50 flex items-center gap-2"
                  >
                    {isSavingOrder ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                    순서 저장
                  </button>
                </>
              ) : isSelectMode ? (
                <>
                  <button 
                    disabled={selectedItems.length === 0 || isBulkDeleting}
                    onClick={handleBulkDelete}
                    className="px-4 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs font-bold rounded-xl hover:bg-red-100 dark:hover:bg-red-900/40 transition-all disabled:opacity-50 flex items-center gap-2"
                  >
                    {isBulkDeleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                    삭제 ({selectedItems.length})
                  </button>
                  <button 
                    onClick={() => {
                      setIsSelectMode(false);
                      setSelectedItems([]);
                    }}
                    className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-xs font-bold rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-all"
                  >
                    취소
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => void handleCopySourceSentences()}
                    disabled={orderedSourceSentences.length === 0}
                    className="px-4 py-2 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 text-gray-600 dark:text-gray-400 text-xs font-bold rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all shadow-sm flex items-center gap-2 disabled:opacity-50"
                    title="원문 문장 순서대로 복사"
                  >
                    {isSentenceListCopied ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                    {isSentenceListCopied ? '복사됨' : '원문 복사'}
                  </button>
                  <button 
                    onClick={enterSortMode}
                    className="px-4 py-2 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 text-gray-600 dark:text-gray-400 text-xs font-bold rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all shadow-sm flex items-center gap-2"
                  >
                    <GripVertical className="w-3.5 h-3.5" />
                    정렬
                  </button>
                  <button 
                    onClick={() => setIsSelectMode(true)}
                    className="px-4 py-2 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 text-gray-600 dark:text-gray-400 text-xs font-bold rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all shadow-sm"
                  >
                    선택
                  </button>
                </>
              )}
            </div>
          </div>

          {(isSortMode ? sortableItems : currentItems).length === 0 ? (
            <div className="bg-white dark:bg-gray-900 p-20 rounded-3xl border border-dashed border-gray-200 dark:border-gray-800 text-center">
              <div className="w-16 h-16 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <Book className="w-8 h-8 text-gray-300 dark:text-gray-600" />
              </div>
              <p className="text-gray-500 dark:text-gray-400 font-medium">이 번들에는 아직 아이템이 없습니다.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {(isSortMode ? sortableItems : currentItems).map((item, idx) => {
                const sentenceWords = getSentenceWords(item);

                return (
                <div 
                  key={item.id} 
                  draggable={isSortMode}
                  onDragStart={(e) => {
                    if (!isSortMode) return;
                    setDraggedItemId(item.id);
                    e.dataTransfer.effectAllowed = 'move';
                  }}
                  onDragOver={(e) => {
                    if (!isSortMode) return;
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                  }}
                  onDrop={(e) => {
                    if (!isSortMode) return;
                    e.preventDefault();
                    handleSortDrop(idx);
                  }}
                  onDragEnd={() => setDraggedItemId(null)}
                  onClick={() => isSelectMode && toggleSelectItem(item.id)}
                  className={`bg-white dark:bg-gray-900 p-5 rounded-3xl border ${selectedItems.includes(item.id) ? 'border-blue-500 ring-2 ring-blue-500/10' : draggedItemId === item.id ? 'border-blue-300 opacity-60' : 'border-gray-100 dark:border-gray-800'} shadow-sm hover:shadow-md transition-all flex items-start gap-4 group ${isSortMode ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'}`}
                >
                  {isSortMode ? (
                    <div className="flex-shrink-0 flex flex-col items-center gap-2">
                      <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/20 text-blue-500 rounded-2xl flex items-center justify-center">
                        <GripVertical className="w-5 h-5" />
                      </div>
                      <div className="flex gap-1">
                        <button
                          disabled={idx === 0}
                          onClick={(e) => {
                            e.stopPropagation();
                            moveSortableItem(idx, idx - 1);
                          }}
                          className="p-1.5 bg-gray-50 dark:bg-gray-800 text-gray-400 hover:text-blue-500 rounded-lg disabled:opacity-30"
                          title="위로 이동"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          disabled={idx === sortableItems.length - 1}
                          onClick={(e) => {
                            e.stopPropagation();
                            moveSortableItem(idx, idx + 1);
                          }}
                          className="p-1.5 bg-gray-50 dark:bg-gray-800 text-gray-400 hover:text-blue-500 rounded-lg disabled:opacity-30"
                          title="아래로 이동"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ) : isSelectMode ? (
                    <div className={`flex-shrink-0 w-10 h-10 rounded-2xl flex items-center justify-center transition-all ${selectedItems.includes(item.id) ? 'bg-blue-600 text-white' : 'bg-gray-50 dark:bg-gray-800 text-gray-300'}`}>
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                  ) : (
                    <div className="flex-shrink-0 w-10 h-10 bg-gray-50 dark:bg-gray-800 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20 group-hover:text-blue-500 rounded-2xl flex items-center justify-center text-gray-400 dark:text-gray-500 font-black transition-colors">
                      {(idx + 1).toString().padStart(2, '0')}
                    </div>
                  )}
                  
                    <div className="flex-1 min-w-0">
                      {item.words ? (
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded text-[10px] font-black uppercase">
                                <Tag className="w-3 h-3" />
                                WORD
                              </span>
                              <span className="text-xs text-gray-400 dark:text-gray-500 uppercase font-bold tracking-tighter">{item.words.lang_code}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              {item.words.audio_url && (
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    playAudio(item.words.audio_url);
                                  }}
                                  className="p-1.5 bg-gray-50 dark:bg-gray-800 text-gray-400 dark:text-gray-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-500 rounded-lg transition-colors"
                                  title="재생"
                                >
                                  <Volume2 className="w-4 h-4" />
                                </button>
                              )}
                              <Link 
                                href={`/admin/words/${item.words.id}`}
                                className="p-1.5 bg-gray-50 dark:bg-gray-800 text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg transition-colors"
                                title="상세 정보"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </Link>
                            </div>
                          </div>
                          <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 tracking-tight">{item.words.word}</h3>
                          <p className="text-gray-500 dark:text-gray-400 font-medium">{getMeaningDisplay(item.words.meaning_ko)}</p>
                        </div>
                      ) : item.sentences ? (
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded text-[10px] font-black uppercase">
                                <MessageCircle className="w-3 h-3" />
                                SENTENCE
                              </span>
                              {(item.speaker_key || item.speaker_name || item.speaker_role) && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 rounded text-[10px] font-black">
                                  {item.speaker_key && (
                                    <span className="uppercase">{item.speaker_key}</span>
                                  )}
                                  {item.speaker_name && (
                                    <span>{item.speaker_name}</span>
                                  )}
                                  {item.speaker_role && (
                                    <span className="text-amber-500/70 dark:text-amber-300/70">({item.speaker_role})</span>
                                  )}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setTtsModalItem(item);
                                }}
                                className="p-1.5 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/40 rounded-lg transition-colors"
                                title="번들 아이템 음성 재생성"
                              >
                                <RotateCcw className="w-4 h-4" />
                              </button>
                              {(item.audio_url || item.sentences.audio_url) && (
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    playAudio(item.audio_url || item.sentences.audio_url);
                                  }}
                                  className="p-1.5 bg-gray-50 dark:bg-gray-800 text-gray-400 dark:text-gray-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-500 rounded-lg transition-colors"
                                  title={item.audio_url ? '번들 아이템 오디오 재생' : '문장 오디오 재생'}
                                >
                                  <Volume2 className="w-4 h-4" />
                                </button>
                              )}
                              <Link 
                                href={`/admin/sentences/${item.sentences.id}`}
                                className="p-1.5 bg-gray-50 dark:bg-gray-800 text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg transition-colors"
                                title="상세 정보"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </Link>
                            </div>
                          </div>
                          <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 tracking-tight leading-snug">{item.sentences.sentence}</h3>
                          <p className="text-gray-500 dark:text-gray-400 font-medium leading-snug">{item.sentences.translation}</p>
                          {item.sentences.translation_en && (
                            <p className="text-xs text-blue-500/60 dark:text-blue-400/60 font-medium italic leading-snug mt-1 flex items-center gap-1">
                              <span className="w-1 h-1 bg-blue-200 dark:bg-blue-800 rounded-full" />
                              {item.sentences.translation_en}
                            </p>
                          )}
                          {sentenceWords.length > 0 && (
                            <div className="mt-4 border-t border-gray-100 dark:border-gray-800 pt-3">
                              <div className="mb-2 flex items-center justify-between text-[10px] font-black uppercase text-gray-400 dark:text-gray-500">
                                <div className="flex items-center gap-1.5">
                                  <Book className="w-3 h-3" />
                                  연결 단어 {sentenceWords.length}
                                </div>
                                {studyWordIds.length > 0 && (
                                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                                    학습 대상 {sentenceWords.filter((w: any) => studyWordIds.includes(w.id)).length}개
                                  </span>
                                )}
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {sentenceWords.map((word: any) => {
                                  const isStudyWord = studyWordIds.includes(word.id);
                                  return (
                                    <Link
                                      href={`/admin/words/${word.id}`}
                                      key={word.id}
                                      onClick={(e) => e.stopPropagation()}
                                      className={`inline-flex max-w-full items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-black transition-colors ${
                                        isStudyWord
                                          ? 'border-emerald-300 dark:border-emerald-700 bg-emerald-50/90 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-200 hover:bg-emerald-100'
                                          : 'border-gray-100 dark:border-gray-800 bg-gray-50/70 dark:bg-gray-800/60 text-gray-700 dark:text-gray-300 hover:border-blue-100 hover:bg-blue-50 hover:text-blue-600'
                                      }`}
                                      title={getMeaningDisplay(word.meaning_ko)}
                                    >
                                      {word.word}
                                      {isStudyWord && (
                                        <span className="inline-flex items-center justify-center rounded-full bg-emerald-500 text-white text-[9px] px-1 py-0.2 leading-none font-bold">
                                          학습
                                        </span>
                                      )}
                                    </Link>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="py-2 text-gray-400 italic">데이터 정보 없음</div>
                      )}

                      {!isEditing && item.image_url && (
                        <div className="mt-3 relative w-32 aspect-video rounded-xl overflow-hidden border border-gray-100 dark:border-gray-800">
                          <Image src={item.image_url} alt="Item" fill className="object-cover" sizes="128px" />
                        </div>
                      )}
                    </div>
                </div>
                );
              })}
            </div>
          )}
        </div>

        {ttsModalItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
            <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-2xl">
              <div className="flex items-start justify-between gap-4 border-b border-gray-100 dark:border-gray-800 px-5 py-4">
                <div className="min-w-0">
                  <h3 className="text-base font-black text-gray-900 dark:text-gray-100">번들 아이템 음성 재생성</h3>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                    {ttsModalItem.sentences?.sentence}
                  </p>
                </div>
                <button
                  onClick={() => setTtsModalItem(null)}
                  disabled={isRegeneratingItemAudio}
                  className="p-2 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 disabled:opacity-50"
                  title="닫기"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="px-5 py-5">
                <TTSSettingsFields
                  value={itemTtsOptions}
                  onChange={setItemTtsOptions}
                  variant="modal"
                />
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-gray-100 dark:border-gray-800 px-5 py-4">
                <button
                  onClick={() => setTtsModalItem(null)}
                  disabled={isRegeneratingItemAudio}
                  className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-sm font-bold hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50"
                >
                  취소
                </button>
                <button
                  onClick={handleRegenerateItemAudio}
                  disabled={isRegeneratingItemAudio}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 disabled:opacity-50"
                >
                  {isRegeneratingItemAudio ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                  재생성
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Key Vocabulary / Study Words Section */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                  <Book className="w-5 h-5 text-purple-500" />
                  학습 대상 단어 관리
                </h2>
                {studyWordIds.length > 0 ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 dark:bg-emerald-950/80 px-2.5 py-0.5 text-xs font-bold text-emerald-800 dark:text-emerald-300">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    학습 대상 {studyWordIds.length}개 / 후보 {words.length}개
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-950/80 px-2.5 py-0.5 text-xs font-bold text-amber-800 dark:text-amber-300">
                    미선별 (전체 {words.length}개 출제 중)
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                번들 문장에 연결된 단어 중 실제 프랙티스(퀴즈/플래시카드/스펠링)에 출제할 핵심 단어군을 선별합니다.
              </p>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              {isEditingStudyWords ? (
                <>
                  <button
                    type="button"
                    onClick={handleCancelEditWords}
                    disabled={isSavingStudyWords}
                    className="px-3.5 py-2 text-xs font-bold rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                  >
                    취소
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveStudyWords}
                    disabled={isSavingStudyWords}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-emerald-600 text-white shadow-sm hover:bg-emerald-500 transition disabled:opacity-50"
                  >
                    {isSavingStudyWords ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        저장 중...
                      </>
                    ) : (
                      <>
                        <Save className="w-3.5 h-3.5" />
                        선택 완료 ({selectedWordIds.size}개 저장)
                      </>
                    )}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={handleStartEditWords}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-purple-600 text-white shadow-sm hover:bg-purple-500 transition"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  학습 단어 편집
                </button>
              )}
            </div>
          </div>

          {/* Edit Mode Control Toolbar */}
          {isEditingStudyWords && (
            <div className="rounded-2xl border border-purple-200 dark:border-purple-900/60 bg-purple-50/50 dark:bg-purple-950/20 p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="text-sm font-bold text-purple-950 dark:text-purple-200">
                  학습 단어로 등록할 단어를 클릭하거나 체크하세요 ({selectedWordIds.size} / {words.length}개 선택됨)
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleExcludeBasicWords}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-purple-200 dark:border-purple-800 bg-white dark:bg-gray-800 text-xs font-bold text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/40 transition"
                    title="el, la, de, yo, sí 등 극초급 기능어 자동 제외"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-purple-500" />
                    기본어 자동 제외
                  </button>
                  <button
                    type="button"
                    onClick={handleSelectAllWords}
                    className="px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 transition"
                  >
                    전체 선택
                  </button>
                  <button
                    type="button"
                    onClick={handleDeselectAllWords}
                    className="px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 transition"
                  >
                    전체 해제
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Search & Filter Bar */}
          {sortedWords.length > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-1 rounded-xl bg-gray-100 dark:bg-gray-800 p-1 text-xs font-bold text-gray-600 dark:text-gray-300">
                <button
                  type="button"
                  onClick={() => setWordFilter('all')}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    wordFilter === 'all'
                      ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm'
                      : 'hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  전체 ({sortedWords.length})
                </button>
                <button
                  type="button"
                  onClick={() => setWordFilter('selected')}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    wordFilter === 'selected'
                      ? 'bg-white dark:bg-gray-900 text-emerald-700 dark:text-emerald-400 shadow-sm'
                      : 'hover:text-emerald-600 dark:hover:text-emerald-400'
                  }`}
                >
                  학습 대상 ({isEditingStudyWords ? selectedWordIds.size : studyWordIds.length})
                </button>
                <button
                  type="button"
                  onClick={() => setWordFilter('unselected')}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    wordFilter === 'unselected'
                      ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm'
                      : 'hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  미선택 ({sortedWords.length - (isEditingStudyWords ? selectedWordIds.size : studyWordIds.length)})
                </button>
              </div>

              <div className="relative max-w-xs w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={wordSearch}
                  onChange={(e) => setWordSearch(e.target.value)}
                  placeholder="단어 또는 뜻 검색..."
                  className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs text-gray-800 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                />
              </div>
            </div>
          )}

          {sortedWords.length === 0 ? (
            <div className="bg-white dark:bg-gray-900 p-12 rounded-3xl border border-dashed border-gray-200 dark:border-gray-800 text-center">
              <p className="text-gray-400 dark:text-gray-500 font-medium">연결된 단어가 없습니다.</p>
            </div>
          ) : displayedWords.length === 0 ? (
            <div className="bg-white dark:bg-gray-900 p-8 rounded-3xl border border-gray-100 dark:border-gray-800 text-center">
              <p className="text-gray-400 dark:text-gray-500 text-sm">조건에 맞는 단어가 없습니다.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              {displayedWords.map((w) => {
                const isSelected = isEditingStudyWords
                  ? selectedWordIds.has(w.id)
                  : studyWordIds.includes(w.id);

                return (
                  <div
                    key={w.id}
                    onClick={() => {
                      if (isEditingStudyWords) {
                        handleToggleWord(w.id);
                      }
                    }}
                    className={`bg-white dark:bg-gray-900 p-4 sm:p-5 rounded-2xl sm:rounded-3xl border transition-all h-full flex flex-col ${
                      isEditingStudyWords
                        ? isSelected
                          ? 'border-emerald-500 dark:border-emerald-600 bg-emerald-50/20 dark:bg-emerald-950/20 cursor-pointer shadow-sm ring-1 ring-emerald-500/30'
                          : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 cursor-pointer opacity-75'
                        : isSelected
                        ? 'border-emerald-300 dark:border-emerald-800/80 shadow-sm'
                        : 'border-gray-100 dark:border-gray-800/80 opacity-80'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2 sm:mb-3">
                      <div className="flex items-center gap-2 min-w-0">
                        {isEditingStudyWords && (
                          <span className="shrink-0 text-emerald-600 dark:text-emerald-400">
                            {isSelected ? (
                              <CheckSquare className="w-5 h-5 fill-emerald-100 dark:fill-emerald-950 text-emerald-600" />
                            ) : (
                              <Square className="w-5 h-5 text-gray-300 dark:text-gray-600" />
                            )}
                          </span>
                        )}
                        <span className="text-base sm:text-lg font-bold text-gray-900 dark:text-gray-100 tracking-tight truncate">
                          {w.word}
                        </span>
                        <div className="flex gap-1 shrink-0">
                          {(w.pos || []).map((p: string, i: number) => (
                            <span key={i} className="bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase">
                              {p}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {!isEditingStudyWords && (
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isSelected
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                          }`}>
                            {isSelected ? '✓ 학습 대상' : '후보'}
                          </span>
                        )}
                        {w.audio_url && (
                          <button 
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              playAudio(w.audio_url);
                            }}
                            className="p-1.5 bg-gray-50 dark:bg-gray-800 text-gray-400 dark:text-gray-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-500 rounded-lg transition-colors"
                            title="발음 듣기"
                          >
                            <Volume2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="mt-auto pt-2 border-t border-gray-50 dark:border-gray-800/50">
                      <p className="text-sm text-gray-700 dark:text-gray-300 font-semibold">{getMeaningDisplay(w.meaning_ko)}</p>
                      {w.meaning_en && (
                        <p className="text-xs text-gray-400 dark:text-gray-500 italic mt-0.5">{getMeaningDisplay(w.meaning_en)}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
