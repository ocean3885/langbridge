"use client";

import { useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';

type AudioItem = {
  id: number;
  title: string | null;
  created_at: string;
  audio_file_path?: string | null;
  created_label: string; // 서버에서 미리 포맷된 문자열
};

interface Props {
  audioList: AudioItem[];
  bulkDelete: (formData: FormData) => Promise<void>;
}

export default function MyAudioList({ audioList, bulkDelete }: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const formRef = useRef<HTMLFormElement>(null);
  const hiddenRef = useRef<HTMLInputElement>(null);

  const allIds = useMemo(() => audioList.map(a => a.id), [audioList]);
  const allSelected = selected.size > 0 && selected.size === allIds.length;
  const anySelected = selected.size > 0;

  const toggleOne = (id: number, checked: boolean) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const toggleAll = (checked: boolean) => {
    setSelected(() => {
      if (!checked) return new Set();
      return new Set(allIds);
    });
  };

  const onBulkDelete = async () => {
    if (!anySelected) return;
    if (!confirm(`선택한 ${selected.size}개 항목을 삭제하시겠습니까?`)) return;

    const form = formRef.current;
    const hidden = hiddenRef.current;
    if (!form || !hidden) return;
    hidden.value = JSON.stringify(Array.from(selected));
    form.requestSubmit();
  };

  return (
    <div className="space-y-4">
      {/* 툴바 */}
      <form ref={formRef} action={bulkDelete} className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Checkbox
            id="select-all"
            checked={allSelected}
            onCheckedChange={(v) => toggleAll(Boolean(v))}
          />
          <label htmlFor="select-all" className="text-sm">전체 선택</label>
          {anySelected && (
            <span className="text-xs text-gray-500">{selected.size}개 선택됨</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <input ref={hiddenRef} type="hidden" name="ids" />
          <button
            type="button"
            onClick={onBulkDelete}
            disabled={!anySelected}
            className="px-3 py-2 rounded bg-red-600 text-white text-sm font-medium disabled:opacity-60 disabled:cursor-not-allowed hover:bg-red-700"
          >
            선택 삭제
          </button>
        </div>
      </form>

      {/* 리스트 */}
      <div className="grid gap-6">
        {audioList.map(item => {
          const isChecked = selected.has(item.id);
          return (
            <Card
              key={item.id}
              className="transition hover:shadow-md cursor-pointer relative"
              onClick={() => router.push(`/player/${item.id}`)}
            >
              <CardHeader>
                <CardTitle className="text-xl font-semibold flex justify-between items-center gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {/* 체크박스: 클릭 시 내비게이션 방지 */}
                    <Checkbox
                      checked={isChecked}
                      onCheckedChange={(v) => toggleOne(item.id, Boolean(v))}
                      onClick={(e) => e.stopPropagation()}
                      onMouseDown={(e) => e.stopPropagation()}
                    />
                    <span className="truncate" title={item.title || '제목 없음'}>
                      {item.title || '제목 없음'}
                    </span>
                  </div>
                </CardTitle>
                <CardDescription>{item.created_label}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-gray-500">생성됨</p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
