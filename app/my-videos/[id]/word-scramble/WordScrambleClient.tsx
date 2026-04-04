'use client';

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { recordCorrectAnswer, recordWrongAnswer, updateScriptContent, deleteScriptProgress } from '@/app/actions/script-progress';
import { ArrowLeft, ChevronLeft, RotateCcw, SkipForward, Check, X, Trophy, Pencil, Trash2 } from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────

interface ScriptItem {
  id: string;
  customContent: string;
  customTranslation: string;
  status: string;
  consecutiveCorrect: number;
  bestTpw: number | null;
  orderIndex: number;
}

interface Props {
  videoId: string;
  videoTitle: string;
  languageName: string | null;
  scripts: ScriptItem[];
  isReviewMode: boolean;
}

interface WordToken {
  id: number;
  text: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────

function shuffleArray<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function tokenize(sentence: string): string[] {
  return sentence.split(/\s+/).filter(Boolean);
}

// ─── Component ───────────────────────────────────────────────────────

export default function WordScrambleClient({ videoId, videoTitle, languageName, scripts: initialScripts, isReviewMode }: Props) {
  const router = useRouter();
  const [scripts, setScripts] = useState<ScriptItem[]>(initialScripts);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedWords, setSelectedWords] = useState<WordToken[]>([]);
  const [availableWords, setAvailableWords] = useState<WordToken[]>([]);
  const [result, setResult] = useState<'correct' | 'wrong' | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [completedCount, setCompletedCount] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const startTimeRef = useRef<number>(Date.now());

  // 수정 모달 상태
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [editTranslation, setEditTranslation] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState('');

  // 삭제 상태
  const [isDeleting, setIsDeleting] = useState(false);

  const currentScript = scripts[currentIndex];
  const total = scripts.length;
  const progressPercent = total > 0 ? Math.round((completedCount / total) * 100) : 0;

  // 원문 단어 배열 (정답)
  const correctWords = useMemo(() => tokenize(currentScript?.customContent ?? ''), [currentScript]);

  // 새 문장 세팅
  const initQuestion = useCallback(
    (index: number) => {
      const script = scripts[index];
      if (!script) return;
      const words = tokenize(script.customContent);
      const tokens: WordToken[] = words.map((w, i) => ({ id: i, text: w }));
      setSelectedWords([]);
      setAvailableWords(shuffleArray(tokens));
      setResult(null);
      startTimeRef.current = Date.now();
    },
    [scripts],
  );

  // 첫 렌더 + currentIndex 변경 시 초기화
  useEffect(() => {
    initQuestion(currentIndex);
  }, [currentIndex, initQuestion]);

  // ─── Interactions ────────────────────────────────────────────────

  const selectWord = useCallback((word: WordToken) => {
    setAvailableWords((prev) => prev.filter((w) => w.id !== word.id));
    setSelectedWords((prev) => [...prev, word]);
  }, []);

  const deselectWord = useCallback((word: WordToken) => {
    setSelectedWords((prev) => prev.filter((w) => w.id !== word.id));
    setAvailableWords((prev) => [...prev, word]);
  }, []);

  const resetQuestion = useCallback(() => {
    initQuestion(currentIndex);
  }, [currentIndex, initQuestion]);

  const goPrev = useCallback(() => {
    if (currentIndex > 0) {
      setResult(null);
      setCompletedCount((c) => Math.max(0, c - 1));
      setCurrentIndex((i) => i - 1);
    }
  }, [currentIndex]);

  const skipQuestion = useCallback(() => {
    if (currentIndex + 1 < total) {
      setCompletedCount((c) => c + 1);
      setCurrentIndex((i) => i + 1);
    } else {
      setCompletedCount(total);
      setIsFinished(true);
    }
  }, [currentIndex, total]);

  // ─── 정답 확인 ──────────────────────────────────────────────────

  const checkAnswer = useCallback(async () => {
    if (isChecking || !currentScript) return;
    setIsChecking(true);

    const userAnswer = selectedWords.map((w) => w.text).join(' ');
    const correctAnswer = correctWords.join(' ');
    const isCorrect = userAnswer === correctAnswer;

    // TPW 계산 (단어당 소요 시간)
    const elapsedMs = Date.now() - startTimeRef.current;
    const tpw = correctWords.length > 0 ? elapsedMs / 1000 / correctWords.length : null;

    setResult(isCorrect ? 'correct' : 'wrong');

    try {
      if (isCorrect) {
        await recordCorrectAnswer(currentScript.id, tpw);
      } else {
        await recordWrongAnswer(currentScript.id);
      }
    } catch (err) {
      console.error('Failed to record answer:', err);
    }

    setIsChecking(false);
  }, [isChecking, currentScript, selectedWords, correctWords]);

