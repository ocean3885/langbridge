'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clipboard,
  Copy,
  FileJson,
  Loader2,
  Pencil,
  Plus,
  Save,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import {
  BundleGenerationDraft,
  BundleGenerationDraftCount,
  BundleGenerationDraftStatus,
  RegisteredBundleSource,
  createBundleGenerationDrafts,
  deleteBundleGenerationDraft,
  getBundleGenerationPrompt,
  listBundleGenerationDrafts,
  listRegisteredBundleSources,
  saveBundleGenerationPrompt,
  updateBundleGenerationDraft,
} from '@/lib/supabase/services/bundle-generation-drafts';

type Category = {
  id: string;
  name: string;
  name_en?: string | null;
};

const TRANSFER_KEY = 'langbridge:bundle-generation-draft';
const REGISTERED_BUNDLES_PER_PAGE = 20;

function parseDraftInput(input: string) {
  const parsed = parseJsonLikeInput(input);
  return Array.isArray(parsed)
    ? parsed
    : Array.isArray(parsed?.bundles)
      ? parsed.bundles
      : [parsed];
}

function parseJsonLikeInput(input: string) {
  const source = extractJsonSource(input);
  try {
    return JSON.parse(source);
  } catch (initialError) {
    const repaired = repairCommonJsonIssues(source);
    if (repaired !== source) {
      try {
        return JSON.parse(repaired);
      } catch {
        // Fall through to the original error so the reported position matches the pasted text.
      }
    }

    const message = initialError instanceof Error ? initialError.message : 'JSON 형식이 올바르지 않습니다.';
    throw new Error(`JSON 형식이 올바르지 않습니다. ${message}`);
  }
}

function extractJsonSource(input: string) {
  const trimmed = input.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenced?.[1]) return fenced[1].trim();

  const firstObject = trimmed.indexOf('{');
  const firstArray = trimmed.indexOf('[');
  const starts = [firstObject, firstArray].filter(index => index >= 0);
  if (starts.length === 0) return trimmed;

  const start = Math.min(...starts);
  const endChar = trimmed[start] === '[' ? ']' : '}';
  const end = trimmed.lastIndexOf(endChar);
  return end > start ? trimmed.slice(start, end + 1).trim() : trimmed;
}

function repairCommonJsonIssues(input: string) {
  return escapeUnescapedStringQuotes(input)
    .replace(/,\s*([}\]])/g, '$1')
    .replace(/(["}\]\d])\s*\n\s*("[-\w]+"\s*:)/g, '$1,\n$2')
    .replace(/\b(true|false|null)\s*\n\s*("[-\w]+"\s*:)/g, '$1,\n$2');
}

function escapeUnescapedStringQuotes(input: string) {
  let output = '';
  let inString = false;
  let isEscaped = false;

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];

    if (char === '"' && !isEscaped) {
      if (!inString) {
        inString = true;
        output += char;
      } else if (isLikelyClosingQuote(input, index)) {
        inString = false;
        output += char;
      } else {
        output += '\\"';
      }
      isEscaped = false;
      continue;
    }

    output += char;

    if (char === '\\' && !isEscaped) {
      isEscaped = true;
    } else {
      isEscaped = false;
    }
  }

  return output;
}

function isLikelyClosingQuote(input: string, quoteIndex: number) {
  for (let index = quoteIndex + 1; index < input.length; index += 1) {
    const char = input[index];
    if (/\s/.test(char)) continue;
    return char === ':' || char === ',' || char === '}' || char === ']';
  }

  return true;
}

function buildSourceJson(
  category: Category | undefined,
  registeredBundles: RegisteredBundleSource[],
  pendingDrafts: BundleGenerationDraft[]
) {
  return {
    category: {
      id: category?.id || '',
      name: category?.name || '',
      name_en: category?.name_en || '',
    },
    registeredBundles: registeredBundles.map(bundle => ({
      title_en: bundle.title_en || '',
      description_en: bundle.description_en || '',
      items: bundle.items,
    })),
    pendingBundles: pendingDrafts.map(draft => draft.payload),
  };
}

