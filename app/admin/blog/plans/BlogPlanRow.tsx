import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import type { BlogContentPlanListItem } from '@/lib/supabase/services/blog-content-plans';
import { blogPlanStatusStyles, type BlogPlansCopy } from './blog-plans.copy';
import { KeywordChips } from './KeywordChips';

interface BlogPlanRowProps {
  plan: BlogContentPlanListItem;
  t: BlogPlansCopy;
  generatingPlanId: string | null;
  publishingPlanId: string | null;
  deletingPlanId: string | null;
  onGeneratePost: (planId: string) => void;
  onPublishPost: (planId: string) => void;
  onDeletePlan: (planId: string) => void;
}

export function BlogPlanRow({
  plan,
  t,
  generatingPlanId,
  publishingPlanId,
  deletingPlanId,
  onGeneratePost,
  onPublishPost,
  onDeletePlan,
}: BlogPlanRowProps) {
  const isGeneratingPost = generatingPlanId === plan.id;
  const isPublishingPost = publishingPlanId === plan.id;
  const isDeletingPlan = deletingPlanId === plan.id;
  const isPublished = plan.status === 'published' || Boolean(plan.linkedPost);
  const canPublish = plan.status === 'ready' && plan.hasGeneratedPayload && !isPublished;
  const canDelete = !isPublished;
  const isBusy = isGeneratingPost || isPublishingPost || isDeletingPlan;

  return (
    <article className="grid gap-4 border-b border-zinc-200 px-5 py-4 last:border-b-0 dark:border-zinc-800 xl:grid-cols-[1fr_130px_140px_110px_170px] xl:items-center">
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
      <div className="text-sm font-semibold text-zinc-600 dark:text-zinc-400">
        {plan.hasGeneratedPayload ? t.generated : t.notGenerated}
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
          className="inline-flex h-9 min-w-[78px] items-center justify-center gap-2 rounded-md border border-[#559c63] bg-white px-3 text-sm font-bold text-[#4f865a] transition hover:bg-[#EEF7EF] disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-900 dark:hover:bg-emerald-500/10"
        >
          {isGeneratingPost ? <Loader2 className="animate-spin" size={15} /> : null}
          {isGeneratingPost ? t.postGenerating : t.generatePost}
        </button>
        {canPublish ? (
          <button
            type="button"
            onClick={() => onPublishPost(plan.id)}
            disabled={isBusy}
            className="inline-flex h-9 min-w-[72px] items-center justify-center gap-2 rounded-md bg-[#559c63] px-3 text-sm font-bold text-white transition hover:bg-[#4b8b58] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPublishingPost ? <Loader2 className="animate-spin" size={15} /> : null}
            {isPublishingPost ? t.postPublishing : t.publishPost}
          </button>
        ) : null}
        {canDelete ? (
          <button
            type="button"
            onClick={() => onDeletePlan(plan.id)}
            disabled={isBusy}
            className="inline-flex h-9 min-w-[72px] items-center justify-center gap-2 rounded-md border border-red-200 bg-white px-3 text-sm font-bold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-900/70 dark:bg-zinc-900 dark:text-red-300 dark:hover:bg-red-950/30"
          >
            {isDeletingPlan ? <Loader2 className="animate-spin" size={15} /> : null}
            {isDeletingPlan ? t.planDeleting : t.deletePlan}
          </button>
        ) : null}
      </div>
    </article>
  );
}