  const goNext = useCallback(() => {
    setResult(null);
    if (currentIndex + 1 < total) {
      setCompletedCount((c) => c + 1);
      setCurrentIndex((i) => i + 1);
    } else {
      setCompletedCount(total);
      setIsFinished(true);
    }
  }, [currentIndex, total]);

  // ─── 수정 / 삭제 ───────────────────────────────────────────────

  const openEditModal = useCallback(() => {
    if (!currentScript) return;
    setEditContent(currentScript.customContent);
    setEditTranslation(currentScript.customTranslation);
    setEditError('');
    setEditModalOpen(true);
  }, [currentScript]);

  const handleEditSave = useCallback(async () => {
    if (!currentScript) return;
    const trimmedContent = editContent.trim();
    if (!trimmedContent) {
      setEditError('원문을 입력해주세요.');
      return;
    }
    setEditSaving(true);
    setEditError('');
    try {
      const res = await updateScriptContent(currentScript.id, trimmedContent, editTranslation.trim());
      if (!res.success) {
        setEditError(res.error);
        return;
      }
      // 로컬 상태 갱신
      setScripts((prev) =>
        prev.map((s) =>
          s.id === currentScript.id
            ? { ...s, customContent: trimmedContent, customTranslation: editTranslation.trim() }
            : s,
        ),
      );
      setEditModalOpen(false);
      // 현재 문제 다시 초기화 (수정된 문장 반영)
      setTimeout(() => initQuestion(currentIndex), 0);
    } catch {
      setEditError('수정에 실패했습니다.');
    } finally {
      setEditSaving(false);
    }
  }, [currentScript, editContent, editTranslation, currentIndex, initQuestion]);

  const handleDelete = useCallback(async () => {
    if (!currentScript || isDeleting) return;
    if (!window.confirm('이 문장을 학습 목록에서 삭제하시겠습니까?')) return;
    setIsDeleting(true);
    try {
      const res = await deleteScriptProgress(currentScript.id);
      if (!res.success) {
        alert(res.error);
        return;
      }
      const newScripts = scripts.filter((s) => s.id !== currentScript.id);
      setScripts(newScripts);
      if (newScripts.length === 0) {
        setIsFinished(true);
      } else if (currentIndex >= newScripts.length) {
        setCurrentIndex(newScripts.length - 1);
      } else {
        // 같은 인덱스에 다른 문장이 오므로 다시 초기화
        initQuestion(currentIndex);
      }
    } catch {
      alert('삭제에 실패했습니다.');
    } finally {
      setIsDeleting(false);
    }
  }, [currentScript, isDeleting, scripts, currentIndex, initQuestion]);

  // ─── Finish Screen ─────────────────────────────────────────────