function buildPrompt(
  category: Category | undefined
) {
  return `You are creating Spanish learning bundles for the category "${category?.name_en || category?.name || ''}".

Review the attached reference file containing bundles that are already registered or waiting for registration.
Using that file as context, create new bundles with distinct topics, English titles, English descriptions, and Spanish sentences.
Do not repeat existing bundle topics, titles, or exact sentences from the attached file.
Include Korean and English translations for the bundle title, description, and every Spanish sentence.
Each generated bundle must use one of the two payload shapes below.

Standard bundle:
{
  "title": "한국어 제목",
  "title_en": "English title",
  "description": "한국어 설명",
  "description_en": "English description",
  "items": [
    {
      "sentence": "Spanish sentence",
      "translation": "한국어 문장 번역",
      "translation_en": "English sentence translation"
    }
  ]
}

Conversation bundle:
{
  "title": "한국어 제목",
  "title_en": "English title",
  "description": "한국어 설명",
  "description_en": "English description",
  "type": "conversation",
  "speakers": [
    { "key": "a", "name": "María", "role": "guest" },
    { "key": "b", "name": "Carlos", "role": "host" }
  ],
  "items": [
    {
      "speaker": "a",
      "sentence": "Spanish sentence",
      "translation": "한국어 문장 번역",
      "translation_en": "English sentence translation"
    }
  ]
}

Generate exactly one bundle and return only the selected standard or conversation JSON object.
Do not wrap the result in a "bundles" array and do not include markdown code fences or explanations.`;
}

