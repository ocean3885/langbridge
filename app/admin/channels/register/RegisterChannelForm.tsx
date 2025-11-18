"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { registerChannel } from '@/app/actions/channels';

export default function RegisterChannelForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [languages, setLanguages] = useState<{ id: number; name_ko: string; name_en: string }[]>([]);
  const [form, setForm] = useState({
    channelName: '',
    channelUrl: '',
    channelDescription: '',
    thumbnailUrl: '',
    languageId: '',
  });

  useEffect(() => {
    fetch('/api/admin/languages')
      .then(r => r.json())
      .then(setLanguages)
      .catch(err => console.error('언어 목록 로드 오류:', err));
  }, []);

  const onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.channelName.trim()) {
      alert('채널명을 입력하세요.');
      return;
    }
    setIsSubmitting(true);
    const res = await registerChannel({
      channelName: form.channelName.trim(),
      channelUrl: form.channelUrl || null,
      channelDescription: form.channelDescription || null,
      thumbnailUrl: form.thumbnailUrl || null,
      languageId: form.languageId ? Number(form.languageId) : null,
    });
    setIsSubmitting(false);

    if (res.success) {
      alert('채널이 등록되었습니다.');
      router.push('/admin/channels');
    } else {
      alert(res.error || '채널 등록에 실패했습니다.');
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-6 bg-white rounded-lg shadow p-6">
      <div>
        <label className="block text-sm font-medium mb-2">채널명 *</label>
        <input
          type="text"
          name="channelName"
          value={form.channelName}
          onChange={onChange}
          required
          placeholder="예: TED-Ed (English)"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">채널 URL</label>
        <input
          type="url"
          name="channelUrl"
          value={form.channelUrl}
          onChange={onChange}
          placeholder="https://www.youtube.com/@..."
          className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">썸네일 URL</label>
        <input
          type="url"
          name="thumbnailUrl"
          value={form.thumbnailUrl}
          onChange={onChange}
          placeholder="https://.../image.png"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">설명</label>
        <textarea
          name="channelDescription"
          value={form.channelDescription}
          onChange={onChange}
          rows={3}
          placeholder="채널에 대한 설명"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white resize-none"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">언어</label>
        <select
          name="languageId"
          value={form.languageId}
          onChange={onChange}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white"
        >
          <option value="">선택안함</option>
          {languages.map(l => (
            <option key={l.id} value={l.id}>{l.name_ko} ({l.name_en})</option>
          ))}
        </select>
      </div>

      <div className="flex gap-4">
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {isSubmitting ? '등록 중...' : '채널 등록'}
        </button>
        <button
          type="button"
          onClick={() => history.back()}
          disabled={isSubmitting}
          className="px-6 py-3 bg-gray-200 rounded-lg hover:bg-gray-300 disabled:opacity-50"
        >
          취소
        </button>
      </div>
    </form>
  );
}