  if (isFinished) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
        <Trophy className="w-16 h-16 text-yellow-500" />
        <h2 className="text-2xl font-bold">학습 완료!</h2>
        <p className="text-muted-foreground">
          {isReviewMode ? '복습' : '학습'} {total}개 문장을 모두 마쳤습니다.
        </p>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => router.push(`/my-videos/${videoId}`)}>
            영상으로 돌아가기
          </Button>
          <Button onClick={() => window.location.reload()}>다시 학습하기</Button>
        </div>
      </div>
    );
  }

  if (!currentScript) return null;

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-6 pb-8">
      {/* 헤더 */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push(`/my-videos/${videoId}`)}
          className="p-2 hover:bg-accent rounded-md transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-medium text-muted-foreground truncate">{videoTitle}</h1>
          <p className="text-xs text-muted-foreground">
            {isReviewMode ? '복습 모드' : '학습 모드'} · {currentIndex + 1} / {total}
          </p>
          {isReviewMode && (
            <p className="text-xs text-muted-foreground/70 mt-0.5">연속 3회 정답으로 마스터한 문장들입니다</p>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-secondary rounded-full h-2.5 overflow-hidden">
        <motion.div
          className="h-full bg-primary rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${progressPercent}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      {/* 수정 / 삭제 */}
      <div className="flex justify-end gap-1 -mb-4">
        <button
          onClick={openEditModal}
          disabled={isChecking}
          className="p-1.5 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors disabled:opacity-50"
          title="문장 수정"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={handleDelete}
          disabled={isChecking || isDeleting}
          className="p-1.5 rounded-md text-muted-foreground hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-950/30 transition-colors disabled:opacity-50"
          title="문장 삭제"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Question: 번역문 */}
      <div className="bg-card border rounded-xl p-6 text-center">
        <p className="text-xs text-muted-foreground mb-2">이 문장을 {languageName ?? '외국어'}로 배열하세요</p>
        <p className="text-xl font-semibold leading-relaxed">{currentScript.customTranslation}</p>
      </div>

      {/* Answer Area */}
      <div
        className={`min-h-[80px] border-2 border-dashed rounded-xl p-4 flex flex-wrap gap-2 items-start transition-colors ${
          result === 'correct'
            ? 'border-green-500 bg-green-50 dark:bg-green-950/20'
            : result === 'wrong'
              ? 'border-red-500 bg-red-50 dark:bg-red-950/20'
              : 'border-muted-foreground/30'
        }`}
      >
        <AnimatePresence mode="popLayout">
          {selectedWords.map((word) => (
            <motion.button
              key={`sel-${word.id}`}
              layout
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              onClick={() => !isChecking && deselectWord(word)}
              className="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium shadow-sm hover:opacity-90 transition-opacity cursor-pointer disabled:cursor-not-allowed"
              disabled={isChecking}
            >
              {word.text}
            </motion.button>
          ))}
        </AnimatePresence>
        {selectedWords.length === 0 && (
          <p className="text-muted-foreground text-sm w-full text-center py-4">
            아래에서 단어를 선택하세요
          </p>
        )}
      </div>

      {/* 결과 피드백 */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`flex items-center gap-2 justify-center text-sm font-medium ${
              result === 'correct' ? 'text-green-600' : 'text-red-600'
            }`}
          >
            {result === 'correct' ? (
              <>
                <Check className="w-4 h-4" /> 정답입니다!
              </>
            ) : (
              <>
                <X className="w-4 h-4" /> 오답입니다. 정답: {correctWords.join(' ')}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Word Bank */}
      <div className="bg-secondary/50 rounded-xl p-4 flex flex-wrap gap-2 min-h-[60px] justify-center">
        <AnimatePresence mode="popLayout">
          {availableWords.map((word) => (
            <motion.button
              key={`avail-${word.id}`}
              layout
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              onClick={() => !isChecking && selectWord(word)}
              className="px-3 py-1.5 bg-background border rounded-lg text-sm font-medium shadow-sm hover:bg-accent transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isChecking}
            >
              {word.text}
            </motion.button>
          ))}
        </AnimatePresence>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" onClick={goPrev} disabled={isChecking || currentIndex === 0}>
            <ChevronLeft className="w-4 h-4 sm:mr-1" />
            <span className="hidden sm:inline">이전</span>
          </Button>
          <Button variant="ghost" size="sm" onClick={resetQuestion} disabled={isChecking}>
            <RotateCcw className="w-4 h-4 sm:mr-1" />
            <span className="hidden sm:inline">초기화</span>
          </Button>
        </div>

        {result ? (
          <Button onClick={goNext} className="min-w-[120px]">
            다음 문장
          </Button>
        ) : (
          <Button
            onClick={checkAnswer}
            disabled={selectedWords.length === 0 || isChecking}
            className="min-w-[120px]"
          >
            {isChecking ? '확인 중...' : '정답 확인'}
          </Button>
        )}

        <Button variant="ghost" size="sm" onClick={skipQuestion} disabled={isChecking}>
          건너뛰기
          <SkipForward className="w-4 h-4 ml-1" />
        </Button>
      </div>

      {/* 수정 모달 */}
      {editModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-lg bg-card p-5 sm:p-6 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">문장 수정</h2>
              <button
                onClick={() => setEditModalOpen(false)}
                className="text-muted-foreground hover:text-foreground"
                disabled={editSaving}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {editError && (
              <div className="text-sm text-red-600 bg-red-50 dark:bg-red-950/20 p-2 rounded">
                {editError}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="edit-content" className="text-sm font-semibold">
                원문
              </Label>
              <textarea
                id="edit-content"
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full min-h-[80px] p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-y bg-background"
                disabled={editSaving}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-translation" className="text-sm font-semibold">
                번역
              </Label>
              <textarea
                id="edit-translation"
                value={editTranslation}
                onChange={(e) => setEditTranslation(e.target.value)}
                className="w-full min-h-[80px] p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-y bg-background"
                disabled={editSaving}
              />
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <Button variant="outline" onClick={() => setEditModalOpen(false)} disabled={editSaving}>
                취소
              </Button>
              <Button onClick={handleEditSave} disabled={editSaving || !editContent.trim()}>
                {editSaving ? '저장 중...' : '저장'}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
