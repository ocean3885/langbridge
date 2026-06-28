import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import type { BlogContentPlanListItem } from '@/lib/supabase/services/blog-content-plans';
import { blogPlanStatusStyles, type BlogPlansCopy } from './blog-plans.copy';
import { KeywordChips } from './KeywordChips';

interface BlogPlanRowProps {
  plan: BlogContentPlanListItem;
  t: BlogPlansCopy;
  generatingPlanId: string | null;
  generatingJsonPlanId: string | null;
  publishingPlanId: string | null;
  deletingPlanId: string | null;
  onGeneratePost: (planId: string) => void;
  onGeneratePostJson: (planId: string) => void;
  onPublishPost: (planId: string) => void;
  onDeletePlan: (planId: string) => void;
}

export function BlogPlanRow({
  plan,
  t,
  generatingPlanId,
  generatingJsonPlanId,
  publishingPlanId,
  deletingPlanId,
  onGeneratePost,
  onGeneratePostJson,
  onPublishPost,
  onDeletePlan,
}: BlogPlanRowProps) {
  const isGeneratingPost = generatingPlanId === plan.id;
  const isGeneratingJson = generatingJsonPlanId === plan.id;
  const isPublishingPost = publishingPlanId === plan.id;
  const isDeletingPlan = deletingPlanId === plan.id;
  const isPublished = plan.status === 'published' || Boolean(plan.linkedPost);
  const canGenerateJson = plan.hasGeneratedDraft && !isPublished;
  const canPublish = plan.status === 'ready' && plan.hasGeneratedJson && !isPublished;
  const canDelete = !isPublished;
  const isBusy = isGeneratingPost || isGeneratingJson || isPublishingPost || isDeletingPlan;

  return (
    <article className="border-b border-zinc-200 px-5 py-4 last:border-b-0 dark:border-zinc-800">
      <div className="grid gap-4 xl:grid-cols-[1fr_130px_150px_110px_250px] xl:items-center">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-bold ${
                blogPlanStatusStyles[plan.status] ?? blogPlanStatusStyles.pending
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
          <h3 className="mt-2 truncate text-base font-black text-zinc-950 dark:text-zinc-50">{plan.title}</h3>
          <p className="mt-1 line-clamp-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">{plan.description}</p>
          {plan.slug ? (
            <p className="mt-1 truncate font-mono text-xs text-zinc-500 dark:text-zinc-400">/blog/{plan.slug}</p>
          ) : null}
        </div>
        <div>
          <KeywordChips keywords={plan.targetKeywords.slice(0, 4)} />
        </div>
        <div className="space-y-1 text-xs font-semibold text-zinc-600 dark:text-zinc-400">
          <p>{plan.hasGeneratedDraft ? t.draftGenerated : t.draftNotGenerated}</p>
          <p>{plan.hasGeneratedJson ? t.jsonGenerated : t.jsonNotGenerated}</p>
        </div>
        <div className="text-sm">
          {plan.linkedPost ? (
            <Link href={`/blog/${plan.linkedPost.slug}`} className="font-bold text-[#559c63] hover:underline">
              {t.linked}
            </Link>
          ) : (
            <span className="text-zinc-400">-</span>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onGeneratePost(plan.id)}
            disabled={isBusy || isPublished}
            className="inline-flex h-9 min-w-[52px] items-center justify-center gap-2 rounded-md border border-[#559c63] bg-white px-3 text-sm font-bold text-[#4f865a] transition hover:bg-[#EEF7EF] disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-900 dark:hover:bg-emerald-500/10"
          >
            {isGeneratingPost ? <Loader2 className="animate-spin" size={15} /> : null}
            {isGeneratingPost ? t.postGenerating : t.generatePost}
          </button>
          <button
            type="button"
            onClick={() => onGeneratePostJson(plan.id)}
            disabled={isBusy || !canGenerateJson}
            className="inline-flex h-9 min-w-[52px] items-center justify-center gap-2 rounded-md border border-zinc-300 bg-white px-3 text-sm font-bold text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            {isGeneratingJson ? <Loader2 className="animate-spin" size={15} /> : null}
            {isGeneratingJson ? t.postJsonGenerating : t.jsonPost}
          </button>
          <button
            type="button"
            onClick={() => onPublishPost(plan.id)}
            disabled={isBusy || !canPublish}
            className="inline-flex h-9 min-w-[72px] items-center justify-center gap-2 rounded-md bg-[#559c63] px-3 text-sm font-bold text-white transition hover:bg-[#4b8b58] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPublishingPost ? <Loader2 className="animate-spin" size={15} /> : null}
            {isPublishingPost ? t.postPublishing : t.publishPost}
          </button>
          <button
            type="button"
            onClick={() => onDeletePlan(plan.id)}
            disabled={isBusy || !canDelete}
            className="inline-flex h-9 min-w-[68px] items-center justify-center gap-2 rounded-md border border-red-200 bg-white px-3 text-sm font-bold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-900/70 dark:bg-zinc-900 dark:text-red-300 dark:hover:bg-red-950/30"
          >
            {isDeletingPlan ? <Loader2 className="animate-spin" size={15} /> : null}
            {isDeletingPlan ? t.planDeleting : t.deletePlan}
          </button>
        </div>
      </div>
      {plan.generatedDraftText || plan.generatedJsonText ? (
        <details className="mt-4 rounded-md border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-950">
          <summary className="cursor-pointer text-xs font-black uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            {t.generatedPreview}
          </summary>
          <div className="mt-3 grid gap-3 lg:grid-cols-2">
            {plan.generatedDraftText ? (
              <section>
                <h4 className="text-xs font-black text-zinc-700 dark:text-zinc-200">{t.generatedDraft}</h4>
                <pre className="mt-2 max-h-80 overflow-auto whitespace-pre-wrap rounded-md bg-white p-3 text-xs leading-5 text-zinc-700 dark:bg-zinc-900 dark:text-zinc-200">
                  {plan.generatedDraftText}
                </pre>
              </section>
            ) : null}
            {plan.generatedJsonText ? (
              <section>
                <h4 className="text-xs font-black text-zinc-700 dark:text-zinc-200">{t.generatedJson}</h4>
                <pre className="mt-2 max-h-80 overflow-auto whitespace-pre-wrap rounded-md bg-white p-3 font-mono text-xs leading-5 text-zinc-700 dark:bg-zinc-900 dark:text-zinc-200">
                  {plan.generatedJsonText}
                </pre>
              </section>
            ) : null}
          </div>
        </details>
      ) : null}
    </article>
  );
}
