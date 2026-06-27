'use client';

import { useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Check,
  FileText,
  Loader2,
  Plus,
  Sparkles,
  Wand2,
} from 'lucide-react';
import type { WordGenerationProvider } from '@/lib/generator';
import type {
  BlogContentPlanListItem,
  BlogPlanCategory,
} from '@/lib/supabase/services/blog-content-plans';
import {
  generateBlogPlanCandidatesAction,
  saveBlogPlanCandidatesAction,
} from './actions';
import type { BlogPlanCandidate } from './actions';

interface BlogContentPlansManagerProps {
  categories: BlogPlanCategory[];
  plans: BlogContentPlanListItem[];
  language: 'ko' | 'en';
}

const copy = {
  ko: {
    title: '블로그 콘텐츠 기획',
    description: '카테고리별 기존 글과 활성 기획의 제목, slug, 설명만 참고해 새 기획 후보를 생성합니다.',
    back: '글 목록',
    generate: '기획 후보 생성',
    generating: '생성 중',
    saveSelected: '선택 저장',
    saving: '저장 중',
    category: '카테고리',
    count: '후보 개수',
    provider: '생성 모델',
    seedKeywords: '포함 키워드',
    excludedTopics: '제외 주제',
    audience: '대상 독자',
    direction: '콘텐츠 방향',
    candidateTitle: '생성 후보',
    listTitle: '저장된 기획',
    emptyCandidates: '아직 생성된 후보가 없습니다.',
    emptyPlans: '저장된 기획이 없습니다.',
    context: '참고 컨텍스트',
    posts: '기존 글',
    activePlans: '활성 기획',
    generated: '생성 결과 있음',
    notGenerated: '미생성',
    linked: '연결 글',
    noCategory: '카테고리 없음',
    saved: (count: number) => `${count}개 기획을 저장했습니다.`,
    selectCategory: '카테고리를 선택해 주세요.',
    selectCandidates: '저장할 후보를 선택해 주세요.',
  },
  en: {
    title: 'Blog Content Plans',
    description: 'Generate new plan candidates using only title, slug, and description from the selected category.',
    back: 'Posts',
    generate: 'Generate Plans',
    generating: 'Generating',
    saveSelected: 'Save Selected',
    saving: 'Saving',
    category: 'Category',
    count: 'Count',
    provider: 'Provider',
    seedKeywords: 'Seed keywords',
    excludedTopics: 'Excluded topics',
    audience: 'Audience',
    direction: 'Direction',
    candidateTitle: 'Candidates',
    listTitle: 'Saved plans',
    emptyCandidates: 'No candidates generated yet.',
    emptyPlans: 'No saved plans yet.',
    context: 'Context',
    posts: 'Posts',
    activePlans: 'Active plans',
    generated: 'Generated payload',
    notGenerated: 'Not generated',
    linked: 'Linked post',
    noCategory: 'No category',
    saved: (count: number) => `Saved ${count} plans.`,
    selectCategory: 'Choose a category.',
    selectCandidates: 'Choose candidates to save.',
  },
};

const statusStyles: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-800',
  generating: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:ring-blue-800',
  ready: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-800',
  published: 'bg-zinc-100 text-zinc-700 ring-1 ring-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:ring-zinc-700',
  paused: 'bg-orange-50 text-orange-700 ring-1 ring-orange-200 dark:bg-orange-500/10 dark:text-orange-300 dark:ring-orange-800',
  discarded: 'bg-red-50 text-red-700 ring-1 ring-red-200 dark:bg-red-500/10 dark:text-red-300 dark:ring-red-800',
};

function splitKeywords(value: string) {
  return value
    .split(',')
    .map((keyword) => keyword.trim())
    .filter(Boolean);
}

function KeywordChips({ keywords }: { keywords: string[] }) {
  if (keywords.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {keywords.map((keyword) => (
        <span
          key={keyword}
          className="rounded-md bg-zinc-100 px-2 py-1 text-xs font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
        >
          {keyword}
        </span>
      ))}
    </div>
  );
}

