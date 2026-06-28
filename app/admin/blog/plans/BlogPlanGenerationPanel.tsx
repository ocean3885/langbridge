import { Loader2, Sparkles, Settings, Wand2 } from 'lucide-react';
import type { WordGenerationProvider } from '@/lib/generator';
import type { BlogPlanCategory } from '@/lib/supabase/services/blog-content-plans';
import type { BlogPlansCopy } from './blog-plans.copy';
import { KeywordChips, splitKeywords } from './KeywordChips';
import { PromptLibraryPanel } from './PromptLibraryPanel';
import type { BlogPlanCandidatePrompt } from './prompt-presets';

type ContextSummary = {
  categoryName: string;
  postCount: number;
  activePlanCount: number;
} | null;

interface BlogPlanGenerationPanelProps {
  t: BlogPlansCopy;
  categories: BlogPlanCategory[];
  categoryId: string;
  onCategoryChange: (value: string) => void;
  candidateCount: number;
  onCandidateCountChange: (value: number) => void;
  provider: WordGenerationProvider;
  onProviderChange: (value: WordGenerationProvider) => void;
  promptId: string;
  onPromptIdChange: (value: string) => void;
  prompts: BlogPlanCandidatePrompt[];
  isPromptPanelOpen: boolean;
  onPromptPanelToggle: () => void;
  promptEditingId: string;
  promptTitle: string;
  promptContent: string;
  isPromptPending: boolean;
  onPromptSelect: (prompt: BlogPlanCandidatePrompt) => void;
  onPromptTitleChange: (value: string) => void;
  onPromptContentChange: (value: string) => void;
  onNewPrompt: () => void;
  onSavePrompt: () => void;
  onDeletePrompt: (id: string) => void;
  seedKeywords: string;
  onSeedKeywordsChange: (value: string) => void;
  excludedTopics: string;
  onExcludedTopicsChange: (value: string) => void;
  audience: string;
  onAudienceChange: (value: string) => void;
  direction: string;
  onDirectionChange: (value: string) => void;
  contextSummary: ContextSummary;
  message: string | null;
  error: string | null;
  isGenerating: boolean;
  onGenerate: () => void;
}

export function BlogPlanGenerationPanel({
  t,
  categories,
  categoryId,
  onCategoryChange,
  candidateCount,
  onCandidateCountChange,
  provider,
  onProviderChange,
  promptId,
  onPromptIdChange,
  prompts,
  isPromptPanelOpen,
  onPromptPanelToggle,
  promptEditingId,
  promptTitle,
  promptContent,
  isPromptPending,
  onPromptSelect,
  onPromptTitleChange,
  onPromptContentChange,
  onNewPrompt,
  onSavePrompt,
  onDeletePrompt,
  seedKeywords,
  onSeedKeywordsChange,
  excludedTopics,
  onExcludedTopicsChange,
  audience,
  onAudienceChange,
  direction,
  onDirectionChange,
  contextSummary,
  message,
  error,
  isGenerating,
  onGenerate,
}: BlogPlanGenerationPanelProps) {
  return (
    <section className="rounded-lg border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex flex-col gap-3 border-b border-zinc-200 px-5 py-4 dark:border-zinc-800 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-2">
          <Wand2 size={18} className="text-[#559c63]" />
          <h2 className="text-sm font-black text-zinc-900 dark:text-zinc-100">{t.generate}</h2>
        </div>
        <div className="grid gap-2 sm:grid-cols-[minmax(0,240px)_auto]">
          <label className="flex items-center gap-2">
            <span className="shrink-0 text-xs font-bold uppercase text-zinc-500">{t.promptTitle}</span>
            <select
              value={promptId}
              onChange={(event) => onPromptIdChange(event.target.value)}
              className="h-9 min-w-0 flex-1 rounded-md border border-zinc-300 bg-white px-3 text-sm font-semibold outline-none focus:border-[#559c63] dark:border-zinc-700 dark:bg-zinc-950"
            >
              {prompts.map((prompt) => (
                <option key={prompt.id} value={prompt.id}>
                  {prompt.title}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={onPromptPanelToggle}
            className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-zinc-300 bg-white px-3 text-sm font-bold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            <Settings size={15} />
            {t.promptButton}
          </button>
        </div>
      </div>

      {isPromptPanelOpen ? (
        <PromptLibraryPanel
          t={t}
          kind="candidate"
          prompts={prompts}
          selectedId={promptId}
          editingId={promptEditingId}
          title={promptTitle}
          prompt={promptContent}
          isPending={isPromptPending}
          onSelect={onPromptSelect}
          onTitleChange={onPromptTitleChange}
          onPromptChange={onPromptContentChange}
          onNew={onNewPrompt}
          onSave={onSavePrompt}
          onDelete={onDeletePrompt}
        />
      ) : null}

      <div className="grid gap-4 px-5 py-5 lg:grid-cols-3">
        <label className="space-y-2">
          <span className="text-xs font-bold uppercase text-zinc-500">{t.category}</span>
          <select
            value={categoryId}
            onChange={(event) => onCategoryChange(event.target.value)}
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
            onChange={(event) => onCandidateCountChange(Number(event.target.value))}
            className="h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm font-semibold outline-none focus:border-[#559c63] dark:border-zinc-700 dark:bg-zinc-950"
          />
        </label>

        <label className="space-y-2">
          <span className="text-xs font-bold uppercase text-zinc-500">{t.provider}</span>
          <select
            value={provider}
            onChange={(event) => onProviderChange(event.target.value as WordGenerationProvider)}
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
            onChange={(event) => onSeedKeywordsChange(event.target.value)}
            placeholder="스페인어 회화, 스페인어 질문 표현"
            className="h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-[#559c63] dark:border-zinc-700 dark:bg-zinc-950"
          />
          <KeywordChips keywords={splitKeywords(seedKeywords)} />
        </label>

        <label className="space-y-2">
          <span className="text-xs font-bold uppercase text-zinc-500">{t.excludedTopics}</span>
          <textarea
            value={excludedTopics}
            onChange={(event) => onExcludedTopicsChange(event.target.value)}
            rows={3}
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#559c63] dark:border-zinc-700 dark:bg-zinc-950"
          />
        </label>

        <label className="space-y-2">
          <span className="text-xs font-bold uppercase text-zinc-500">{t.audience}</span>
          <textarea
            value={audience}
            onChange={(event) => onAudienceChange(event.target.value)}
            rows={3}
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#559c63] dark:border-zinc-700 dark:bg-zinc-950"
          />
        </label>

        <label className="space-y-2">
          <span className="text-xs font-bold uppercase text-zinc-500">{t.direction}</span>
          <textarea
            value={direction}
            onChange={(event) => onDirectionChange(event.target.value)}
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
          onClick={onGenerate}
          disabled={isGenerating || categories.length === 0}
          className="inline-flex items-center justify-center gap-2 rounded-md bg-[#559c63] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#468653] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isGenerating ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} />}
          {isGenerating ? t.generating : t.generate}
        </button>
      </div>
    </section>
  );
}
