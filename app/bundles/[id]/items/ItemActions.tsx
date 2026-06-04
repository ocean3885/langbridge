'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, StickyNote, Volume2, X } from 'lucide-react';

type ItemActionsCopy = {
  audio: string;
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
  isLoggedIn,
  copy,
}: {
  audioUrl: string | null;
  sentenceId: number | null;
  initialMemo: string | null;
  isLoggedIn: boolean;
  copy: ItemActionsCopy;
}) {
  const router = useRouter();
  const [memo, setMemo] = useState(initialMemo || '');
  const [draft, setDraft] = useState(initialMemo || '');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  function playAudio() {
    if (!audioUrl) return;
    const audio = new Audio(audioUrl);
    audio.play().catch((error) => console.error('Audio play error:', error));
  }

  function startEditing() {
    setDraft(memo);
    setIsEditing(true);
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
            className="flex h-9 w-9 items-center justify-center rounded-full text-zinc-500 transition hover:bg-zinc-100 hover:text-[#2f7d4a]"
            aria-label={copy.audio}
            title={copy.audio}
          >
            <Volume2 className="h-4 w-4" />
          </button>
        )}
        {isLoggedIn && sentenceId && (
          <button
            type="button"
            onClick={startEditing}
            className={`flex h-9 w-9 items-center justify-center rounded-full transition hover:bg-zinc-100 hover:text-[#2f7d4a] ${
              memo ? 'text-[#2f7d4a]' : 'text-zinc-500'
            }`}
            aria-label={copy.memo}
            title={copy.memo}
          >
            <StickyNote className={`h-4 w-4 ${memo ? 'fill-current' : ''}`} />
          </button>
        )}
      </div>

      {isEditing && (
        <div className="w-full min-w-[240px] rounded-xl border border-emerald-100 bg-emerald-50/40 p-3">
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder={copy.memoPlaceholder}
            rows={3}
            className="w-full resize-none rounded-lg border border-emerald-100 bg-white p-3 text-sm outline-none focus:border-[#2f7d4a]"
          />
          <div className="mt-2 flex justify-end gap-1">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-500 transition hover:bg-white"
              aria-label={copy.cancel}
              title={copy.cancel}
            >
              <X className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={saveMemo}
              disabled={isSaving}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-[#3f8d54] text-white transition hover:bg-[#347946] disabled:opacity-50"
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
