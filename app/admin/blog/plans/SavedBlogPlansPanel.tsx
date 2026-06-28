import { FileText, Settings } from 'lucide-react';
import type { WordGenerationProvider } from '@/lib/generator';
import type { BlogContentPlanListItem } from '@/lib/supabase/services/blog-content-plans';
import type { BlogPlansCopy } from './blog-plans.copy';
import { BlogPlanRow } from './BlogPlanRow';
import { PromptLibraryPanel } from './PromptLibraryPanel';
import type { BlogPlanPostPrompt } from './prompt-presets';

export type SavedPlanFilter = 'active' | 'ready' | 'published' | 'all';

interface SavedBlogPlansPanelProps {
  t: BlogPlansCopy;
  plans: BlogContentPlanListItem[];
  filter: SavedPlanFilter;
  filterCounts: Record<SavedPlanFilter, number>;
  onFilterChange: (value: SavedPlanFilter) => void;
  postPromptId: string;
  onPostPromptIdChange: (value: string) => void;
  postPrompts: BlogPlanPostPrompt[];
  postProvider: WordGenerationProvider;
  onPostProviderChange: (value: WordGenerationProvider) => void;
  isPromptPanelOpen: boolean;
  onPromptPanelToggle: () => void;
  postPromptEditingId: string;
  postPromptTitle: string;
  draftPrompt: string;
  onDraftPromptChange: (value: string) => void;
  jsonPrompt: string;
  onJsonPromptChange: (value: string) => void;
  isPromptPending: boolean;
  onPostPromptSelect: (prompt: BlogPlanPostPrompt) => void;
  onPostPromptTitleChange: (value: string) => void;
  onNewPostPrompt: () => void;
  onSavePostPrompt: () => void;
  onDeletePostPrompt: (id: string) => void;
  generatingPlanId: string | null;
  publishingPlanId: string | null;
  deletingPlanId: string | null;
  onGeneratePost: (planId: string) => void;
  onPublishPost: (planId: string) => void;
  onDeletePlan: (planId: string) => void;
}

const savedPlanFilters: SavedPlanFilter[] = ['active', 'ready', 'published', 'all'];

export function SavedBlogPlansPanel({
  t,
  plans,
  filter,
  filterCounts,
  onFilterChange,
  postPromptId,
  onPostPromptIdChange,
  postPrompts,
  postProvider,
  onPostProviderChange,
  isPromptPanelOpen,
  onPromptPanelToggle,
  postPromptEditingId,
  postPromptTitle,
  draftPrompt,
  onDraftPromptChange,
  jsonPrompt,
  onJsonPromptChange,
  isPromptPending,
  onPostPromptSelect,
  onPostPromptTitleChange,
  onNewPostPrompt,
  onSavePostPrompt,
  onDeletePostPrompt,
  generatingPlanId,
  publishingPlanId,
  deletingPlanId,
  onGeneratePost,
  onPublishPost,
  onDeletePlan,
}: SavedBlogPlansPanelProps) {
  const filterLabels: Record<SavedPlanFilter, string> = {
    active: t.filterActive,
    ready: t.filterReady,
    published: t.filterPublished,
    all: t.filterAll,
  };

  return (
    <section className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex flex-col gap-3 border-b border-zinc-200 px-5 py-4 dark:border-zinc-800 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <FileText size={18} className="text-[#559c63]" />
            <h2 className="text-sm font-black text-zinc-900 dark:text-zinc-100">{t.listTitle}</h2>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {savedPlanFilters.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => onFilterChange(item)}
                className={`inline-flex h-8 items-center justify-center rounded-md px-3 text-xs font-bold transition ${
                  filter === item
                    ? 'bg-[#559c63] text-white'
                    : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700'
                }`}
              >
                {filterLabels[item]} {filterCounts[item]}
              </button>
            ))}
          </div>
        </div>
        <div className="grid gap-2 sm:grid-cols-[minmax(220px,300px)_140px_auto]">
          <label className="flex min-w-0 items-center">
            <span className="sr-only">{t.postPrompt}</span>
            <select
              value={postPromptId}
              onChange={(event) => onPostPromptIdChange(event.target.value)}
              className="h-9 w-full min-w-0 rounded-md border border-zinc-300 bg-white px-3 text-sm font-semibold outline-none focus:border-[#559c63] dark:border-zinc-700 dark:bg-zinc-950"
            >
              {postPrompts.map((prompt) => (
                <option key={prompt.id} value={prompt.id}>
                  {prompt.title}
                </option>
              ))}
            </select>
          </label>
          <label className="flex min-w-0 items-center">
            <span className="sr-only">{t.postModel}</span>
            <select
              value={postProvider}
              onChange={(event) => onPostProviderChange(event.target.value as WordGenerationProvider)}
              className="h-9 w-full min-w-0 rounded-md border border-zinc-300 bg-white px-3 text-sm font-semibold outline-none focus:border-[#559c63] dark:border-zinc-700 dark:bg-zinc-950"
            >
              <option value="deepseek">DeepSeek</option>
              <option value="chatgpt">ChatGPT</option>
              <option value="gemini">Gemini</option>
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
          kind="post"
          prompts={postPrompts}
          selectedId={postPromptId}
          editingId={postPromptEditingId}
          title={postPromptTitle}
          draftPrompt={draftPrompt}
          onDraftPromptChange={onDraftPromptChange}
          jsonPrompt={jsonPrompt}
          onJsonPromptChange={onJsonPromptChange}
          isPending={isPromptPending}
          onSelect={onPostPromptSelect}
          onTitleChange={onPostPromptTitleChange}
          onNew={onNewPostPrompt}
          onSave={onSavePostPrompt}
          onDelete={onDeletePostPrompt}
        />
      ) : null}
      {plans.length > 0 ? (
        <div>
          {plans.map((plan) => (
            <BlogPlanRow
              key={plan.id}
              plan={plan}
              t={t}
              generatingPlanId={generatingPlanId}
              publishingPlanId={publishingPlanId}
              deletingPlanId={deletingPlanId}
              onGeneratePost={onGeneratePost}
              onPublishPost={onPublishPost}
              onDeletePlan={onDeletePlan}
            />
          ))}
        </div>
      ) : (
        <div className="flex min-h-[180px] flex-col items-center justify-center px-6 py-10 text-center">
          <FileText size={30} className="text-zinc-400" />
          <p className="mt-3 text-sm font-semibold text-zinc-500 dark:text-zinc-400">{t.emptyPlans}</p>
        </div>
      )}
    </section>
  );
}
