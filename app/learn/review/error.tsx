'use client';
export default function ReviewError({ reset }: { reset: () => void }) {
  return <section role="alert" className="mx-auto max-w-xl space-y-4 px-4 py-10"><h1 className="text-xl font-bold">복습 목록을 불러오지 못했습니다 / Unable to load reviews</h1><p>잠시 후 다시 시도해주세요. / Please try again.</p><button onClick={reset} className="min-h-11 rounded-lg bg-green-700 px-5 text-white">다시 시도 / Retry</button></section>;
}
