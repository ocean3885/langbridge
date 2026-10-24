import Link from 'next/link';
import { ArrowLeft, ArrowRight, BookOpen, CheckCircle2, MessagesSquare } from 'lucide-react';
import { redirect } from 'next/navigation';
import { getAppUserFromServer, getDisplayLanguage } from '@/lib/auth/app-user';
import { getReviewNeededSummary, getReviewSentences } from '@/lib/supabase/services/learning-review';
import { getReviewPlan } from '@/lib/learning/review-recommendation';
import { defaultSentenceReviewMode, REVIEW_MAX_COUNT } from '@/lib/learning/review-session';
import ProgressMobileMenu from '../progress/ProgressMobileMenu';
import ProgressSidebar from '../progress/ProgressSidebar';
import { NextReviewTime } from './_components/NextReviewTime';

export const dynamic = 'force-dynamic';

export default async function ReviewPage() {
  const [user, language] = await Promise.all([getAppUserFromServer(), getDisplayLanguage()]);
  if (!user) redirect('/auth/login?redirectTo=/learn/review');
  const summary = await getReviewNeededSummary(user.id);
  const plan = getReviewPlan(summary);
  const ko = language === 'ko';
  const mode = plan?.type === 'sentences' ? defaultSentenceReviewMode(await getReviewSentences(user.id, REVIEW_MAX_COUNT, 'review', false), language) : 'quiz';
  const reason = plan?.reason === 'first'
    ? ko ? '학습한 항목의 첫 복습을 시작해보세요.' : 'Start the first review of items you have studied.'
    : plan?.reason === 'incorrect'
      ? ko ? '복습 시점이 된 항목 중 최근 틀린 항목부터 확인해요.' : 'Revisit recently missed items that are due for review.'
      : ko ? '복습 예정 시각이 먼저 지난 항목부터 확인해요.' : 'Start with the items that have waited longest for review.';
  const noun = plan?.type === 'words' ? ko ? '단어' : 'words' : ko ? '문장' : 'sentences';
  const modes = { quiz: ko ? '퀴즈' : 'Quiz', scramble: ko ? '스크램블' : 'Scramble', wordfill: ko ? '단어 채우기' : 'Word Fill', flashcards: ko ? '다시 보기' : 'Read again' };

  return <main className="mx-auto max-w-7xl px-0 pb-10 text-zinc-950 dark:text-zinc-100 lg:px-2">
    <ProgressMobileMenu language={language} activeIndex={4} />
    <div className="grid min-h-[calc(100vh-140px)] grid-cols-1 overflow-hidden bg-white dark:bg-zinc-950 lg:grid-cols-[238px_minmax(0,1fr)] lg:rounded-xl lg:border lg:border-zinc-200 lg:dark:border-zinc-800">
      <ProgressSidebar language={language} activeIndex={4} />
      <section className="min-w-0 px-4 py-7 sm:px-8 lg:px-10">
        <Link href="/learn/progress" className="inline-flex items-center gap-2 text-sm text-zinc-500"><ArrowLeft className="h-4 w-4" />{ko ? '학습 현황으로' : 'Back to overview'}</Link>
        <h1 className="mt-4 text-3xl font-bold sm:text-4xl">{ko ? '복습' : 'Review'}</h1>
        <p className="mt-3 text-sm text-zinc-500">{ko ? '짧게 복습하고, 배운 내용을 오래 기억하세요.' : 'A short review helps you remember what you have learned.'}</p>
        {plan ? <section className="mt-7 rounded-xl border border-green-200 bg-green-50 p-5 dark:border-green-900 dark:bg-green-950/20 sm:p-7">
          <p className="text-sm font-bold text-green-700 dark:text-green-300">{ko ? '추천 복습' : 'Recommended review'} · {modes[mode]}</p>
          <h2 className="mt-3 text-2xl font-bold">{ko ? `${noun} ${plan.count}개부터 시작하세요` : `Start with ${plan.count} ${noun}`}</h2>
          <p className="mt-3 text-sm leading-6">{reason}</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link prefetch={false} href={`/learn/review/${plan.type}?start=1&count=10&mode=${mode}`} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#3f9657] px-5 py-3 text-sm font-bold text-white hover:bg-[#2f7d4a]">{ko ? `${plan.count}개 복습 시작` : `Review ${plan.count} items`}<ArrowRight className="h-4 w-4 shrink-0" /></Link>
            <Link prefetch={false} href={`/learn/review/${plan.type}?mode=${mode}`} className="inline-flex min-h-11 items-center rounded-lg border border-green-300 px-5 text-sm font-semibold dark:border-green-800">{ko ? '설정 변경' : 'Change settings'}</Link>
          </div>
        </section> : <section className="mt-7 rounded-xl border border-zinc-200 p-7 dark:border-zinc-800">
          <CheckCircle2 className="h-8 w-8 text-green-600" />
          <h2 className="mt-4 text-xl font-bold">{ko ? '지금 예정된 복습은 없습니다' : 'No reviews are due right now'}</h2>
          <p className="mt-3 text-sm text-zinc-500">{summary.nextReviewAt ? (ko ? '다음 복습 시점에 다시 확인해주세요.' : 'Come back at your next scheduled review.') : (ko ? '학습한 항목의 복습 시점이 되면 이곳에 표시됩니다.' : 'Items appear here when they are ready for review.')}</p>
          <NextReviewTime value={summary.nextReviewAt} language={language} />
          <Link href="/bundles" className="mt-5 inline-flex min-h-11 items-center rounded-lg bg-[#3f9657] px-5 text-sm font-bold text-white">{ko ? '학습 번들 보기' : 'Explore bundles'}</Link>
        </section>}
        <section className="mt-7">
          <h2 className="text-lg font-bold">{ko ? `복습 대기 ${summary.availableTotal}개` : `${summary.availableTotal} items due`}</h2>
          <p className="mt-2 text-sm text-zinc-500">{ko ? '문장이나 단어를 직접 골라 복습할 수도 있어요.' : 'You can also choose a review type below.'}</p>
          <div className="mt-4 divide-y divide-zinc-200 border-y border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
            {[{ type: 'words', title: ko ? '단어 복습' : 'Word review', count: summary.availableWords, Icon: BookOpen }, { type: 'sentences', title: ko ? '문장 복습' : 'Sentence review', count: summary.availableSentences, Icon: MessagesSquare }].map(({ type, title, count, Icon }) => <div key={type} className="flex flex-wrap items-center gap-3 py-5">
              <Icon className="h-6 w-6 shrink-0 text-green-600" /><div className="min-w-0 flex-1"><h3 className="font-bold">{title}</h3><p className="mt-1 text-sm text-zinc-500">{count ? ko ? `${count}개 대기` : `${count} due` : ko ? '현재 대기 없음' : 'Nothing due'}</p></div>
              {count > 0 && <Link prefetch={false} href={`/learn/review/${type}`} className="inline-flex min-h-11 shrink-0 items-center rounded-lg border border-zinc-200 px-4 text-sm font-bold dark:border-zinc-700">{ko ? '선택' : 'Choose'}</Link>}
            </div>)}
          </div>
        </section>
        <p className="mt-6 text-sm leading-6 text-zinc-500">{ko ? '완료한 번들의 항목도 기억을 유지하도록 복습 시점에 다시 나타납니다.' : 'Items from completed bundles can return when their next review is due.'}</p>
      </section>
    </div>
  </main>;
}
