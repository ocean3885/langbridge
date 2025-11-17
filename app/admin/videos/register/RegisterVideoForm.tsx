'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { registerVideo } from '@/app/actions/video';

export default function RegisterVideoForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    youtubeUrl: '',
    title: '',
    description: '',
    duration: '',
    transcriptText: '',
    lang: 'ko',
    transcriptFile: null as File | null,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // If a CSV file is provided, parse it to the server expected transcriptText format
      let transcriptText = formData.transcriptText;
      if (formData.transcriptFile) {
        transcriptText = await parseCsvToTranscriptText(formData.transcriptFile);
      }

      const result = await registerVideo({
        youtubeUrl: formData.youtubeUrl,
        title: formData.title,
        description: formData.description || undefined,
        duration: formData.duration ? parseInt(formData.duration) : undefined,
        transcriptText: transcriptText,
        lang: formData.lang || 'ko',
      });

      if (result.success) {
        alert('영상이 성공적으로 등록되었습니다.');
        router.push('/admin/videos');
      } else {
        alert(result.error || '영상 등록에 실패했습니다.');
      }
    } catch (error) {
      console.error('Submit error:', error);
      alert('영상 등록 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // CSV parsing helpers
  function parseCsvLine(line: string): string[] {
    const result: string[] = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        inQuotes = !inQuotes;
        continue;
      }
      if (ch === ',' && !inQuotes) {
        result.push(cur);
        cur = '';
      } else {
        cur += ch;
      }
    }
    result.push(cur);
    return result.map(s => s.trim());
  }

  function timeToSeconds(timeStr: string): number {
    // Accepts H:MM:SS, MM:SS, SS or H:MM:SS.sss
    const parts = timeStr.trim().split(':').map(s => parseFloat(s));
    if (parts.length === 3) {
      const [h, m, s] = parts; return h * 3600 + m * 60 + s;
    } else if (parts.length === 2) {
      const [m, s] = parts; return m * 60 + s;
    } else if (parts.length === 1) {
      return parts[0];
    }
    // fallback
    return 0;
  }

  async function parseCsvToTranscriptText(file: File): Promise<string> {
    const text = await file.text();
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const rows = lines.map(line => parseCsvLine(line)).filter(fields => fields.length >= 3);
    if (rows.length === 0) throw new Error('CSV 파일에 유효한 데이터가 없습니다.');

    // Calculate start times and end times
    const starts = rows.map(r => timeToSeconds(r[0]));
    const parts = rows.map((r, i) => {
      const start = starts[i];
      const nextStart = starts[i+1];
      const end = nextStart && nextStart > start ? nextStart - 0.01 : start + 3;
      const original = r[1];
      const translated = r[2];
      return `${start.toFixed(2)} ${end.toFixed(2)} ${original} | ${translated}`;
    });

    return parts.join('\n');
  }
  return (
    <div className="min-h-screen bg-gray-50 ml-64 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">영상 등록</h1>
          <p className="text-gray-600 mt-2">YouTube 영상과 스크립트를 등록합니다.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 bg-white rounded-lg shadow p-6">
        {/* YouTube URL */}
        <div>
          <label htmlFor="youtubeUrl" className="block text-sm font-medium mb-2">
            YouTube URL *
          </label>
          <input
            type="text"
            id="youtubeUrl"
            name="youtubeUrl"
            value={formData.youtubeUrl}
            onChange={handleChange}
            required
            placeholder="https://www.youtube.com/watch?v=..."
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
          />
          <p className="text-sm text-gray-500 mt-1">
            YouTube 영상 URL을 입력하세요 (예: https://www.youtube.com/watch?v=dQw4w9WgXcQ)
          </p>
        </div>

        {/* 제목 */}
        <div>
          <label htmlFor="title" className="block text-sm font-medium mb-2">
            제목 *
          </label>
          <input
            type="text"
            id="title"
            name="title"
            value={formData.title}
            onChange={handleChange}
            required
            placeholder="영상 제목"
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
          />
        </div>

        {/* 설명 */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium mb-2">
            설명
          </label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows={3}
            placeholder="영상 설명 (선택사항)"
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 resize-none"
          />
        </div>

        {/* 영상 길이 */}
        <div>
          <label htmlFor="duration" className="block text-sm font-medium mb-2">
            영상 길이 (초)
          </label>
          <input
            type="number"
            id="duration"
            name="duration"
            value={formData.duration}
            onChange={handleChange}
            placeholder="300"
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
          />
          <p className="text-sm text-gray-500 mt-1">
            선택사항 - 입력하지 않으면 자동으로 YouTube에서 가져옵니다
          </p>
        </div>

        {/* 번역 언어 */}
        <div>
          <label htmlFor="lang" className="block text-sm font-medium mb-2">
            번역 언어
          </label>
          <select
            id="lang"
            name="lang"
            value={formData.lang}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
          >
            <option value="ko">한국어</option>
            <option value="en">English</option>
            <option value="ja">日本語</option>
            <option value="zh">中文</option>
          </select>
        </div>

        {/* 스크립트 CSV 파일 */}
        <div>
          <label htmlFor="transcriptCsv" className="block text-sm font-medium mb-2">
            스크립트 CSV 파일 *
          </label>
          <input
            id="transcriptCsv"
            name="transcriptCsv"
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => setFormData(prev => ({ ...prev, transcriptFile: e.target.files?.[0] ?? null }))}
            required
            className="w-full px-2 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white"
          />
          <p className="text-sm text-gray-500 mt-1">
            CSV 파일 형식: 문장시작 타임스탬프,원문 문장,한글 해석
            <br />예: 0:00:10,good afternoon everyone,여러분 좋은 오후입니다.
          </p>
        </div>

        {/* 제출 버튼 */}
        <div className="flex gap-4">
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {isSubmitting ? '등록 중...' : '영상 등록'}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            disabled={isSubmitting}
            className="px-6 py-3 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50"
          >
            취소
          </button>
        </div>
      </form>

        {/* 도움말 */}
        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <h3 className="font-semibold mb-2">💡 스크립트 CSV 형식 안내</h3>
          <ul className="text-sm space-y-1 text-gray-700 dark:text-gray-300">
            <li>• CSV 형식: 문장시작 타임스탬프,원문 문장,한글 해석</li>
            <li>• 타임스탬프 예시: 0:00:10 (H:MM:SS 또는 MM:SS 가능)</li>
            <li>• 각 행의 시작 시간은 다음 행의 시작 시간이 끝 시간이 됩니다 (마지막 행은 +3초)</li>
            <li>• 텍스트에 쉼표가 포함되면 ""로 감싸세요 (CSV 규칙 준수)</li>
            <li>• 빈 줄은 자동으로 무시됩니다</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
