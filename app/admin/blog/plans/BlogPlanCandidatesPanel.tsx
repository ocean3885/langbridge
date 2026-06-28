import { Check, Loader2, Plus, Sparkles } from 'lucide-react';
import type { BlogPlanCandidate } from './actions';
import type { BlogPlansCopy } from './blog-plans.copy';
import { KeywordChips } from './KeywordChips';

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
            <span className="font-mono text-xs text-zinc-500 dark:text-zinc-400">/blog/{candidate.slug}</span>
          </div>
          <h3 className="mt-2 text-base font-black text-zinc-950 dark:text-zinc-50">{candidate.title}</h3>
          <p className="mt-1 text-sm leading-6 text-zinc-600 dark:text-zinc-400">{candidate.description}</p>
          <div className="mt-3">
            <KeywordChips keywords={candidate.targetKeywords} />
          </div>
          <div className="mt-3 grid gap-2 text-xs leading-5 text-zinc-500 dark:text-zinc-400 lg:grid-cols-3">
            <p>{candidate.searchIntent}</p>
            <p>{candidate.contentAngle}</p>
            <p>{candidate.audience}</p>
          </div>
          {candidate.notes ? (
            <p className="mt-2 text-xs font-semibold text-zinc-500 dark:text-zinc-400">{candidate.notes}</p>
          ) : null}
        </div>
      </div>
    </article>
  );
}

interface BlogPlanCandidatesPanelProps {
  t: BlogPlansCopy;
  candidates: BlogPlanCandidate[];
  selectedIndexes: Set<number>;
  selectedCount: number;
  isSaving: boolean;
  onSave: () => void;
  onToggleCandidate: (index: number) => void;
}

export function BlogPlanCandidatesPanel({
  t,
  candidates,
  selectedIndexes,
  selectedCount,
  isSaving,
  onSave,
  onToggleCandidate,
}: BlogPlanCandidatesPanelProps) {
  return (
    <section className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex flex-col gap-3 border-b border-zinc-200 px-5 py-4 dark:border-zinc-800 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Sparkles size={18} className="text-[#559c63]" />
          <h2 className="text-sm font-black text-zinc-900 dark:text-zinc-100">{t.candidateTitle}</h2>
        </div>
        <button
          type="button"
          onClick={onSave}
          disabled={isSaving || selectedCount === 0}
          className="inline-flex items-center justify-center gap-2 rounded-md border border-[#559c63] bg-white px-4 py-2 text-sm font-bold text-[#4f865a] transition hover:bg-[#EEF7EF] disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-900 dark:hover:bg-emerald-500/10"
        >
          {isSaving ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />}
          {isSaving ? t.saving : `${t.saveSelected} (${selectedCount})`}
        </button>
      </div>
      {candidates.length > 0 ? (
        <div>
          {candidates.map((candidate, index) => (
            <CandidateCard
              key={`${candidate.slug}-${index}`}
              candidate={candidate}
              selected={selectedIndexes.has(index)}
              onToggle={() => onToggleCandidate(index)}
            />
          ))}
        </div>
      ) : (
        <div className="flex min-h-[180px] flex-col items-center justify-center px-6 py-10 text-center">
          <Sparkles size={30} className="text-zinc-400" />
          <p className="mt-3 text-sm font-semibold text-zinc-500 dark:text-zinc-400">{t.emptyCandidates}</p>
        </div>
      )}
    </section>
  );
}
