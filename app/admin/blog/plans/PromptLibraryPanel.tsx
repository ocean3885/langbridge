import { Loader2, Plus, Save, Trash2 } from 'lucide-react';
import type { BlogPlansCopy } from './blog-plans.copy';
import type { BlogPlanCandidatePrompt, BlogPlanPostPrompt } from './prompt-presets';

interface CandidatePromptLibraryPanelProps {
  t: BlogPlansCopy;
  kind: 'candidate';
  prompts: BlogPlanCandidatePrompt[];
  selectedId: string;
  editingId: string;
  title: string;
  prompt: string;
  isPending: boolean;
  onSelect: (prompt: BlogPlanCandidatePrompt) => void;
  onTitleChange: (value: string) => void;
  onPromptChange: (value: string) => void;
  onNew: () => void;
  onSave: () => void;
  onDelete: (id: string) => void;
}

interface PostPromptLibraryPanelProps {
  t: BlogPlansCopy;
  kind: 'post';
  prompts: BlogPlanPostPrompt[];
  selectedId: string;
  editingId: string;
  title: string;
  draftPrompt: string;
  jsonPrompt: string;
  isPending: boolean;
  onSelect: (prompt: BlogPlanPostPrompt) => void;
  onTitleChange: (value: string) => void;
  onDraftPromptChange: (value: string) => void;
  onJsonPromptChange: (value: string) => void;
  onNew: () => void;
  onSave: () => void;
  onDelete: (id: string) => void;
}

type PromptLibraryPanelProps = CandidatePromptLibraryPanelProps | PostPromptLibraryPanelProps;

export function PromptLibraryPanel(props: PromptLibraryPanelProps) {
  return (
    <div className="grid gap-4 border-t border-zinc-200 p-5 dark:border-zinc-800 lg:grid-cols-[220px_1fr]">
      <div className="min-w-0 rounded-lg border border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center justify-between border-b border-zinc-200 px-3 py-3 dark:border-zinc-800">
          <p className="text-xs font-black uppercase text-zinc-500">{props.t.promptList}</p>
          <button
            type="button"
            onClick={props.onNew}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-zinc-300 bg-white text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
            aria-label={props.t.newPrompt}
            title={props.t.newPrompt}
          >
            <Plus size={15} />
          </button>
        </div>
        <div className="max-h-72 overflow-y-auto">
          {props.prompts.map((prompt) => (
            <button
              key={prompt.id}
              type="button"
              onClick={() => props.onSelect(prompt as never)}
              className={`block w-full border-b border-zinc-200 px-3 py-3 text-left text-sm last:border-b-0 dark:border-zinc-800 ${
                prompt.id === props.selectedId
                  ? 'bg-[#EEF7EF] font-bold text-[#4f865a] dark:bg-emerald-500/10 dark:text-emerald-300'
                  : 'text-zinc-700 hover:bg-zinc-50 dark:text-zinc-200 dark:hover:bg-zinc-800'
              }`}
            >
              <span className="line-clamp-2">{prompt.title}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="min-w-0 space-y-4 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
        <label className="space-y-2">
          <span className="text-xs font-bold uppercase text-zinc-500">{props.t.promptTitle}</span>
          <input
            value={props.title}
            onChange={(event) => props.onTitleChange(event.target.value)}
            className="h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm font-semibold outline-none focus:border-[#559c63] dark:border-zinc-700 dark:bg-zinc-950"
          />
        </label>

        {props.kind === 'candidate' ? (
          <label className="space-y-2">
            <span className="text-xs font-bold uppercase text-zinc-500">{props.t.promptContent}</span>
            <textarea
              value={props.prompt}
              onChange={(event) => props.onPromptChange(event.target.value)}
              rows={13}
              className="w-full resize-y rounded-md border border-zinc-300 bg-white px-3 py-2 font-mono text-xs leading-5 outline-none focus:border-[#559c63] dark:border-zinc-700 dark:bg-zinc-950"
            />
          </label>
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            <label className="space-y-2">
              <span className="text-xs font-bold uppercase text-zinc-500">{props.t.draftPrompt}</span>
              <textarea
                value={props.draftPrompt}
                onChange={(event) => props.onDraftPromptChange(event.target.value)}
                rows={13}
                className="w-full resize-y rounded-md border border-zinc-300 bg-white px-3 py-2 font-mono text-xs leading-5 outline-none focus:border-[#559c63] dark:border-zinc-700 dark:bg-zinc-950"
              />
            </label>
            <label className="space-y-2">
              <span className="text-xs font-bold uppercase text-zinc-500">{props.t.jsonPrompt}</span>
              <textarea
                value={props.jsonPrompt}
                onChange={(event) => props.onJsonPromptChange(event.target.value)}
                rows={13}
                className="w-full resize-y rounded-md border border-zinc-300 bg-white px-3 py-2 font-mono text-xs leading-5 outline-none focus:border-[#559c63] dark:border-zinc-700 dark:bg-zinc-950"
              />
            </label>
          </div>
        )}

        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() => props.onDelete(props.editingId)}
            disabled={props.isPending || props.prompts.length <= 1 || !props.editingId}
            className="inline-flex items-center justify-center gap-2 rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm font-bold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200"
          >
            <Trash2 size={15} />
            {props.t.deletePrompt}
          </button>
          <button
            type="button"
            onClick={props.onSave}
            disabled={props.isPending}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-[#559c63] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#468653] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {props.isPending ? <Loader2 className="animate-spin" size={15} /> : <Save size={15} />}
            {props.t.savePrompt}
          </button>
        </div>
      </div>
    </div>
  );
}
