'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import type { WordGenerationProvider } from '@/lib/generator';
import type {
  BlogContentPlanListItem,
  BlogPlanCategory,
} from '@/lib/supabase/services/blog-content-plans';
import {
  deleteBlogContentPlanAction,
  deleteBlogPlanCandidatePromptAction,
  deleteBlogPlanPostPromptAction,
  generateBlogPostFromPlanAction,
  generateBlogPlanCandidatesAction,
  getBlogPlanPromptLibraryAction,
  publishBlogPostFromPlanAction,
  saveBlogPlanCandidatePromptAction,
  saveBlogPlanCandidatesAction,
  saveBlogPlanPostPromptAction,
} from './actions';
import type { BlogPlanCandidate } from './actions';
import { BlogPlanCandidatesPanel } from './BlogPlanCandidatesPanel';
import { BlogPlanGenerationPanel } from './BlogPlanGenerationPanel';
import { blogPlansCopy, type BlogPlansLanguage } from './blog-plans.copy';
import {
  DEFAULT_BLOG_PLAN_CANDIDATE_PROMPTS,
  DEFAULT_BLOG_PLAN_POST_PROMPTS,
} from './prompt-presets';
import type { BlogPlanCandidatePrompt, BlogPlanPostPrompt } from './prompt-presets';
import { SavedBlogPlansPanel } from './SavedBlogPlansPanel';
import type { SavedPlanFilter } from './SavedBlogPlansPanel';

interface BlogContentPlansManagerProps {
  categories: BlogPlanCategory[];
  plans: BlogContentPlanListItem[];
  language: BlogPlansLanguage;
}

