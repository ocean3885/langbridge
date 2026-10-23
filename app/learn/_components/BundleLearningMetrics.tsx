import type { HomeBundleLearning } from '@/lib/practice/bundle-home';

type Language = 'ko' | 'en';
export function getHomeLearningActionLabel(action: HomeBundleLearning['action'], language: Language) {
  const labels = language === 'ko'
    ? { words: '단어 연습', 'continue-listening': '이어서 듣기', 'start-listening': '듣기 시작', details: '상세 보기' }
    : { words: 'Practice words', 'continue-listening': 'Continue listening', 'start-listening': 'Start listening', details: 'View details' };
  return labels[action];
}

export function BundleLearningMetrics({ learning, language }: { learning: HomeBundleLearning; language: Language }) {
  const ko = language === 'ko';
  const status = learning.isCompleted ? (ko ? '전체 완료' : 'Fully completed')
    : learning.sentenceCompleted ? (ko ? '문장 완료' : 'Sentences complete')
    : learning.wordCompleted ? (ko ? '단어 완료' : 'Words complete') : null;
  return <div className="mt-3 space-y-2">
    {status && <span className="inline-flex rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">{status} ✓</span>}
    <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs font-semibold text-zinc-600 dark:text-zinc-300">
      {learning.maxStars > 0 && <span>⭐ {ko ? '문장 스타' : 'Sentence stars'} {learning.earnedStars}/{learning.maxStars}</span>}
      {learning.totalWords > 0 && <span>📚 {ko ? '단어 완료' : 'Words complete'} {learning.completedWords}/{learning.totalWords}</span>}
      {learning.sentenceCount > 0 && <span>🎧 {ko ? `누적 청취 ${learning.totalPlays}회` : `${learning.totalPlays} plays`}</span>}
    </div>
    {learning.knownWords > 0 && <p className="text-xs text-zinc-500 dark:text-zinc-400">{ko ? `이전에 학습한 단어 ${learning.knownWords}개 포함` : `Includes ${learning.knownWords} previously studied words`}</p>}
  </div>;
}