function CandidateCard({
  candidate,
  selected,
  onToggle,
}: {
  candidate: BlogPlanCandidate;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <article className="border-b border-zinc-200 px-5 py-4 last:border-b-0 dark:border-zinc-800">
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={onToggle}
          aria-label="select"
          className={`mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border transition ${
            selected
              ? 'border-[#559c63] bg-[#559c63] text-white'
              : 'border-zinc-300 bg-white text-transparent hover:border-[#559c63] dark:border-zinc-700 dark:bg-zinc-900'
          }`}
        >
          <Check size={15} />
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-[#EEF7EF] px-2 py-1 text-xs font-bold text-[#4f865a] dark:bg-emerald-500/10 dark:text-emerald-300">
              P{candidate.priority}
            </span>
            <span className="font-mono text-xs text-zinc-500 dark:text-zinc-400">
              /blog/{candidate.slug}
            </span>
          </div>
          <h3 className="mt-2 text-base font-black text-zinc-950 dark:text-zinc-50">
            {candidate.title}
          </h3>
          <p className="mt-1 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
            {candidate.description}
          </p>
          <div className="mt-3">
            <KeywordChips keywords={candidate.targetKeywords} />
          </div>
          <div className="mt-3 grid gap-2 text-xs leading-5 text-zinc-500 dark:text-zinc-400 lg:grid-cols-3">
            <p>{candidate.searchIntent}</p>
            <p>{candidate.contentAngle}</p>
            <p>{candidate.audience}</p>
          </div>
          {candidate.notes ? (
            <p className="mt-2 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
              {candidate.notes}
            </p>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function PlanRow({ plan, language }: { plan: BlogContentPlanListItem; language: 'ko' | 'en' }) {
  const t = copy[language];

  return (
    <article className="grid gap-4 border-b border-zinc-200 px-5 py-4 last:border-b-0 dark:border-zinc-800 xl:grid-cols-[1fr_130px_140px_110px] xl:items-center">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-bold ${
              statusStyles[plan.status] ?? statusStyles.pending
            }`}
          >
            {plan.status}
          </span>
          <span className="rounded-md bg-zinc-100 px-2 py-1 text-xs font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
            P{plan.priority}
          </span>
          <span className="rounded-md bg-zinc-100 px-2 py-1 text-xs font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
            {plan.category?.name ?? t.noCategory}
          </span>
        </div>
        <h3 className="mt-2 truncate text-base font-black text-zinc-950 dark:text-zinc-50">
          {plan.title}
        </h3>
        <p className="mt-1 line-clamp-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
          {plan.description}
        </p>
        {plan.slug ? (
          <p className="mt-1 truncate font-mono text-xs text-zinc-500 dark:text-zinc-400">
            /blog/{plan.slug}
          </p>
        ) : null}
      </div>
      <div>
        <KeywordChips keywords={plan.targetKeywords.slice(0, 4)} />
      </div>
      <div className="text-sm font-semibold text-zinc-600 dark:text-zinc-400">
        {plan.hasGeneratedPayload ? t.generated : t.notGenerated}
      </div>
      <div className="text-sm">
        {plan.linkedPost ? (
          <Link
            href={`/blog/${plan.linkedPost.slug}`}
            className="font-bold text-[#559c63] hover:underline"
          >
            {t.linked}
          </Link>
        ) : (
          <span className="text-zinc-400">-</span>
        )}
      </div>
    </article>
  );
}

export function BlogContentPlansManager({
  categories,
  plans,
  language,
}: BlogContentPlansManagerProps) {
  const t = copy[language];
  const router = useRouter();
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? '');
  const [candidateCount, setCandidateCount] = useState(3);
  const [provider, setProvider] = useState<WordGenerationProvider>('deepseek');
  const [seedKeywords, setSeedKeywords] = useState('');
  const [excludedTopics, setExcludedTopics] = useState('');
  const [audience, setAudience] = useState('');
  const [direction, setDirection] = useState('');
  const [candidates, setCandidates] = useState<BlogPlanCandidate[]>([]);
  const [selectedIndexes, setSelectedIndexes] = useState<Set<number>>(new Set());
  const [contextSummary, setContextSummary] = useState<{
    categoryName: string;
    postCount: number;
    activePlanCount: number;
  } | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, startGenerating] = useTransition();
  const [isSaving, startSaving] = useTransition();

  const selectedCandidates = useMemo(
    () => candidates.filter((_, index) => selectedIndexes.has(index)),
    [candidates, selectedIndexes]
  );

  const handleGenerate = () => {
    setError(null);
    setMessage(null);

    if (!categoryId) {
      setError(t.selectCategory);
      return;
    }

    startGenerating(async () => {
      const result = await generateBlogPlanCandidatesAction({
        categoryId,
        candidateCount,
        seedKeywords,
        excludedTopics,
        audience,
        direction,
        provider,
      });

      if (!result.success || !result.candidates) {
        setError(result.error ?? 'Failed to generate.');
        return;
      }

      setCandidates(result.candidates);
      setSelectedIndexes(new Set(result.candidates.map((_, index) => index)));
      setContextSummary(result.contextSummary ?? null);
    });
  };

  const handleSave = () => {
    setError(null);
    setMessage(null);

    if (!categoryId) {
      setError(t.selectCategory);
      return;
    }

    if (selectedCandidates.length === 0) {
      setError(t.selectCandidates);
      return;
    }

    startSaving(async () => {
      const result = await saveBlogPlanCandidatesAction({
        categoryId,
        candidates: selectedCandidates,
      });

      if (!result.success) {
        setError(result.error ?? 'Failed to save.');
        return;
      }

      setMessage(t.saved(result.count ?? selectedCandidates.length));
      setCandidates([]);
      setSelectedIndexes(new Set());
      setContextSummary(null);
      router.refresh();
    });
  };

  const toggleCandidate = (index: number) => {
    setSelectedIndexes((current) => {
      const next = new Set(current);

      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }

      return next;
    });
  };

  return (
    <main className="min-h-screen bg-[#F9F7F2] px-4 py-8 text-zinc-950 dark:bg-zinc-950 dark:text-zinc-50 md:ml-64 md:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-black tracking-normal">{t.title}</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-600 dark:text-zinc-400">
              {t.description}
            </p>
          </div>
          <Link
            href="/admin/blog"
            className="inline-flex items-center justify-center gap-2 rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-bold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            <ArrowLeft size={16} />
            {t.back}
          </Link>
        </header>

        <section className="rounded-lg border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
            <div className="flex items-center gap-2">
              <Wand2 size={18} className="text-[#559c63]" />
              <h2 className="text-sm font-black text-zinc-900 dark:text-zinc-100">
                {t.generate}
              </h2>
            </div>
          </div>

          <div className="grid gap-4 px-5 py-5 lg:grid-cols-3">
            <label className="space-y-2">
              <span className="text-xs font-bold uppercase text-zinc-500">{t.category}</span>
              <select
                value={categoryId}
                onChange={(event) => setCategoryId(event.target.value)}
                className="h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm font-semibold outline-none focus:border-[#559c63] dark:border-zinc-700 dark:bg-zinc-950"
              >
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2">
              <span className="text-xs font-bold uppercase text-zinc-500">{t.count}</span>
              <input
                type="number"
                min={1}
                max={8}
                value={candidateCount}
                onChange={(event) => setCandidateCount(Number(event.target.value))}
                className="h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm font-semibold outline-none focus:border-[#559c63] dark:border-zinc-700 dark:bg-zinc-950"
              />
            </label>

            <label className="space-y-2">
              <span className="text-xs font-bold uppercase text-zinc-500">{t.provider}</span>
              <select
                value={provider}
                onChange={(event) => setProvider(event.target.value as WordGenerationProvider)}
                className="h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm font-semibold outline-none focus:border-[#559c63] dark:border-zinc-700 dark:bg-zinc-950"
              >
                <option value="deepseek">DeepSeek</option>
                <option value="chatgpt">ChatGPT</option>
                <option value="gemini">Gemini</option>
              </select>
            </label>

            <label className="space-y-2 lg:col-span-3">
              <span className="text-xs font-bold uppercase text-zinc-500">{t.seedKeywords}</span>
              <input
                value={seedKeywords}
                onChange={(event) => setSeedKeywords(event.target.value)}
                placeholder="스페인어 회화, 스페인어 질문 표현"
                className="h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-[#559c63] dark:border-zinc-700 dark:bg-zinc-950"
              />
              <KeywordChips keywords={splitKeywords(seedKeywords)} />
            </label>

            <label className="space-y-2">
              <span className="text-xs font-bold uppercase text-zinc-500">{t.excludedTopics}</span>
              <textarea
                value={excludedTopics}
                onChange={(event) => setExcludedTopics(event.target.value)}
                rows={3}
                className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#559c63] dark:border-zinc-700 dark:bg-zinc-950"
              />
            </label>

            <label className="space-y-2">
              <span className="text-xs font-bold uppercase text-zinc-500">{t.audience}</span>
              <textarea
                value={audience}
                onChange={(event) => setAudience(event.target.value)}
                rows={3}
                className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#559c63] dark:border-zinc-700 dark:bg-zinc-950"
              />
            </label>

            <label className="space-y-2">
              <span className="text-xs font-bold uppercase text-zinc-500">{t.direction}</span>
              <textarea
                value={direction}
                onChange={(event) => setDirection(event.target.value)}
                rows={3}
                className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#559c63] dark:border-zinc-700 dark:bg-zinc-950"
              />
            </label>
          </div>

          <div className="flex flex-col gap-3 border-t border-zinc-200 px-5 py-4 dark:border-zinc-800 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-h-5 text-sm">
              {contextSummary ? (
                <span className="font-semibold text-zinc-600 dark:text-zinc-400">
                  {t.context}: {contextSummary.categoryName} · {t.posts} {contextSummary.postCount} · {t.activePlans}{' '}
                  {contextSummary.activePlanCount}
                </span>
              ) : null}
              {message ? <span className="font-semibold text-[#559c63]">{message}</span> : null}
              {error ? <span className="font-semibold text-red-600 dark:text-red-300">{error}</span> : null}
            </div>
            <button
              type="button"
              onClick={handleGenerate}
              disabled={isGenerating || categories.length === 0}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-[#559c63] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#468653] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isGenerating ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} />}
              {isGenerating ? t.generating : t.generate}
            </button>
          </div>
        </section>

        <section className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex flex-col gap-3 border-b border-zinc-200 px-5 py-4 dark:border-zinc-800 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <Sparkles size={18} className="text-[#559c63]" />
              <h2 className="text-sm font-black text-zinc-900 dark:text-zinc-100">
                {t.candidateTitle}
              </h2>
            </div>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving || selectedCandidates.length === 0}
              className="inline-flex items-center justify-center gap-2 rounded-md border border-[#559c63] bg-white px-4 py-2 text-sm font-bold text-[#4f865a] transition hover:bg-[#EEF7EF] disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-900 dark:hover:bg-emerald-500/10"
            >
              {isSaving ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />}
              {isSaving ? t.saving : `${t.saveSelected} (${selectedCandidates.length})`}
            </button>
          </div>
          {candidates.length > 0 ? (
            <div>
              {candidates.map((candidate, index) => (
                <CandidateCard
                  key={`${candidate.slug}-${index}`}
                  candidate={candidate}
                  selected={selectedIndexes.has(index)}
                  onToggle={() => toggleCandidate(index)}
                />
              ))}
            </div>
          ) : (
            <div className="flex min-h-[180px] flex-col items-center justify-center px-6 py-10 text-center">
              <Sparkles size={30} className="text-zinc-400" />
              <p className="mt-3 text-sm font-semibold text-zinc-500 dark:text-zinc-400">
                {t.emptyCandidates}
              </p>
            </div>
          )}
        </section>

        <section className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center gap-2 border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
            <FileText size={18} className="text-[#559c63]" />
            <h2 className="text-sm font-black text-zinc-900 dark:text-zinc-100">
              {t.listTitle}
            </h2>
          </div>
          {plans.length > 0 ? (
            <div>
              {plans.map((plan) => (
                <PlanRow key={plan.id} plan={plan} language={language} />
              ))}
            </div>
          ) : (
            <div className="flex min-h-[180px] flex-col items-center justify-center px-6 py-10 text-center">
              <FileText size={30} className="text-zinc-400" />
              <p className="mt-3 text-sm font-semibold text-zinc-500 dark:text-zinc-400">
                {t.emptyPlans}
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