export function BlogContentPlansManager({
  categories,
  plans,
  language,
}: BlogContentPlansManagerProps) {
  const t = blogPlansCopy[language];
  const router = useRouter();
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? '');
  const [candidateCount, setCandidateCount] = useState(3);
  const [provider, setProvider] = useState<WordGenerationProvider>('deepseek');
  const [postProvider, setPostProvider] = useState<WordGenerationProvider>('gemini');
  const [candidatePrompts, setCandidatePrompts] = useState<BlogPlanCandidatePrompt[]>(DEFAULT_BLOG_PLAN_CANDIDATE_PROMPTS);
  const [candidatePromptId, setCandidatePromptId] = useState(DEFAULT_BLOG_PLAN_CANDIDATE_PROMPTS[0]?.id ?? '');
  const [candidatePromptPanelOpen, setCandidatePromptPanelOpen] = useState(false);
  const [candidatePromptEditingId, setCandidatePromptEditingId] = useState(DEFAULT_BLOG_PLAN_CANDIDATE_PROMPTS[0]?.id ?? '');
  const [candidatePromptTitle, setCandidatePromptTitle] = useState(DEFAULT_BLOG_PLAN_CANDIDATE_PROMPTS[0]?.title ?? '');
  const [candidatePromptContent, setCandidatePromptContent] = useState(DEFAULT_BLOG_PLAN_CANDIDATE_PROMPTS[0]?.prompt ?? '');
  const [postPrompts, setPostPrompts] = useState<BlogPlanPostPrompt[]>(DEFAULT_BLOG_PLAN_POST_PROMPTS);
  const [postPromptId, setPostPromptId] = useState(DEFAULT_BLOG_PLAN_POST_PROMPTS[0]?.id ?? '');
  const [postPromptPanelOpen, setPostPromptPanelOpen] = useState(false);
  const [postPromptEditingId, setPostPromptEditingId] = useState(DEFAULT_BLOG_PLAN_POST_PROMPTS[0]?.id ?? '');
  const [postPromptTitle, setPostPromptTitle] = useState(DEFAULT_BLOG_PLAN_POST_PROMPTS[0]?.title ?? '');
  const [draftPrompt, setDraftPrompt] = useState(DEFAULT_BLOG_PLAN_POST_PROMPTS[0]?.draftPrompt ?? '');
  const [jsonPrompt, setJsonPrompt] = useState(DEFAULT_BLOG_PLAN_POST_PROMPTS[0]?.jsonPrompt ?? '');
  const [seedKeywords, setSeedKeywords] = useState('');
  const [excludedTopics, setExcludedTopics] = useState('');
  const [audience, setAudience] = useState('');
  const [direction, setDirection] = useState('');
  const [candidates, setCandidates] = useState<BlogPlanCandidate[]>([]);
  const [candidateCategoryId, setCandidateCategoryId] = useState('');
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
  const [isPromptPending, startPromptTransition] = useTransition();
  const [generatingPlanId, setGeneratingPlanId] = useState<string | null>(null);
  const [publishingPlanId, setPublishingPlanId] = useState<string | null>(null);
  const [deletingPlanId, setDeletingPlanId] = useState<string | null>(null);
  const [savedPlanFilter, setSavedPlanFilter] = useState<SavedPlanFilter>('active');

  const selectedCandidates = useMemo(
    () => candidates.filter((_, index) => selectedIndexes.has(index)),
    [candidates, selectedIndexes]
  );

  const savedPlanFilterCounts = useMemo(() => {
    const ready = plans.filter((plan) => plan.status === 'ready' && !plan.linkedPost).length;
    const published = plans.filter((plan) => plan.status === 'published' || Boolean(plan.linkedPost)).length;
    const active = plans.filter(
      (plan) => ['pending', 'generating', 'ready', 'paused'].includes(plan.status) && !plan.linkedPost
    ).length;

    return {
      active,
      ready,
      published,
      all: plans.length,
    };
  }, [plans]);

  const filteredPlans = useMemo(() => {
    if (savedPlanFilter === 'ready') {
      return plans.filter((plan) => plan.status === 'ready' && !plan.linkedPost);
    }

    if (savedPlanFilter === 'published') {
      return plans.filter((plan) => plan.status === 'published' || Boolean(plan.linkedPost));
    }

    if (savedPlanFilter === 'all') {
      return plans;
    }

    return plans.filter(
      (plan) => ['pending', 'generating', 'ready', 'paused'].includes(plan.status) && !plan.linkedPost
    );
  }, [plans, savedPlanFilter]);

  useEffect(() => {
    let ignore = false;

    getBlogPlanPromptLibraryAction()
      .then((result) => {
        if (ignore) return;

        if (!result.success) {
          setError(result.error ?? t.promptLoadError);
          return;
        }

        const nextCandidatePrompts = result.candidatePrompts?.length
          ? result.candidatePrompts
          : DEFAULT_BLOG_PLAN_CANDIDATE_PROMPTS;
        const nextPostPrompts = result.postPrompts?.length ? result.postPrompts : DEFAULT_BLOG_PLAN_POST_PROMPTS;
        const nextCandidatePrompt = nextCandidatePrompts[0];
        const nextPostPrompt = nextPostPrompts[0];

        setCandidatePrompts(nextCandidatePrompts);
        setCandidatePromptId(nextCandidatePrompt?.id ?? '');
        setCandidatePromptEditingId(nextCandidatePrompt?.id ?? '');
        setCandidatePromptTitle(nextCandidatePrompt?.title ?? '');
        setCandidatePromptContent(nextCandidatePrompt?.prompt ?? '');
        setPostPrompts(nextPostPrompts);
        setPostPromptId(nextPostPrompt?.id ?? '');
        setPostPromptEditingId(nextPostPrompt?.id ?? '');
        setPostPromptTitle(nextPostPrompt?.title ?? '');
        setDraftPrompt(nextPostPrompt?.draftPrompt ?? '');
        setJsonPrompt(nextPostPrompt?.jsonPrompt ?? '');
      })
      .catch(() => {
        if (!ignore) setError(t.promptLoadError);
      });

    return () => {
      ignore = true;
    };
  }, [t.promptLoadError]);

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
        promptId: candidatePromptId,
      });

      if (!result.success || !result.candidates) {
        setError(result.error ?? 'Failed to generate.');
        return;
      }

      setCandidates(result.candidates);
      setCandidateCategoryId(categoryId);
      setSelectedIndexes(new Set(result.candidates.map((_, index) => index)));
      setContextSummary(result.contextSummary ?? null);
    });
  };

  const handleSave = () => {
    setError(null);
    setMessage(null);

    if (!candidateCategoryId) {
      setError(t.selectCategory);
      return;
    }

    if (selectedCandidates.length === 0) {
      setError(t.selectCandidates);
      return;
    }

    startSaving(async () => {
      const result = await saveBlogPlanCandidatesAction({
        categoryId: candidateCategoryId,
        candidates: selectedCandidates,
      });

      if (!result.success) {
        setError(result.error ?? 'Failed to save.');
        return;
      }

      setMessage(t.saved(result.count ?? selectedCandidates.length));
      setCandidates([]);
      setCandidateCategoryId('');
      setSelectedIndexes(new Set());
      setContextSummary(null);
      router.refresh();
    });
  };

  const handleSelectCandidatePrompt = (prompt: BlogPlanCandidatePrompt) => {
    setCandidatePromptId(prompt.id);
    setCandidatePromptEditingId(prompt.id);
    setCandidatePromptTitle(prompt.title);
    setCandidatePromptContent(prompt.prompt);
  };

  const handleNewCandidatePrompt = () => {
    setCandidatePromptId('');
    setCandidatePromptEditingId('');
    setCandidatePromptTitle('');
    setCandidatePromptContent('');
  };

  const handleSaveCandidatePrompt = () => {
    setError(null);
    setMessage(null);

    startPromptTransition(async () => {
      const result = await saveBlogPlanCandidatePromptAction({
        id: candidatePromptEditingId,
        title: candidatePromptTitle,
        prompt: candidatePromptContent,
      });

      if (!result.success) {
        setError(result.error ?? t.promptSaveError);
        return;
      }

      const nextPrompts = result.candidatePrompts ?? candidatePrompts;
      const selectedId = result.selectedId ?? nextPrompts[0]?.id ?? '';
      const selectedPrompt = nextPrompts.find((prompt) => prompt.id === selectedId) ?? nextPrompts[0];

      setCandidatePrompts(nextPrompts);
      setCandidatePromptId(selectedPrompt?.id ?? '');
      setCandidatePromptEditingId(selectedPrompt?.id ?? '');
      setCandidatePromptTitle(selectedPrompt?.title ?? '');
      setCandidatePromptContent(selectedPrompt?.prompt ?? '');
      setMessage(t.promptSaved);
    });
  };

  const handleDeleteCandidatePrompt = (id: string) => {
    setError(null);
    setMessage(null);

    startPromptTransition(async () => {
      const result = await deleteBlogPlanCandidatePromptAction(id);

      if (!result.success) {
        setError(result.error ?? t.promptDeleteError);
        return;
      }

      const nextPrompts = result.candidatePrompts ?? candidatePrompts;
      const selectedId = result.selectedId ?? nextPrompts[0]?.id ?? '';
      const selectedPrompt = nextPrompts.find((prompt) => prompt.id === selectedId) ?? nextPrompts[0];

      setCandidatePrompts(nextPrompts);
      setCandidatePromptId(selectedPrompt?.id ?? '');
      setCandidatePromptEditingId(selectedPrompt?.id ?? '');
      setCandidatePromptTitle(selectedPrompt?.title ?? '');
      setCandidatePromptContent(selectedPrompt?.prompt ?? '');
      setMessage(t.promptDeleted);
    });
  };

  const handleSelectPostPrompt = (prompt: BlogPlanPostPrompt) => {
    setPostPromptId(prompt.id);
    setPostPromptEditingId(prompt.id);
    setPostPromptTitle(prompt.title);
    setDraftPrompt(prompt.draftPrompt);
    setJsonPrompt(prompt.jsonPrompt);
  };

  const handleNewPostPrompt = () => {
    setPostPromptId('');
    setPostPromptEditingId('');
    setPostPromptTitle('');
    setDraftPrompt('');
    setJsonPrompt('');
  };

  const handleSavePostPrompt = () => {
    setError(null);
    setMessage(null);

    startPromptTransition(async () => {
      const result = await saveBlogPlanPostPromptAction({
        id: postPromptEditingId,
        title: postPromptTitle,
        draftPrompt,
        jsonPrompt,
      });

      if (!result.success) {
        setError(result.error ?? t.promptSaveError);
        return;
      }

      const nextPrompts = result.postPrompts ?? postPrompts;
      const selectedId = result.selectedId ?? nextPrompts[0]?.id ?? '';
      const selectedPrompt = nextPrompts.find((prompt) => prompt.id === selectedId) ?? nextPrompts[0];

      setPostPrompts(nextPrompts);
      setPostPromptId(selectedPrompt?.id ?? '');
      setPostPromptEditingId(selectedPrompt?.id ?? '');
      setPostPromptTitle(selectedPrompt?.title ?? '');
      setDraftPrompt(selectedPrompt?.draftPrompt ?? '');
      setJsonPrompt(selectedPrompt?.jsonPrompt ?? '');
      setMessage(t.promptSaved);
    });
  };

  const handleDeletePostPrompt = (id: string) => {
    setError(null);
    setMessage(null);

    startPromptTransition(async () => {
      const result = await deleteBlogPlanPostPromptAction(id);

      if (!result.success) {
        setError(result.error ?? t.promptDeleteError);
        return;
      }

      const nextPrompts = result.postPrompts ?? postPrompts;
      const selectedId = result.selectedId ?? nextPrompts[0]?.id ?? '';
      const selectedPrompt = nextPrompts.find((prompt) => prompt.id === selectedId) ?? nextPrompts[0];

      setPostPrompts(nextPrompts);
      setPostPromptId(selectedPrompt?.id ?? '');
      setPostPromptEditingId(selectedPrompt?.id ?? '');
      setPostPromptTitle(selectedPrompt?.title ?? '');
      setDraftPrompt(selectedPrompt?.draftPrompt ?? '');
      setJsonPrompt(selectedPrompt?.jsonPrompt ?? '');
      setMessage(t.promptDeleted);
    });
  };

  const handleGeneratePost = (planId: string) => {
    setError(null);
    setMessage(null);
    setGeneratingPlanId(planId);

    startSaving(async () => {
      try {
        const result = await generateBlogPostFromPlanAction({
          planId,
          provider: postProvider,
          promptId: postPromptId,
        });

        if (!result.success) {
          setError(result.error ?? t.postGenerateError);
          return;
        }

        setMessage(t.postGenerated);
        router.refresh();
      } finally {
        setGeneratingPlanId(null);
      }
    });
  };

  const handlePublishPost = (planId: string) => {
    setError(null);
    setMessage(null);
    setPublishingPlanId(planId);

    startSaving(async () => {
      try {
        const result = await publishBlogPostFromPlanAction(planId);

        if (!result.success) {
          setError(result.error ?? t.postPublishError);
          return;
        }

        setMessage(result.slug ? `${t.postPublished} /blog/${result.slug}` : t.postPublished);
        router.refresh();
      } finally {
        setPublishingPlanId(null);
      }
    });
  };

  const handleSavedPlanFilterChange = (filter: SavedPlanFilter) => {
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;

    setSavedPlanFilter(filter);
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        window.scrollTo({ left: scrollX, top: scrollY });
      });
    });
  };

  const handleDeletePlan = (planId: string) => {
    if (!window.confirm(t.planDeleteConfirm)) {
      return;
    }

    setError(null);
    setMessage(null);
    setDeletingPlanId(planId);

    startSaving(async () => {
      try {
        const result = await deleteBlogContentPlanAction(planId);

        if (!result.success) {
          setError(result.error ?? t.planDeleteError);
          return;
        }

        setMessage(t.planDeleted);
        router.refresh();
      } finally {
        setDeletingPlanId(null);
      }
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

        <BlogPlanGenerationPanel
          t={t}
          categories={categories}
          categoryId={categoryId}
          onCategoryChange={setCategoryId}
          candidateCount={candidateCount}
          onCandidateCountChange={setCandidateCount}
          provider={provider}
          onProviderChange={setProvider}
          promptId={candidatePromptId}
          onPromptIdChange={setCandidatePromptId}
          prompts={candidatePrompts}
          isPromptPanelOpen={candidatePromptPanelOpen}
          onPromptPanelToggle={() => setCandidatePromptPanelOpen((value) => !value)}
          promptEditingId={candidatePromptEditingId}
          promptTitle={candidatePromptTitle}
          promptContent={candidatePromptContent}
          isPromptPending={isPromptPending}
          onPromptSelect={handleSelectCandidatePrompt}
          onPromptTitleChange={setCandidatePromptTitle}
          onPromptContentChange={setCandidatePromptContent}
          onNewPrompt={handleNewCandidatePrompt}
          onSavePrompt={handleSaveCandidatePrompt}
          onDeletePrompt={handleDeleteCandidatePrompt}
          seedKeywords={seedKeywords}
          onSeedKeywordsChange={setSeedKeywords}
          excludedTopics={excludedTopics}
          onExcludedTopicsChange={setExcludedTopics}
          audience={audience}
          onAudienceChange={setAudience}
          direction={direction}
          onDirectionChange={setDirection}
          contextSummary={contextSummary}
          message={message}
          error={error}
          isGenerating={isGenerating}
          onGenerate={handleGenerate}
        />

        <BlogPlanCandidatesPanel
          t={t}
          candidates={candidates}
          selectedIndexes={selectedIndexes}
          selectedCount={selectedCandidates.length}
          isSaving={isSaving}
          onSave={handleSave}
          onToggleCandidate={toggleCandidate}
        />

        <SavedBlogPlansPanel
          t={t}
          plans={filteredPlans}
          filter={savedPlanFilter}
          filterCounts={savedPlanFilterCounts}
          onFilterChange={handleSavedPlanFilterChange}
          postPromptId={postPromptId}
          onPostPromptIdChange={setPostPromptId}
          postPrompts={postPrompts}
          postProvider={postProvider}
          onPostProviderChange={setPostProvider}
          isPromptPanelOpen={postPromptPanelOpen}
          onPromptPanelToggle={() => setPostPromptPanelOpen((value) => !value)}
          postPromptEditingId={postPromptEditingId}
          postPromptTitle={postPromptTitle}
          draftPrompt={draftPrompt}
          onDraftPromptChange={setDraftPrompt}
          jsonPrompt={jsonPrompt}
          onJsonPromptChange={setJsonPrompt}
          isPromptPending={isPromptPending}
          onPostPromptSelect={handleSelectPostPrompt}
          onPostPromptTitleChange={setPostPromptTitle}
          onNewPostPrompt={handleNewPostPrompt}
          onSavePostPrompt={handleSavePostPrompt}
          onDeletePostPrompt={handleDeletePostPrompt}
          generatingPlanId={generatingPlanId}
          publishingPlanId={publishingPlanId}
          deletingPlanId={deletingPlanId}
          onGeneratePost={handleGeneratePost}
          onPublishPost={handlePublishPost}
          onDeletePlan={handleDeletePlan}
        />
      </div>
    </main>
  );
}
