"use client";

import { useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Check, Pencil, X } from "lucide-react";
import { useRouter } from "next/navigation";

type Props = {
  title: string;
  canEdit: boolean;
  action: (formData: FormData) => Promise<{ ok: boolean; message?: string }>;
};

export default function TitleEditorClient({ title, canEdit, action }: Props) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(title);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const onCancel = () => {
    setEditing(false);
    setValue(title);
    setError(null);
  };

  const onSubmit = () => {
    const fd = new FormData();
    fd.set("title", value.trim());
    startTransition(async () => {
      const res = await action(fd);
      if (!res.ok) {
        setError(res.message || "제목 수정에 실패했습니다.");
        return;
      }
      setError(null);
      setEditing(false);
      router.refresh();
    });
  };

  if (!canEdit) {
    return <h1 className="text-4xl font-bold mb-4 break-words">{title}</h1>;
  }

  if (!editing) {
    return (
      <div className="flex items-center gap-2 mb-4">
        <h1 className="text-2xl sm:text-4xl font-bold break-words">{title}</h1>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="제목 수정"
          onClick={() => setEditing(true)}
        >
          <Pencil className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="mb-4">
      <div className="flex items-center gap-2">
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="제목을 입력하세요"
          disabled={pending}
        />
        <Button
          type="button"
          onClick={onSubmit}
          disabled={pending || value.trim().length === 0 || value.trim().length > 200}
          className="gap-1"
        >
          <Check className="w-4 h-4" /> 저장
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} disabled={pending} className="gap-1">
          <X className="w-4 h-4" /> 취소
        </Button>
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
