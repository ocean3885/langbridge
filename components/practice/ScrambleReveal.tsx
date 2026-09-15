'use client';

import { Volume2 } from 'lucide-react';

export function ScrambleRevealActions({ language, onReveal, onSkip }: { language: 'ko' | 'en'; onReveal: () => void; onSkip: () => void }) {
  return <div className="flex flex-wrap items-start justify-between gap-3 text-sm">
    <div>
      <button type="button" onClick={onReveal} className="min-h-10 rounded-lg px-3 py-2 font-semibold text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800">{language === 'ko' ? '정답 보기' : 'Show answer'}</button>
      <p className="px-3 text-xs text-zinc-500 dark:text-zinc-400">{language === 'ko' ? '오답으로 기록돼요.' : 'Counts as an incorrect answer.'}</p>
    </div>
    <button type="button" onClick={onSkip} className="min-h-10 rounded-lg px-3 py-2 font-semibold text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800">{language === 'ko' ? '건너뛰기' : 'Skip'}</button>
  </div>;
}

export function ScrambleRevealedAnswer({ language, sentence, translation, onPlay }: { language: 'ko' | 'en'; sentence: string; translation: string; onPlay?: () => void }) {
  return <section aria-live="polite" className="rounded-xl border border-sky-200 bg-sky-50 p-5 dark:border-sky-900 dark:bg-sky-950/30">
    <p className="text-sm font-semibold text-sky-800 dark:text-sky-200">{language === 'ko' ? '문장을 확인하고 다음에 다시 도전해보세요.' : 'Take a look at the sentence and try again next time.'}</p>
    <p className="mt-3 text-xl font-bold text-zinc-900 dark:text-zinc-100">{sentence}</p>
    <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">{translation}</p>
    {onPlay && <button type="button" onClick={onPlay} className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-sky-800 hover:bg-sky-100 dark:text-sky-200 dark:hover:bg-sky-900"><Volume2 className="h-4 w-4" />{language === 'ko' ? '문장 듣기' : 'Listen'}</button>}
  </section>;
}
