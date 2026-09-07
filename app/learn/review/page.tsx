import Link from 'next/link';
import { ArrowLeft, ArrowRight, BookOpen, CalendarClock, CheckCircle2, MessagesSquare, RotateCcw } from 'lucide-react';
import { redirect } from 'next/navigation';
import { getAppUserFromServer, getDisplayLanguage } from '@/lib/auth/app-user';
import { getReviewNeededSummary } from '@/lib/supabase/services/learning-review';
import { getReviewHref, getReviewRecommendation } from '@/lib/learning/review-recommendation';
import ProgressMobileMenu from '../progress/ProgressMobileMenu';
import ProgressSidebar from '../progress/ProgressSidebar';

export const dynamic = 'force-dynamic';

const copy = {
  ko: {
    back: 'Overview로 돌아가기', title: 'Review', description: '지금 복습할 항목을 확인하고 바로 시작하세요.',
    queue: '지금 복습할 항목', breakdown: (sentences: number, words: number) => `문장 ${sentences}개 · 단어 ${words}개`,
    recommendation: '추천 복습', recommendType: (type: string, count: number) => `${type} ${count}개를 먼저 복습해보세요.`,
    sentences: '문장 복습', words: '단어 복습', startSentences: '문장 복습 시작', startWords: '단어 복습 시작', start: '시작',
    dueCount: (count: number) => `${count}개 복습 필요`, lowestLevel: (level: number) => `최저 숙련도 Level ${level}`, none: '복습할 항목 없음',
    allDone: '지금 복습할 항목이 없습니다.', allDoneBody: '새로운 학습을 이어가거나 학습 현황을 확인해보세요.', browse: '학습 번들 보기',
    nextReview: '다음 복습 예정', noUpcoming: '예정된 복습 없음', byType: '유형별 복습',
  },
  en: {
    back: 'Back to Overview', title: 'Review', description: 'See what is due and start reviewing right away.',
    queue: 'Due for review', breakdown: (sentences: number, words: number) => `${sentences} sentences · ${words} words`,
    recommendation: 'Recommended', recommendType: (type: string, count: number) => `Start with ${count} ${type.toLowerCase()}.`,
    sentences: 'Sentence review', words: 'Word review', startSentences: 'Start sentence review', startWords: 'Start word review', start: 'Start',
    dueCount: (count: number) => `${count} due`, lowestLevel: (level: number) => `Lowest proficiency: Level ${level}`, none: 'Nothing due',
    allDone: 'There is nothing to review right now.', allDoneBody: 'Continue learning something new or check your progress.', browse: 'Explore bundles',
    nextReview: 'Next review', noUpcoming: 'No upcoming review', byType: 'Review by type',
  },
};