export default function BundleItemsMaker({
  userId,
  categories,
  draftCounts,
}: {
  userId: string;
  categories: Category[];
  draftCounts: BundleGenerationDraftCount[];
}) {
  const router = useRouter();
  const [selectedCategoryId, setSelectedCategoryId] = useState(categories[0]?.id || '');
  const [draftCountByCategory, setDraftCountByCategory] = useState<Record<string, number>>(() =>
    Object.fromEntries(draftCounts.map(item => [item.category_id, item.count]))
  );
  const [registeredBundles, setRegisteredBundles] = useState<RegisteredBundleSource[]>([]);
  const [drafts, setDrafts] = useState<BundleGenerationDraft[]>([]);
  const [jsonInput, setJsonInput] = useState('');
  const [promptInput, setPromptInput] = useState(() => buildPrompt(categories[0]));
  const [savedPrompt, setSavedPrompt] = useState(() => buildPrompt(categories[0]));
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingPrompt, setIsSavingPrompt] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<'source' | 'prompt' | null>(null);
  const [registeredPage, setRegisteredPage] = useState(1);
  const [expandedBundleIds, setExpandedBundleIds] = useState<Set<string>>(new Set());

  const selectedCategory = categories.find(category => category.id === selectedCategoryId);

  const loadCategoryData = async (categoryId: string) => {
    if (!categoryId) return;
    setIsLoading(true);
    setError(null);
    try {
      const [registered, pending, storedPrompt] = await Promise.all([
        listRegisteredBundleSources(categoryId),
        listBundleGenerationDrafts(categoryId),
        getBundleGenerationPrompt(categoryId),
      ]);
      setRegisteredBundles(registered);
      setDrafts(pending);
      setDraftCountByCategory(current => ({
        ...current,
        [categoryId]: pending.length,
      }));
      const category = categories.find(item => item.id === categoryId);
      const nextPrompt = storedPrompt?.prompt || buildPrompt(category);
      setPromptInput(nextPrompt);
      setSavedPrompt(nextPrompt);
    } catch (loadError: any) {
      setError(loadError.message || '카테고리 자료를 불러오지 못했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setRegisteredPage(1);
    setExpandedBundleIds(new Set());
    void loadCategoryData(selectedCategoryId);
  }, [categories, selectedCategoryId]);

  const existingSentenceSet = useMemo(() => new Set([
    ...registeredBundles.flatMap(bundle => bundle.items),
    ...drafts.flatMap(draft => draft.payload.items.map(item => item.sentence)),
  ].map(sentence => sentence.trim().toLowerCase())), [registeredBundles, drafts]);
  const registeredTotalPages = Math.max(
    1,
    Math.ceil(registeredBundles.length / REGISTERED_BUNDLES_PER_PAGE)
  );
  const displayedRegisteredBundles = useMemo(() => {
    const safePage = Math.min(registeredPage, registeredTotalPages);
    const startIndex = (safePage - 1) * REGISTERED_BUNDLES_PER_PAGE;
    return registeredBundles.slice(startIndex, startIndex + REGISTERED_BUNDLES_PER_PAGE);
  }, [registeredBundles, registeredPage, registeredTotalPages]);

  const toggleRegisteredBundle = (bundleId: string) => {
    setExpandedBundleIds(current => {
      const next = new Set(current);
      if (next.has(bundleId)) {
        next.delete(bundleId);
      } else {
        next.add(bundleId);
      }
      return next;
    });
  };

  const copyText = async (type: 'source' | 'prompt') => {
    const value = type === 'source'
      ? JSON.stringify(buildSourceJson(selectedCategory, registeredBundles, drafts), null, 2)
      : promptInput;

    await navigator.clipboard.writeText(value);
    setCopied(type);
    window.setTimeout(() => setCopied(null), 1400);
  };

  const savePrompt = async () => {
    if (!selectedCategoryId) return;
    setIsSavingPrompt(true);
    setError(null);
    try {
      const saved = await saveBundleGenerationPrompt(userId, selectedCategoryId, promptInput);
      setPromptInput(saved.prompt);
      setSavedPrompt(saved.prompt);
    } catch (saveError: any) {
      setError(saveError.message || '프롬프트 저장에 실패했습니다.');
    } finally {
      setIsSavingPrompt(false);
    }
  };

  const resetPrompt = () => {
    const defaultPrompt = buildPrompt(selectedCategory);
    setPromptInput(defaultPrompt);
  };

  const saveJsonDrafts = async () => {
    if (!selectedCategoryId) return;
    setError(null);
    setIsSaving(true);

    try {
      const payloads = parseDraftInput(jsonInput);
      if (payloads.length === 0) {
        throw new Error('유효한 번들 초안을 찾지 못했습니다.');
      }

      await createBundleGenerationDrafts(userId, selectedCategoryId, payloads);
      setJsonInput('');
      await loadCategoryData(selectedCategoryId);
    } catch (saveError: any) {
      setError(saveError.message || '등록 대기 번들 저장에 실패했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  const startBundleCreation = (draft: BundleGenerationDraft) => {
    sessionStorage.setItem(TRANSFER_KEY, JSON.stringify({
      generationDraftId: draft.id,
      category_id: draft.category_id,
      ...draft.payload,
    }));
    router.push('/admin/bundles/new?from=make-items');
  };

  return (
    <div className="md:ml-64 min-h-[calc(100vh-5rem)] bg-gray-50 p-4 pt-20 dark:bg-background md:p-8 md:pt-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div className="flex items-center gap-3">
            <Link
              href="/admin/bundles"
              className="rounded-xl border border-gray-200 bg-white p-2 text-gray-500 transition-colors hover:text-blue-600 dark:border-gray-800 dark:bg-gray-900"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white">번들 문장 생성</h1>
              <p className="text-sm text-gray-500">기존 자료를 참고해 새 번들 문장 초안을 관리합니다.</p>
            </div>
          </div>
          <select
            value={selectedCategoryId}
            onChange={event => setSelectedCategoryId(event.target.value)}
            className="min-w-64 rounded-2xl border border-gray-200 bg-white px-4 py-3 font-bold text-gray-700 outline-none focus:border-blue-400 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
          >
            {categories.map(category => (
              <option key={category.id} value={category.id}>
                {category.name_en || category.name} ({draftCountByCategory[category.id] || 0})
              </option>
            ))}
          </select>
        </div>

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700 dark:border-red-900/50 dark:bg-red-900/10 dark:text-red-300">
            {error}
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-3">
          <SummaryCard label="등록된 번들" value={registeredBundles.length} />
          <SummaryCard label="등록 대기 번들" value={drafts.length} />
          <SummaryCard label="참고 문장" value={existingSentenceSet.size} />
        </div>

        <section className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <h2 className="flex items-center gap-2 font-extrabold text-gray-900 dark:text-white">
                <Sparkles className="h-5 w-5 text-blue-600" />
                ChatGPT 생성 자료
              </h2>
              <p className="mt-1 text-xs text-gray-500">기존 등록 자료와 대기 자료를 함께 복사하여 중복 생성을 줄입니다.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <CopyButton
                label={copied === 'source' ? '복사됨' : '자료 JSON 복사'}
                active={copied === 'source'}
                onClick={() => void copyText('source')}
              />
              <CopyButton
                label={copied === 'prompt' ? '복사됨' : 'ChatGPT 프롬프트 복사'}
                active={copied === 'prompt'}
                onClick={() => void copyText('prompt')}
              />
            </div>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_auto]">
            <textarea
              value={jsonInput}
              onChange={event => setJsonInput(event.target.value)}
              placeholder='ChatGPT가 생성한 단일 번들 JSON 객체를 붙여넣으세요.'
              className="min-h-64 w-full resize-y rounded-2xl border-0 bg-gray-950 p-4 font-mono text-xs text-gray-200 outline-none ring-blue-500/20 focus:ring-4"
            />
            <button
              type="button"
              onClick={() => void saveJsonDrafts()}
              disabled={!jsonInput.trim() || isSaving}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-6 py-4 font-bold text-white transition-colors hover:bg-blue-700 disabled:opacity-50 lg:self-end"
            >
              {isSaving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Plus className="h-5 w-5" />}
              대기 목록에 추가
            </button>
          </div>
          <div className="mt-5 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <label className="text-xs font-black uppercase tracking-wide text-gray-400">
                  ChatGPT 프롬프트
                </label>
                {promptInput !== savedPrompt && (
                  <span className="rounded-full bg-amber-50 px-2 py-1 text-[10px] font-black text-amber-700 dark:bg-amber-900/20 dark:text-amber-300">
                    저장되지 않은 변경
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={resetPrompt}
                  className="rounded-lg px-3 py-1.5 text-xs font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  기본값
                </button>
                <button
                  type="button"
                  onClick={() => void savePrompt()}
                  disabled={isSavingPrompt || !promptInput.trim() || promptInput === savedPrompt}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-40"
                >
                  {isSavingPrompt ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                  프롬프트 저장
                </button>
              </div>
            </div>
            <textarea
              value={promptInput}
              onChange={event => setPromptInput(event.target.value)}
              className="min-h-72 w-full resize-y rounded-2xl border border-gray-200 bg-gray-50 p-4 font-mono text-xs text-gray-700 outline-none ring-blue-500/20 focus:border-blue-400 focus:ring-4 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-200"
            />
          </div>
        </section>

        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-extrabold text-gray-900 dark:text-white">등록 대기 번들</h2>
            <p className="text-xs text-gray-500">제목·설명·문장을 검토한 뒤 기존 번들 생성 화면으로 전달합니다.</p>
          </div>
          {isLoading ? (
            <LoadingPanel />
          ) : drafts.length === 0 ? (
            <EmptyPanel text="이 카테고리에 등록 대기 중인 번들이 없습니다." />
          ) : (
            <div className="space-y-4">
              {drafts.map(draft => (
                <DraftCard
                  key={draft.id}
                  draft={draft}
                  existingSentences={new Set([
                    ...registeredBundles.flatMap(bundle => bundle.items),
                    ...drafts
                      .filter(otherDraft => otherDraft.id !== draft.id)
                      .flatMap(otherDraft => otherDraft.payload.items.map(item => item.sentence)),
                  ].map(sentence => sentence.toLowerCase()))}
                  onRefresh={() => loadCategoryData(selectedCategoryId)}
                  onStart={() => startBundleCreation(draft)}
                />
              ))}
            </div>
          )}
        </section>

        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-extrabold text-gray-900 dark:text-white">기존 등록 번들</h2>
            <p className="text-xs text-gray-500">화면에는 요약만 표시하며, 복사 자료에는 전체 스페인어 문장이 포함됩니다.</p>
          </div>
          {isLoading ? (
            <LoadingPanel />
          ) : registeredBundles.length === 0 ? (
            <EmptyPanel text="이 카테고리에 등록된 번들이 없습니다." />
          ) : (
            <div className="space-y-4">
              <div className="overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
                <div className="hidden grid-cols-[minmax(0,1.1fr)_minmax(0,2fr)_100px_80px] gap-4 border-b border-gray-100 bg-gray-50 px-5 py-3 text-xs font-black uppercase tracking-wide text-gray-400 dark:border-gray-800 dark:bg-gray-800/60 md:grid">
                  <span>Title</span>
                  <span>Description</span>
                  <span>Sentences</span>
                  <span />
                </div>
                {displayedRegisteredBundles.map(bundle => {
                  const expanded = expandedBundleIds.has(bundle.id);
                  return (
                    <article key={bundle.id} className="border-b border-gray-100 last:border-b-0 dark:border-gray-800">
                      <div className="grid gap-3 px-5 py-4 md:grid-cols-[minmax(0,1.1fr)_minmax(0,2fr)_100px_80px] md:items-center md:gap-4">
                        <h3 className="truncate font-extrabold text-gray-900 dark:text-white">
                          {bundle.title_en || 'Untitled bundle'}
                        </h3>
                        <p className="line-clamp-2 text-sm text-gray-500">
                          {bundle.description_en || 'No English description'}
                        </p>
                        <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
                          {bundle.items.length}개
                        </span>
                        <button
                          type="button"
                          onClick={() => toggleRegisteredBundle(bundle.id)}
                          className="inline-flex items-center justify-center gap-1 rounded-lg px-2 py-1.5 text-xs font-bold text-gray-500 transition-colors hover:bg-gray-100 hover:text-blue-600 dark:hover:bg-gray-800"
                        >
                          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          {expanded ? '접기' : '보기'}
                        </button>
                      </div>
                      {expanded && (
                        <ol className="grid gap-2 border-t border-gray-100 bg-gray-50/70 px-5 py-4 dark:border-gray-800 dark:bg-gray-950/40 md:grid-cols-2">
                          {bundle.items.map((sentence, index) => (
                            <li key={`${bundle.id}-${index}`} className="flex gap-2 text-sm text-gray-700 dark:text-gray-300">
                              <span className="font-bold text-blue-500">{index + 1}.</span>
                              <span>{sentence}</span>
                            </li>
                          ))}
                        </ol>
                      )}
                    </article>
                  );
                })}
              </div>

              {registeredTotalPages > 1 && (
                <div className="flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => setRegisteredPage(page => Math.max(1, page - 1))}
                    disabled={registeredPage <= 1}
                    className="rounded-xl border border-gray-200 p-2 text-gray-500 disabled:opacity-30 dark:border-gray-700"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="text-xs font-bold text-gray-500">
                    {registeredPage} / {registeredTotalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setRegisteredPage(page => Math.min(registeredTotalPages, page + 1))}
                    disabled={registeredPage >= registeredTotalPages}
                    className="rounded-xl border border-gray-200 p-2 text-gray-500 disabled:opacity-30 dark:border-gray-700"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function DraftCard({
  draft,
  existingSentences,
  onRefresh,
  onStart,
}: {
  draft: BundleGenerationDraft;
  existingSentences: Set<string>;
  onRefresh: () => Promise<void>;
  onStart: () => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [isWorking, setIsWorking] = useState(false);
  const [payloadJson, setPayloadJson] = useState(JSON.stringify(draft.payload, null, 2));
  const [notes, setNotes] = useState(draft.notes || '');

  const duplicateCount = draft.payload.items.filter(
    item => existingSentences.has(item.sentence.toLowerCase())
  ).length;

  const save = async (status: BundleGenerationDraftStatus = draft.status) => {
    setIsWorking(true);
    try {
      await updateBundleGenerationDraft(draft.id, {
        payload: parseJsonLikeInput(payloadJson),
        notes,
        status,
      });
      setIsEditing(false);
      await onRefresh();
    } finally {
      setIsWorking(false);
    }
  };

  const remove = async () => {
    if (!window.confirm('이 등록 대기 번들을 삭제할까요?')) return;
    setIsWorking(true);
    try {
      await deleteBundleGenerationDraft(draft.id);
      await onRefresh();
    } finally {
      setIsWorking(false);
    }
  };

  return (
    <article className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      {isEditing ? (
        <div className="space-y-3">
          <textarea
            value={payloadJson}
            onChange={event => setPayloadJson(event.target.value)}
            className="min-h-96 w-full rounded-xl border border-gray-200 bg-gray-950 px-4 py-3 font-mono text-xs text-gray-200 dark:border-gray-700"
            placeholder="일반형 또는 대화형 번들 JSON"
          />
          <input
            value={notes}
            onChange={event => setNotes(event.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm dark:border-gray-700 dark:bg-gray-950"
            placeholder="관리 메모"
          />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setIsEditing(false)} className="rounded-xl px-4 py-2 font-bold text-gray-500">
              <X className="inline h-4 w-4" /> 취소
            </button>
            <button type="button" onClick={() => void save()} disabled={isWorking} className="rounded-xl bg-blue-600 px-4 py-2 font-bold text-white">
              <Save className="mr-1 inline h-4 w-4" /> 저장
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex flex-col justify-between gap-4 md:flex-row">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-extrabold text-gray-900 dark:text-white">{draft.payload.title_en}</h3>
                <span className="rounded-full bg-amber-50 px-2 py-1 text-[10px] font-black uppercase text-amber-700 dark:bg-amber-900/20 dark:text-amber-300">
                  {draft.status}
                </span>
                {draft.payload.type === 'conversation' && (
                  <span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-black text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300">
                    conversation
                  </span>
                )}
                {duplicateCount > 0 && (
                  <span className="rounded-full bg-red-50 px-2 py-1 text-[10px] font-black text-red-600 dark:bg-red-900/20">
                    기존 문장 중복 {duplicateCount}
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-gray-500">{draft.payload.description_en}</p>
              {draft.notes && <p className="mt-2 text-xs font-bold text-violet-500">메모: {draft.notes}</p>}
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => setIsEditing(true)} className="rounded-xl border border-gray-200 px-3 py-2 text-xs font-bold dark:border-gray-700">
                <Pencil className="mr-1 inline h-4 w-4" /> 수정
              </button>
              <button type="button" onClick={() => void save('ready')} disabled={isWorking} className="rounded-xl border border-emerald-200 px-3 py-2 text-xs font-bold text-emerald-600">
                <Check className="mr-1 inline h-4 w-4" /> 준비 완료
              </button>
              <button type="button" onClick={onStart} className="rounded-xl bg-blue-600 px-3 py-2 text-xs font-bold text-white">
                <FileJson className="mr-1 inline h-4 w-4" /> 번들 등록
              </button>
              <button type="button" onClick={() => void remove()} disabled={isWorking} className="rounded-xl px-3 py-2 text-xs font-bold text-red-500">
                <Trash2 className="inline h-4 w-4" />
              </button>
            </div>
          </div>
          <ol className="mt-4 grid gap-2 md:grid-cols-2">
            {draft.payload.items.map((item, index) => {
              const duplicate = existingSentences.has(item.sentence.toLowerCase());
              return (
                <li key={`${draft.id}-${index}`} className={`rounded-xl px-3 py-2 text-sm ${duplicate ? 'bg-red-50 text-red-700 dark:bg-red-900/10 dark:text-red-300' : 'bg-gray-50 text-gray-700 dark:bg-gray-800 dark:text-gray-300'}`}>
                  <span className="mr-2 font-bold text-blue-500">{index + 1}.</span>{item.sentence}
                </li>
              );
            })}
          </ol>
        </>
      )}
    </article>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <p className="text-xs font-bold text-gray-400">{label}</p>
      <p className="mt-1 text-2xl font-black text-gray-900 dark:text-white">{value}</p>
    </div>
  );
}

function CopyButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-xs font-bold dark:border-gray-700">
      {active ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
      {label}
    </button>
  );
}

function LoadingPanel() {
  return (
    <div className="flex items-center justify-center rounded-3xl border border-gray-100 bg-white p-12 dark:border-gray-800 dark:bg-gray-900">
      <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
    </div>
  );
}

function EmptyPanel({ text }: { text: string }) {
  return (
    <div className="rounded-3xl border border-dashed border-gray-200 bg-white p-10 text-center text-sm text-gray-400 dark:border-gray-700 dark:bg-gray-900">
      <Clipboard className="mx-auto mb-2 h-6 w-6" />
      {text}
    </div>
  );
}
