'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bookmark, Check, StickyNote, Volume2, X } from 'lucide-react';

type ItemActionsCopy = {
  audio: string;
  saveSentence: string;
  unsaveSentence: string;
  memo: string;
  memoPlaceholder: string;
  save: string;
  cancel: string;
  saveFailed: string;
};

export default function ItemActions({
  audioUrl,
  sentenceId,
  initialMemo,
  initialIsPinned,
  isLoggedIn,
  copy,
}: {
  audioUrl: string | null;
  sentenceId: number | null;
  initialMemo: string | null;
  initialIsPinned: boolean;
  isLoggedIn: boolean;
  copy: ItemActionsCopy;
}) {
  const router = useRouter();
  const [memo, setMemo] = useState(initialMemo || '');
  const [draft, setDraft] = useState(initialMemo || '');
  const [isPinned, setIsPinned] = useState(initialIsPinned);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isPinning, setIsPinning] = useState(false);

  function playAudio() {
    if (!audioUrl) return;
    const audio = new Audio(audioUrl);
    audio.play().catch((error) => console.error('Audio play error:', error));
  }

  function startEditing() {
    setDraft(memo);
    setIsEditing(true);
  }

  async function togglePinned() {
    if (!sentenceId || isPinning) return;
    const nextPinned = !isPinned;

    setIsPinned(nextPinned);
    setIsPinning(true);

    try {
      const response = await fetch('/api/user-interactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sentence_id: sentenceId,
          is_pinned: nextPinned,
        }),
      });

      if (!response.ok) throw new Error('Failed to update sentence pin');
      router.refresh();
    } catch {
      setIsPinned(!nextPinned);
      alert(copy.saveFailed);
    } finally {
      setIsPinning(false);
    }
  }

  async function saveMemo() {
    if (!sentenceId || isSaving) return;
    setIsSaving(true);

    try {
      const response = await fetch('/api/user-interactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sentence_id: sentenceId,
          memo: draft.trim() || null,
        }),
      });

      if (!response.ok) throw new Error('Failed to save memo');
      setMemo(draft.trim());
      setIsEditing(false);
      router.refresh();
    } catch {
      alert(copy.saveFailed);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="flex flex-col items-stretch gap-3">
      <div className="flex justify-end gap-1">
        {audioUrl && (
          <button
            type="button"
            onClick={playAudio}
            className="flex h-9 w-9 items-center justify-center rounded-full text-zinc-500 transition hover:bg-zinc-100 hover:text-[#2f7d4a] dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-emerald-400"
            aria-label={copy.audio}
            title={copy.audio}
          >
            <Volume2 className="h-4 w-4" />
          </button>
        )}
        {isLoggedIn && sentenceId && (
          <button
            type="button"
            onClick={togglePinned}
            disabled={isPinning}
            className={`flex h-9 w-9 items-center justify-center rounded-full transition hover:bg-zinc-100 hover:text-[#2f7d4a] disabled:opacity-60 dark:hover:bg-zinc-800 dark:hover:text-emerald-400 ${
              isPinned ? 'text-[#2f7d4a] dark:text-emerald-400' : 'text-zinc-500 dark:text-zinc-400'
            }`}
            aria-label={isPinned ? copy.unsaveSentence : copy.saveSentence}
            aria-pressed={isPinned}
            title={isPinned ? copy.unsaveSentence : copy.saveSentence}
          >
            <Bookmark className={`h-4 w-4 ${isPinned ? 'fill-current' : ''}`} />
          </button>
        )}
        {isLoggedIn && sentenceId && (
          <button
            type="button"
            onClick={startEditing}
            className={`flex h-9 w-9 items-center justify-center rounded-full transition hover:bg-zinc-100 hover:text-[#2f7d4a] dark:hover:bg-zinc-800 dark:hover:text-emerald-400 ${
              memo ? 'text-[#2f7d4a] dark:text-emerald-400' : 'text-zinc-500 dark:text-zinc-400'
            }`}
            aria-label={copy.memo}
            title={copy.memo}
          >
            <StickyNote className={`h-4 w-4 ${memo ? 'fill-current' : ''}`} />
          </button>
        )}
      </div>

      {isEditing && (
        <div className="w-full min-w-[240px] rounded-xl border border-emerald-100 bg-emerald-50/40 p-3 dark:border-emerald-900 dark:bg-emerald-950/30">
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder={copy.memoPlaceholder}
            rows={3}
            className="w-full resize-none rounded-lg border border-emerald-100 bg-white p-3 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-[#2f7d4a] dark:border-emerald-900 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-emerald-500"
          />
          <div className="mt-2 flex justify-end gap-1">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-500 transition hover:bg-white dark:text-zinc-400 dark:hover:bg-zinc-800"
              aria-label={copy.cancel}
              title={copy.cancel}
            >
              <X className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={saveMemo}
              disabled={isSaving}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-[#3f8d54] text-white transition hover:bg-[#347946] disabled:opacity-50 dark:bg-emerald-600 dark:hover:bg-emerald-500"
              aria-label={copy.save}
              title={copy.save}
            >
              <Check className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