export default async function ReviewPage() {
  const [user, language] = await Promise.all([getAppUserFromServer(), getDisplayLanguage()]);
  if (!user) redirect('/auth/sign-in?redirectTo=/learn/review');
  const summary = await getReviewNeededSummary(user.id);
  const t = copy[language];
  const recommendation = getReviewRecommendation(summary);
  const recommendedCount = recommendation === 'words' ? summary.availableWords : summary.availableSentences;
  const recommendedTitle = recommendation === 'words' ? t.words : t.sentences;
  const otherCount = recommendation === 'words' ? summary.availableSentences : summary.availableWords;
  const recommendedHref = recommendation ? getReviewHref(recommendation, otherCount) : '/bundles';
  const reviewTypes = [
    { type: 'sentences' as const, icon: MessagesSquare, title: t.sentences, count: summary.availableSentences, level: summary.lowestSentenceLevel, tone: 'text-[#2f7d4a] bg-[#e7f4e8]' },
    { type: 'words' as const, icon: BookOpen, title: t.words, count: summary.availableWords, level: summary.lowestWordLevel, tone: 'text-[#4676cc] bg-[#edf3ff]' },
  ];

  return <main className="mx-auto max-w-7xl px-0 pb-10 text-zinc-950 dark:text-zinc-100 lg:px-2">
    <ProgressMobileMenu language={language} activeIndex={4} />
    <div className="grid min-h-[calc(100vh-140px)] overflow-hidden bg-white dark:bg-zinc-950 lg:grid-cols-[238px_minmax(0,1fr)] lg:rounded-xl lg:border lg:border-zinc-200 lg:dark:border-zinc-800">
      <ProgressSidebar language={language} activeIndex={4} />
      <section className="min-w-0 px-4 py-7 sm:px-8 lg:px-10">
        <Link href="/learn/progress" className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-500 hover:text-[#2f7d4a] dark:text-zinc-400"><ArrowLeft className="h-4 w-4" />{t.back}</Link>
        <div className="mt-4"><h1 className="text-3xl font-bold sm:text-4xl">{t.title}</h1><p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-300">{t.description}</p></div>
        <section className="mt-7 border-y border-zinc-200 py-6 dark:border-zinc-800"><div className="flex items-center gap-4"><span className="flex h-11 w-11 items-center justify-center rounded-md bg-[#fff0ec] text-[#e95c3e]"><RotateCcw className="h-5 w-5" /></span><div><p className="text-sm font-semibold text-zinc-500">{t.queue}</p><p className="mt-0.5 text-3xl font-bold tabular-nums">{summary.availableTotal}</p><p className="mt-1 text-sm text-zinc-500">{t.breakdown(summary.availableSentences, summary.availableWords)}</p></div></div></section>
        {summary.availableTotal > 0 && recommendation ? <section className="mt-7 border border-[#b9d9bf] bg-[#f5fbf6] p-5 dark:border-emerald-900 dark:bg-emerald-950/20 sm:flex sm:items-center sm:justify-between sm:gap-6"><div><p className="text-xs font-bold text-[#2f7d4a] dark:text-emerald-300">{t.recommendation}</p><h2 className="mt-2 text-xl font-bold">{t.recommendType(recommendedTitle, recommendedCount)}</h2></div><Link href={recommendedHref} className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-[#3f9657] px-5 text-sm font-bold text-white hover:bg-[#2f7d4a] sm:mt-0 sm:w-auto">{recommendation === 'words' ? t.startWords : t.startSentences}<ArrowRight className="h-4 w-4" /></Link></section> : <section className="mt-7 border border-zinc-200 px-5 py-10 text-center dark:border-zinc-800"><CheckCircle2 className="mx-auto h-8 w-8 text-[#3f9657]" /><h2 className="mt-3 text-lg font-bold">{t.allDone}</h2><p className="mt-2 text-sm text-zinc-500">{t.allDoneBody}</p><Link href="/bundles" className="mt-5 inline-flex min-h-10 items-center justify-center rounded-md bg-[#3f9657] px-4 text-sm font-bold text-white">{t.browse}</Link></section>}
        <section className="mt-8"><h2 className="text-lg font-bold">{t.byType}</h2><div className="mt-4 border-y border-zinc-200 dark:border-zinc-800">{reviewTypes.map(type => { const remainingCount = type.type === 'words' ? summary.availableSentences : summary.availableWords; return <div key={type.type} className="grid grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-4 border-b border-zinc-100 py-5 last:border-0 dark:border-zinc-800"><span className={`flex h-10 w-10 items-center justify-center rounded-md ${type.tone}`}><type.icon className="h-5 w-5" /></span><div><h3 className="font-bold">{type.title}</h3><p className="mt-1 text-sm text-zinc-500">{type.count ? `${t.dueCount(type.count)}${type.level !== null ? ` · ${t.lowestLevel(type.level)}` : ''}` : t.none}</p></div>{type.count > 0 ? <Link href={getReviewHref(type.type, remainingCount)} className="inline-flex min-h-10 items-center gap-2 rounded-md border border-zinc-200 px-4 text-sm font-bold hover:border-[#8bbf87] hover:text-[#2f7d4a] dark:border-zinc-700">{t.start}<ArrowRight className="h-4 w-4" /></Link> : <span className="text-sm font-semibold text-zinc-400">{t.none}</span>}</div>; })}</div></section>
        <div className="mt-7 flex items-center gap-3 text-sm text-zinc-500"><CalendarClock className="h-4 w-4" /><span className="font-semibold">{t.nextReview}:</span><span>{summary.nextReviewAt ? formatDate(summary.nextReviewAt, language) : t.noUpcoming}</span></div>
      </section>
    </div>
  </main>;
}

function formatDate(value: string, language: 'ko' | 'en') { return new Intl.DateTimeFormat(language === 'ko' ? 'ko-KR' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(value)); }
