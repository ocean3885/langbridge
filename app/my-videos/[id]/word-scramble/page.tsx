import { notFound, redirect } from 'next/navigation';
import { getAppUserFromServer } from '@/lib/auth/app-user';
import { getVideoWithTranscriptsSqlite } from '@/lib/sqlite/videos';
import { initScriptProgress } from '@/app/actions/script-progress';
import WordScrambleClient from './WordScrambleClient';

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ mode?: string }>;
}

export default async function WordScramblePage({ params, searchParams }: Props) {
  const { id: videoId } = await params;
  const { mode } = await searchParams;

  const user = await getAppUserFromServer();
  if (!user) redirect('/auth/login');

  const { video } = await getVideoWithTranscriptsSqlite(videoId);
  if (!video) notFound();

  // 학습 시작 – script_progress 초기화 (이미 있으면 기존 데이터 반환)
  const result = await initScriptProgress(videoId);
  if (!result.success) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-red-500">{result.error}</p>
      </div>
    );
  }

  const reviewMode = mode === 'review';
  const scripts = reviewMode
    ? result.data.filter((s) => s.status === 'mastered')
    : result.data.filter((s) => s.status === 'learning');

  if (scripts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-muted-foreground text-lg">
          {reviewMode ? '복습할 문장이 없습니다.' : '학습할 문장이 없습니다. 모두 마스터했어요! 🎉'}
        </p>
        {reviewMode && (
          <p className="text-muted-foreground text-sm text-center max-w-sm">
            학습 모드에서 같은 문장을 연속 3회 정답 처리하면 마스터 상태가 되어 복습 목록에 추가됩니다.
          </p>
        )}
        <a
          href={`/my-videos/${videoId}`}
          className="text-primary underline hover:no-underline"
        >
          영상으로 돌아가기
        </a>
      </div>
    );
  }

  return (
    <WordScrambleClient
      videoId={videoId}
      videoTitle={video.title}
      languageName={video.language_name ?? null}
      scripts={scripts.map((s) => ({
        id: s.id,
        customContent: s.custom_content,
        customTranslation: s.custom_translation,
        status: s.status,
        consecutiveCorrect: s.consecutive_correct,
        bestTpw: s.best_tpw,
        orderIndex: s.order_index,
        totalAttempts: s.total_attempts,
        correctCount: s.correct_count,
        wrongCount: s.wrong_count,
        bestConsecutiveCorrect: s.best_consecutive_correct,
        lastAnswerAt: s.last_answer_at,
        firstMasteredAt: s.first_mastered_at,
        masteredCount: s.mastered_count,
        avgTpw: s.avg_tpw,
      }))}
      isReviewMode={reviewMode}
    />
  );
}
